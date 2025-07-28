import { createClient } from '@supabase/supabase-js';

export default async (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Server configuration error: Supabase environment variables are not set.' });
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
    const { year, month } = req.query;

    if (!year || !month) {
        return res.status(400).json({ error: 'Year and month are required' });
    }

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    try {
        // Получаем сессию пользователя
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('Authentication error:', userError?.message || 'User not authenticated');
            return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        }

        const userId = user.id;

        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('category_name, outcome')
            .eq('user_id', userId) // Фильтруем по user_id
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .gt('outcome', 0);

        if (error) throw error;

        if (transactions.length === 0) {
            return res.status(200).json({ recommendation: null, message: 'No data for the selected period.' });
        }

        const expensesByCategory = transactions.reduce((acc, t) => {
            acc[t.category_name] = (acc[t.category_name] || 0) + t.outcome;
            return acc;
        }, {});

        const topCategory = Object.entries(expensesByCategory).sort(([, a], [, b]) => b - a)[0];

        if (!topCategory) {
            return res.status(200).json({ recommendation: null, message: 'No spending categories found.' });
        }

        const recommendation = {
            category: topCategory[0],
            type: 'reduce',
            value: 10, // Propose a 10% reduction
            reason: `Категория "${topCategory[0]}" является вашей самой большой статьей расходов в этом месяце. Попробуйте сократить ее на 10%.`
        };

        res.status(200).json({ recommendation });

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
