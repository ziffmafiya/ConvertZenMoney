import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { user_id } = req.query;

    if (!user_id) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Получаем кредиты пользователя
    const { data: loans, error: loansError } = await supabase
      .from('credit_loans')
      .select(`
        *,
        loan_payments (
          id,
          payment_date,
          payment_amount,
          principal_paid,
          interest_paid,
          remaining_balance,
          payment_type
        )
      `)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch loans' });
    }

    // Рассчитываем дополнительную информацию для каждого кредита
    const loansWithCalculations = loans.map(loan => {
      const totalPaid = loan.loan_payments?.reduce((sum, payment) => sum + parseFloat(payment.payment_amount), 0) || 0;
      const remainingBalance = parseFloat(loan.principal_amount) - totalPaid;
      const progressPercent = (totalPaid / parseFloat(loan.principal_amount)) * 100;
      
      // Рассчитываем следующий платеж
      const today = new Date();
      const startDate = new Date(loan.start_date);
      const monthsSinceStart = (today.getFullYear() - startDate.getFullYear()) * 12 + 
                              (today.getMonth() - startDate.getMonth());
      const nextPaymentDate = new Date(startDate);
      nextPaymentDate.setMonth(startDate.getMonth() + monthsSinceStart + 1);
      
      // Рассчитываем общую сумму к выплате
      const totalAmountToPay = parseFloat(loan.principal_amount) + 
                              (parseFloat(loan.principal_amount) * parseFloat(loan.interest_rate) * parseFloat(loan.loan_term_months) / 12);
      
      return {
        ...loan,
        total_paid: totalPaid,
        remaining_balance: remainingBalance,
        progress_percent: Math.min(progressPercent, 100),
        next_payment_date: nextPaymentDate.toISOString().split('T')[0],
        total_amount_to_pay: totalAmountToPay,
        interest_paid: totalPaid - (parseFloat(loan.principal_amount) - remainingBalance),
        principal_paid: parseFloat(loan.principal_amount) - remainingBalance
      };
    });

    // Рассчитываем общую статистику
    const totalLoans = loansWithCalculations.length;
    const activeLoans = loansWithCalculations.filter(loan => loan.status === 'active');
    const totalDebt = activeLoans.reduce((sum, loan) => sum + loan.remaining_balance, 0);
    const totalMonthlyPayments = activeLoans.reduce((sum, loan) => sum + parseFloat(loan.monthly_payment), 0);
    const totalPaid = loansWithCalculations.reduce((sum, loan) => sum + loan.total_paid, 0);

    const summary = {
      total_loans: totalLoans,
      active_loans: activeLoans.length,
      total_debt: totalDebt,
      total_monthly_payments: totalMonthlyPayments,
      total_paid: totalPaid,
      average_interest_rate: activeLoans.length > 0 
        ? activeLoans.reduce((sum, loan) => sum + parseFloat(loan.interest_rate), 0) / activeLoans.length 
        : 0
    };

    res.status(200).json({
      loans: loansWithCalculations,
      summary
    });

  } catch (error) {
    console.error('Error in get-credit-loans:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 