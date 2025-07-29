import { createClient } from '@supabase/supabase-js';
import { HDBSCAN } from 'apr144-hdbscanjs';

// Функция для нормализации данных (Z-score стандартизация)
function normalizeFeatures(data) {
    if (!data || data.length === 0 || !data[0]) {
        return [];
    }
    const numFeatures = data[0].length;
    const numSamples = data.length;
    const means = new Array(numFeatures).fill(0);
    const stdDevs = new Array(numFeatures).fill(0);

    for (let i = 0; i < numSamples; i++) {
        for (let j = 0; j < numFeatures; j++) {
            means[j] += data[i][j];
        }
    }
    for (let j = 0; j < numFeatures; j++) {
        means[j] /= numSamples;
    }

    for (let i = 0; i < numSamples; i++) {
        for (let j = 0; j < numFeatures; j++) {
            stdDevs[j] += Math.pow(data[i][j] - means[j], 2);
        }
    }
    for (let j = 0; j < numFeatures; j++) {
        stdDevs[j] = Math.sqrt(stdDevs[j] / numSamples);
    }

    const normalizedData = data.map(sample => {
        return sample.map((value, j) => {
            return stdDevs[j] !== 0 ? (value - means[j]) / stdDevs[j] : 0;
        });
    });

    return normalizedData;
}

export async function runClustering(supabase, { minClusterSize = 5, minSamples = 3, normalize = true } = {}) {
    try {
        console.log('Starting background clustering process...');
        const { data: transactions, error: fetchError } = await supabase.rpc('get_unclustered_transactions');

        if (fetchError) {
            console.error('[Clustering] Supabase RPC error:', fetchError.message);
            return;
        }

        if (!transactions || transactions.length === 0) {
            console.log('[Clustering] No new transactions to cluster.');
            return;
        }
        
        console.log(`[Clustering] Found ${transactions.length} unclustered transactions.`);

        if (transactions.length < minClusterSize) {
            console.log(`[Clustering] Not enough transactions (${transactions.length}) to meet minClusterSize (${minClusterSize}).`);
            return;
        }

        const embeddings = transactions.map(t => t.description_embedding);
        
        // Проверка на null эмбеддинги
        if (embeddings.some(e => e === null)) {
            console.error('[Clustering] Error: Found null embeddings in transactions returned from DB.');
            return;
        }

        console.log('[Clustering] Normalizing features...');
        const pointsToCluster = normalize ? normalizeFeatures(embeddings) : embeddings;

        console.log('[Clustering] Starting HDBSCAN.fit...');
        const clusterer = new HDBSCAN({
            minClusterSize: parseInt(minClusterSize, 10),
            minSamples: parseInt(minSamples, 10)
        });
        const labels = clusterer.fit(pointsToCluster);
        console.log('[Clustering] HDBSCAN.fit complete.');

        const clustersToInsert = labels.map((label, index) => ({
            transaction_id: transactions[index].id,
            cluster_id: label
        }));

        console.log(`[Clustering] Inserting ${clustersToInsert.length} cluster entries...`);
        const { error: insertError } = await supabase
            .from('transaction_clusters')
            .insert(clustersToInsert);

        if (insertError) {
            console.error('[Clustering] Error inserting transaction clusters:', insertError.message);
        } else {
            console.log(`[Clustering] Automatic clustering complete. Clustered ${transactions.length} transactions.`);
        }

    } catch (error) {
        console.error('[Clustering] Unhandled error during automatic clustering:', error.message, error.stack);
    }
}
