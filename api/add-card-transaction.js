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
      transaction_date,
      amount,
      description,
      category,
      merchant,
      transaction_type,
      is_grace_period_eligible,
      notes
    } = req.body;

    // Валидация обязательных полей
    if (!card_id || !transaction_date || !amount || !description) {
      return res.status(400).json({ 
        error: 'Missing required fields: card_id, transaction_date, amount, description' 
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

    const transactionAmount = parseFloat(amount);
    
    // Проверяем, не превышает ли транзакция доступный кредит
    const newBalance = parseFloat(card.current_balance) + transactionAmount;
    if (newBalance > parseFloat(card.credit_limit)) {
      return res.status(400).json({ 
        error: 'Transaction would exceed credit limit' 
      });
    }

    // Создаем транзакцию
    const { data: newTransaction, error: insertError } = await supabase
      .from('card_transactions')
      .insert({
        card_id,
        transaction_date,
        amount: transactionAmount,
        description,
        category: category || null,
        merchant: merchant || null,
        transaction_type: transaction_type || 'purchase',
        is_grace_period_eligible: is_grace_period_eligible !== false, // По умолчанию true
        notes: notes || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting transaction:', insertError);
      return res.status(500).json({ error: 'Failed to create transaction' });
    }

    // Обновляем баланс карты
    const { error: updateError } = await supabase
      .from('credit_cards')
      .update({
        current_balance: newBalance,
        last_statement_balance: newBalance // Обновляем баланс последней выписки
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

    const transactionWithCalculations = {
      ...newTransaction,
      new_balance: newBalance,
      available_credit: parseFloat(card.credit_limit) - newBalance,
      minimum_payment: minimumPayment,
      utilization_ratio: utilizationRatio,
      is_in_grace_period: today <= gracePeriodEnd,
      grace_period_end: gracePeriodEnd.toISOString().split('T')[0],
      payment_due_date: paymentDueDate.toISOString().split('T')[0]
    };

    res.status(201).json({
      message: 'Transaction added successfully',
      transaction: transactionWithCalculations
    });

  } catch (error) {
    console.error('Error in add-card-transaction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 