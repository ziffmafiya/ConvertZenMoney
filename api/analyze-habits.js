import { createClient } from '@supabase/supabase-js';

// Helper function to get the previous month and year
function getPreviousMonth(year, month) {
    const date = new Date(year, month - 1, 1);
    date.setMonth(date.getMonth() - 1);
    return {
        year: date.getFullYear(),
        month: date.getMonth() + 1
    };
}

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

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Fetch transactions for the current period
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
        
        const { data: currentTransactions, error: currentError } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

        if (currentError) {
            console.error('Supabase select error (current):', currentError);
            return res.status(500).json({ error: currentError.message });
        }

        // Fetch transactions for the previous period for trend calculation
        const { year: prevYear, month: prevMonth } = getPreviousMonth(parseInt(year), parseInt(month));
        const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
        const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${new Date(prevYear, prevMonth, 0).getDate()}`;

        const { data: previousTransactions, error: previousError } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', prevStartDate)
            .lte('date', prevEndDate);

        if (previousError) {
            console.error('Supabase select error (previous):', previousError);
            return res.status(500).json({ error: previousError.message });
        }

        const habits = analyzeHabits(currentTransactions, previousTransactions);

        res.status(200).json({ habits });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

function analyzeHabits(currentTransactions, previousTransactions) {
    const habits = {};
    
    // Process current transactions
    const currentPayeeData = processTransactions(currentTransactions);
    
    // Process previous transactions
    const previousPayeeData = processTransactions(previousTransactions);

    // Identify habits and calculate trends
    for (const payee in currentPayeeData) {
        if (currentPayeeData[payee].count > 3) { // Habit threshold
            const currentData = currentPayeeData[payee];
            const previousData = previousPayeeData[payee] || { totalSpent: 0, count: 0 };

            // Calculate trend
            let trend = 0;
            if (previousData.totalSpent > 0) {
                trend = ((currentData.totalSpent - previousData.totalSpent) / previousData.totalSpent) * 100;
            } else if (currentData.totalSpent > 0) {
                trend = 100; // New habit
            }

            habits[payee] = {
                ...currentData,
                trend: trend.toFixed(0),
                avgSpent: (currentData.totalSpent / currentData.count).toFixed(2),
            };
        }
    }

    return habits;
}

function processTransactions(transactions) {
    const payeeData = {};
    transactions.forEach(t => {
        if (t.outcome > 0) {
            const payee = t.payee.trim();
            if (!payeeData[payee]) {
                payeeData[payee] = {
                    count: 0,
                    totalSpent: 0,
                    category: t.category_name,
                    transactions: []
                };
            }
            payeeData[payee].count++;
            payeeData[payee].totalSpent += t.outcome;
            payeeData[payee].transactions.push({ date: t.date, amount: t.outcome });
        }
    });
    return payeeData;
}
