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

async function generateHabitName(transactions, supabase) {
    // This function would ideally call the deep-analysis endpoint,
    // but for simplicity, we'll generate a name based on the most common payee.
    // A real implementation would require a more sophisticated approach.
    const payeeCounts = transactions.reduce((acc, t) => {
        acc[t.payee] = (acc[t.payee] || 0) + 1;
        return acc;
    }, {});
    const mostCommonPayee = Object.keys(payeeCounts).sort((a, b) => payeeCounts[b] - payeeCounts[a])[0];
    return `Привычка: ${mostCommonPayee}`;
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
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
        
        const { data: currentTransactions, error: currentError } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .not('description_embedding', 'is', null);

        if (currentError) {
            console.error('Supabase select error (current):', currentError);
            return res.status(500).json({ error: currentError.message });
        }

        const habits = await analyzeHabitsWithEmbeddings(currentTransactions, supabase);

        res.status(200).json({ habits });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

async function analyzeHabitsWithEmbeddings(transactions, supabase) {
    const habits = {};
    let processedTransactionIds = new Set();

    for (const transaction of transactions) {
        if (processedTransactionIds.has(transaction.id)) {
            continue;
        }

        const { data: similarTransactions, error } = await supabase.rpc('match_transactions', {
            query_embedding: transaction.description_embedding,
            match_threshold: 0.85, // Adjust this threshold as needed
            match_count: 10
        });
        
        if (error) {
            console.error('Error matching transactions:', error);
            continue;
        }

        if (similarTransactions.length > 3) { // Habit threshold
            const habitTransactions = similarTransactions.filter(t => !processedTransactionIds.has(t.id));
            
            if (habitTransactions.length > 3) {
                const habitName = await generateHabitName(habitTransactions, supabase);
                const totalSpent = habitTransactions.reduce((sum, t) => sum + t.outcome, 0);
                
                habits[habitName] = {
                    count: habitTransactions.length,
                    totalSpent: totalSpent.toFixed(2),
                    avgSpent: (totalSpent / habitTransactions.length).toFixed(2),
                    category: habitTransactions[0].category_name,
                    transactions: habitTransactions.map(t => ({ date: t.date, amount: t.outcome })),
                    trend: 0 // Trend calculation would require fetching previous month's data as well
                };

                habitTransactions.forEach(t => processedTransactionIds.add(t.id));
            }
        }
    }

    return habits;
}
