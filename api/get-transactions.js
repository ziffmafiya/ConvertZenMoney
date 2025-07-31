// Импорт Supabase клиента для работы с базой данных
import { createClient } from '@supabase/supabase-js';

/**
 * Обработчик для получения транзакций из базы данных
 * Поддерживает фильтрацию по месяцу и году
 */
export default async function handler(req, res) {
    // Получаем параметры фильтрации из query string запроса
    const { month, year } = req.query;

    // Получаем ключи доступа к Supabase из переменных окружения
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Проверяем наличие обязательных ключей конфигурации
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    // Создаем клиент Supabase для подключения к базе данных
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Начинаем строить запрос к таблице 'transactions'
        // Выбираем все поля, включая информацию об аномалиях
        let query = supabase.from('transactions').select('*, is_anomaly, anomaly_reason');

        // Применяем фильтры по дате, если они указаны в запросе
        if (year) {
            // Формируем начальную дату (первый день месяца или года)
            const startDate = `${year}-${month || '01'}-01`;
            // Формируем конечную дату (последний день месяца или года)
            const endDate = month 
                ? `${year}-${month}-${new Date(year, month, 0).getDate()}`
                : `${year}-12-31`;
            
            // Добавляем условия фильтрации по диапазону дат
            query = query.gte('date', startDate).lte('date', endDate);
        }

        // Выполняем запрос к базе данных
        const { data, error } = await query;

        // Обрабатываем ошибку при выполнении запроса к базе данных
        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Преобразование данных из snake_case (база данных) в camelCase (фронтенд)
        // Данные из Supabase приходят с именами столбцов в snake_case
        // Фронтенд ожидает camelCase для совместимости с JavaScript конвенциями
        const transactions = data.map(t => ({
            date: t.date,
            categoryName: t.category_name,           // category_name -> categoryName
            payee: t.payee,
            comment: t.comment,
            outcomeAccountName: t.outcome_account_name, // outcome_account_name -> outcomeAccountName
            outcome: t.outcome,
            incomeAccountName: t.income_account_name,   // income_account_name -> incomeAccountName
            income: t.income,
            is_anomaly: t.is_anomaly,                // Флаг аномалии
            anomaly_reason: t.anomaly_reason         // Причина аномалии
        }));

        // Отправляем успешный ответ с преобразованными данными
        res.status(200).json({ transactions });
    } catch (error) {
        // Обработка непредвиденных ошибок сервера
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}
