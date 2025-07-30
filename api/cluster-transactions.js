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
      .select('id, amount, description, created_at, description_embedding'); // Include description_embedding column

    if (fetchError) {
      console.error('Error fetching transactions:', fetchError);
      return res.status(500).json({ error: 'Failed to fetch transactions' });
    }

    if (!transactions || transactions.length === 0) {
      return res.status(200).json({ message: 'No transactions to cluster.' });
    }

    // Filter out transactions without embeddings and prepare data for clustering
    const transactionsWithEmbeddings = transactions.filter(t => t.description_embedding && Array.isArray(t.description_embedding) && t.description_embedding.length > 0);

    if (transactionsWithEmbeddings.length === 0) {
      return res.status(200).json({ message: 'No transactions with embeddings to cluster.' });
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
      console.error('Error updating transactions with clusters:', updateError);
      return res.status(500).json({ error: 'Failed to update transactions with clusters' });
    }

    res.status(200).json({ message: 'Transactions clustered successfully!', clusters: updates.length });

  } catch (error) {
    console.error('Unexpected error during clustering:', error);
    res.status(500).json({ error: 'An unexpected error occurred.' });
  }
}
