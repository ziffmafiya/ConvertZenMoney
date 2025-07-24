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

    // --- Deduplication Logic ---
    const createUniqueHash = (t) => {
        // Creates a consistent, unique string from the core fields of a transaction.
        return `${t.date}|${t.categoryName}|${t.payee}|${t.comment}|${t.outcome}|${t.income}`;
    };

    try {
        // 1. Generate hashes for all incoming transactions
        const transactionsWithHashes = transactions.map(t => ({
            ...t,
            unique_hash: createUniqueHash(t)
        }));
        const incomingHashes = transactionsWithHashes.map(t => t.unique_hash);

        // 2. Check which hashes already exist in the database
        const { data: existingTransactions, error: fetchError } = await supabase
            .from('transactions')
            .select('unique_hash')
            .in('unique_hash', incomingHashes);

        if (fetchError) {
            console.error('Supabase fetch error for deduplication:', fetchError);
            return res.status(500).json({ error: `Failed to check for existing transactions: ${fetchError.message}` });
        }

        const existingHashes = new Set(existingTransactions.map(t => t.unique_hash));

        // 3. Filter out transactions that already exist
        const newTransactions = transactionsWithHashes.filter(t => !existingHashes.has(t.unique_hash));

        if (newTransactions.length === 0) {
            console.log('No new transactions to upload.');
            return res.status(200).json({ message: 'No new transactions to upload. All provided transactions already exist.' });
        }
        
        console.log(`Found ${newTransactions.length} new transactions to process.`);

        // 4. Generate embeddings only for the new transactions
        const transactionsToInsert = await Promise.all(newTransactions.map(async (t) => {
            const description = `Payee: ${t.payee || 'N/A'}, Category: ${t.categoryName || 'N/A'}, Comment: ${t.comment || 'N/A'}`;
            const embedding = await getEmbedding(description);
            
            // We already have unique_hash in the object, just add the embedding
            return {
                ...t,
                description_embedding: embedding
            };
        }));

        console.log('Attempting to insert new transactions with embeddings:', transactionsToInsert);

        // 5. Insert only the new, enriched transactions
        const { data, error } = await supabase
            .from('transactions')
            .insert(transactionsToInsert);

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: error.message });
        }

        console.log(`${data.length} transactions uploaded successfully.`);
        res.status(200).json({ message: `${data.length} new transactions uploaded successfully.` });
    } catch (error) {
        console.error('Unhandled server error during embedding or Supabase insert:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
