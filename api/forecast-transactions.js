import { createClient } from '@supabase/supabase-js';
import winkStatistics from 'wink-statistics';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { months: forecastMonths = 6 } = req.query; // Default to 6 months
    const numForecastMonths = parseInt(forecastMonths, 10);

    if (isNaN(numForecastMonths) || numForecastMonths <= 0) {
        return res.status(400).json({ error: 'Invalid number of months specified.' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Fetch all transactions to build a proper historical model
        let { data: transactions, error } = await supabase
            .from('transactions')
            .select('date, income, outcome')
            .order('date', { ascending: true });

        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Aggregate data by month
        const monthlyData = {};
        transactions.forEach(t => {
            const month = t.date.substring(0, 7); // YYYY-MM
            if (!monthlyData[month]) {
                monthlyData[month] = { income: 0, outcome: 0 };
            }
            monthlyData[month].income += t.income;
            monthlyData[month].outcome += t.outcome;
        });

        const sortedMonths = Object.keys(monthlyData).sort();

        // We need at least 2 data points to create a forecast model
        if (sortedMonths.length < 2) {
            return res.status(200).json({ 
                historical: sortedMonths.map(m => ({ month: m, ...monthlyData[m] })),
                forecast: [],
                message: "Недостаточно исторических данных для построения прогноза (требуется минимум 2 месяца)."
            });
        }

        const historicalIncome = sortedMonths.map((m, i) => [i, monthlyData[m].income]);
        const historicalOutcome = sortedMonths.map((m, i) => [i, monthlyData[m].outcome]);

        // Simple linear regression for forecasting
        const incomeModel = winkStatistics.regression.linear(historicalIncome);
        const outcomeModel = winkStatistics.regression.linear(historicalOutcome);

        const forecast = [];
        const lastMonthIndex = sortedMonths.length - 1;
        const lastMonthDate = new Date(`${sortedMonths[lastMonthIndex]}-01`);

        for (let i = 1; i <= numForecastMonths; i++) {
            const nextMonthIndex = lastMonthIndex + i;
            const nextMonthDate = new Date(lastMonthDate);
            nextMonthDate.setMonth(nextMonthDate.getMonth() + i);
            
            const forecastMonth = nextMonthDate.toISOString().substring(0, 7);
            
            forecast.push({
                month: forecastMonth,
                income: Math.max(0, incomeModel.predict(nextMonthIndex)), // Ensure non-negative
                outcome: Math.max(0, outcomeModel.predict(nextMonthIndex)) // Ensure non-negative
            });
        }

        res.status(200).json({ 
            historical: sortedMonths.map(m => ({ month: m, ...monthlyData[m] })),
            forecast
        });

    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
