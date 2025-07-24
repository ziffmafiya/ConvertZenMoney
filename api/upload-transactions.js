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

    const { transactions, excludeDebts } = req.body;
    console.log('Received request to upload transactions. Count:', transactions ? transactions.length : 0, 'Exclude Debts:', excludeDebts);

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        console.error('Validation error: No transactions provided or invalid format.');
        return res.status(400).json({ error: 'No transactions provided or invalid format' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }
     if (!process.env.GEMINI_API_KEY) {
        console.error('Configuration error: GEMINI_API_KEY not configured.');
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }
    console.log('Supabase client initialized.');

    const supabase = createClient(supabaseUrl, supabaseKey);

    function normalize(str) {
        return (str ?? '').replace(/\u00A0/g, ' ').trim().toLowerCase();
    }

    // --- Deduplication Logic ---
    const createUniqueHash = (t) => {
        // Creates a consistent, unique string from the core fields of a transaction,
        // safely handling null/undefined values and ensuring consistent number formatting.
        // Normalize date to YYYY-MM-DD format for consistent hashing
        let normalizedDate = '';
        if (t.date) {
            const parts = t.date.split('.');
            if (parts.length === 3) {
                normalizedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // Assuming DD.MM.YYYY
            } else {
                normalizedDate = t.date; // Use as is if not DD.MM.YYYY
            }
        }
        
        const category = (t.categoryName || '').trim();
        const payee = (t.payee || '').trim();
        const comment = (t.comment || '').trim();
        // Format numbers to 2 decimal places to avoid floating point inconsistencies.
        const outcome = (t.outcome || 0).toFixed(2);
        const income = (t.income || 0).toFixed(2);
        return `${normalizedDate}|${category}|${payee}|${comment}|${outcome}|${income}`;
    };

    try {
        // 1. Generate hashes for all incoming transactions
        const transactionsWithHashes = transactions.map(t => ({
            ...t,
            unique_hash: createUniqueHash(t)
        }));
        const incomingHashes = transactionsWithHashes.map(t => t.unique_hash);
        
        // --- DEBUGGING LOG ---
        console.log("DEBUG: Incoming Hashes generated from file (first 5):", JSON.stringify(incomingHashes.slice(0, 5), null, 2));
        console.log("DEBUG: Total incoming hashes:", incomingHashes.length);

        // 2. Check which hashes already exist in the database, processing in chunks to avoid timeouts
        const CHUNK_SIZE = 500;
        const existingHashes = new Set();

        for (let i = 0; i < incomingHashes.length; i += CHUNK_SIZE) {
            const chunk = incomingHashes.slice(i, i + CHUNK_SIZE);
            console.log(`DEBUG: Checking chunk of hashes (size: ${chunk.length}, first 3: ${JSON.stringify(chunk.slice(0, 3))})`);
            
            const { data: existingTransactions, error: fetchError } = await supabase
                .rpc('get_existing_hashes', { hashes: chunk });

            if (fetchError) {
                // The error message might be HTML, so we log a clear message first
                console.error('Supabase fetch error during deduplication chunk processing:', fetchError);
                return res.status(500).json({ error: `Failed to check for existing transactions. Supabase returned an error: ${fetchError.message}` });
            }

            if (existingTransactions) {
                console.log(`DEBUG: Supabase returned ${existingTransactions.length} existing transactions for this chunk (first 3: ${JSON.stringify(existingTransactions.slice(0, 3))})`);
                existingTransactions.forEach(t => existingHashes.add(t.unique_hash));
            }
        }

        // --- DEBUGGING LOG ---
        console.log("DEBUG: Hashes found in database (first 5):", JSON.stringify(Array.from(existingHashes).slice(0, 5), null, 2));
        console.log("DEBUG: Total existing hashes found:", existingHashes.size);

        // 3. Filter out transactions that already exist
        const newTransactions = transactionsWithHashes.filter(t => !existingHashes.has(t.unique_hash));
        console.log(`DEBUG: After initial deduplication (removing existing), ${newTransactions.length} transactions remain.`);

        if (newTransactions.length === 0) {
            console.log('No new transactions to upload.');
            return res.status(200).json({ message: 'No new transactions to upload. All provided transactions already exist.' });
        }
        
        let transactionsToProcess = newTransactions;

        if (excludeDebts) {
            const originalCountBeforeDebtFilter = transactionsToProcess.length;
            transactionsToProcess = transactionsToProcess.filter(row => {
                const income = normalize(row.incomeAccountName);
                const outcome = normalize(row.outcomeAccountName);
                const hasDebt = income.includes('долги') || outcome.includes('долги');
                return !hasDebt;
            });
            console.log(`DEBUG: Filtered out debt-related transactions. Removed ${originalCountBeforeDebtFilter - transactionsToProcess.length}. Remaining: ${transactionsToProcess.length}`);
        }

        if (transactionsToProcess.length === 0) {
            console.log('No new transactions to upload after all filters applied.');
            return res.status(200).json({ message: 'No new transactions to upload after filtering. All provided transactions already exist or were excluded.' });
        }
        
        console.log(`DEBUG: Final count of transactions to insert: ${transactionsToProcess.length}`);

        // 4. Generate embeddings only for the new transactions
        let transactionsToInsert = await Promise.all(transactionsToProcess.map(async (t) => {
            const description = `Payee: ${t.payee || 'N/A'}, Category: ${t.categoryName || 'N/A'}, Comment: ${t.comment || 'N/A'}`;
            const embedding = await getEmbedding(description);
            
            // We already have unique_hash in the object, just add the embedding
            // and map to the correct snake_case column names for Supabase.
            return {
                date: t.date,
                category_name: t.categoryName,
                payee: t.payee,
                comment: t.comment,
                outcome_account_name: t.outcomeAccountName,
                outcome: t.outcome,
                income_account_name: t.incomeAccountName,
                income: t.income,
                unique_hash: t.unique_hash, // Pass the hash along
                description_embedding: embedding
            };
        }));

        console.log('DEBUG: Transactions to insert before final check (first 5):', JSON.stringify(transactionsToInsert.slice(0, 5), null, 2));
        console.log('DEBUG: Total transactions to insert before final check:', transactionsToInsert.length);

        // Verify no duplicates before final insert (extra safeguard)
        let finalHashes = new Set(transactionsToInsert.map(t => t.unique_hash));
        if (finalHashes.size !== transactionsToInsert.length) {
            console.error("ERROR: Duplicates found in transactionsToInsert before final insert! This indicates an issue with hash generation or prior filtering.");
            // As a safeguard, re-filter to ensure uniqueness before inserting
            transactionsToInsert = Array.from(new Map(transactionsToInsert.map(item => [item.unique_hash, item])).values());
            console.log(`DEBUG: Corrected to ${transactionsToInsert.length} unique transactions before insert.`);
        }
        console.log('DEBUG: Transactions to insert after final check (first 5):', JSON.stringify(transactionsToInsert.slice(0, 5), null, 2));
        console.log('DEBUG: Final count of transactions to insert after all checks:', transactionsToInsert.length);

        // 5. Insert only the new, enriched transactions
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
