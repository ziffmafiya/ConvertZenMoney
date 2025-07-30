const express = require('express');
const router = express.Router();
const db = require('./db');

// Configure grace period for a credit card
router.post('/', async (req, res) => {
  try {
    const { card_id, grace_period_days, statement_day, payment_due_day } = req.body;
    
    if (!card_id) {
      return res.status(400).send('Card ID is required');
    }
    
    const result = await db.query(
      `UPDATE credit_cards 
       SET grace_period_days = $1, statement_day = $2, payment_due_day = $3 
       WHERE id = $4 
       RETURNING *`,
      [grace_period_days, statement_day, payment_due_day, card_id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).send('Credit card not found');
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
});

module.exports = router;
