import { createClient } from '@supabase/supabase-js';
import { DBSCAN } from 'density-clustering';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // 1. Получение данных из Supabase
        const { data: transactions, error: fetchError } = await supabase
            .from('transactions')
            .select('id, outcome, income, description_embedding');

        if (fetchError) {
            console.error('Supabase fetch error:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        if (!transactions || transactions.length === 0) {
            return res.status(200).json({ message: 'No transactions to cluster.' });
        }

        // 2. Подготовка данных для HDBSCAN
        // Объединяем outcome, income и description_embedding в один вектор.
        // Важно: необходимо нормализовать outcome и income, чтобы они не доминировали.
        // Для простоты, пока не будем нормализовать, но это важный шаг для улучшения качества кластеризации.
        const dataForClustering = transactions.map(t => {
            const embedding = t.description_embedding || [];
            // Простая конкатенация. В реальном приложении нужна нормализация.
            return [...embedding, t.outcome || 0, t.income || 0];
        });

        // 3. Применение HDBSCAN
        // Параметры HDBSCAN: min_cluster_size и min_samples
        // Эти значения могут потребовать настройки в зависимости от ваших данных.
        // 3. Применение HDBSCAN
        // Параметры HDBSCAN: min_cluster_size и min_samples
        // Эти значения могут потребовать настройки в зависимости от ваших данных.
        // 3. Применение DBSCAN
        // Параметры DBSCAN: eps (радиус окрестности) и minPts (минимальное количество точек в окрестности)
        // Эти значения могут потребовать настройки в зависимости от ваших данных.
        const dbscan = new DBSCAN();
        const eps = 0.5; // Примерное значение, требует настройки
        const minPts = 5; // Примерное значение, требует настройки

        const clusters = dbscan.run(dataForClustering, eps, minPts);

        // DBSCAN возвращает массив массивов, где каждый внутренний массив - это индексы точек в кластере.
        // Точки, не вошедшие ни в один кластер, не включены в clusters.
        // Нам нужно создать массив меток, где -1 - это шум.
        const labels = new Array(transactions.length).fill(-1); // Инициализируем все как шум
        clusters.forEach((cluster, clusterId) => {
            cluster.forEach(dataIndex => {
                labels[dataIndex] = clusterId;
            });
        });

        // 4. Сохранение результатов обратно в Supabase
        // Создаем массив объектов для обновления
        const updates = transactions.map((t, index) => ({
            id: t.id,
            cluster_id: labels[index] // Добавляем метку кластера
        }));

        // Обновляем транзакции в Supabase
        const { error: updateError } = await supabase
            .from('transactions')
            .upsert(updates, { onConflict: 'id' }); // Используем upsert для обновления существующих записей

        if (updateError) {
            console.error('Supabase update error:', updateError);
            return res.status(500).json({ error: updateError.message });
        }

        res.status(200).json({
            message: `Clustering completed. ${updates.length} transactions processed.`,
            clusterLabels: labels
        });

    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
