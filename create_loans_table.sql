CREATE TABLE loans (
  id SERIAL PRIMARY KEY,
  principal NUMERIC(15,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL,
  term_months INT NOT NULL,
  start_date DATE NOT NULL,
  monthly_payment NUMERIC(15,2) NOT NULL,
  remaining_balance NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
