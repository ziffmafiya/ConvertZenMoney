import { createClient } from '@supabase/supabase-js';

// Инициализация клиента Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

export const config = {
    runtime: 'edge',
};

export default async function handler(req, res) {
    const { year, month } = req.query;

    if (!year || !month) {
        return res.status(400).json({ error: 'Year and month are required' });
    }

    try {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0, 23, 59, 59);

        // Получаем транзакции за выбранный период
        const { data: transactions, error } = await supabase
            .from('transactions')
            .select('categoryName, payee, outcome')
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .gt('outcome', 0);

        if (error) {
            throw error;
        }

        // Группируем данные для treemap
        const treemapData = {};
        transactions.forEach(t => {
            const category = t.categoryName || 'Без категории';
            const payee = t.payee || 'Без контрагента';
            if (!treemapData[category]) {
                treemapData[category] = {};
            }
            if (!treemapData[category][payee]) {
                treemapData[category][payee] = 0;
            }
            treemapData[category][payee] += t.outcome;
        });

        res.status(200).json({ treemapData });
    } catch (error) {
        console.error('Error fetching treemap data:', error);
        res.status(500).json({ error: 'Failed to fetch treemap data', details: error.message });
    }
}
