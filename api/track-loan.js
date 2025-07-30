const express = require('express');
const router = express.Router();
const db = require('./db'); // Assuming db setup exists

// Create or update a loan
router.post('/', async (req, res) => {
  try {
    const { id, principal, interest_rate, term_months, start_date, monthly_payment, remaining_balance } = req.body;
    
    if (id) {
      // Update existing loan
      const result = await db.query(
        'UPDATE loans SET principal = $1, interest_rate = $2, term_months = $3, start_date = $4, monthly_payment = $5, remaining_balance = $6 WHERE id = $7 RETURNING *',
        [principal, interest_rate, term_months, start_date, monthly_payment, remaining_balance, id]
      );
      res.json(result.rows[0]);
    } else {
      // Create new loan
      const result = await db.query(
        'INSERT INTO loans (principal, interest_rate, term_months, start_date, monthly_payment, remaining_balance) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
        [principal, interest_rate, term_months, start_date, monthly_payment, remaining_balance]
      );
      res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
