import { createClient } from '@supabase/supabase-js';

// Эта функция будет ядром нашей системы обнаружения аномалий.
export default async function handler(req, res) {
    // Мы будем запускать эту функцию через GET-запрос (например, через Cron Job или вручную)
    if (req.method !== 'GET') {
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
        // 1. Получаем все транзакции, у которых есть сумма расхода
        const { data: transactions, error: fetchError } = await supabase
            .from('transactions')
            .select('id, category_name, outcome')
            .not('outcome', 'is', null)
            .gt('outcome', 0);

        if (fetchError) {
            console.error('Supabase fetch error:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        // 2. Группируем транзакции по категориям
        const transactionsByCategory = transactions.reduce((acc, t) => {
            if (!acc[t.category_name]) {
                acc[t.category_name] = [];
            }
            acc[t.category_name].push(t);
            return acc;
        }, {});

        const anomalyUpdates = [];

        // 3. Анализируем каждую категорию
        for (const category in transactionsByCategory) {
            const categoryTransactions = transactionsByCategory[category];
            const outcomes = categoryTransactions.map(t => t.outcome);

            // Пропускаем категории с малым количеством транзакций для более точной статистики
            if (outcomes.length < 5) {
                continue;
            }

            // Вычисляем среднее и стандартное отклонение
            const sum = outcomes.reduce((a, b) => a + b, 0);
            const avg = sum / outcomes.length;
            const stddev = Math.sqrt(outcomes.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / outcomes.length);

            // Определяем порог аномалии (например, среднее + 3 стандартных отклонения)
            const anomalyThreshold = avg + (3 * stddev);

            // 4. Ищем аномалии в категории
            for (const t of categoryTransactions) {
                if (t.outcome > anomalyThreshold) {
                    anomalyUpdates.push({
                        id: t.id,
                        is_anomaly: true,
                        anomaly_reason: `Сумма ${t.outcome.toFixed(2)} значительно превышает среднюю (${avg.toFixed(2)}) для категории "${category}".`
                    });
                }
            }
        }

        // 5. Обновляем транзакции, помеченные как аномальные
        if (anomalyUpdates.length > 0) {
            const { error: updateError } = await supabase
                .from('transactions')
                .upsert(anomalyUpdates);

            if (updateError) {
                console.error('Supabase update error:', updateError);
                return res.status(500).json({ error: updateError.message });
            }
        }

        res.status(200).json({ 
            message: 'Anomaly detection completed.',
            anomalies_found: anomalyUpdates.length,
            details: anomalyUpdates 
        });

    } catch (error) {
        console.error('Unhandled server error during anomaly detection:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
