import { createClient } from '@supabase/supabase-js';
import { DBSCAN } from 'density-clustering';
import { TSNE } from 'tsne-js'; // Import TSNE

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { eps, minPts } = req.body;

  if (typeof eps !== 'number' || typeof minPts !== 'number' || eps <= 0 || minPts <= 0) {
    return res.status(400).json({ error: 'Invalid eps or minPts parameters. They must be positive numbers.' });
  }

  try {
    // 1. Clear existing cluster data to ensure overwrite
    const { error: clearError } = await supabase
      .from('transactions')
      .update({ cluster_id: null, embedding_tsne_x: null, embedding_tsne_y: null })
      .not('cluster_id', 'is', null); // Only clear if not already null

    if (clearError) {
      console.error('Error clearing existing cluster data:', clearError);
      // Do not return error, continue with clustering, but log it
    }

    // 2. Fetch transaction data from Supabase
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, description_embedding');

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
      return res.status(200).json({ message: 'No transactions with valid embeddings to cluster.' });
    }

    const embeddings = transactionsWithEmbeddings.map(t => t.description_embedding);

    // 3. Apply DBSCAN Clustering
    const dbscan = new DBSCAN();
    const clusters = dbscan.run(embeddings, eps, minPts);

    // 4. Perform t-SNE dimensionality reduction
    const tsne = new TSNE({
      dim: 2, // Output dimension (2D for visualization)
      perplexity: 30.0, // Typical values are between 5 and 50
      earlyExaggeration: 4.0, // Typical values are between 4 and 12
      learningRate: 100.0, // Typical values are between 10 and 1000
      nIter: 1000, // Number of iterations
      metric: 'euclidean' // or 'cosine'
    });

    tsne.init({
      data: embeddings,
      type: 'dense'
    });

    // Run t-SNE computation
    const tsneOutput = tsne.run(); // This will run for nIter iterations

    // Prepare updates for Supabase
    const updates = [];
    const assignedTransactionIds = new Set();

    clusters.forEach((cluster, clusterId) => {
      cluster.forEach(dataIndex => {
        const transactionId = transactionsWithEmbeddings[dataIndex].id;
        const tsne_x = tsneOutput[dataIndex][0];
        const tsne_y = tsneOutput[dataIndex][1];
        updates.push({
          id: transactionId,
          cluster_id: clusterId,
          embedding_tsne_x: tsne_x,
          embedding_tsne_y: tsne_y
        });
        assignedTransactionIds.add(transactionId);
      });
    });

    // Handle noise points (not assigned to any cluster by DBSCAN)
    transactionsWithEmbeddings.forEach((t, index) => {
      if (!assignedTransactionIds.has(t.id)) {
        updates.push({
          id: t.id,
          cluster_id: -1, // Assign -1 for noise points
          embedding_tsne_x: tsneOutput[index][0],
          embedding_tsne_y: tsneOutput[index][1]
        });
        assignedTransactionIds.add(t.id);
      }
    });

    // Handle transactions that originally had no embeddings (ensure their cluster_id is null or -1)
    transactions.forEach(t => {
      if (!assignedTransactionIds.has(t.id)) {
        updates.push({
          id: t.id,
          cluster_id: null, // Or -1 if you prefer to explicitly mark them as unclustered
          embedding_tsne_x: null,
          embedding_tsne_y: null
        });
      }
    });

    // 5. Store clustering and t-SNE results in Supabase
    let successfulUpdates = 0;
    let updateErrors = [];

    // Supabase recommends batching updates for performance
    const batchSize = 1000;
    for (let i = 0; i < updates.length; i += batchSize) {
      const batch = updates.slice(i, i + batchSize);
      const { error: batchUpdateError } = await supabase
        .from('transactions')
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false }); // Use upsert to update existing rows

      if (batchUpdateError) {
        console.error(`Error updating batch ${i / batchSize}:`, batchUpdateError);
        updateErrors.push({ batchIndex: i / batchSize, error: batchUpdateError.message });
      } else {
        successfulUpdates += batch.length;
      }
    }

    if (updateErrors.length > 0) {
      console.error('Errors occurred during batch update of transactions with clusters and TSNE:', updateErrors);
      return res.status(500).json({
        error: `Failed to update some transactions with clusters and TSNE. Total errors: ${updateErrors.length}`,
        details: updateErrors.slice(0, 5)
      });
    }

    res.status(200).json({ message: `Transactions clustered and TSNE-reduced successfully! Updated ${successfulUpdates} transactions.`, totalClusters: clusters.length });

  } catch (error) {
    console.error('Unhandled error during clustering process:', error);
    res.status(500).json({ error: `An unexpected error occurred: ${error.message || error.toString()}` });
  }
}
