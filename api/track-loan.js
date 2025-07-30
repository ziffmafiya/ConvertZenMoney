const db = require('./db');

module.exports = async (req, res) => {
  // Only handle POST requests
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  console.log('Received request at /api/track-loan');
  
  try {
    // Parse JSON body
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    
    await new Promise(resolve => req.on('end', resolve));
    const data = JSON.parse(body);
    
    console.log('Request body:', data);
    const { id, principal, interest_rate, term_months, start_date, monthly_payment, remaining_balance, paid_amount } = data;
    
    if (id) {
      console.log(`Updating loan with ID: ${id}`);
      const result = await db.query(
        'UPDATE loans SET principal = $1, interest_rate = $2, term_months = $3, start_date = $4, monthly_payment = $5, remaining_balance = $6, paid_amount = $7 WHERE id = $8 RETURNING *',
        [principal, interest_rate, term_months, start_date, monthly_payment, remaining_balance, paid_amount, id]
      );
      console.log('Update result:', result.rows[0]);
      res.json(result.rows[0]);
    } else {
      console.log('Creating new loan');
      const result = await db.query(
        'INSERT INTO loans (principal, interest_rate, term_months, start_date, monthly_payment, remaining_balance, paid_amount) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *',
        [principal, interest_rate, term_months, start_date, monthly_payment, remaining_balance, paid_amount]
      );
      console.log('Insert result:', result.rows[0]);
      res.status(201).json(result.rows[0]);
    }
  } catch (err) {
    console.error('Error in /track-loan:', err);
    res.status(500).send('Server error');
  }
};
