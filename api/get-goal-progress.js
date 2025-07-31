// Импорт Supabase клиента для работы с базой данных
import { createClient } from '@supabase/supabase-js';

/**
 * Основной обработчик для получения прогресса по финансовым целям
 * Анализирует текущие траты и сравнивает их с установленными целями
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
    
    // Получаем параметры из тела запроса
    const { year, month, goal } = req.body;

    // Проверяем наличие обязательных параметров
    if (!year || !month || !goal) {
        return res.status(400).json({ error: 'Year, month, and goal are required' });
    }

    try {
        // Получаем траты за текущий месяц для целевой категории
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);

        const { data: currentTransactions, error: currentError } = await supabase
            .from('transactions')
            .select('outcome')
            .eq('category_name', goal.category)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .gt('outcome', 0);

        if (currentError) throw currentError;

        // Суммируем все траты за текущий месяц в целевой категории
        const currentMonthExpenses = currentTransactions.reduce((sum, t) => sum + t.outcome, 0);

        // Инициализируем переменные для отслеживания прогресса
        let progress1 = 0; // Для goalProgressBar (процент выполнения цели)
        let progress2 = 0; // Для goalProgressText (фактическое значение)
        let status = 'On Track'; // Статус выполнения цели
        let comparisonMonth = null; // Месяц для сравнения

        // Обрабатываем разные типы целей
        if (goal.type === 'limit') {
            // Цель типа "лимит" - не превысить определенную сумму
            if (goal.value > 0) {
                progress1 = (currentMonthExpenses / goal.value) * 100; // Процент использования лимита
                progress2 = currentMonthExpenses; // Фактическая сумма трат
            }
            if (progress1 > 100) {
                status = 'Over Limit'; // Превышен лимит
            }
        } else if (goal.type === 'reduce') {
            // Цель типа "сокращение" - уменьшить траты по сравнению с предыдущим месяцем
            const prevMonthDate = new Date(year, month - 2, 1);
            const prevMonthEndDate = new Date(year, month - 1, 0);
            comparisonMonth = prevMonthDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

            // Получаем траты за предыдущий месяц для сравнения
            const { data: prevTransactions, error: prevError } = await supabase
                .from('transactions')
                .select('outcome')
                .eq('category_name', goal.category)
                .gte('date', prevMonthDate.toISOString())
                .lte('date', prevMonthEndDate.toISOString())
                .gt('outcome', 0);

            if (prevError) throw prevError;

            // Суммируем траты за предыдущий месяц
            const previousMonthExpenses = prevTransactions.reduce((sum, t) => sum + t.outcome, 0);

            if (previousMonthExpenses > 0) {
                // Вычисляем процент сокращения трат
                const reduction = ((previousMonthExpenses - currentMonthExpenses) / previousMonthExpenses) * 100;
                if (goal.value > 0) {
                    progress1 = (reduction / goal.value) * 100; // Процент достижения цели сокращения
                    progress2 = reduction; // Фактический процент сокращения
                }
            } else if (currentMonthExpenses > 0) {
                progress1 = 0; // Если в предыдущем месяце трат не было, а в текущем есть - прогресс 0%
                progress2 = -Infinity; // Показывает перерасход, когда экономию посчитать нельзя
            } else {
                progress1 = 100; // Если трат не было ни в одном из месяцев - цель достигнута
                progress2 = 100;
            }
            
            // Определяем статус выполнения цели сокращения
            if (progress1 < 100) {
                status = 'Behind'; // Отстаем от цели
            } else {
                status = 'On Track'; // Идем по плану
            }
        }
        
        // Отправляем результат с информацией о прогрессе
        res.status(200).json({
            progress1: Math.max(0, progress1), // Ограничиваем progress1 снизу нулем для отображения
            progress2: progress2,
            currentValue: currentMonthExpenses,
            targetValue: goal.value,
            status,
            comparisonMonth
        });

    } catch (error) {
        // Обработка ошибок
        res.status(500).json({ error: error.message });
    }
};
