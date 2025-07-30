const express = require('express');
const router = express.Router();
const db = require('./db');

// Loan Tracking Endpoints
router.post('/track-loan', async (req, res) => {
  try {
    const { id, principal, interest_rate, term_months, start_date, monthly_payment, remaining_balance, paid_amount } = req.body;
    
    if (id) {
      const result = await db.query(
        'UPDATE loans SET principal = $1, interest_rate = $2, term_months = $3, start_date = $4, monthly_payment = $5, remaining_balance = $6, paid_amount = $7 WHERE id = $8 RETURNING *',
        [principal, interest_rate, term_months, start_date, monthly_payment, remaining_balance, paid_amount, id]
      );
      res.json(result.rows[0]);
    } else {
      const result = await db.query(
        'INSERT INTO loans (principal, interest_rate, term_months, start_date, monthly_payment, remaining_balance, paid_amount) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [principal, interest_rate, term_months, start_date, monthly_payment, remaining_balance, paid_amount]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/loan-progress/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const loanResult = await db.query('SELECT * FROM loans WHERE id = $1', [id]);
    
    if (loanResult.rows.length === 0) {
      return res.status(404).send('Loan not found');
    }
    
    const loan = loanResult.rows[0];
    const paymentsMade = Math.floor(
      (new Date() - new Date(loan.start_date)) / (30 * 24 * 60 * 60 * 1000)
    );
    
    const progress = {
      paymentsMade: Math.min(paymentsMade, loan.term_months),
      totalPayments: loan.term_months,
      percentComplete: Math.round((Math.min(paymentsMade, loan.term_months) / loan.term_months) * 100),
      remainingBalance: loan.remaining_balance,
      nextPaymentDate: calculateNextPayment(loan.start_date, paymentsMade)
    };
    
    res.json(progress);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Credit Card Endpoints
router.post('/set-grace-period', async (req, res) => {
  try {
    const { card_id, card_name, grace_period_days, statement_day, payment_due_day } = req.body;

    if (card_id) {
      // Update existing card
      const result = await db.query(
        `UPDATE credit_cards 
         SET grace_period_days = $1, statement_day = $2, payment_due_day = $3, card_name = $4
         WHERE id = $5 
         RETURNING *`,
        [grace_period_days, statement_day, payment_due_day, card_name, card_id]
      );
      
      if (result.rows.length === 0) {
        return res.status(404).send('Credit card not found');
      }
      res.json(result.rows[0]);
    } else {
      // Create new card
      if (!card_name) {
        return res.status(400).send('Card name is required for a new card.');
      }
      const result = await db.query(
        `INSERT INTO credit_cards (card_name, grace_period_days, statement_day, payment_due_day) 
         VALUES ($1, $2, $3, $4) 
         RETURNING *`,
        [card_name, grace_period_days, statement_day, payment_due_day]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

router.get('/grace-status/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cardResult = await db.query('SELECT * FROM credit_cards WHERE id = $1', [id]);
    
    if (cardResult.rows.length === 0) {
      return res.status(404).send('Credit card not found');
    }
    
    const card = cardResult.rows[0];
    const today = new Date();
    
    const statementDate = new Date(today.getFullYear(), today.getMonth(), card.statement_day);
    if (today < statementDate) {
      statementDate.setMonth(statementDate.getMonth() - 1);
    }
    
    const dueDate = new Date(statementDate);
    dueDate.setDate(dueDate.getDate() + card.grace_period_days);
    
    const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    const transactionsResult = await db.query(
      `SELECT amount FROM transactions 
       WHERE card_id = $1 AND date >= $2`,
      [id, statementDate.toISOString().split('T')[0]]
    );
    
    const totalSpent = transactionsResult.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const minPayment = Math.max(totalSpent * 0.05, 100);
    
    res.json({
      card_id: id,
      current_balance: card.unpaid_balance,
      total_spent_this_period: totalSpent,
      min_payment: minPayment,
      due_date: dueDate.toISOString().split('T')[0],
      days_remaining: daysRemaining
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

// Helper function
function calculateNextPayment(startDate, paymentsMade) {
  const nextDate = new Date(startDate);
  nextDate.setMonth(nextDate.getMonth() + paymentsMade + 1);
  return nextDate.toISOString().split('T')[0];
}

module.exports = router;
