import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const { action, data } = req.body;

    switch (action) {
      case 'get_loans':
        return await handleGetLoans(req, res);
      case 'add_loan':
        return await handleAddLoan(req, res);
      case 'add_loan_payment':
        return await handleAddLoanPayment(req, res);
      case 'get_credit_cards':
        return await handleGetCreditCards(req, res);
      case 'add_credit_card':
        return await handleAddCreditCard(req, res);
      case 'add_card_transaction':
        return await handleAddCardTransaction(req, res);
      case 'add_card_payment':
        return await handleAddCardPayment(req, res);
      case 'get_credit_summary':
        return await handleGetCreditSummary(req, res);
      default:
        return res.status(400).json({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Credit management error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Get user's credit loans
async function handleGetLoans(req, res) {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get loans with payments
    const { data: loans, error: loansError } = await supabase
      .from('credit_loans')
      .select(`
        *,
        loan_payments(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (loansError) throw loansError;

    // Calculate additional fields for each loan
    const enrichedLoans = loans.map(loan => {
      const payments = loan.loan_payments || [];
      const totalPaid = payments.reduce((sum, payment) => sum + parseFloat(payment.payment_amount), 0);
      const remainingBalance = parseFloat(loan.principal_amount) - totalPaid;
      const progressPercent = (totalPaid / parseFloat(loan.principal_amount)) * 100;
      
      // Calculate next payment date (simplified - could be enhanced)
      const nextPaymentDate = new Date();
      nextPaymentDate.setDate(nextPaymentDate.getDate() + 30); // Assume monthly payments

      return {
        ...loan,
        total_paid: totalPaid,
        remaining_balance: remainingBalance,
        progress_percent: Math.min(progressPercent, 100),
        next_payment_date: nextPaymentDate.toISOString().split('T')[0],
        total_amount_to_pay: parseFloat(loan.principal_amount) + 
          (parseFloat(loan.principal_amount) * parseFloat(loan.interest_rate) * parseFloat(loan.loan_term_months) / 12)
      };
    });

    // Calculate summary
    const summary = {
      total_loans: loans.length,
      active_loans: loans.filter(loan => loan.status === 'active').length,
      total_debt: enrichedLoans.reduce((sum, loan) => sum + loan.remaining_balance, 0),
      total_monthly_payments: enrichedLoans.reduce((sum, loan) => sum + parseFloat(loan.monthly_payment), 0),
      average_interest_rate: enrichedLoans.length > 0 
        ? enrichedLoans.reduce((sum, loan) => sum + parseFloat(loan.interest_rate), 0) / enrichedLoans.length 
        : 0
    };

    return res.status(200).json({
      loans: enrichedLoans,
      summary
    });
  } catch (error) {
    console.error('Error getting loans:', error);
    return res.status(500).json({ error: 'Failed to get loans' });
  }
}

// Add new credit loan
async function handleAddLoan(req, res) {
  try {
    const { 
      userId, 
      loanName, 
      loanType, 
      principalAmount, 
      interestRate, 
      loanTermMonths, 
      startDate, 
      bankName, 
      accountNumber, 
      notes 
    } = req.body;

    if (!userId || !loanName || !loanType || !principalAmount || !interestRate || !loanTermMonths || !startDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Calculate end date and monthly payment
    const start = new Date(startDate);
    const endDate = new Date(start);
    endDate.setMonth(endDate.getMonth() + parseInt(loanTermMonths));

    // Calculate monthly payment using annuity formula
    const monthlyRate = parseFloat(interestRate) / 12;
    const monthlyPayment = parseFloat(principalAmount) * 
      (monthlyRate * Math.pow(1 + monthlyRate, parseInt(loanTermMonths))) / 
      (Math.pow(1 + monthlyRate, parseInt(loanTermMonths)) - 1);

    const { data, error } = await supabase
      .from('credit_loans')
      .insert({
        user_id: userId,
        loan_name: loanName,
        loan_type: loanType,
        principal_amount: principalAmount,
        interest_rate: interestRate,
        loan_term_months: loanTermMonths,
        monthly_payment: monthlyPayment.toFixed(2),
        start_date: startDate,
        end_date: endDate.toISOString().split('T')[0],
        current_balance: principalAmount,
        bank_name: bankName,
        account_number: accountNumber,
        notes
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ loan: data });
  } catch (error) {
    console.error('Error adding loan:', error);
    return res.status(500).json({ error: 'Failed to add loan' });
  }
}

// Add loan payment
async function handleAddLoanPayment(req, res) {
  try {
    const { userId, loanId, paymentAmount, paymentDate, notes } = req.body;

    if (!userId || !loanId || !paymentAmount || !paymentDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get loan details
    const { data: loan, error: loanError } = await supabase
      .from('credit_loans')
      .select('*')
      .eq('id', loanId)
      .eq('user_id', userId)
      .single();

    if (loanError || !loan) {
      return res.status(404).json({ error: 'Loan not found' });
    }

    // Calculate principal and interest paid
    const monthlyInterest = parseFloat(loan.current_balance) * parseFloat(loan.interest_rate) / 12;
    const interestPaid = Math.min(monthlyInterest, parseFloat(paymentAmount));
    const principalPaid = parseFloat(paymentAmount) - interestPaid;

    // Add payment record
    const { data: payment, error: paymentError } = await supabase
      .from('loan_payments')
      .insert({
        loan_id: loanId,
        payment_amount: paymentAmount,
        principal_paid: principalPaid,
        interest_paid: interestPaid,
        payment_date: paymentDate,
        notes
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Update loan balance
    const newBalance = parseFloat(loan.current_balance) - principalPaid;
    const newTotalPaid = parseFloat(loan.total_paid || 0) + parseFloat(paymentAmount);
    const status = newBalance <= 0 ? 'paid_off' : 'active';

    const { error: updateError } = await supabase
      .from('credit_loans')
      .update({
        current_balance: Math.max(0, newBalance),
        total_paid: newTotalPaid,
        status
      })
      .eq('id', loanId);

    if (updateError) throw updateError;

    return res.status(201).json({ payment });
  } catch (error) {
    console.error('Error adding loan payment:', error);
    return res.status(500).json({ error: 'Failed to add loan payment' });
  }
}

// Get user's credit cards
async function handleGetCreditCards(req, res) {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get credit cards with payments and transactions
    const { data: cards, error: cardsError } = await supabase
      .from('credit_cards')
      .select(`
        *,
        card_payments(*),
        card_transactions(*)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (cardsError) throw cardsError;

    // Calculate additional fields for each card
    const enrichedCards = cards.map(card => {
      const payments = card.card_payments || [];
      const transactions = card.card_transactions || [];
      
      // Calculate grace period
      const statementDate = new Date(card.statement_date);
      const gracePeriodEnd = new Date(statementDate);
      gracePeriodEnd.setDate(gracePeriodEnd.getDate() + parseInt(card.grace_period_days));
      
      const paymentDueDate = new Date(card.payment_due_date);
      const now = new Date();
      
      const isInGracePeriod = now <= gracePeriodEnd;
      const daysUntilPaymentDue = Math.ceil((paymentDueDate - now) / (1000 * 60 * 60 * 24));
      const daysUntilGracePeriodEnd = Math.ceil((gracePeriodEnd - now) / (1000 * 60 * 60 * 24));
      
      // Calculate minimum payment
      const minimumPayment = parseFloat(card.current_balance) * parseFloat(card.minimum_payment_percentage) / 100;
      
      // Calculate grace period eligible amount
      const gracePeriodEligibleAmount = isInGracePeriod ? parseFloat(card.current_balance) : 0;
      
      // Calculate interest charged (simplified)
      const interestCharged = isInGracePeriod ? 0 : parseFloat(card.current_balance) * parseFloat(card.interest_rate) / 12;
      
      // Calculate utilization ratio
      const utilizationRatio = parseFloat(card.current_balance) / parseFloat(card.credit_limit) * 100;

      return {
        ...card,
        statement_date_formatted: statementDate.toLocaleDateString(),
        payment_due_date_formatted: paymentDueDate.toLocaleDateString(),
        grace_period_end: gracePeriodEnd.toISOString().split('T')[0],
        is_in_grace_period: isInGracePeriod,
        days_until_payment_due: daysUntilPaymentDue,
        days_until_grace_period_end: daysUntilGracePeriodEnd,
        minimum_payment: minimumPayment.toFixed(2),
        grace_period_eligible_amount: gracePeriodEligibleAmount.toFixed(2),
        interest_charged: interestCharged.toFixed(2),
        utilization_ratio: utilizationRatio.toFixed(1)
      };
    });

    // Calculate summary
    const summary = {
      total_cards: cards.length,
      total_credit_limit: enrichedCards.reduce((sum, card) => sum + parseFloat(card.credit_limit), 0),
      total_balance: enrichedCards.reduce((sum, card) => sum + parseFloat(card.current_balance), 0),
      average_utilization: enrichedCards.length > 0 
        ? enrichedCards.reduce((sum, card) => sum + parseFloat(card.utilization_ratio), 0) / enrichedCards.length 
        : 0,
      cards_in_grace_period: enrichedCards.filter(card => card.is_in_grace_period).length
    };

    return res.status(200).json({
      cards: enrichedCards,
      summary
    });
  } catch (error) {
    console.error('Error getting credit cards:', error);
    return res.status(500).json({ error: 'Failed to get credit cards' });
  }
}

// Add new credit card
async function handleAddCreditCard(req, res) {
  try {
    const { 
      userId, 
      cardName, 
      creditLimit, 
      currentBalance, 
      interestRate, 
      statementDate, 
      paymentDueDate, 
      gracePeriodDays, 
      minimumPaymentPercentage, 
      bankName, 
      cardNumber, 
      notes 
    } = req.body;

    if (!userId || !cardName || !creditLimit || !currentBalance || !interestRate || !statementDate || !paymentDueDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Set defaults
    const graceDays = gracePeriodDays || 21;
    const minPaymentPercent = minimumPaymentPercentage || 3;

    // Validate balance doesn't exceed limit
    if (parseFloat(currentBalance) > parseFloat(creditLimit)) {
      return res.status(400).json({ error: 'Current balance cannot exceed credit limit' });
    }

    const { data, error } = await supabase
      .from('credit_cards')
      .insert({
        user_id: userId,
        card_name: cardName,
        credit_limit: creditLimit,
        current_balance: currentBalance,
        interest_rate: interestRate,
        statement_date: statementDate,
        payment_due_date: paymentDueDate,
        grace_period_days: graceDays,
        minimum_payment_percentage: minPaymentPercent,
        bank_name: bankName,
        card_number: cardNumber,
        notes
      })
      .select()
      .single();

    if (error) throw error;

    return res.status(201).json({ card: data });
  } catch (error) {
    console.error('Error adding credit card:', error);
    return res.status(500).json({ error: 'Failed to add credit card' });
  }
}

// Add card transaction
async function handleAddCardTransaction(req, res) {
  try {
    const { userId, cardId, transactionAmount, transactionDate, description, category, notes } = req.body;

    if (!userId || !cardId || !transactionAmount || !transactionDate || !description) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get card details
    const { data: card, error: cardError } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: 'Credit card not found' });
    }

    // Check if transaction would exceed credit limit
    const newBalance = parseFloat(card.current_balance) + parseFloat(transactionAmount);
    if (newBalance > parseFloat(card.credit_limit)) {
      return res.status(400).json({ error: 'Transaction would exceed credit limit' });
    }

    // Add transaction
    const { data: transaction, error: transactionError } = await supabase
      .from('card_transactions')
      .insert({
        card_id: cardId,
        transaction_amount: transactionAmount,
        transaction_date: transactionDate,
        description,
        category,
        notes
      })
      .select()
      .single();

    if (transactionError) throw transactionError;

    // Update card balance
    const { error: updateError } = await supabase
      .from('credit_cards')
      .update({
        current_balance: newBalance
      })
      .eq('id', cardId);

    if (updateError) throw updateError;

    return res.status(201).json({ transaction });
  } catch (error) {
    console.error('Error adding card transaction:', error);
    return res.status(500).json({ error: 'Failed to add card transaction' });
  }
}

// Add card payment
async function handleAddCardPayment(req, res) {
  try {
    const { userId, cardId, paymentAmount, paymentDate, notes } = req.body;

    if (!userId || !cardId || !paymentAmount || !paymentDate) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get card details
    const { data: card, error: cardError } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('id', cardId)
      .eq('user_id', userId)
      .single();

    if (cardError || !card) {
      return res.status(404).json({ error: 'Credit card not found' });
    }

    // Add payment record
    const { data: payment, error: paymentError } = await supabase
      .from('card_payments')
      .insert({
        card_id: cardId,
        payment_amount: paymentAmount,
        payment_date: paymentDate,
        notes
      })
      .select()
      .single();

    if (paymentError) throw paymentError;

    // Update card balance
    const newBalance = Math.max(0, parseFloat(card.current_balance) - parseFloat(paymentAmount));

    const { error: updateError } = await supabase
      .from('credit_cards')
      .update({
        current_balance: newBalance,
        last_payment_amount: paymentAmount,
        last_payment_date: paymentDate
      })
      .eq('id', cardId);

    if (updateError) throw updateError;

    return res.status(201).json({ payment });
  } catch (error) {
    console.error('Error adding card payment:', error);
    return res.status(500).json({ error: 'Failed to add card payment' });
  }
}

// Get overall credit summary
async function handleGetCreditSummary(req, res) {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }

    // Get loans summary
    const { data: loans } = await supabase
      .from('credit_loans')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active');

    // Get credit cards summary
    const { data: cards } = await supabase
      .from('credit_cards')
      .select('*')
      .eq('user_id', userId);

    // Calculate totals
    const totalLoanDebt = loans.reduce((sum, loan) => sum + parseFloat(loan.current_balance), 0);
    const totalLoanPayments = loans.reduce((sum, loan) => sum + parseFloat(loan.monthly_payment), 0);
    const totalCardBalance = cards.reduce((sum, card) => sum + parseFloat(card.current_balance), 0);
    const totalCardLimit = cards.reduce((sum, card) => sum + parseFloat(card.credit_limit), 0);

    // Calculate credit health score
    const utilizationRatio = totalCardLimit > 0 ? (totalCardBalance / totalCardLimit) * 100 : 0;
    const averageInterestRate = loans.length > 0 
      ? loans.reduce((sum, loan) => sum + parseFloat(loan.interest_rate), 0) / loans.length 
      : 0;
    
    let creditHealthScore = 100;
    if (utilizationRatio > 30) creditHealthScore -= 20;
    if (utilizationRatio > 50) creditHealthScore -= 20;
    if (averageInterestRate > 0.15) creditHealthScore -= 15;
    if (totalLoanDebt > 100000) creditHealthScore -= 10;
    creditHealthScore = Math.max(0, creditHealthScore);

    // Generate alerts
    const alerts = [];
    const now = new Date();

    // Check for overdue payments
    cards.forEach(card => {
      const paymentDue = new Date(card.payment_due_date);
      if (now > paymentDue) {
        alerts.push({
          type: 'overdue_payment',
          severity: 'high',
          message: `Просрочен платеж по карте ${card.card_name}`,
          due_date: card.payment_due_date
        });
      }
    });

    // Check for upcoming payments
    cards.forEach(card => {
      const paymentDue = new Date(card.payment_due_date);
      const daysUntilDue = Math.ceil((paymentDue - now) / (1000 * 60 * 60 * 24));
      if (daysUntilDue <= 7 && daysUntilDue > 0) {
        alerts.push({
          type: 'upcoming_payment',
          severity: 'medium',
          message: `Скоро платеж по карте ${card.card_name}`,
          due_date: card.payment_due_date,
          days_until_due: daysUntilDue
        });
      }
    });

    // Check for high utilization
    cards.forEach(card => {
      const utilization = (parseFloat(card.current_balance) / parseFloat(card.credit_limit)) * 100;
      if (utilization > 80) {
        alerts.push({
          type: 'high_utilization',
          severity: 'medium',
          message: `Высокая загрузка карты ${card.card_name} (${utilization.toFixed(1)}%)`,
          utilization: utilization
        });
      }
    });

    const summary = {
      total_debt: totalLoanDebt + totalCardBalance,
      total_monthly_obligations: totalLoanPayments,
      credit_health_score: creditHealthScore,
      utilization_ratio: utilizationRatio.toFixed(1),
      average_interest_rate: (averageInterestRate * 100).toFixed(2),
      total_loans: loans.length,
      total_cards: cards.length,
      alerts: alerts
    };

    return res.status(200).json(summary);
  } catch (error) {
    console.error('Error getting credit summary:', error);
    return res.status(500).json({ error: 'Failed to get credit summary' });
  }
} 