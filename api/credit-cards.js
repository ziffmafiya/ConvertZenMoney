import { createClient } from '@supabase/supabase-js';

// Обработчик для всех операций с кредитными картами
export default async function handler(req, res) {
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
        switch (req.method) {
            case 'GET':
                return await handleGetCreditCards(supabase, res);

            case 'POST':
                return await handleAddCreditCard(supabase, req, res);

            case 'PUT':
                return await handleUpdateCreditCard(supabase, req, res);

            case 'DELETE':
                return await handleDeleteCreditCard(supabase, req, res);

            default:
                return res.status(405).json({ error: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Функция для получения всех кредитных карт
async function handleGetCreditCards(supabase, res) {
    try {
        const { data, error } = await supabase
            .from('credit_cards')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ creditCards: data });
    } catch (error) {
        console.error('Error in handleGetCreditCards:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Функция для добавления новой кредитной карты
async function handleAddCreditCard(supabase, req, res) {
    const { card_name, grace_period_days, statement_day, payment_due_day, unpaid_balance, first_transaction_date } = req.body;
    
    // Отладочная информация
    console.log('Received credit card data:', {
        card_name,
        grace_period_days,
        statement_day,
        payment_due_day,
        first_transaction_date,
        unpaid_balance
    });

    // Валидация обязательных полей
    if (!card_name || card_name.trim() === '') {
        return res.status(400).json({ error: 'Название карты обязательно для заполнения' });
    }
    
    if (grace_period_days === undefined || grace_period_days === null || grace_period_days === '' || parseInt(grace_period_days) <= 0) {
        return res.status(400).json({ error: 'Льготный период должен быть больше 0 дней' });
    }

    // Валидация дней (если указаны)
    if (statement_day && (statement_day < 1 || statement_day > 31)) {
        return res.status(400).json({ error: 'День выписки должен быть от 1 до 31' });
    }

    if (payment_due_day && (payment_due_day < 1 || payment_due_day > 31)) {
        return res.status(400).json({ error: 'День платежа должен быть от 1 до 31' });
    }

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
        if (first_transaction_date) cardData.first_transaction_date = first_transaction_date;

        // Вставляем новую кредитную карту в таблицу 'credit_cards'
        const { data, error } = await supabase
            .from('credit_cards')
            .insert([cardData])
            .select();

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({
            message: 'Кредитная карта успешно добавлена',
            creditCard: data[0]
        });
    } catch (error) {
        console.error('Error in handleAddCreditCard:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Функция для обновления кредитной карты
async function handleUpdateCreditCard(supabase, req, res) {
    const { id, card_name, grace_period_days, statement_day, payment_due_day, unpaid_balance, first_transaction_date } = req.body;

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

    try {
        // Строим объект для обновления
        const updateData = {};
        if (card_name !== undefined) updateData.card_name = card_name;
        if (grace_period_days !== undefined) updateData.grace_period_days = parseInt(grace_period_days);
        if (statement_day !== undefined) updateData.statement_day = statement_day ? parseInt(statement_day) : null;
        if (payment_due_day !== undefined) updateData.payment_due_day = payment_due_day ? parseInt(payment_due_day) : null;
        if (unpaid_balance !== undefined) updateData.unpaid_balance = parseFloat(unpaid_balance);
        if (first_transaction_date !== undefined) updateData.first_transaction_date = first_transaction_date;

        // Обновляем кредитную карту в таблице 'credit_cards'
        const { data, error } = await supabase
            .from('credit_cards')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Supabase update error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Проверяем, была ли найдена карта для обновления
        if (data.length === 0) {
            return res.status(404).json({ error: 'Кредитная карта не найдена' });
        }

        res.status(200).json({
            message: 'Кредитная карта успешно обновлена',
            creditCard: data[0]
        });
    } catch (error) {
        console.error('Error in handleUpdateCreditCard:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Функция для удаления кредитной карты
async function handleDeleteCreditCard(supabase, req, res) {
    const { id } = req.query;

    // Валидация обязательных полей
    if (!id) {
        return res.status(400).json({ error: 'ID кредитной карты обязателен' });
    }

    try {
        // Удаляем кредитную карту из таблицы 'credit_cards'
        const { error } = await supabase
            .from('credit_cards')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase delete error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ 
            message: 'Кредитная карта успешно удалена'
        });
    } catch (error) {
        console.error('Error in handleDeleteCreditCard:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
} 