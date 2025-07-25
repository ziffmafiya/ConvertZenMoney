import { createClient } from '@supabase/supabase-js';

// Вспомогательная функция для получения предыдущего месяца и года
function getPreviousMonth(year, month) {
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1
    };
}

// Асинхронная функция для генерации названия привычки
async function generateHabitName(transactions, supabase) {
    // В идеале эта функция должна вызывать эндпоинт глубокого анализа,
    // но для простоты мы генерируем название на основе самого частого получателя.
    // Реальная реализация потребовала бы более сложного подхода.
    const payeeCounts = transactions.reduce((acc, t) => {
        acc[t.payee] = (acc[t.payee] || 0) + 1;
        return acc;
    }, {});
    const mostCommonPayee = Object.keys(payeeCounts).sort((a, b) => payeeCounts[b] - payeeCounts[a])[0];
    return `Привычка: ${mostCommonPayee}`;
}

// Основной обработчик запроса
export default async function handler(req, res) {
    // Проверяем, что метод запроса - GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Получаем месяц и год из параметров запроса
    const { month, year } = req.query;

    // Проверяем наличие обязательных параметров
    if (!year || !month) {
        return res.status(400).json({ error: 'Year and month are required' });
    }

    // Получаем URL и ключ для доступа к Supabase из переменных окружения
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Проверяем, что переменные окружения заданы
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    // Создаем клиент Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Определяем начальную и конечную даты для запроса
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
        
        // Получаем транзакции за текущий период, у которых есть эмбеддинги
        const { data: currentTransactions, error: currentError } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .not('description_embedding', 'is', null);

        // Обрабатываем ошибку при запросе
        if (currentError) {
            console.error('Supabase select error (current):', currentError);
            return res.status(500).json({ error: currentError.message });
        }

        // Анализируем привычки с использованием эмбеддингов
        const habits = await analyzeHabitsWithEmbeddings(currentTransactions, supabase);

        // Возвращаем результат
        res.status(200).json({ habits });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Асинхронная функция для анализа привычек с использованием эмбеддингов
async function analyzeHabitsWithEmbeddings(transactions, supabase) {
    const habits = {};
    let processedTransactionIds = new Set(); // Множество для отслеживания уже обработанных транзакций

    // Итерируемся по каждой транзакции
    for (const transaction of transactions) {
        // Пропускаем уже обработанные транзакции
        if (processedTransactionIds.has(transaction.id)) {
            continue;
        }

        // Вызываем RPC-функцию для поиска похожих транзакций
        const { data: similarTransactions, error } = await supabase.rpc('match_transactions', {
            query_embedding: transaction.description_embedding,
            match_threshold: 0.85, // Порог схожести, можно настраивать
            match_count: 10 // Количество возвращаемых похожих транзакций
        });
        
        if (error) {
            console.error('Error matching transactions:', error);
            continue;
        }

        // Если найдено достаточно похожих транзакций, считаем это привычкой
        if (similarTransactions.length > 3) { // Порог для определения привычки
            const habitTransactions = similarTransactions.filter(t => !processedTransactionIds.has(t.id));
            
            if (habitTransactions.length > 3) {
                // Генерируем название привычки
                const habitName = await generateHabitName(habitTransactions, supabase);
                // Считаем общую сумму трат
                const totalSpent = habitTransactions.reduce((sum, t) => sum + t.outcome, 0);
                
                // Формируем объект привычки
                habits[habitName] = {
                    count: habitTransactions.length,
                    totalSpent: totalSpent.toFixed(2),
                    avgSpent: (totalSpent / habitTransactions.length).toFixed(2),
                    category: habitTransactions[0].category_name,
                    transactions: habitTransactions.map(t => ({ date: t.date, amount: t.outcome })),
                    trend: 0 // Расчет тренда требует данных за предыдущий месяц
                };

                // Добавляем ID транзакций привычки в множество обработанных
                habitTransactions.forEach(t => processedTransactionIds.add(t.id));
            }
        }
    }

    return habits;
}
