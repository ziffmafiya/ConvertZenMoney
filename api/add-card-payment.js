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
      card_id,
      payment_date,
      payment_amount,
      payment_type,
      statement_period_start,
      statement_period_end,
      notes
    } = req.body;

    // Валидация обязательных полей
    if (!card_id || !payment_date || !payment_amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: card_id, payment_date, payment_amount' 
      });
    }

    // Получаем информацию о карте
    const { data: card, error: cardError } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', card_id)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: 'Credit card not found' });
    }

    const paymentAmount = parseFloat(payment_amount);
    const currentBalance = parseFloat(card.current_balance);
    
    // Проверяем, не превышает ли платеж текущий баланс
    if (paymentAmount > currentBalance) {
      return res.status(400).json({ 
        error: 'Payment amount cannot exceed current balance' 
      });
    }

    // Создаем платеж
    const { data: newPayment, error: insertError } = await supabase
      .from('card_payments')
      .insert({
        card_id,
        payment_date,
        payment_amount: paymentAmount,
        payment_type: payment_type || 'regular',
        statement_period_start: statement_period_start || null,
        statement_period_end: statement_period_end || null,
        notes: notes || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting payment:', insertError);
      return res.status(500).json({ error: 'Failed to create payment' });
    }

    // Обновляем баланс карты
    const newBalance = currentBalance - paymentAmount;
    const { error: updateError } = await supabase
      .from('credit_cards')
      .update({
        current_balance: newBalance,
        last_payment_amount: paymentAmount,
        last_payment_date: payment_date
      })
      .eq('id', card_id);

    if (updateError) {
      console.error('Error updating card balance:', updateError);
      return res.status(500).json({ error: 'Failed to update card balance' });
    }

    // Рассчитываем дополнительную информацию
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();
    
    // Рассчитываем даты выписки и платежа для текущего месяца
    const statementDate = new Date(currentYear, currentMonth, card.statement_date);
    const paymentDueDate = new Date(currentYear, currentMonth, card.payment_due_date);
    
    // Если дата выписки уже прошла в этом месяце, берем следующий месяц
    if (statementDate < today) {
      statementDate.setMonth(statementDate.getMonth() + 1);
      paymentDueDate.setMonth(paymentDueDate.getMonth() + 1);
    }
    
    // Рассчитываем дату окончания беспроцентного периода
    const gracePeriodEnd = new Date(statementDate);
    gracePeriodEnd.setDate(statementDate.getDate() + card.grace_period_days);
    
    // Рассчитываем минимальный платеж
    const minimumPayment = newBalance * parseFloat(card.minimum_payment_percent);
    
    // Рассчитываем кредитный рейтинг (utilization ratio)
    const utilizationRatio = newBalance / parseFloat(card.credit_limit) * 100;

    const paymentWithCalculations = {
      ...newPayment,
      new_balance: newBalance,
      available_credit: parseFloat(card.credit_limit) - newBalance,
      minimum_payment: minimumPayment,
      utilization_ratio: utilizationRatio,
      is_in_grace_period: today <= gracePeriodEnd,
      grace_period_end: gracePeriodEnd.toISOString().split('T')[0],
      payment_due_date: paymentDueDate.toISOString().split('T')[0],
      days_until_payment_due: Math.ceil((paymentDueDate - today) / (1000 * 60 * 60 * 24)),
      days_until_grace_period_end: Math.ceil((gracePeriodEnd - today) / (1000 * 60 * 60 * 24))
    };

    res.status(201).json({
      message: 'Payment added successfully',
      payment: paymentWithCalculations
    });

  } catch (error) {
    console.error('Error in add-card-payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 