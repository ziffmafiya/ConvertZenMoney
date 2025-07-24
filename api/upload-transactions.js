import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });

async function getEmbedding(text) {
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('Error generating embedding:', error);
        // Depending on the desired behavior, you might want to return null,
        // or a default vector, or re-throw the error.
        // For now, we'll re-throw to let the caller handle it.
        throw new Error('Failed to generate embedding.');
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
    console.log('Supabase client initialized.');

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        // Generate embeddings for each transaction
        const transactionsWithEmbeddings = await Promise.all(transactions.map(async (t) => {
            // Create a descriptive string for embedding
            const description = `Payee: ${t.payee || 'N/A'}, Category: ${t.categoryName || 'N/A'}, Comment: ${t.comment || 'N/A'}`;
            
            // Generate the embedding
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
                description_embedding: embedding // Add the new embedding field
            };
        }));

        console.log('Attempting to insert transactions with embeddings:', transactionsWithEmbeddings);

        const { data, error } = await supabase
            .from('transactions')
            .insert(transactionsWithEmbeddings);

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: error.message });
        }

        console.log('Transactions uploaded successfully. Data:', data);
        res.status(200).json({ message: 'Transactions uploaded successfully', data });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
