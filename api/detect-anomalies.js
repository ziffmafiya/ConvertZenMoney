// Импорт Supabase клиента для работы с базой данных
import { createClient } from '@supabase/supabase-js';

/**
 * Основной обработчик для обнаружения аномалий в финансовых транзакциях
 * Эта функция является ядром системы обнаружения аномалий в транзакциях
 * Использует статистический анализ для выявления необычных трат по категориям
 * @param {object} req - Объект запроса
 * @param {object} res - Объект ответа
 */
export default async function handler(req, res) {

    // Получаем ключи доступа к Supabase из переменных окружения
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Проверяем наличие обязательных ключей конфигурации
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    // Создаем клиент Supabase для подключения к базе данных
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        const { year, month } = req.query;

        if (!year || !month) {
            return res.status(400).json({ error: 'Year and month are required for anomaly detection.' });
        }

        // Шаг 1: Получаем транзакции с расходами для анализа за выбранный месяц и год
        // Выбираем только транзакции с положительными суммами расходов
        const { data: transactions, error: fetchError } = await supabase
            .from('transactions')
            .select('*') // Выбираем все поля, чтобы избежать ошибок с ограничениями NOT NULL
            .not('outcome', 'is', null)
            .gt('outcome', 0)
            .gte('date', `${year}-${month}-01`)
            .lte('date', `${year}-${month}-${new Date(year, month, 0).getDate()}`); // Учитываем последний день месяца

        if (fetchError) {
            console.error('Supabase fetch error:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        // Шаг 2: Группируем транзакции по категориям для статистического анализа
        // Это позволяет анализировать аномалии в контексте каждой категории трат
        const transactionsByCategory = transactions.reduce((acc, t) => {
            if (!acc[t.category_name]) {
                acc[t.category_name] = [];
            }
            acc[t.category_name].push(t);
            return acc;
        }, {});

        const anomalyUpdates = []; // Массив для хранения обновлений аномальных транзакций

        // Шаг 3: Анализируем каждую категорию на наличие аномалий
        for (const category in transactionsByCategory) {
            const categoryTransactions = transactionsByCategory[category];
            const outcomes = categoryTransactions.map(t => t.outcome);

            // Пропускаем категории с малым количеством транзакций для более точной статистики
            // Нужно минимум 5 транзакций для надежного статистического анализа
            if (outcomes.length < 5) {
                continue;
            }

            // Вычисляем статистические показатели для текущей категории
            const sum = outcomes.reduce((a, b) => a + b, 0);
            const avg = sum / outcomes.length; // Среднее значение трат в категории
            // Вычисляем стандартное отклонение для определения разброса значений
            const stddev = Math.sqrt(outcomes.map(x => Math.pow(x - avg, 2)).reduce((a, b) => a + b, 0) / outcomes.length);

            // Определяем порог аномалии используя классический статистический подход
            // Классический подход: среднее + 3 стандартных отклонения (правило 3-сигма)
            const anomalyThreshold = avg + (3 * stddev);

            // Шаг 4: Ищем транзакции, превышающие порог аномалии
            for (const t of categoryTransactions) {
                if (t.outcome > anomalyThreshold) {
                    // Создаем полный объект для upsert, чтобы удовлетворить ограничения NOT NULL в базе данных
                    const updateRecord = {
                        ...t, // Копируем все существующие поля транзакции
                        is_anomaly: true, // Помечаем как аномалию
                        anomaly_reason: `Сумма ${t.outcome.toFixed(2)} значительно превышает среднюю (${avg.toFixed(2)}) для категории "${category}".`
                    };
                    anomalyUpdates.push(updateRecord);
                }
            }
        }

        // Шаг 5: Обновляем транзакции, помеченные как аномальные, в базе данных
        if (anomalyUpdates.length > 0) {
            const { error: updateError } = await supabase
                .from('transactions')
                .upsert(anomalyUpdates); // Используем upsert для обновления существующих записей

            if (updateError) {
                console.error('Supabase update error:', updateError);
                return res.status(500).json({ error: updateError.message });
            }
        }

        // Возвращаем успешный ответ с результатами анализа
        res.status(200).json({ 
            message: 'Anomaly detection completed.',
            anomalies_found: anomalyUpdates.length,
            details: anomalyUpdates 
        });

    } catch (error) {
        // Обработка непредвиденных ошибок сервера
        console.error('Unhandled server error during anomaly detection:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
