import { createClient } from '@supabase/supabase-js';

// Вспомогательная функция для получения предыдущего месяца и года (не используется напрямую в текущей реализации, но может быть полезна)
function getPreviousMonth(year, month) {
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1
    };
}

// Асинхронная функция для генерации названия привычки на основе наиболее частого получателя
async function generateHabitName(transactions) {
    const payeeCounts = transactions.reduce((acc, t) => {
        acc[t.payee] = (acc[t.payee] || 0) + 1;
        return acc;
    }, {});
    const mostCommonPayee = Object.keys(payeeCounts).sort((a, b) => payeeCounts[b] - payeeCounts[a])[0];
    return `Привычка: ${mostCommonPayee}`;
}

// Основной обработчик API-запроса для анализа привычек
export default async function handler(req, res) {
    // Разрешаем только GET-запросы
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Извлекаем месяц и год из параметров запроса
    const { month, year } = req.query;

    // Проверяем, что обязательные параметры (год и месяц) присутствуют
    if (!year || !month) {
        return res.status(400).json({ error: 'Year and month are required' });
    }

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
        // Определяем диапазон дат для текущего месяца
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
        
        // Получаем транзакции за указанный период, исключая те, у которых нет эмбеддингов
        const { data: currentTransactions, error: currentError } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .not('description_embedding', 'is', null);

        // Обрабатываем возможные ошибки при запросе к Supabase
        if (currentError) {
            console.error('Supabase select error (current):', currentError);
            return res.status(500).json({ error: currentError.message });
        }

        // Выполняем анализ привычек на основе векторных эмбеддингов
        const habits = await analyzeHabitsWithEmbeddings(currentTransactions, supabase);

        // Отправляем найденные привычки в ответе
        res.status(200).json({ habits });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Асинхронная функция для анализа привычек на основе векторных эмбеддингов
async function analyzeHabitsWithEmbeddings(transactions, supabase) {
    const habits = {};
    // Множество для отслеживания уже обработанных транзакций, чтобы избежать дублирования
    let processedTransactionIds = new Set(); 

    // Итерируемся по каждой транзакции для поиска похожих
    for (const transaction of transactions) {
        // Пропускаем транзакции, которые уже были включены в какую-либо привычку
        if (processedTransactionIds.has(transaction.id)) {
            continue;
        }

        // Вызываем RPC-функцию Supabase для поиска семантически похожих транзакций
        const { data: similarTransactions, error } = await supabase.rpc('match_transactions', {
            query_embedding: transaction.description_embedding,
            match_threshold: 0.85, // Порог схожести (0.0 - 1.0), можно настроить
            match_count: 10 // Максимальное количество возвращаемых похожих транзакций
        });
        
        // Обрабатываем ошибки при поиске похожих транзакций
        if (error) {
            console.error('Ошибка при поиске похожих транзакций:', error);
            continue;
        }

        // Если найдено достаточно похожих транзакций, считаем это потенциальной привычкой
        if (similarTransactions.length > 3) { // Порог для определения привычки (например, более 3 похожих транзакций)
            // Фильтруем похожие транзакции, чтобы исключить уже обработанные
            const habitTransactions = similarTransactions.filter(t => !processedTransactionIds.has(t.id));
            
            // Если после фильтрации осталось достаточно транзакций, формируем привычку
            if (habitTransactions.length > 3) {
                // Генерируем название для привычки на основе наиболее частого получателя
                const habitName = await generateHabitName(habitTransactions);
                // Вычисляем общую сумму трат для этой привычки
                const totalSpent = habitTransactions.reduce((sum, t) => sum + t.outcome, 0);
                
                // Формируем объект, описывающий привычку
                habits[habitName] = {
                    count: habitTransactions.length, // Количество транзакций, составляющих привычку
                    totalSpent: totalSpent.toFixed(2), // Общая сумма трат
                    avgSpent: (totalSpent / habitTransactions.length).toFixed(2), // Средняя сумма траты
                    category: habitTransactions[0].category_name, // Категория первой транзакции (предполагаем, что все транзакции привычки одной категории)
                    transactions: habitTransactions.map(t => ({ date: t.date, amount: t.outcome })), // Детали транзакций
                    trend: 0 // Заглушка для тренда; для реального расчета нужен анализ предыдущих периодов
                };

                // Добавляем ID всех транзакций, включенных в эту привычку, в множество обработанных
                habitTransactions.forEach(t => processedTransactionIds.add(t.id));
            }
        }
    }

    return habits;
}
