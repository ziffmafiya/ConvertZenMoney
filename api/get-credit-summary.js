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

    // Получаем кредиты
    const { data: loans, error: loansError } = await supabase
      .from('credit_loans')
      .select(`
        *,
        loan_payments (
          id,
          payment_date,
          payment_amount,
          principal_paid,
          interest_paid
        )
      `)
      .eq('user_id', user_id)
      .eq('status', 'active');

    if (loansError) {
      console.error('Error fetching loans:', loansError);
      return res.status(500).json({ error: 'Failed to fetch loans' });
    }

    // Получаем кредитные карты
    const { data: cards, error: cardsError } = await supabase
      .from('credit_cards')
      .select(`
        *,
        card_payments (
          id,
          payment_date,
          payment_amount
        ),
        card_transactions (
          id,
          transaction_date,
          amount,
          is_grace_period_eligible
        )
      `)
      .eq('user_id', user_id)
      .eq('status', 'active');

    if (cardsError) {
      console.error('Error fetching credit cards:', cardsError);
      return res.status(500).json({ error: 'Failed to fetch credit cards' });
    }

    // Рассчитываем статистику по кредитам
    const loansSummary = loans.reduce((summary, loan) => {
      const totalPaid = loan.loan_payments?.reduce((sum, payment) => sum + parseFloat(payment.payment_amount), 0) || 0;
      const remainingBalance = parseFloat(loan.principal_amount) - totalPaid;
      
      return {
        total_loans: summary.total_loans + 1,
        total_debt: summary.total_debt + remainingBalance,
        total_monthly_payments: summary.total_monthly_payments + parseFloat(loan.monthly_payment),
        total_paid: summary.total_paid + totalPaid,
        average_interest_rate: summary.average_interest_rate + parseFloat(loan.interest_rate)
      };
    }, {
      total_loans: 0,
      total_debt: 0,
      total_monthly_payments: 0,
      total_paid: 0,
      average_interest_rate: 0
    });

    if (loansSummary.total_loans > 0) {
      loansSummary.average_interest_rate = loansSummary.average_interest_rate / loansSummary.total_loans;
    }

    // Рассчитываем статистику по кредитным картам
    const cardsSummary = cards.reduce((summary, card) => {
      const currentBalance = parseFloat(card.current_balance);
      const creditLimit = parseFloat(card.credit_limit);
      
      return {
        total_cards: summary.total_cards + 1,
        total_credit_limit: summary.total_credit_limit + creditLimit,
        total_current_balance: summary.total_current_balance + currentBalance,
        total_available_credit: summary.total_available_credit + (creditLimit - currentBalance)
      };
    }, {
      total_cards: 0,
      total_credit_limit: 0,
      total_current_balance: 0,
      total_available_credit: 0
    });

    // Рассчитываем общую статистику
    const totalDebt = loansSummary.total_debt + cardsSummary.total_current_balance;
    const totalMonthlyObligations = loansSummary.total_monthly_payments;
    const overallUtilizationRatio = cardsSummary.total_credit_limit > 0 
      ? (cardsSummary.total_current_balance / cardsSummary.total_credit_limit) * 100 
      : 0;

    // Рассчитываем беспроцентный период для карт
    const today = new Date();
    const cardsInGracePeriod = cards.filter(card => {
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const statementDate = new Date(currentYear, currentMonth, card.statement_date);
      
      if (statementDate < today) {
        statementDate.setMonth(statementDate.getMonth() + 1);
      }
      
      const gracePeriodEnd = new Date(statementDate);
      gracePeriodEnd.setDate(statementDate.getDate() + card.grace_period_days);
      
      return today <= gracePeriodEnd;
    });

    // Рассчитываем ближайшие платежи
    const upcomingPayments = [];
    
    // Добавляем платежи по кредитам
    loans.forEach(loan => {
      const startDate = new Date(loan.start_date);
      const monthsSinceStart = (today.getFullYear() - startDate.getFullYear()) * 12 + 
                              (today.getMonth() - startDate.getMonth());
      const nextPaymentDate = new Date(startDate);
      nextPaymentDate.setMonth(startDate.getMonth() + monthsSinceStart + 1);
      
      if (nextPaymentDate > today) {
        upcomingPayments.push({
          type: 'loan',
          name: loan.loan_name,
          amount: parseFloat(loan.monthly_payment),
          due_date: nextPaymentDate.toISOString().split('T')[0],
          days_until_due: Math.ceil((nextPaymentDate - today) / (1000 * 60 * 60 * 24))
        });
      }
    });

    // Добавляем платежи по кредитным картам
    cards.forEach(card => {
      const currentMonth = today.getMonth();
      const currentYear = today.getFullYear();
      const paymentDueDate = new Date(currentYear, currentMonth, card.payment_due_date);
      
      if (paymentDueDate < today) {
        paymentDueDate.setMonth(paymentDueDate.getMonth() + 1);
      }
      
      if (paymentDueDate > today) {
        const minimumPayment = parseFloat(card.current_balance) * parseFloat(card.minimum_payment_percent);
        upcomingPayments.push({
          type: 'credit_card',
          name: card.card_name,
          amount: minimumPayment,
          due_date: paymentDueDate.toISOString().split('T')[0],
          days_until_due: Math.ceil((paymentDueDate - today) / (1000 * 60 * 60 * 24))
        });
      }
    });

    // Сортируем по дате платежа
    upcomingPayments.sort((a, b) => a.days_until_due - b.days_until_due);

    const summary = {
      loans: loansSummary,
      credit_cards: {
        ...cardsSummary,
        cards_in_grace_period: cardsInGracePeriod.length,
        overall_utilization_ratio: overallUtilizationRatio
      },
      overall: {
        total_debt: totalDebt,
        total_monthly_obligations: totalMonthlyObligations,
        debt_to_income_ratio: 0, // Можно рассчитать, если есть данные о доходах
        credit_health_score: calculateCreditHealthScore(overallUtilizationRatio, loansSummary.average_interest_rate)
      },
      upcoming_payments: upcomingPayments.slice(0, 5), // Топ-5 ближайших платежей
      alerts: generateAlerts(upcomingPayments, cardsInGracePeriod, overallUtilizationRatio)
    };

    res.status(200).json(summary);

  } catch (error) {
    console.error('Error in get-credit-summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}

// Функция для расчета кредитного рейтинга
function calculateCreditHealthScore(utilizationRatio, averageInterestRate) {
  let score = 100;
  
  // Снижаем балл за высокую утилизацию кредита
  if (utilizationRatio > 90) score -= 30;
  else if (utilizationRatio > 80) score -= 20;
  else if (utilizationRatio > 70) score -= 10;
  else if (utilizationRatio > 50) score -= 5;
  
  // Снижаем балл за высокие процентные ставки
  if (averageInterestRate > 0.15) score -= 20;
  else if (averageInterestRate > 0.12) score -= 15;
  else if (averageInterestRate > 0.10) score -= 10;
  else if (averageInterestRate > 0.08) score -= 5;
  
  return Math.max(0, score);
}

// Функция для генерации предупреждений
function generateAlerts(upcomingPayments, cardsInGracePeriod, utilizationRatio) {
  const alerts = [];
  
  // Предупреждения о просроченных платежах
  const overduePayments = upcomingPayments.filter(payment => payment.days_until_due < 0);
  if (overduePayments.length > 0) {
    alerts.push({
      type: 'overdue',
      message: `У вас ${overduePayments.length} просроченных платежей`,
      severity: 'high'
    });
  }
  
  // Предупреждения о приближающихся платежах
  const urgentPayments = upcomingPayments.filter(payment => payment.days_until_due <= 3 && payment.days_until_due >= 0);
  if (urgentPayments.length > 0) {
    alerts.push({
      type: 'urgent',
      message: `У вас ${urgentPayments.length} платежей в ближайшие 3 дня`,
      severity: 'medium'
    });
  }
  
  // Предупреждения о высокой утилизации кредита
  if (utilizationRatio > 80) {
    alerts.push({
      type: 'high_utilization',
      message: 'Высокая утилизация кредитных карт может негативно влиять на кредитный рейтинг',
      severity: 'medium'
    });
  }
  
  // Информация о беспроцентном периоде
  if (cardsInGracePeriod.length > 0) {
    alerts.push({
      type: 'grace_period',
      message: `${cardsInGracePeriod.length} карт находятся в беспроцентном периоде`,
      severity: 'low'
    });
  }
  
  return alerts;
} 