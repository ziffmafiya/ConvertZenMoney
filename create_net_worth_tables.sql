-- Создание таблиц для расчета Net Worth (активы минус обязательства)

-- Таблица активов
CREATE TABLE IF NOT EXISTS assets (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'cash', 'investment', 'property', 'vehicle', 'other'
  value NUMERIC(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'UAH',
  description TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица обязательств (долгов)
CREATE TABLE IF NOT EXISTS liabilities (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, -- 'loan', 'credit_card', 'mortgage', 'other'
  amount NUMERIC(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'UAH',
  description TEXT,
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Таблица истории Net Worth для отслеживания изменений во времени
CREATE TABLE IF NOT EXISTS net_worth_history (
  id SERIAL PRIMARY KEY,
  total_assets NUMERIC(15,2) NOT NULL,
  total_liabilities NUMERIC(15,2) NOT NULL,
  net_worth NUMERIC(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'UAH',
  recorded_at TIMESTAMP DEFAULT NOW()
);

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_assets_type ON assets(type);
CREATE INDEX IF NOT EXISTS idx_liabilities_type ON liabilities(type);
CREATE INDEX IF NOT EXISTS idx_net_worth_history_date ON net_worth_history(recorded_at);

-- Комментарии к таблицам
COMMENT ON TABLE assets IS 'Таблица для хранения активов пользователя';
COMMENT ON TABLE liabilities IS 'Таблица для хранения обязательств пользователя';
COMMENT ON TABLE net_worth_history IS 'История изменений Net Worth для построения графиков'; 