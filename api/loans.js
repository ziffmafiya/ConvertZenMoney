import { createClient } from '@supabase/supabase-js';

// Обработчик для всех операций с кредитами
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
                return await handleGetLoans(supabase, res);
            
            case 'POST':
                return await handleAddLoan(supabase, req, res);
            
            case 'PUT':
                return await handleUpdateLoan(supabase, req, res);
            
            case 'PATCH':
                return await handleRecordPayment(supabase, req, res);
            
            case 'DELETE':
                return await handleDeleteLoan(supabase, req, res);
            
            default:
                return res.status(405).json({ error: 'Method Not Allowed' });
        }
    } catch (error) {
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Функция для получения всех кредитов
async function handleGetLoans(supabase, res) {
    try {
        const { data, error } = await supabase
            .from('loans')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ loans: data });
    } catch (error) {
        console.error('Error in handleGetLoans:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Функция для расчета ежемесячного платежа
function calculateMonthlyPayment(principal, interestRate, termMonths) {
    const monthlyRate = interestRate / 100 / 12;
    if (monthlyRate === 0) {
        return principal / termMonths;
    }
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
}

// Функция для добавления нового кредита
async function handleAddLoan(supabase, req, res) {
    const { loan_name, principal, interest_rate, term_months, start_date, paid_amount } = req.body;

    // Валидация обязательных полей
    if (!principal || !interest_rate || !term_months || !start_date) {
        return res.status(400).json({ error: 'Основная сумма, процентная ставка, срок и дата открытия обязательны для заполнения' });
    }

    try {
        // Автоматически рассчитываем ежемесячный платеж
        const monthly_payment = calculateMonthlyPayment(parseFloat(principal), parseFloat(interest_rate), parseInt(term_months));
        
        // Вычисляем оставшийся баланс (основная сумма минус уже выплаченная)
        const initialPaidAmount = paid_amount ? parseFloat(paid_amount) : 0.00;
        const remaining_balance = Math.max(0, parseFloat(principal) - initialPaidAmount);

        // Вставляем новый кредит в таблицу 'loans'
        const { data, error } = await supabase
            .from('loans')
            .insert([{
                loan_name: loan_name || `Кредит #${Date.now()}`,
                principal: parseFloat(principal),
                interest_rate: parseFloat(interest_rate),
                term_months: parseInt(term_months),
                start_date: start_date,
                monthly_payment: monthly_payment,
                remaining_balance: remaining_balance,
                paid_amount: initialPaidAmount
            }])
            .select();

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(201).json({ 
            message: 'Кредит успешно добавлен',
            loan: data[0]
        });
    } catch (error) {
        console.error('Error in handleAddLoan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Функция для обновления кредита
async function handleUpdateLoan(supabase, req, res) {
    const { id, paid_amount, remaining_balance } = req.body;

    // Валидация обязательных полей
    if (!id) {
        return res.status(400).json({ error: 'ID кредита обязателен' });
    }

    try {
        // Строим объект для обновления
        const updateData = {};
        if (paid_amount !== undefined) updateData.paid_amount = parseFloat(paid_amount);
        if (remaining_balance !== undefined) updateData.remaining_balance = parseFloat(remaining_balance);

        // Обновляем кредит в таблице 'loans'
        const { data, error } = await supabase
            .from('loans')
            .update(updateData)
            .eq('id', id)
            .select();

        if (error) {
            console.error('Supabase update error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Проверяем, был ли найден кредит для обновления
        if (data.length === 0) {
            return res.status(404).json({ error: 'Кредит не найден' });
        }

        res.status(200).json({ 
            message: 'Кредит успешно обновлен',
            loan: data[0]
        });
    } catch (error) {
        console.error('Error in handleUpdateLoan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Функция для записи платежа по кредиту
async function handleRecordPayment(supabase, req, res) {
    const { loan_id, payment_amount } = req.body;

    // Валидация обязательных полей
    if (!loan_id || !payment_amount) {
        return res.status(400).json({ error: 'ID кредита и сумма платежа обязательны' });
    }

    if (payment_amount <= 0) {
        return res.status(400).json({ error: 'Сумма платежа должна быть больше нуля' });
    }

    try {
        // Сначала получаем текущие данные кредита
        const { data: loanData, error: fetchError } = await supabase
            .from('loans')
            .select('*')
            .eq('id', loan_id)
            .single();

        if (fetchError) {
            console.error('Error fetching loan:', fetchError);
            return res.status(404).json({ error: 'Кредит не найден' });
        }

        // Вычисляем новые значения
        const newPaidAmount = loanData.paid_amount + parseFloat(payment_amount);
        const newRemainingBalance = Math.max(0, loanData.remaining_balance - parseFloat(payment_amount));

        // Обновляем кредит
        const { data, error } = await supabase
            .from('loans')
            .update({
                paid_amount: newPaidAmount,
                remaining_balance: newRemainingBalance
            })
            .eq('id', loan_id)
            .select();

        if (error) {
            console.error('Supabase update error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ 
            message: 'Платеж успешно записан',
            loan: data[0],
            payment_amount: parseFloat(payment_amount)
        });
    } catch (error) {
        console.error('Error in handleRecordPayment:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

// Функция для удаления кредита
async function handleDeleteLoan(supabase, req, res) {
    const { id } = req.query;

    // Валидация обязательных полей
    if (!id) {
        return res.status(400).json({ error: 'ID кредита обязателен' });
    }

    try {
        // Удаляем кредит из таблицы 'loans'
        const { error } = await supabase
            .from('loans')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Supabase delete error:', error);
            return res.status(500).json({ error: error.message });
        }

        res.status(200).json({ 
            message: 'Кредит успешно удален'
        });
    } catch (error) {
        console.error('Error in handleDeleteLoan:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
} 