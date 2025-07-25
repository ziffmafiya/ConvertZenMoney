import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Основной обработчик запроса для глубокого анализа
export default async function handler(req, res) {
    // Проверяем, что метод запроса - GET
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Получаем параметры из запроса
    const { month, year, category, model: selectedModel } = req.query;

    // Проверяем наличие обязательных параметров
    if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required for deep analysis.' });
    }

    // Преобразуем месяц и год в числа
    const currentMonth = parseInt(month);
    const currentYear = parseInt(year);

    // Вычисляем предыдущий месяц и год для сравнения
    let previousMonth = currentMonth - 1;
    let previousYear = currentYear;

    if (previousMonth === 0) {
        previousMonth = 12;
        previousYear -= 1;
    }

    // Форматируем месяцы, добавляя ведущий ноль при необходимости
    const previousMonthPadded = String(previousMonth).padStart(2, '0');
    const currentMonthPadded = String(currentMonth).padStart(2, '0');

    // Получаем ключи доступа из переменных окружения
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    const geminiApiKey = process.env.GEMINI_API_KEY;

    // Проверяем наличие ключей
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    if (!geminiApiKey) {
        console.error('Configuration error: GEMINI_API_KEY not configured.');
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    // Инициализируем клиенты Supabase и Google Generative AI
    const supabase = createClient(supabaseUrl, supabaseKey);
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({ model: selectedModel || "gemini-2.5-pro" }); // Используем выбранную модель или модель по умолчанию

    try {
        // Определяем даты для запроса транзакций за текущий месяц
        const currentMonthStartDate = `${currentYear}-${currentMonthPadded}-01`;
        const currentMonthEndDate = `${currentYear}-${currentMonthPadded}-${new Date(currentYear, currentMonth, 0).getDate()}`;
        
        // Получаем транзакции за текущий месяц
        const { data: currentMonthTransactions, error: currentMonthFetchError } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', currentMonthStartDate)
            .lte('date', currentMonthEndDate);

        // Обрабатываем ошибку при запросе
        if (currentMonthFetchError) {
            console.error('Supabase fetch error for current month:', currentMonthFetchError);
            return res.status(500).json({ error: currentMonthFetchError.message });
        }

        // Определяем даты для запроса транзакций за предыдущий месяц
        const previousMonthStartDate = `${previousYear}-${previousMonthPadded}-01`;
        const previousMonthEndDate = `${previousYear}-${previousMonthPadded}-${new Date(previousYear, previousMonth, 0).getDate()}`;

        // Получаем транзакции за предыдущий месяц
        const { data: previousMonthTransactions, error: previousMonthFetchError } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', previousMonthStartDate)
            .lte('date', previousMonthEndDate);

        // Обрабатываем ошибку при запросе
        if (previousMonthFetchError) {
            console.error('Supabase fetch error for previous month:', previousMonthFetchError);
            return res.status(500).json({ error: previousMonthFetchError.message });
        }

        // Проверяем, есть ли транзакции для анализа
        if (!currentMonthTransactions || currentMonthTransactions.length === 0) {
            return res.status(200).json({ analysis: 'Нет транзакций за выбранный текущий месяц для анализа.' });
        }

        // Преобразуем данные о транзакциях в JSON
        const currentMonthTransactionsJson = JSON.stringify(currentMonthTransactions, null, 2);
        const previousMonthTransactionsJson = JSON.stringify(previousMonthTransactions, null, 2);

        // Создаем промпт для языковой модели
        const prompt = `Ты — персональный финансовый ассистент. Проанализируй следующие транзакции:

**Транзакции за ${currentMonthPadded}.${currentYear} (текущий месяц) в формате JSON:**
${currentMonthTransactionsJson}

**Транзакции за ${previousMonthPadded}.${previousYear} (прошлый месяц) в формате JSON:**
${previousMonthTransactionsJson}

На основе этих данных:
1.  Напиши краткую сводку (2-3 предложения) об общих тратах за ${currentMonthPadded}.${currentYear}.
2.  Выдели 3 основные категории трат за ${currentMonthPadded}.${currentYear}. Сравни их с тратами в этих же категориях за ${previousMonthPadded}.${previousYear}. В каких категориях произошли значительные изменения (рост или падение) и каковы могут быть причины?
3.  Найди аномальные или самые крупные покупки в ${currentMonthPadded}.${currentYear}. Объясни, почему они могли быть аномальными (если это возможно на основе данных).
4.  Дай 3 конкретных и выполнимых совета по экономии на следующий месяц, основываясь на самых больших, аномальных или нерегулярных тратах в ${currentMonthPadded}.${currentYear}.
5.  Проведи сравнительный анализ по категории '${category || 'Кафе и рестораны'}': "Сравни мои траты в категории '${category || 'Кафе и рестораны'}' за ${currentMonthPadded}.${currentYear} и ${previousMonthPadded}.${previousYear}. В каких заведениях я стал тратить больше и почему, как ты думаешь?" (Если в 'comment' или 'payee' есть названия заведений, используй их).
6.  Поиск причинно-следственных связей: "Какой основной драйвер роста моих общих расходов в ${currentMonthPadded}.${currentYear} по сравнению с ${previousMonthPadded}.${previousYear}? Связано ли это с одной категорией или несколькими?
7.  Анализ привычек: "Проанализируй мои траты в будние и выходные дни в ${currentMonthPadded}.${currentYear}. Какие паттерны ты видишь? Дай совет, как оптимизировать траты на выходных."

Предоставь анализ на русском языке.
`;

        // Генерируем контент с помощью модели
        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // Возвращаем сгенерированный анализ
        res.status(200).json({ analysis: text });

    } catch (error) {
        console.error('Unhandled server error during deep analysis:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
