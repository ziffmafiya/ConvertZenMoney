import { createClient } from '@supabase/supabase-js';

// In-memory cache for frequently accessed data
const memoryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Optimized handler for getting transactions
export default async function handler(req, res) {
    // Only accept GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Get filtering parameters from request
    const { month, year } = req.query;

    // Validate required parameters
    if (!year) {
        return res.status(400).json({ error: 'Year parameter is required' });
    }

    // Check cache first
    const cacheKey = `transactions_${year}_${month || 'all'}`;
    const cachedData = memoryCache.get(cacheKey);
    
    if (cachedData && (Date.now() - cachedData.timestamp) < CACHE_TTL) {
        // Set cache headers
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
        res.setHeader('X-Cache', 'HIT');
        return res.status(200).json(cachedData.data);
    }

    // Get Supabase access keys from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Check for keys
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    // Create Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Build query to 'transactions' table with optimized select
        let query = supabase
            .from('transactions')
            .select('date, category_name, payee, comment, outcome_account_name, outcome, income_account_name, income, is_anomaly, anomaly_reason');

        // Apply date filters if specified
        if (year) {
            const startDate = `${year}-${month || '01'}-01`;
            const endDate = month 
                ? `${year}-${month}-${new Date(year, month, 0).getDate()}`
                : `${year}-12-31`;
            
            query = query.gte('date', startDate).lte('date', endDate);
        }

        // Add ordering for consistent results
        query = query.order('date', { ascending: false });

        // Execute query
        const { data, error } = await query;

        // Handle query execution error
        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Transform data from snake_case to camelCase
        const transactions = data.map(t => ({
            date: t.date,
            categoryName: t.category_name,
            payee: t.payee,
            comment: t.comment,
            outcomeAccountName: t.outcome_account_name,
            outcome: t.outcome,
            incomeAccountName: t.income_account_name,
            income: t.income,
            is_anomaly: t.is_anomaly,
            anomaly_reason: t.anomaly_reason
        }));

        const responseData = { transactions };

        // Cache the response
        memoryCache.set(cacheKey, {
            data: responseData,
            timestamp: Date.now()
        });

        // Set cache headers
        res.setHeader('Cache-Control', 'public, max-age=300'); // 5 minutes
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('Content-Type', 'application/json');

        // Send successful response with transformed data
        res.status(200).json(responseData);
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Cleanup function to clear old cache entries
function cleanupCache() {
    const now = Date.now();
    for (const [key, value] of memoryCache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            memoryCache.delete(key);
        }
    }
}

// Run cleanup every 10 minutes
setInterval(cleanupCache, 10 * 60 * 1000);

// Export cache stats for monitoring
export function getCacheStats() {
    return {
        size: memoryCache.size,
        keys: Array.from(memoryCache.keys())
    };
} 