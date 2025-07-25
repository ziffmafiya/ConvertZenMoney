-- Добавляем столбец is_anomaly, если он еще не существует
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS is_anomaly BOOLEAN DEFAULT FALSE;

-- Добавляем столбец anomaly_reason, если он еще не существует
ALTER TABLE transactions
ADD COLUMN IF NOT EXISTS anomaly_reason TEXT;
