-- Создание таблицы для хранения информации о кредитных картах пользователя
-- Эта таблица содержит данные для управления кредитными картами и их платежами
CREATE TABLE credit_cards (
  id SERIAL PRIMARY KEY,                           -- Уникальный идентификатор карты (автоинкремент)
  card_name VARCHAR(255) NOT NULL,                 -- Название кредитной карты
  grace_period_days INT NOT NULL,                  -- Льготный период в днях (когда проценты не начисляются)
  statement_day INT CHECK (statement_day BETWEEN 1 AND 31), -- День месяца, когда формируется выписка (1-31)
  payment_due_day INT CHECK (payment_due_day BETWEEN 1 AND 31), -- День месяца, когда должен быть внесен платеж (1-31)
  unpaid_balance NUMERIC(15,2) DEFAULT 0,          -- Неоплаченный баланс по карте (по умолчанию 0)
  created_at TIMESTAMP DEFAULT NOW()               -- Дата и время создания записи
);
