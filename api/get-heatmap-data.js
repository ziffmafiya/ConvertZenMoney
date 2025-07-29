import { createClient } from '@supabase/supabase-js';

// Инициализация клиента Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

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

        res.status(200).json({ heatmapData });
    } catch (error) {
        console.error('Error fetching heatmap data:', error);
        res.status(500).json({ error: 'Failed to fetch heatmap data', details: error.message });
    }
}
