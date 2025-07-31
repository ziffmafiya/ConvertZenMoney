import { createClient } from '@supabase/supabase-js';

// Обработчик для добавления кредитной карты
export default async function handler(req, res) {
    // Принимаем только POST-запросы
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Получаем данные кредитной карты из тела запроса
    const { card_name, grace_period_days, statement_day, payment_due_day, unpaid_balance } = req.body;

    // Валидация обязательных полей
    if (!card_name || !grace_period_days) {
        return res.status(400).json({ error: 'Название карты и льготный период обязательны для заполнения' });
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
        // Подготавливаем данные для вставки
        const cardData = {
            card_name: card_name,
            grace_period_days: parseInt(grace_period_days),
            unpaid_balance: unpaid_balance ? parseFloat(unpaid_balance) : 0.00
        };

        // Добавляем опциональные поля
        if (statement_day) cardData.statement_day = parseInt(statement_day);
        if (payment_due_day) cardData.payment_due_day = parseInt(payment_due_day);

        // Вставляем новую кредитную карту в таблицу 'credit_cards'
        const { data, error } = await supabase
            .from('credit_cards')
            .insert([cardData])
            .select();

        // Обрабатываем ошибку при выполнении запроса
        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Отправляем успешный ответ с данными новой карты
        res.status(201).json({ 
            message: 'Кредитная карта успешно добавлена',
            creditCard: data[0]
        });
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
} 