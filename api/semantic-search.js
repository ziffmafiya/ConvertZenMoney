import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Инициализация модели для эмбеддингов
let genAI;
let embeddingModel;

if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
}

async function getEmbedding(text) {
    if (!embeddingModel) {
        throw new Error('Embedding model not initialized. Check GEMINI_API_KEY.');
    }
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('Error generating embedding:', error);
        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { query } = req.body;
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query parameter is required and must be a string' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    try {
        // Генерация эмбеддинга для запроса
        const queryEmbedding = await getEmbedding(query);
        const supabase = createClient(supabaseUrl, supabaseKey);

        // Вызов векторного поиска в Supabase
        const { data: transactions, error } = await supabase.rpc('match_transactions', {
            query_embedding: queryEmbedding,
            match_threshold: 0.7,
            match_count: 10
        });

        if (error) {
            console.error('Supabase search error:', error);
            // Добавляем дополнительную информацию для отладки
            return res.status(500).json({ 
                error: `Supabase RPC error: ${error.message}`,
                details: {
                    query_embedding_length: queryEmbedding.length,
                    match_threshold: 0.7,
                    match_count: 10
                }
            });
        }

        // Форматирование результатов
        const results = transactions.map(t => ({
            date: t.date,
            categoryName: t.category_name,
            payee: t.payee,
            comment: t.comment,
            outcomeAccountName: t.outcome_account_name,
            outcome: t.outcome,
            incomeAccountName: t.income_account_name,
            income: t.income,
            similarity: t.similarity
        }));

        res.status(200).json({ results });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ 
            error: error.message || 'Internal Server Error',
            stack: error.stack // Добавляем стек вызовов для отладки
        });
    }
}
