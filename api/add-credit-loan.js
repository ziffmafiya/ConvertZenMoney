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
      loan_name,
      loan_type,
      principal_amount,
      interest_rate,
      loan_term_months,
      start_date,
      bank_name,
      account_number,
      notes
    } = req.body;

    // Валидация обязательных полей
    if (!user_id || !loan_name || !loan_type || !principal_amount || 
        !interest_rate || !loan_term_months || !start_date) {
      return res.status(400).json({ 
        error: 'Missing required fields: user_id, loan_name, loan_type, principal_amount, interest_rate, loan_term_months, start_date' 
      });
    }

    // Валидация типов кредитов
    const validLoanTypes = ['personal', 'mortgage', 'auto', 'business', 'other'];
    if (!validLoanTypes.includes(loan_type)) {
      return res.status(400).json({ 
        error: `Invalid loan_type. Must be one of: ${validLoanTypes.join(', ')}` 
      });
    }

    // Рассчитываем дату окончания кредита
    const startDate = new Date(start_date);
    const endDate = new Date(startDate);
    endDate.setMonth(startDate.getMonth() + parseInt(loan_term_months));

    // Рассчитываем ежемесячный платеж по формуле аннуитетного платежа
    const monthlyInterestRate = parseFloat(interest_rate) / 12;
    const principal = parseFloat(principal_amount);
    const termMonths = parseInt(loan_term_months);
    
    let monthlyPayment;
    if (monthlyInterestRate === 0) {
      monthlyPayment = principal / termMonths;
    } else {
      monthlyPayment = principal * 
        (monthlyInterestRate * Math.pow(1 + monthlyInterestRate, termMonths)) / 
        (Math.pow(1 + monthlyInterestRate, termMonths) - 1);
    }

    // Создаем новый кредит
    const { data: newLoan, error: insertError } = await supabase
      .from('credit_loans')
      .insert({
        user_id,
        loan_name,
        loan_type,
        principal_amount: principal,
        interest_rate: parseFloat(interest_rate),
        loan_term_months: termMonths,
        monthly_payment: monthlyPayment,
        start_date: start_date,
        end_date: endDate.toISOString().split('T')[0],
        current_balance: principal,
        bank_name: bank_name || null,
        account_number: account_number || null,
        notes: notes || null
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting loan:', insertError);
      return res.status(500).json({ error: 'Failed to create loan' });
    }

    // Рассчитываем дополнительную информацию
    const totalAmountToPay = principal + (principal * parseFloat(interest_rate) * termMonths / 12);
    const totalInterest = totalAmountToPay - principal;

    const loanWithCalculations = {
      ...newLoan,
      total_amount_to_pay: totalAmountToPay,
      total_interest: totalInterest,
      progress_percent: 0,
      remaining_balance: principal,
      total_paid: 0
    };

    res.status(201).json({
      message: 'Loan created successfully',
      loan: loanWithCalculations
    });

  } catch (error) {
    console.error('Error in add-credit-loan:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 