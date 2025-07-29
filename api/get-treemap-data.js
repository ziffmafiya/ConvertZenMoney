import { createClient } from '@supabase/supabase-js';

import { createClient } from '@supabase/supabase-js';

export const config = {
    runtime: 'edge',
};

export default async function handler(req) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { searchParams } = new URL(req.url);
    const year = searchParams.get('year');
    const month = searchParams.get('month');

    if (!year || !month) {
        return new Response(JSON.stringify({ error: 'Year and month are required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
        });
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

        return new Response(JSON.stringify({ treemapData }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching treemap data:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch treemap data', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
