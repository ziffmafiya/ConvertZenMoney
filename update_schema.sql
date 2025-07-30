-- Этот скрипт обновляет схему таблицы 'transactions', добавляя поля для обнаружения аномалий.

-- Добавляем столбец is_anomaly (логический тип), если он еще не существует.
-- Этот столбец будет использоваться для пометки транзакций как аномальных.
-- Значение по умолчанию - FALSE.
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN DEFAULT FALSE;

-- Добавляем столбец anomaly_reason (текстовый тип), если он еще не существует.
-- В этом столбце будет храниться объяснение, почему транзакция была помечена как аномальная.
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS anomaly_reason TEXT;

-- Создаем таблицу для отслеживания кредитов
CREATE TABLE IF NOT EXISTS loans (
  id SERIAL PRIMARY KEY,
  principal NUMERIC(15,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL,
  term_months INT NOT NULL,
  start_date DATE NOT NULL,
  monthly_payment NUMERIC(15,2) NOT NULL,
  remaining_balance NUMERIC(15,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Создаем таблицу для отслеживания кредитных карт
CREATE TABLE IF NOT EXISTS credit_cards (
  id SERIAL PRIMARY KEY,
  card_name VARCHAR(255) NOT NULL,
  grace_period_days INT NOT NULL,
  statement_day INT CHECK (statement_day BETWEEN 1 AND 31),
  payment_due_day INT CHECK (payment_due_day BETWEEN 1 AND 31),
  unpaid_balance NUMERIC(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
