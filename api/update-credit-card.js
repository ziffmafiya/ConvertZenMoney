import { createClient } from '@supabase/supabase-js';

// Обработчик для обновления кредитной карты
export default async function handler(req, res) {
    // Принимаем только PUT-запросы
    if (req.method !== 'PUT') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Получаем данные из тела запроса
    const { id, card_name, grace_period_days, statement_day, payment_due_day, unpaid_balance } = req.body;

    // Валидация обязательных полей
    if (!id) {
        return res.status(400).json({ error: 'ID кредитной карты обязателен' });
    }

    // Валидация дней (если указаны)
    if (statement_day && (statement_day < 1 || statement_day > 31)) {
        return res.status(400).json({ error: 'День выписки должен быть от 1 до 31' });
    }

    if (payment_due_day && (payment_due_day < 1 || payment_due_day > 31)) {
        return res.status(400).json({ error: 'День платежа должен быть от 1 до 31' });
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
        // Строим объект для обновления
        const updateData = {};
        if (card_name !== undefined) updateData.card_name = card_name;
        if (grace_period_days !== undefined) updateData.grace_period_days = parseInt(grace_period_days);
        if (statement_day !== undefined) updateData.statement_day = statement_day ? parseInt(statement_day) : null;
        if (payment_due_day !== undefined) updateData.payment_due_day = payment_due_day ? parseInt(payment_due_day) : null;
        if (unpaid_balance !== undefined) updateData.unpaid_balance = parseFloat(unpaid_balance);

        // Обновляем кредитную карту в таблице 'credit_cards'
        const { data, error } = await supabase
            .from('credit_cards')
            .update(updateData)
            .eq('id', id)
            .select();

        // Обрабатываем ошибку при выполнении запроса
        if (error) {
            console.error('Supabase update error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Проверяем, была ли найдена карта для обновления
        if (data.length === 0) {
            return res.status(404).json({ error: 'Кредитная карта не найдена' });
        }

        // Отправляем успешный ответ с обновленными данными
        res.status(200).json({ 
            message: 'Кредитная карта успешно обновлена',
            creditCard: data[0]
        });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
} 