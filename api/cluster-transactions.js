import { createClient } from '@supabase/supabase-js';
import { HDBSCAN } from 'hdbscan';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { transactionIds } = req.body;
    
    if (!transactionIds || !Array.isArray(transactionIds) || transactionIds.length === 0) {
        return res.status(400).json({ error: 'Invalid transaction IDs provided' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase configuration missing' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('Starting clustering for transaction IDs:', transactionIds);
        
        // Получаем эмбендинги для указанных транзакций
        const { data: transactions, error: fetchError } = await supabase
            .from('transactions')
            .select('id, description_embedding')
            .in('id', transactionIds);
        
        console.log(`Fetched ${transactions?.length || 0} transactions for clustering`);
        
        // Проверяем, что все ID являются UUID
        if (transactionIds.some(id => !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id))) {
            console.error('Invalid UUID format in transaction IDs');
            return res.status(400).json({ error: 'Invalid transaction ID format' });
        }
        
        if (fetchError) throw fetchError;
        if (!transactions || transactions.length === 0) {
            return res.status(404).json({ error: 'No transactions found' });
        }

        // Фильтруем транзакции с валидными эмбендингами
        const validTransactions = transactions.filter(t => 
            t.description_embedding && Array.isArray(t.description_embedding)
        );

        if (validTransactions.length === 0) {
            return res.status(400).json({ error: 'No valid embeddings found' });
        }

        // Извлекаем эмбендинги для кластеризации
        const embeddings = validTransactions.map(t => t.description_embedding);
        
        // Выполняем кластеризацию
        const clusterer = new HDBSCAN({ minClusterSize: 5 });
        console.log('Running HDBSCAN clustering...');
        const clusters = clusterer.run(embeddings);
        console.log(`Clustering completed. Found ${new Set(clusters).size} clusters`);
        
        // Формируем данные для сохранения
        const clusterData = validTransactions.map((t, index) => ({
            transaction_id: t.id, // UUID
            cluster_id: clusters[index]
        }));

        // Сохраняем результаты в БД
        const { error: insertError } = await supabase
            .from('transaction_clusters')
            .insert(clusterData);
        
        if (insertError) throw insertError;
        console.log(`Saved ${clusterData.length} cluster assignments to database`);

        res.status(200).json({ 
            message: `Clustered ${validTransactions.length} transactions`,
            clusterCount: new Set(clusters).size
        });
    } catch (error) {
        console.error('Clustering error:', error);
        res.status(500).json({ error: error.message || 'Clustering failed' });
    }
}
