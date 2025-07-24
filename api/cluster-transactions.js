import { createClient } from '@supabase/supabase-js';
import { DBSCAN } from 'density-clustering';
import { PCA } from 'ml-pca';

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

        // 2. Подготовка данных для DBSCAN
        // Объединяем outcome, income и description_embedding в один вектор.
        // Важно: необходимо нормализовать outcome и income, чтобы они не доминировали.
        const dataForClustering = transactions.map(t => {
            const embedding = Array.isArray(t.description_embedding) ? t.description_embedding : [];
            
            // Убедимся, что все элементы эмбеддинга являются числами
            const numericEmbedding = embedding.map(val => typeof val === 'number' ? val : 0);

            // Нормализация outcome и income
            // Для простоты используем Min-Max Scaling.
            // В реальном приложении нужно рассчитать min/max по всему набору данных.
            // Здесь используем примерные диапазоны или можно получить их динамически.
            const maxOutcome = 10000; // Примерное максимальное значение для outcome
            const maxIncome = 10000;  // Примерное максимальное значение для income

            let normalizedOutcome = 0;
            if (typeof t.outcome === 'number' && !isNaN(t.outcome) && maxOutcome !== 0) {
                normalizedOutcome = t.outcome / maxOutcome;
            }

            let normalizedIncome = 0;
            if (typeof t.income === 'number' && !isNaN(t.income) && maxIncome !== 0) {
                normalizedIncome = t.income / maxIncome;
            }

            // Конкатенация эмбеддингов и нормализованных числовых значений
            return [...numericEmbedding, normalizedOutcome, normalizedIncome];
        });

        // 3. Уменьшение размерности с помощью PCA
        // Уменьшаем до 3 компонент. Это число может быть настроено.
        const pca = new PCA(dataForClustering);
        // Метод для получения преобразованных данных обычно называется predict или transform.
        // Попробуем predict. Если не сработает, возможно, transform.
        const reducedData = pca.transform(dataForClustering, { nComponents: 3 }); // Получаем 3 главные компоненты

        // 4. Применение DBSCAN к уменьшенным данным
        // Параметры DBSCAN: eps (радиус окрестности) и minPts (минимальное количество точек в окрестности)
        // Эти значения требуют настройки в зависимости от ваших данных и уменьшенной размерности.
        // После уменьшения размерности, eps, вероятно, потребуется уменьшить.
        const dbscan = new DBSCAN();
        const eps = 0.5; // Примерное значение для уменьшенных данных, требует настройки
        const minPts = 5; // Примерное значение, требует настройки

        const clusters = dbscan.run(reducedData, eps, minPts);

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
