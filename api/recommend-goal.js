// Импорт Supabase клиента для работы с базой данных
import { createClient } from '@supabase/supabase-js';

/**
 * Основной обработчик для рекомендации финансовых целей
 * Анализирует траты пользователя и предлагает цели для экономии
 * @param {object} req - Объект запроса
 * @param {object} res - Объект ответа
 */
export default async (req, res) => {
    // Получаем ключи доступа к Supabase из переменных окружения
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Проверяем наличие обязательных ключей конфигурации
    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Server configuration error: Supabase environment variables are not set.' });
    }

    // Создаем клиент Supabase для работы с базой данных
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Получаем параметры месяца и года из запроса
    const { year, month } = req.query;

    // Проверяем наличие обязательных параметров
    if (!year || !month) {
        return res.status(400).json({ error: 'Year and month are required' });
    }

    // Формируем диапазон дат для анализа (весь месяц)
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    try {
        // Получаем все транзакции с расходами за указанный месяц
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('category_name, outcome') // Выбираем только нужные поля
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .gt('outcome', 0); // Только транзакции с расходами

        if (error) throw error;

        // Проверяем, есть ли данные для анализа
        if (transactions.length === 0) {
            return res.status(200).json({ recommendation: null, message: 'No data for the selected period.' });
        }

        // Группируем расходы по категориям и суммируем их
        const expensesByCategory = transactions.reduce((acc, t) => {
            acc[t.category_name] = (acc[t.category_name] || 0) + t.outcome;
            return acc;
        }, {});

        // Находим категорию с наибольшими расходами
        const topCategory = Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a)[0];

        // Проверяем, найдена ли категория
        if (!topCategory) {
            return res.status(200).json({ recommendation: null, message: 'No spending categories found.' });
        }

        // Формируем рекомендацию для экономии
        const recommendation = {
            category: topCategory[0], // Название категории с наибольшими расходами
            type: 'reduce',           // Тип цели - сокращение расходов
            value: 10,                // Предлагаем сокращение на 10%
            reason: `Категория "${topCategory[0]}" является вашей самой большой статьей расходов в этом месяце. Попробуйте сократить ее на 10%.`
        };

        // Отправляем рекомендацию клиенту
        res.status(200).json({ recommendation });

    } catch (error) {
        // Обработка ошибок
        res.status(500).json({ error: error.message });
    }
};
