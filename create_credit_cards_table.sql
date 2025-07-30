CREATE TABLE credit_cards (
  id SERIAL PRIMARY KEY,
  card_name VARCHAR(255) NOT NULL,
  grace_period_days INT NOT NULL,
  statement_day INT CHECK (statement_day BETWEEN 1 AND 31),
  payment_due_day INT CHECK (payment_due_day BETWEEN 1 AND 31),
  unpaid_balance NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
