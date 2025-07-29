export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured in environment variables.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    res.status(200).json({ supabaseUrl, supabaseKey });
}
