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
            .select('date, outcome')
            .gte('date', startDate.toISOString())
            .lte('date', endDate.toISOString())
            .gt('outcome', 0);

        if (error) {
            throw error;
        }

        // Инициализируем матрицу 7 (дни недели) x 24 (часы)
        const heatmapData = Array(7).fill(null).map(() => Array(24).fill(0));

        transactions.forEach(t => {
            const date = new Date(t.date);
            const dayOfWeek = (date.getDay() + 6) % 7; // Понедельник = 0, Воскресенье = 6
            const hour = date.getHours();
            heatmapData[dayOfWeek][hour] += t.outcome;
        });

        return new Response(JSON.stringify({ heatmapData }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (error) {
        console.error('Error fetching heatmap data:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch heatmap data', details: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
