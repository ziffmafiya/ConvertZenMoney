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

    // Получаем кредитные карты пользователя
    const { data: cards, error: cardsError } = await supabase
      .from('credit_cards')
      .select(`
        *,
        card_payments (
          id,
          payment_date,
          payment_amount,
          payment_type,
          statement_period_start,
          statement_period_end
        ),
        card_transactions (
          id,
          transaction_date,
          amount,
          description,
          category,
          merchant,
          transaction_type,
          is_grace_period_eligible
        )
      `)
      .eq('user_id', user_id)
      .order('created_at', { ascending: false });

    if (cardsError) {
      console.error('Error fetching credit cards:', cardsError);
      return res.status(500).json({ error: 'Failed to fetch credit cards' });
    }

    // Рассчитываем дополнительную информацию для каждой карты
    const cardsWithCalculations = cards.map(card => {
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
      const minimumPayment = parseFloat(card.current_balance) * parseFloat(card.minimum_payment_percent);
      
      // Получаем транзакции за текущий период выписки
      const currentPeriodTransactions = card.card_transactions?.filter(transaction => {
        const transactionDate = new Date(transaction.transaction_date);
        return transactionDate >= statementDate && transactionDate <= today;
      }) || [];
      
      // Рассчитываем сумму транзакций, подходящих для беспроцентного периода
      const gracePeriodEligibleAmount = currentPeriodTransactions
        .filter(transaction => transaction.is_grace_period_eligible)
        .reduce((sum, transaction) => sum + parseFloat(transaction.amount), 0);
      
      // Проверяем, находится ли карта в беспроцентном периоде
      const isInGracePeriod = today <= gracePeriodEnd;
      
      // Рассчитываем проценты, если не в беспроцентном периоде
      let interestCharged = 0;
      if (!isInGracePeriod && parseFloat(card.current_balance) > 0 && card.interest_rate) {
        const dailyRate = parseFloat(card.interest_rate) / 365;
        const daysSinceStatement = Math.floor((today - statementDate) / (1000 * 60 * 60 * 24));
        interestCharged = parseFloat(card.current_balance) * dailyRate * daysSinceStatement;
      }
      
      // Рассчитываем кредитный рейтинг (utilization ratio)
      const utilizationRatio = parseFloat(card.current_balance) / parseFloat(card.credit_limit) * 100;
      
      return {
        ...card,
        statement_date_formatted: statementDate.toISOString().split('T')[0],
        payment_due_date_formatted: paymentDueDate.toISOString().split('T')[0],
        grace_period_end: gracePeriodEnd.toISOString().split('T')[0],
        is_in_grace_period: isInGracePeriod,
        days_until_payment_due: Math.ceil((paymentDueDate - today) / (1000 * 60 * 60 * 24)),
        days_until_grace_period_end: Math.ceil((gracePeriodEnd - today) / (1000 * 60 * 60 * 24)),
        minimum_payment: minimumPayment,
        grace_period_eligible_amount: gracePeriodEligibleAmount,
        interest_charged: interestCharged,
        utilization_ratio: utilizationRatio,
        current_period_transactions: currentPeriodTransactions.length,
        total_transactions: card.card_transactions?.length || 0
      };
    });

    // Рассчитываем общую статистику
    const totalCards = cardsWithCalculations.length;
    const activeCards = cardsWithCalculations.filter(card => card.status === 'active');
    const totalCreditLimit = activeCards.reduce((sum, card) => sum + parseFloat(card.credit_limit), 0);
    const totalCurrentBalance = activeCards.reduce((sum, card) => sum + parseFloat(card.current_balance), 0);
    const totalAvailableCredit = activeCards.reduce((sum, card) => sum + parseFloat(card.available_credit), 0);
    const overallUtilizationRatio = totalCreditLimit > 0 ? (totalCurrentBalance / totalCreditLimit) * 100 : 0;

    const summary = {
      total_cards: totalCards,
      active_cards: activeCards.length,
      total_credit_limit: totalCreditLimit,
      total_current_balance: totalCurrentBalance,
      total_available_credit: totalAvailableCredit,
      overall_utilization_ratio: overallUtilizationRatio,
      cards_in_grace_period: activeCards.filter(card => card.is_in_grace_period).length
    };

    res.status(200).json({
      cards: cardsWithCalculations,
      summary
    });

  } catch (error) {
    console.error('Error in get-credit-cards:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 