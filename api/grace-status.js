const express = require('express');
const router = express.Router();
const db = require('./db');

// Calculate required payment to avoid interest
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const cardResult = await db.query('SELECT * FROM credit_cards WHERE id = $1', [id]);
    
    if (cardResult.rows.length === 0) {
      return res.status(404).send('Credit card not found');
    }
    
    const card = cardResult.rows[0];
    const today = new Date();
    
    // Calculate statement date
    const statementDate = new Date(today.getFullYear(), today.getMonth(), card.statement_day);
    if (today < statementDate) {
      statementDate.setMonth(statementDate.getMonth() - 1);
    }
    
    // Calculate due date
    const dueDate = new Date(statementDate);
    dueDate.setDate(dueDate.getDate() + card.grace_period_days);
    
    // Calculate days remaining
    const daysRemaining = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    // Calculate required payment
    const transactionsResult = await db.query(
      `SELECT amount FROM transactions 
       WHERE card_id = $1 AND date >= $2`,
      [id, statementDate.toISOString().split('T')[0]]
    );
    
    const totalSpent = transactionsResult.rows.reduce((sum, row) => sum + parseFloat(row.amount), 0);
    const minPayment = Math.max(totalSpent * 0.05, 100); // Example: 5% or min 100
    
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

module.exports = router;
