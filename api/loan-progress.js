const express = require('express');
const router = express.Router();
const db = require('./db');

// Calculate remaining payments and progress
router.get('/:id', async (req, res) => {
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

function calculateNextPayment(startDate, paymentsMade) {
  const nextDate = new Date(startDate);
  nextDate.setMonth(nextDate.getMonth() + paymentsMade + 1);
  return nextDate.toISOString().split('T')[0];
}

module.exports = router;
