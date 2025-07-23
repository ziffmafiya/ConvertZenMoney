import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { transactions } = req.body;
    console.log('Received request to upload transactions. Count:', transactions ? transactions.length : 0);

    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        console.error('Validation error: No transactions provided or invalid format.');
        return res.status(400).json({ error: 'No transactions provided or invalid format' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }
    console.log('Supabase client initialized.');

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

    try {
        const transactionsToInsert = transactions.map(t => ({
            date: t.date,
            category_name: t.categoryName,
            payee: t.payee,
            comment: t.comment,
            outcome_account_name: t.outcomeAccountName,
            outcome: t.outcome,
            income_account_name: t.incomeAccountName,
            income: t.income
        }));
        console.log('Attempting to insert transactions:', transactionsToInsert);

        const { data, error } = await supabase
            .from('transactions')
            .insert(transactionsToInsert);

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: error.message });
        }

        console.log('Transactions uploaded successfully. Data:', data);
        res.status(200).json({ message: 'Transactions uploaded successfully', data });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
