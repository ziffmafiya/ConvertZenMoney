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
      loan_id,
      payment_date,
      payment_amount,
      payment_type,
      notes
    } = req.body;

    // Валидация обязательных полей
    if (!loan_id || !payment_date || !payment_amount) {
      return res.status(400).json({ 
        error: 'Missing required fields: loan_id, payment_date, payment_amount' 
      });
    }

    // Получаем информацию о кредите
    const { data: loan, error: loanError } = await supabase
      .from('credit_loans')
      .select('*')
      .eq('id', loan_id)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Получаем последний платеж для расчета оставшегося баланса
    const { data: lastPayment } = await supabase
      .from('loan_payments')
      .select('remaining_balance')
      .eq('loan_id', loan_id)
      .order('payment_date', { ascending: false })
      .limit(1)
      .single();

    const currentBalance = lastPayment ? lastPayment.remaining_balance : parseFloat(loan.principal_amount);
    const paymentAmount = parseFloat(payment_amount);

    // Рассчитываем распределение платежа между основной суммой и процентами
    const monthlyInterestRate = parseFloat(loan.interest_rate) / 12;
    const interestForPeriod = currentBalance * monthlyInterestRate;
    
    let principalPaid, interestPaid;
    if (paymentAmount <= interestForPeriod) {
      // Если платеж меньше или равен начисленным процентам
      interestPaid = paymentAmount;
      principalPaid = 0;
    } else {
      // Если платеж больше начисленных процентов
      interestPaid = interestForPeriod;
      principalPaid = paymentAmount - interestForPeriod;
    }

    const remainingBalance = currentBalance - principalPaid;

    // Создаем запись о платеже
    const { data: newPayment, error: insertError } = await supabase
      .from('loan_payments')
      .insert({
        loan_id,
        payment_date,
        payment_amount: paymentAmount,
        principal_paid: principalPaid,
        interest_paid: interestPaid,
        remaining_balance: remainingBalance,
        payment_type: payment_type || 'regular',
        notes: notes || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting payment:', insertError);
      return res.status(500).json({ error: 'Failed to create payment' });
    }

    // Обновляем информацию о кредите
    const totalPaid = parseFloat(loan.total_paid || 0) + paymentAmount;
    const { error: updateError } = await supabase
      .from('credit_loans')
      .update({
        current_balance: remainingBalance,
        total_paid: totalPaid,
        status: remainingBalance <= 0 ? 'paid_off' : 'active'
      })
      .eq('id', loan_id);

    if (updateError) {
      console.error('Error updating loan:', updateError);
      return res.status(500).json({ error: 'Failed to update loan' });
    }

    // Рассчитываем прогресс погашения
    const progressPercent = (totalPaid / parseFloat(loan.principal_amount)) * 100;

    const paymentWithCalculations = {
      ...newPayment,
      progress_percent: Math.min(progressPercent, 100),
      loan_status: remainingBalance <= 0 ? 'paid_off' : 'active'
    };

    res.status(201).json({
      message: 'Payment added successfully',
      payment: paymentWithCalculations
    });

  } catch (error) {
    console.error('Error in add-loan-payment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 