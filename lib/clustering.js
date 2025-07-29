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
        console.log('Starting clustering process...');
        const { data: transactions, error: fetchError } = await supabase.rpc('get_unclustered_transactions');

        if (fetchError) {
            console.error('Error fetching unclustered transactions for clustering:', fetchError);
            return;
        }

        if (!transactions || transactions.length < minClusterSize) {
            console.log('Not enough new transactions to cluster.');
            return;
        }

        const embeddings = transactions.map(t => t.description_embedding);
        const pointsToCluster = normalize ? normalizeFeatures(embeddings) : embeddings;

        const clusterer = new HDBSCAN({
            minClusterSize: parseInt(minClusterSize, 10),
            minSamples: parseInt(minSamples, 10)
        });

        const labels = clusterer.fit(pointsToCluster);

        const clustersToInsert = labels.map((label, index) => ({
            transaction_id: transactions[index].id,
            cluster_id: label
        }));

        const { error: insertError } = await supabase
            .from('transaction_clusters')
            .insert(clustersToInsert);

        if (insertError) {
            console.error('Error inserting transaction clusters during automatic run:', insertError);
        } else {
            console.log(`Automatic clustering complete. Clustered ${transactions.length} transactions.`);
        }

    } catch (error) {
        console.error('Unhandled error during automatic clustering:', error);
    }
}
