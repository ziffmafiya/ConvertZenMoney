import { createClient } from '@supabase/supabase-js';
import { TSNE } from 'tsne-js';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    // 1. Fetch transaction data from Supabase
    const { data: transactions, error: fetchError } = await supabase
      .from('transactions')
      .select('id, description_embedding, cluster'); // Fetch cluster ID as well

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
      return res.status(200).json({ message: 'No transactions with valid embeddings for t-SNE.' });
    }

    const embeddings = transactionsWithEmbeddings.map(t => t.description_embedding);

    // 2. Apply t-SNE for dimensionality reduction
    const tsne = new TSNE({
      dim: 2, // Reduce to 2 dimensions
      perplexity: Math.min(30, embeddings.length - 1), // Perplexity should be less than data points
      earlyExaggeration: 4.0,
      learningRate: 100.0,
      nIter: 1000, // Number of iterations
      metric: 'euclidean' // Use Euclidean distance
    });

    tsne.init({
      data: embeddings,
      type: 'dense'
    });

    // Run t-SNE computation
    const tsneEmbeddings = await new Promise(resolve => {
      tsne.on('progressIter', function(iter) {
        // console.log("t-SNE iteration: ", iter);
      });
      tsne.on('progressStatus', function(status) {
        // console.log("t-SNE status: ", status);
      });
      tsne.on('finishedIter', function(iter) {
        resolve(tsne.getSolution());
      });
      tsne.run();
    });

    // Combine original transaction data with t-SNE results
    const result = transactionsWithEmbeddings.map((t, index) => ({
      id: t.id,
      cluster: t.cluster, // Include cluster ID
      x: tsneEmbeddings[index][0],
      y: tsneEmbeddings[index][1]
    }));

    res.status(200).json({ tsneData: result });

  } catch (error) {
    console.error('Unhandled error during t-SNE calculation:', error);
    res.status(500).json({ error: `An unexpected error occurred: ${error.message || error.toString()}` });
  }
}
