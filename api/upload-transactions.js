import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
let genAI;
let embeddingModel;

if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
}

async function getEmbedding(text) {
    if (!embeddingModel) {
        console.error('Embedding model not initialized. Check GEMINI_API_KEY.');
        throw new Error('Embedding model not initialized.');
    }
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('Error generating embedding for text:', text, error);
        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
}

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { transactions } = req.body;
    console.log('Received request to upload transactions. Count:', transactions ? transactions.length : 0);

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        console.error('Validation error: No transactions provided or invalid format.');
        return res.status(400).json({ error: 'No transactions provided or invalid format' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }
     if (!process.env.GEMINI_API_KEY) {
        console.error('Configuration error: GEMINI_API_KEY not configured.');
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }
    console.log('Supabase client initialized.');

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        // --- TEMPORARY SIMPLIFIED LOGIC FOR DEBUGGING ---
        // Generate embeddings for each transaction and map to correct column names
        const transactionsToInsert = await Promise.all(transactions.map(async (t) => {
            const description = `Payee: ${t.payee || 'N/A'}, Category: ${t.categoryName || 'N/A'}, Comment: ${t.comment || 'N/A'}`;
            const embedding = await getEmbedding(description);
            
            return {
                date: t.date,
                category_name: t.categoryName,
                payee: t.payee,
                comment: t.comment,
                outcome_account_name: t.outcomeAccountName,
                outcome: t.outcome,
                income_account_name: t.incomeAccountName,
                income: t.income,
                // unique_hash: createUniqueHash(t), // Temporarily disabled
                description_embedding: embedding
            };
        }));

        console.log('DEBUG: Attempting to insert transactions without deduplication check:', transactionsToInsert);

        const { data, error } = await supabase
            .from('transactions')
            .insert(transactionsToInsert);

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: error.message });
        }

        const insertedCount = data ? data.length : 0;
        console.log(`${insertedCount} transactions uploaded successfully.`);
        res.status(200).json({ message: `${insertedCount} new transactions uploaded successfully.` });
    } catch (error) {
        console.error('Unhandled server error during embedding or Supabase insert:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
