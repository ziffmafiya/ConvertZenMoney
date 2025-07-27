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
            .eq('categoryName', goal.category)
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .gt('outcome', 0);

        if (currentError) throw currentError;

        const currentMonthExpenses = currentTransactions.reduce((sum, t) => sum + t.outcome, 0);

        let progress = 0;
        let status = 'On Track';

        if (goal.type === 'limit') {
            if (goal.value > 0) {
                progress = (currentMonthExpenses / goal.value) * 100;
            }
            if (progress > 100) {
                status = 'Over Limit';
            }
        } else if (goal.type === 'reduce') {
            // Fetch previous month's expenses for comparison
            const prevMonthDate = new Date(year, month - 2, 1);
            const prevMonthEndDate = new Date(year, month - 1, 0);

            const { data: prevTransactions, error: prevError } = await supabase
                .from('transactions')
                .select('outcome')
                .eq('categoryName', goal.category)
                .gte('date', prevMonthDate.toISOString())
                .lte('date', prevMonthEndDate.toISOString())
                .gt('outcome', 0);

            if (prevError) throw prevError;

            const previousMonthExpenses = prevTransactions.reduce((sum, t) => sum + t.outcome, 0);

            if (previousMonthExpenses > 0) {
                const reduction = ((previousMonthExpenses - currentMonthExpenses) / previousMonthExpenses) * 100;
                progress = (reduction / goal.value) * 100;
            } else if (currentMonthExpenses > 0) {
                progress = -100; // Spent something when previously spent nothing
            } else {
                progress = 100; // Spent nothing, same as before
            }
            
            if (progress < 100) {
                status = 'Behind';
            }
        }

        res.status(200).json({
            progress: Math.max(0, progress), // Don't show negative progress
            currentValue: currentMonthExpenses,
            targetValue: goal.value,
            status
        });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
