import { createClient } from '@supabase/supabase-js';

// Эта функция является ядром системы обнаружения аномалий в транзакциях.
export default async function handler(req, res) {
    // Обработчик принимает только GET-запросы. Это удобно для запуска через Cron Job или вручную.
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Получаем ключи доступа к Supabase из переменных окружения.
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Проверяем наличие ключей.
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    // Создаем клиент Supabase.
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Шаг 1: Получаем все транзакции с расходами.
        const { data: transactions, error: fetchError } = await supabase
            .from('transactions')
            .select('*') // Выбираем все поля, чтобы избежать ошибок с ограничениями NOT NULL.
            .not('outcome', 'is', null)
            .gt('outcome', 0);

        if (fetchError) {
            console.error('Supabase fetch error:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        // Шаг 2: Группируем транзакции по категориям для анализа.
        const transactionsByCategory = transactions.reduce((acc, t) => {
            if (!acc[t.category_name]) {
                acc[t.category_name] = [];
            }
            acc[t.category_name].push(t);
            return acc;
        }, {});

        const anomalyUpdates = []; // Массив для хранения обновлений аномальных транзакций.

        // Шаг 3: Анализируем каждую категорию на наличие аномалий.
        for (const category in transactionsByCategory) {
            const categoryTransactions = transactionsByCategory[category];
            const outcomes = categoryTransactions.map(t => t.outcome);

            // Пропускаем категории с малым количеством транзакций для более точной статистики.
            if (outcomes.length < 5) {
                continue;
            }

            // Вычисляем среднее значение и стандартное отклонение для текущей категории.
            const sum = outcomes.reduce((a, b) => a + b, 0);
            const avg = sum / outcomes.length;
            const stddev = Math.sqrt(outcomes.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / outcomes.length);

            // Определяем порог аномалии. Классический подход: среднее + 3 стандартных отклонения.
            const anomalyThreshold = avg + (3 * stddev);

            // Шаг 4: Ищем транзакции, превышающие порог аномалии.
            for (const t of categoryTransactions) {
                if (t.outcome > anomalyThreshold) {
                    // Создаем полный объект для upsert, чтобы удовлетворить ограничения NOT NULL в базе данных.
                    const updateRecord = {
                        ...t, // Копируем все существующие поля транзакции.
                        is_anomaly: true,
                        anomaly_reason: `Сумма ${t.outcome.toFixed(2)} значительно превышает среднюю (${avg.toFixed(2)}) для категории "${category}".`
                    };
                    anomalyUpdates.push(updateRecord);
                }
            }
        }

        // Шаг 5: Обновляем транзакции, помеченные как аномальные, в базе данных.
        if (anomalyUpdates.length > 0) {
            const { error: updateError } = await supabase
                .from('transactions')
                .upsert(anomalyUpdates);

            if (updateError) {
                console.error('Supabase update error:', updateError);
                return res.status(500).json({ error: updateError.message });
            }
        }

        // Возвращаем успешный ответ с результатами.
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
