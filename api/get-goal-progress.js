import { createClient } from '@supabase/supabase-js';

export default async (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Server configuration error: Supabase environment variables are not set.' });
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { year, month, goal } = req.body;

    if (!year || !month || !goal) {
        return res.status(400).json({ error: 'Year, month, and goal are required' });
    }

    try {
        // Fetch current month's expenses for the goal category
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

        const currentMonthExpenses = currentTransactions.reduce((sum, t) => sum + t.outcome, 0);

        let progress1 = 0; // Для goalProgressBar
        let progress2 = 0; // Для goalProgressText
        let status = 'On Track';
        let comparisonMonth = null;

        if (goal.type === 'limit') {
            if (goal.value > 0) {
                progress1 = (currentMonthExpenses / goal.value) * 100;
                progress2 = currentMonthExpenses;
            }
            if (progress1 > 100) {
                status = 'Over Limit';
            }
        } else if (goal.type === 'reduce') {
            const prevMonthDate = new Date(year, month - 2, 1);
            const prevMonthEndDate = new Date(year, month - 1, 0);
            comparisonMonth = prevMonthDate.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });

            const { data: prevTransactions, error: prevError } = await supabase
                .from('transactions')
                .select('outcome')
                .eq('category_name', goal.category)
                .gte('date', prevMonthDate.toISOString())
                .lte('date', prevMonthEndDate.toISOString())
                .gt('outcome', 0);

            if (prevError) throw prevError;

            const previousMonthExpenses = prevTransactions.reduce((sum, t) => sum + t.outcome, 0);

            if (previousMonthExpenses > 0) {
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
            
            if (progress1 < 100) {
                status = 'Behind';
            } else {
                status = 'On Track';
            }
        }
        
        res.status(200).json({
            progress1: Math.max(0, progress1), // Ограничиваем progress1 снизу нулем для отображения
            progress2: progress2,
            currentValue: currentMonthExpenses,
            targetValue: goal.value,
            status,
            comparisonMonth
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
