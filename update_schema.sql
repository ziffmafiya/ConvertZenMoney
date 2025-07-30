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
