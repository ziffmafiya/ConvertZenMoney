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
        // Начинаем строить запрос к таблице 'transactions'
        let query = supabase.from('transactions').select('id, date, category_name, payee, comment, outcome_account_name, outcome, income_account_name, income, created_at, description_embedding, unique_hash, cluster_id, is_anomaly, anomaly_reason, cluster');

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
            id: t.id,
            date: t.date,
            categoryName: t.category_name,
            payee: t.payee,
            comment: t.comment,
            outcomeAccountName: t.outcome_account_name,
            outcome: t.outcome,
            incomeAccountName: t.income_account_name,
            income: t.income,
            createdAt: t.created_at, // Add created_at
            descriptionEmbedding: t.description_embedding, // Add description_embedding
            uniqueHash: t.unique_hash, // Add unique_hash
            clusterId: t.cluster_id, // Add cluster_id
            isAnomaly: t.is_anomaly, // Use camelCase for consistency
            anomalyReason: t.anomaly_reason, // Use camelCase for consistency
            cluster: t.cluster // Add cluster
        }));

        // Отправляем успешный ответ с преобразованными данными
        res.status(200).json({ transactions });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
