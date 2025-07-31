-- Создание таблицы для хранения информации о кредитах пользователя
-- Эта таблица содержит все необходимые данные для управления кредитами
CREATE TABLE loans (
  id SERIAL PRIMARY KEY,                           -- Уникальный идентификатор кредита (автоинкремент)
  principal NUMERIC(15,2) NOT NULL,                -- Основная сумма кредита (до 13 цифр до запятой, 2 после)
  interest_rate NUMERIC(5,2) NOT NULL,             -- Годовая процентная ставка (до 3 цифр до запятой, 2 после)
  term_months INT NOT NULL,                        -- Срок кредита в месяцах
  start_date DATE NOT NULL,                        -- Дата начала кредита
  monthly_payment NUMERIC(15,2) NOT NULL,          -- Размер ежемесячного платежа
  remaining_balance NUMERIC(15,2) NOT NULL,        -- Оставшаяся сумма к погашению
  paid_amount NUMERIC(15,2) NOT NULL DEFAULT 0.00, -- Уже выплаченная сумма (по умолчанию 0)
  created_at TIMESTAMP DEFAULT NOW()               -- Дата и время создания записи
);
