import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Function to calculate Euclidean distance between two vectors
function euclideanDistance(vec1, vec2) {
  if (vec1.length !== vec2.length) {
    throw new Error("Vectors must have the same dimension");
  }
  let sum = 0;
  for (let i = 0; i < vec1.length; i++) {
    sum += (vec1[i] - vec2[i]) ** 2;
  }
  return Math.sqrt(sum);
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const minPts = 3; // Fixed minPts as per the task description
  const k = minPts - 1; // k-th nearest neighbor (4th in this case)

  try {
    // 1. Fetch transaction data from Supabase
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, description_embedding');

    if (fetchError) {
      console.error('Error fetching transactions from Supabase:', fetchError);
      return res.status(500).json({ error: `Failed to fetch transactions: ${fetchError.message || fetchError.toString()}` });
    }

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({ message: 'No transactions to process.' });
    }

    // Parse description_embedding from string to array of numbers
    const parsedTransactions = transactions.map(t => {
      let parsedEmbedding = null;
      if (typeof t.description_embedding === 'string') {
        try {
          parsedEmbedding = JSON.parse(t.description_embedding);
        } catch (e) {
          console.error(`Error parsing embedding for transaction ${t.id}:`, e);
        }
      } else if (Array.isArray(t.description_embedding)) {
        parsedEmbedding = t.description_embedding;
      }
      return { ...t, description_embedding: parsedEmbedding };
    });

    // Filter out transactions without valid embeddings
    const transactionsWithEmbeddings = parsedTransactions.filter(t => t.description_embedding && Array.isArray(t.description_embedding) && t.description_embedding.length > 0);

    if (transactionsWithEmbeddings.length === 0) {
      return res.status(200).json({ message: 'No transactions with valid embeddings to calculate k-distances.' });
    }

    if (transactionsWithEmbeddings.length <= k) {
        return res.status(200).json({ message: `Not enough transactions (${transactionsWithEmbeddings.length}) to find the ${k}-th nearest neighbor. Need at least ${k + 1} transactions.` });
    }

    const embeddings = transactionsWithEmbeddings.map(t => t.description_embedding);
    const kDistances = [];

    // Calculate distance to the k-th nearest neighbor for each point
    for (let i = 0; i < embeddings.length; i++) {
      const currentEmbedding = embeddings[i];
      const distances = [];

      for (let j = 0; j < embeddings.length; j++) {
        if (i === j) continue; // Don't calculate distance to itself
        distances.push(euclideanDistance(currentEmbedding, embeddings[j]));
      }

      // Sort distances and get the k-th (minPts-1) distance
      distances.sort((a, b) => a - b);
      if (distances.length > k) {
        kDistances.push(distances[k]);
      }
    }

    // Sort all k-distances in ascending order
    kDistances.sort((a, b) => a - b);

    res.status(200).json({ kDistances });

  } catch (error) {
    console.error('Unhandled error during k-distance calculation:', error);
    res.status(500).json({ error: `An unexpected error occurred: ${error.message || error.toString()}` });
  }
}
