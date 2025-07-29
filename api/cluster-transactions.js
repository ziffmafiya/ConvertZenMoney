import { createClient } from '@supabase/supabase-js';
import { runClustering } from './lib/clustering';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { minClusterSize = 5, minSamples = 3, normalize = true } = req.body;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Запускаем кластеризацию как фоновый процесс и не ждем его завершения
        runClustering(supabase, { minClusterSize, minSamples, normalize });

        res.status(202).json({ message: 'Clustering process started in the background.' });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
