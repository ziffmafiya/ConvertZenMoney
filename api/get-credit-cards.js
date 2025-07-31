import { createClient } from '@supabase/supabase-js';

// Обработчик для получения кредитных карт
export default async function handler(req, res) {
    // Принимаем только GET-запросы
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

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
        // Выполняем запрос к таблице 'credit_cards'
        const { data, error } = await supabase
            .from('credit_cards')
            .select('*')
            .order('created_at', { ascending: false });

        // Обрабатываем ошибку при выполнении запроса
        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Отправляем успешный ответ с данными
        res.status(200).json({ creditCards: data });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
} 