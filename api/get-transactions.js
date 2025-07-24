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

        // Apply filters on the server-side if they are provided
        if (year) {
            const startDate = `${year}-${month || '01'}-01`;
            const endDate = month 
                ? `${year}-${month}-${new Date(year, month, 0).getDate()}`
                : `${year}-12-31`;
            
            query = query.gte('date', startDate).lte('date', endDate);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ error: error.message });
        }

        // The data from Supabase has snake_case column names.
        // The frontend expects camelCase property names.
        // We need to map the keys before sending the response.
        const transactions = data.map(t => ({
            date: t.date,
            categoryName: t.category_name,
            payee: t.payee,
            comment: t.comment,
            outcomeAccountName: t.outcome_account_name,
            outcome: t.outcome,
            incomeAccountName: t.income_account_name,
            income: t.income
        }));

        res.status(200).json({ transactions });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
