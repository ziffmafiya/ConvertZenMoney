// Импорт Supabase клиента для работы с базой данных
import { createClient } from '@supabase/supabase-js';

/**
 * Основной обработчик для всех операций с кредитами
 * Поддерживает GET, POST, PUT, PATCH, DELETE операции для управления кредитами
 * @param {object} req - Объект запроса
 * @param {object} res - Объект ответа
 */
export default async function handler(req, res) {
    // Получаем ключи доступа к Supabase из переменных окружения
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Проверяем наличие обязательных ключей конфигурации
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    // Создаем клиент Supabase для работы с базой данных
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Маршрутизируем запросы по HTTP методам
        switch (req.method) {
            case 'GET':
                return await handleGetLoans(supabase, res); // Получение списка кредитов
            
            case 'POST':
                return await handleAddLoan(supabase, req, res); // Добавление нового кредита
            
            case 'PUT':
                return await handleUpdateLoan(supabase, req, res); // Обновление кредита
            
            case 'PATCH':
                return await handleRecordPayment(supabase, req, res); // Запись платежа
            
            case 'DELETE':
                return await handleDeleteLoan(supabase, req, res); // Удаление кредита
            
            default:
                return res.status(405).json({ error: 'Method Not Allowed' });
        }
    } catch (error) {
        // Обработка непредвиденных ошибок сервера
        console.error('Unhandled server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * Функция для получения всех кредитов пользователя
 * Возвращает список кредитов, отсортированный по дате создания
 * @param {object} supabase - Клиент Supabase
 * @param {object} res - Объект ответа
 */
async function handleGetLoans(supabase, res) {
    try {
        const { data, error } = await supabase
            .from('loans')
            .select('*')
            .order('created_at', { ascending: false }); // Сортировка по дате создания (новые сначала)

        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Для каждого кредита вычисляем дату следующего платежа
        const loansWithNextPayment = data.map(loan => {
            const nextPaymentInfo = calculateNextPaymentDate(
                new Date(loan.start_date),
                loan.term_months,
                loan.monthly_payment,
                loan.paid_amount,
                loan.principal
            );
            return { ...loan, ...nextPaymentInfo };
        });

        res.status(200).json({ loans: loansWithNextPayment });
    } catch (error) {
        console.error('Error in handleGetLoans:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
}

/**
 * Функция для расчета ежемесячного платежа по кредиту
 * Использует стандартную формулу аннуитетного платежа
 * @param {number} principal - Основная сумма кредита
 * @param {number} interestRate - Годовая процентная ставка
 * @param {number} termMonths - Срок кредита в месяцах
 * @returns {number} - Размер ежемесячного платежа
 */
function calculateMonthlyPayment(principal, interestRate, termMonths) {
    const monthlyRate = interestRate / 100 / 12; // Конвертируем годовую ставку в месячную
    if (monthlyRate === 0) {
        return principal / termMonths; // Если ставка 0%, просто делим сумму на срок
    }
    // Формула аннуитетного платежа
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
}

/**
 * Функция для расчета даты следующего платежа и его суммы.
 * Учитывает дату начала кредита, срок, ежемесячный платеж и уже выплаченную сумму.
 * @param {Date} startDate - Дата начала кредита.
 * @param {number} termMonths - Общий срок кредита в месяцах.
 * @param {number} monthlyPayment - Ежемесячный платеж.
 * @param {number} paidAmount - Общая сумма уже выплаченных средств.
 * @param {number} principal - Основная сумма кредита.
 * @returns {{next_payment_date: string|null, next_payment_amount: number|null, days_until_next_payment: number|null}}
 */
function calculateNextPaymentDate(startDate, termMonths, monthlyPayment, paidAmount, principal) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Обнуляем время для корректного сравнения дат

    // Если кредит полностью погашен
    if (paidAmount >= principal) {
        return { next_payment_date: null, next_payment_amount: null, days_until_next_payment: null };
    }

    let nextPaymentDate = null;
    let nextPaymentAmount = monthlyPayment;

    // Определяем количество уже прошедших платежей
    // Это упрощенный расчет, который предполагает, что платежи всегда были вовремя
    const monthsPassed = Math.floor(paidAmount / monthlyPayment);

    // Вычисляем дату следующего ожидаемого платежа
    // Добавляем monthsPassed + 1 к месяцу начала кредита
    nextPaymentDate = new Date(startDate);
    nextPaymentDate.setMonth(startDate.getMonth() + monthsPassed + 1);
    nextPaymentDate.setDate(startDate.getDate()); // Сохраняем день месяца

    // Если дата следующего платежа в прошлом, переносим ее на следующий месяц
    while (nextPaymentDate < today) {
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    }

    // Проверяем, не превышает ли следующая дата платежа общий срок кредита
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + termMonths);

    if (nextPaymentDate > endDate) {
        // Если следующая дата платежа выходит за рамки срока, и кредит еще не погашен,
        // это может быть последний платеж (остаток)
        const remainingBalance = principal - paidAmount;
        if (remainingBalance > 0) {
            nextPaymentDate = endDate; // Последний платеж в конце срока
            nextPaymentAmount = remainingBalance; // Сумма равна остатку
        } else {
            return { next_payment_date: null, next_payment_amount: null, days_until_next_payment: null };
        }
    }

    // Вычисляем количество дней до следующего платежа
    const diffTime = nextPaymentDate.getTime() - today.getTime();
    const daysUntilNextPayment = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return {
        next_payment_date: nextPaymentDate.toISOString().split('T')[0], // Формат YYYY-MM-DD
        next_payment_amount: nextPaymentAmount,
        days_until_next_payment: daysUntilNextPayment
    };
}

/**
 * Функция для добавления нового кредита
 * Валидирует данные и создает новую запись в базе данных
 * @param {object} supabase - Клиент Supabase
 * @param {object} req - Объект запроса
 * @param {object} res - Объект ответа
 */
function calculateMonthlyPayment(principal, interestRate, termMonths) {
    const monthlyRate = interestRate / 100 / 12; // Конвертируем годовую ставку в месячную
    if (monthlyRate === 0) {
        return principal / termMonths; // Если ставка 0%, просто делим сумму на срок
    }
    // Формула аннуитетного платежа
    return principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) / (Math.pow(1 + monthlyRate, termMonths) - 1);
}

/**
 * Функция для добавления нового кредита
 * Валидирует данные и создает новую запись в базе данных
 * @param {object} supabase - Клиент Supabase
 * @param {object} req - Объект запроса
 * @param {object} res - Объект ответа
 */
async function handleAddLoan(supabase, req, res) {
    const { loan_name, principal, interest_rate, term_months, start_date, paid_amount } = req.body;
    
    // Отладочная информация для логирования входящих данных
    console.log('Received loan data:', {
        loan_name,
        principal,
        interest_rate,
        term_months,
        start_date,
        paid_amount
    });

    // Валидация обязательных полей
    if (principal === undefined || principal === null || principal === '' || parseFloat(principal) <= 0) {
        return res.status(400).json({ error: 'Основная сумма должна быть больше 0' });
    }
    
    if (interest_rate === undefined || interest_rate === null || interest_rate === '' || parseFloat(interest_rate) < 0) {
        return res.status(400).json({ error: 'Процентная ставка должна быть неотрицательной' });
    }
    
    if (term_months === undefined || term_months === null || term_months === '' || parseInt(term_months) <= 0) {
        return res.status(400).json({ error: 'Срок кредита должен быть больше 0 месяцев' });
    }
    
    if (!start_date || start_date.trim() === '') {
        return res.status(400).json({ error: 'Дата открытия кредита обязательна' });
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
