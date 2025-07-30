import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Main API handler for generating financial reports
export default async function handler(req, res) {
    // Allow only GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Extract parameters (period, year) from the request
    const { period, year } = req.query;

    // Validate required parameters
    if (!period || !year) {
        return res.status(400).json({ error: 'Period and year are required for the report.' });
    }

    // Get Supabase and Gemini API keys from environment variables
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // Check for missing environment variables
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    if (!geminiApiKey) {
        console.error('Configuration error: GEMINI_API_KEY not configured.');
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    // Initialize Supabase and Google Generative AI clients
    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    try {
        // Determine the date range based on the selected period
        let startDate, endDate;
        const currentYear = parseInt(year);

        if (period === 'month') {
            const month = new Date().getMonth() + 1; // Use current month for simplicity
            startDate = `${currentYear}-${String(month).padStart(2, '0')}-01`;
            endDate = `${currentYear}-${String(month).padStart(2, '0')}-${new Date(currentYear, month, 0).getDate()}`;
        } else if (period === 'quarter') {
            const quarter = Math.floor((new Date().getMonth() + 3) / 3);
            const startMonth = (quarter - 1) * 3 + 1;
            const endMonth = startMonth + 2;
            startDate = `${currentYear}-${String(startMonth).padStart(2, '0')}-01`;
            const endDay = new Date(currentYear, endMonth, 0).getDate();
            endDate = `${currentYear}-${String(endMonth).padStart(2, '0')}-${endDay}`;
        } else if (period === 'year') {
            startDate = `${currentYear}-01-01`;
            endDate = `${currentYear}-12-31`;
        } else {
            return res.status(400).json({ error: 'Invalid period specified.' });
        }

        // Fetch transactions for the specified period
        const { data: transactions, error: fetchError } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate);

        if (fetchError) {
            console.error('Supabase fetch error:', fetchError);
            return res.status(500).json({ error: fetchError.message });
        }

        if (!transactions || transactions.length === 0) {
            return res.status(200).json({ report: 'Нет транзакций за выбранный период для создания отчета.' });
        }

        const transactionsJson = JSON.stringify(transactions, null, 2);

        // Create the prompt for the Gemini AI
        const prompt = `
            Ты — персональный финансовый ассистент. Создай краткий отчет на основе следующих транзакций за ${period} ${year}.

            **Транзакции в формате JSON:**
            ${transactionsJson}

            **Структура отчета:**
            1.  **Краткая сводка:** 2-3 предложения об общих доходах, расходах и чистом балансе.
            2.  **Расходы по категориям:** Выдели 3-5 основных категорий трат.
            3.  **Привычки и тренды:** Опиши основные покупательские привычки и тренды за этот период.
            4.  **Анализ:** Что удалось улучшить по сравнению с предыдущими периодами (если возможно), а что нет?
            5.  **Рекомендации:** Дай 2-3 конкретных совета по улучшению финансового здоровья на следующий период.

            Предоставь отчет на русском языке.
        `;

        // Generate the report using the Gemini AI
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Send the generated report back to the client
        res.status(200).json({ report: text });

    } catch (error) {
        console.error('Unhandled server error during report generation:', error);
        res.status(500).json({ error: error.message || 'Внутренняя ошибка сервера' });
    }
}
