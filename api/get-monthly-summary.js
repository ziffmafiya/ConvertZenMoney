// Импорт Supabase клиента для работы с базой данных
import { createClient } from '@supabase/supabase-js';

/**
 * Вспомогательная функция для получения предыдущего месяца и года
 * Используется для сравнительного анализа с текущим периодом
 * @param {number} year - Год
 * @param {number} month - Месяц (1-12)
 * @returns {object} - Объект с годом и месяцем предыдущего периода
 */
function getPreviousMonth(year, month) {
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1
    };
}

/**
 * Функция для получения транзакций за определенный месяц и год
 * Извлекает только поля outcome и income для оптимизации запроса
 * @param {object} supabase - Клиент Supabase
 * @param {number} year - Год
 * @param {number} month - Месяц
 * @returns {Promise<Array>} - Массив транзакций с полями outcome и income
 */
async function getTransactionsForMonth(supabase, year, month) {
    // Формируем начальную и конечную даты для запроса
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDate = `${year}-${String(month).padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    // Выполняем запрос к базе данных
    const { data, error } = await supabase
        .from('transactions')
        .select('outcome, income') // Выбираем только нужные поля для оптимизации
        .gte('date', startDate)
        .lte('date', endDate);

    if (error) {
        console.error(`Supabase select error for ${year}-${month}:`, error);
        throw new Error(error.message);
    }
    return data;
}

/**
 * Основной обработчик запроса для получения месячной сводки
 * Сравнивает доходы и расходы текущего месяца с предыдущим
 * @param {object} req - Объект запроса
 * @param {object} res - Объект ответа
 */
export default async function handler(req, res) {

    // Получаем параметры месяца и года из запроса
    const { month, year } = req.query;

    // Проверяем наличие обязательных параметров
    if (!year || !month) {
        return res.status(400).json({ error: 'Year and month are required' });
    }

    // Получаем ключи доступа к Supabase из переменных окружения
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Проверяем наличие ключей конфигурации
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    // Создаем клиент Supabase для работы с базой данных
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Получаем транзакции за текущий месяц
        const currentMonthTransactions = await getTransactionsForMonth(supabase, year, month);

        // Вычисляем общие показатели за текущий месяц
        let currentMonthOutcome = currentMonthTransactions.reduce((sum, t) => sum + (t.outcome || 0), 0);
        let currentMonthIncome = currentMonthTransactions.reduce((sum, t) => sum + (t.income || 0), 0);
        let currentMonthDifference = currentMonthIncome - currentMonthOutcome;

        // Получаем транзакции за предыдущий месяц для сравнения
        const prevMonthInfo = getPreviousMonth(parseInt(year), parseInt(month));
        let prevMonthTransactions = [];
        try {
            prevMonthTransactions = await getTransactionsForMonth(supabase, prevMonthInfo.year, prevMonthInfo.month);
        } catch (e) {
            // Если данных за предыдущий месяц нет, это не ошибка, просто продолжаем
            console.warn(`No data for previous month ${prevMonthInfo.year}-${prevMonthInfo.month}: ${e.message}`);
        }

        // Вычисляем общие показатели за предыдущий месяц
        let prevMonthOutcome = prevMonthTransactions.reduce((sum, t) => sum + (t.outcome || 0), 0);
        let prevMonthIncome = prevMonthTransactions.reduce((sum, t) => sum + (t.income || 0), 0);

        /**
         * Функция для расчета процентного изменения между двумя значениями
         * @param {number} current - Текущее значение
         * @param {number} previous - Предыдущее значение
         * @returns {string} - Строка с процентным изменением
         */
        const calculatePercentageChange = (current, previous) => {
            if (previous === 0) {
                return current === 0 ? "0%" : "N/A"; // Или "Infinity%" если current > 0
            }
            const change = ((current - previous) / previous) * 100;
            return `${change.toFixed(2)}%`;
        };

        // Вычисляем процентные изменения для доходов и расходов
        const incomeChange = calculatePercentageChange(currentMonthIncome, prevMonthIncome);
        const outcomeChange = calculatePercentageChange(currentMonthOutcome, prevMonthOutcome);

        // Отправляем результат с процентными изменениями
        res.status(200).json({ incomeChange, outcomeChange });

    } catch (error) {
        // Обработка непредвиденных ошибок сервера
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
