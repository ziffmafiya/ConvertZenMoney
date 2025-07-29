import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      user_id,
      card_name,
      bank_name,
      credit_limit,
      grace_period_days,
      interest_rate,
      statement_date,
      payment_due_date,
      minimum_payment_percent,
      card_type,
      notes
    } = req.body;

    // Валидация обязательных полей
    if (!user_id || !card_name || !bank_name || !credit_limit || 
        !statement_date || !payment_due_date) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, card_name, bank_name, credit_limit, statement_date, payment_due_date' 
      });
    }

    // Валидация типов карт
    const validCardTypes = ['credit', 'debit', 'charge'];
    if (card_type && !validCardTypes.includes(card_type)) {
      return res.status(400).json({ 
        error: `Invalid card_type. Must be one of: ${validCardTypes.join(', ')}` 
      });
    }

    // Валидация дат
    const statementDay = parseInt(statement_date);
    const paymentDay = parseInt(payment_due_date);
    
    if (statementDay < 1 || statementDay > 31) {
      return res.status(400).json({ error: 'Statement date must be between 1 and 31' });
    }
    
    if (paymentDay < 1 || paymentDay > 31) {
      return res.status(400).json({ error: 'Payment due date must be between 1 and 31' });
    }

    // Создаем новую кредитную карту
    const { data: newCard, error: insertError } = await supabase
      .from('credit_cards')
      .insert({
        user_id,
        card_name,
        bank_name,
        credit_limit: parseFloat(credit_limit),
        current_balance: 0,
        grace_period_days: grace_period_days || 21,
        interest_rate: interest_rate ? parseFloat(interest_rate) : null,
        statement_date: statementDay,
        payment_due_date: paymentDay,
        minimum_payment_percent: minimum_payment_percent ? parseFloat(minimum_payment_percent) : 0.05,
        card_type: card_type || 'credit',
        notes: notes || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting credit card:', insertError);
      return res.status(500).json({ error: 'Failed to create credit card' });
    }

    // Рассчитываем дополнительную информацию
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Рассчитываем даты выписки и платежа для текущего месяца
    const statementDate = new Date(currentYear, currentMonth, newCard.statement_date);
    const paymentDueDate = new Date(currentYear, currentMonth, newCard.payment_due_date);
    
    // Если дата выписки уже прошла в этом месяце, берем следующий месяц
    if (statementDate < today) {
      statementDate.setMonth(statementDate.getMonth() + 1);
      paymentDueDate.setMonth(paymentDueDate.getMonth() + 1);
    }
    
    // Рассчитываем дату окончания беспроцентного периода
    const gracePeriodEnd = new Date(statementDate);
    gracePeriodEnd.setDate(statementDate.getDate() + newCard.grace_period_days);

    const cardWithCalculations = {
      ...newCard,
      statement_date_formatted: statementDate.toISOString().split('T')[0],
      payment_due_date_formatted: paymentDueDate.toISOString().split('T')[0],
      grace_period_end: gracePeriodEnd.toISOString().split('T')[0],
      is_in_grace_period: true,
      days_until_payment_due: Math.ceil((paymentDueDate - today) / (1000 * 60 * 60 * 24)),
      days_until_grace_period_end: Math.ceil((gracePeriodEnd - today) / (1000 * 60 * 60 * 24)),
      minimum_payment: 0,
      grace_period_eligible_amount: 0,
      interest_charged: 0,
      utilization_ratio: 0,
      current_period_transactions: 0,
      total_transactions: 0
    };

    res.status(201).json({
      message: 'Credit card created successfully',
      card: cardWithCalculations
    });

  } catch (error) {
    console.error('Error in add-credit-card:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 