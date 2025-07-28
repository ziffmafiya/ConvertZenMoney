import { createClient } from '@supabase/supabase-js';

// Обработчик для получения транзакций
export default async function handler(req, res) {
    // Принимаем только GET-запросы
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Получаем параметры фильтрации из запроса
    const { month, year } = req.query;

    // Получаем ключи доступа к Supabase из переменных окружения
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Проверяем наличие ключей
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    // Создаем клиент Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Получаем сессию пользователя
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            console.error('Authentication error:', userError?.message || 'User not authenticated');
            return res.status(401).json({ error: 'Unauthorized: User not authenticated' });
        }

        // Начинаем строить запрос к таблице 'transactions'
        // Добавляем фильтрацию по user_id
        let query = supabase.from('transactions').select('*, is_anomaly, anomaly_reason').eq('user_id', user.id);

        // Применяем фильтры по дате, если они указаны
        if (year) {
            const startDate = `${year}-${month || '01'}-01`;
            const endDate = month 
                ? `${year}-${month}-${new Date(year, month, 0).getDate()}`
                : `${year}-12-31`;
            
            query = query.gte('date', startDate).lte('date', endDate);
        }

        // Выполняем запрос
        const { data, error } = await query;

        // Обрабатываем ошибку при выполнении запроса
        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Данные из Supabase приходят с именами столбцов в snake_case.
        // Фронтенд ожидает camelCase.
        // Необходимо преобразовать ключи перед отправкой ответа.
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

        // Отправляем успешный ответ с преобразованными данными
        res.status(200).json({ transactions });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
