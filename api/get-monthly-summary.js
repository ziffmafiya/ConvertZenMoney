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

// Функция для получения транзакций за определенный месяц и год
async function getTransactionsForMonth(supabase, year, month, userId) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    const { data, error } = await supabase
        .from('transactions')
        .select('outcome, income')
        .eq('user_id', userId) // Добавляем фильтрацию по user_id
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) {
        console.error(`Supabase select error for ${year}-${month}:`, error);
        throw new Error(error.message);
    }
    return data;
}

// Основной обработчик запроса
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { month, year } = req.query;

    if (!year || !month) {
        return res.status(400).json({ error: 'Year and month are required' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    // Извлекаем JWT из заголовка Authorization
    const token = req.headers.authorization?.split(' ')[1];

    const supabase = createClient(supabaseUrl, supabaseKey, {
        global: {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        },
    });

    try {
        // Получаем сессию пользователя
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('Authentication error:', userError?.message || 'User not authenticated');
            return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        }

        const userId = user.id;

        // Получаем транзакции за текущий месяц
        const currentMonthTransactions = await getTransactionsForMonth(supabase, year, month, userId);

        let currentMonthOutcome = currentMonthTransactions.reduce((sum, t) => sum + (t.outcome || 0), 0);
        let currentMonthIncome = currentMonthTransactions.reduce((sum, t) => sum + (t.income || 0), 0);
        let currentMonthDifference = currentMonthIncome - currentMonthOutcome;

        // Получаем транзакции за предыдущий месяц
        const prevMonthInfo = getPreviousMonth(parseInt(year), parseInt(month));
        let prevMonthTransactions = [];
        try {
            prevMonthTransactions = await getTransactionsForMonth(supabase, prevMonthInfo.year, prevMonthInfo.month);
        } catch (e) {
            // Если данных за предыдущий месяц нет, это не ошибка, просто продолжаем
            console.warn(`No data for previous month ${prevMonthInfo.year}-${prevMonthInfo.month}: ${e.message}`);
        }

        let prevMonthOutcome = prevMonthTransactions.reduce((sum, t) => sum + (t.outcome || 0), 0);
        let prevMonthIncome = prevMonthTransactions.reduce((sum, t) => sum + (t.income || 0), 0);

        // Функция для расчета процентного изменения
        const calculatePercentageChange = (current, previous) => {
            if (previous === 0) {
                return current === 0 ? "0%" : "N/A"; // Или "Infinity%" если current > 0
            }
            const change = ((current - previous) / previous) * 100;
            return `${change.toFixed(2)}%`;
        };

        const incomeChange = calculatePercentageChange(currentMonthIncome, prevMonthIncome);
        const outcomeChange = calculatePercentageChange(currentMonthOutcome, prevMonthOutcome);

        res.status(200).json({ incomeChange, outcomeChange });

    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
