import { createClient } from '@supabase/supabase-js';
import { DBSCAN } from 'density-clustering';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Fetch transaction data from Supabase
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, description_embedding'); // Only fetch id and description_embedding

    if (fetchError) {
      console.error('Error fetching transactions from Supabase:', fetchError);
      return res.status(500).json({ error: `Failed to fetch transactions: ${fetchError.message || fetchError.toString()}` });
    }

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({ message: 'No transactions to cluster.' });
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

    // Filter out transactions without valid embeddings and prepare data for clustering
    const transactionsWithEmbeddings = parsedTransactions.filter(t => t.description_embedding && Array.isArray(t.description_embedding) && t.description_embedding.length > 0);

    if (transactionsWithEmbeddings.length === 0) {
      // If no transactions with valid embeddings, return a sample of raw embeddings for debugging
      const sampleEmbeddings = parsedTransactions.slice(0, 5).map(t => ({
        id: t.id,
        description_embedding: t.description_embedding,
        type: typeof t.description_embedding,
        isArray: Array.isArray(t.description_embedding),
        length: Array.isArray(t.description_embedding) ? t.description_embedding.length : null
      }));
      return res.status(200).json({
        message: 'No transactions with embeddings to cluster.',
        debugInfo: {
          totalTransactionsFetched: transactions.length,
          sampleEmbeddings: sampleEmbeddings
        }
      });
    }

    // 2. Data Preprocessing
    // Use only the embedding for clustering as requested.
    // If 'amount' or 'created_at' were to be used alongside embeddings,
    // proper scaling would be crucial due to different value ranges.
    const data = transactionsWithEmbeddings.map(t => t.description_embedding);

    // 3. Apply DBSCAN Clustering
    // Parameters for DBSCAN: eps (epsilon) and minPts (minimum points)
    // These values will likely need tuning based on your data and embedding space.
    // For demonstration, using arbitrary values.
    const dbscan = new DBSCAN();
    // Note: The 'density-clustering' library's DBSCAN expects a distance function
    // if the data is not simple 2D points. For high-dimensional embeddings,
    // a custom distance function (e.g., cosine similarity converted to distance)
    // might be more appropriate. For now, it will use Euclidean distance.
    const clusters = dbscan.run(data, 0.5, 5); // eps (distance), minPts (min points in cluster)

    // Map cluster results back to original transactionsWithEmbeddings
    const updates = [];
    clusters.forEach((cluster, clusterId) => {
      cluster.forEach(dataIndex => {
        updates.push({
          id: transactionsWithEmbeddings[dataIndex].id,
          cluster: clusterId
        });
      });
    });

    // Handle noise points (not assigned to any cluster from transactionsWithEmbeddings)
    const assignedTransactionIds = new Set(updates.map(u => u.id));
    transactionsWithEmbeddings.forEach(t => {
      if (!assignedTransactionIds.has(t.id)) {
        updates.push({
          id: t.id,
          cluster: -1 // Assign -1 for noise points
        });
      }
    });

    // Also handle transactions that originally had no embeddings
    transactions.forEach(t => {
      if (!t.description_embedding || !Array.isArray(t.description_embedding) || t.description_embedding.length === 0) {
        updates.push({
          id: t.id,
          cluster: -1 // Assign -1 for transactions without embeddings
        });
      }
    });


    // 4. Store clustering results in Supabase
    const { error: updateError } = await supabase
      .from('transactions')
      .upsert(updates, { onConflict: 'id' }); // Use upsert to update existing records

    if (updateError) {
      console.error('Error updating transactions with clusters in Supabase:', updateError);
      return res.status(500).json({ error: `Failed to update transactions with clusters: ${updateError.message || updateError.toString()}` });
    }

    res.status(200).json({ message: 'Transactions clustered successfully!', clusters: updates.length });

  } catch (error) {
    console.error('Unhandled error during clustering process:', error);
    res.status(500).json({ error: `An unexpected error occurred: ${error.message || error.toString()}` });
  }
}
