import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { month, year } = req.query;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        let query = supabase.from('transactions').select('*');

        if (year) {
            const startDate = `${year}-${month || '01'}-01`;
            const endDate = month
                ? `${year}-${month}-${new Date(year, month, 0).getDate()}`
                : `${year}-12-31`;
            
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data: transactions, error } = await query;

        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ error: error.message });
        }

        const habits = analyzeHabits(transactions);

        res.status(200).json({ habits });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

function analyzeHabits(transactions) {
    const habits = {};
    const payeeFrequency = {};

    transactions.forEach(t => {
        if (t.outcome > 0) {
            const payee = t.payee.trim();
            payeeFrequency[payee] = (payeeFrequency[payee] || 0) + 1;
        }
    });

    for (const payee in payeeFrequency) {
        if (payeeFrequency[payee] > 3) { // Consider it a habit if it occurs more than 3 times
            const habitTransactions = transactions.filter(t => t.payee.trim() === payee);
            const totalSpent = habitTransactions.reduce((sum, t) => sum + t.outcome, 0);
            const avgSpent = totalSpent / habitTransactions.length;
            
            habits[payee] = {
                count: habitTransactions.length,
                totalSpent: totalSpent.toFixed(2),
                avgSpent: avgSpent.toFixed(2),
                category: habitTransactions[0].category_name 
            };
        }
    }

    return habits;
}
