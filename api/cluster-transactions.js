import { createClient } from '@supabase/supabase-js';

// Основной обработчик API-запроса для кластеризации транзакций
export default async function handler(req, res) {
    // Разрешаем только POST-запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Получаем параметры кластеризации из тела запроса
    const { minClusterSize = 5, minSamples = 3, epsilon = 0.5 } = req.body;

    // Получаем URL и ключ Supabase из переменных окружения
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Проверяем наличие необходимых переменных окружения
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    // Инициализируем клиент Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log('Starting transaction clustering...');
        const startTime = performance.now();

        // Вызываем Edge Function для кластеризации
        const { data, error } = await supabase.functions.invoke('cluster_embeddings', {
            body: {
                minClusterSize,
                minSamples,
                epsilon
            }
        });

        const endTime = performance.now();
        const duration = Math.round(endTime - startTime);

        if (error) {
            console.error('Edge function error:', error);
            return res.status(500).json({ 
                error: 'Clustering failed', 
                details: error.message,
                duration 
            });
        }

        console.log(`Clustering completed in ${duration}ms:`, data);

        // Возвращаем результаты кластеризации
        res.status(200).json({
            success: true,
            clusters: data.clusters,
            noise: data.noise,
            total: data.total,
            clusterStats: data.clusterStats,
            duration
        });

    } catch (error) {
        console.error('Unexpected server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
} 