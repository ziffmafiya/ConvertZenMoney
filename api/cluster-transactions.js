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
            .select('id, date, outcome, income, description_embedding');

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
            
            // Нормализация outcome и income
            // Для простоты используем Min-Max Scaling.
            // В реальном приложении нужно рассчитать min/max по всему набору данных.
            // Здесь используем примерные диапазоны или можно получить их динамически.
            const maxOutcome = 10000; // Примерное максимальное значение для outcome
            const maxIncome = 10000;  // Примерное максимальное значение для income

            const normalizedOutcome = t.outcome ? (t.outcome / maxOutcome) : 0;
            const normalizedIncome = t.income ? (t.income / maxIncome) : 0;

            // Конкатенация эмбеддингов и нормализованных числовых значений
            return [...embedding, normalizedOutcome, normalizedIncome];
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
        // 3. Применение DBSCAN
        // Параметры DBSCAN: eps (радиус окрестности) и minPts (минимальное количество точек в окрестности)
        // Эти значения требуют настройки в зависимости от ваших данных.
        // Если все транзакции помечены как шум (-1), попробуйте увеличить eps.
        // Если все транзакции попадают в один большой кластер, попробуйте уменьшить eps.
        const dbscan = new DBSCAN();
        const eps = 1.0; // Увеличено значение, попробуйте 0.5, 1.0, 2.0, 5.0 и т.д.
        const minPts = 3; // Уменьшено значение, попробуйте 2, 3, 5 и т.д.

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
            date: t.date, // Включаем дату, так как она может быть NOT NULL
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
