-- Создание таблицы для хранения кластеров транзакций
CREATE TABLE IF NOT EXISTS transaction_clusters (
    id SERIAL PRIMARY KEY,
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE, -- Исправлено на UUID
    cluster_id INT,
    cluster_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для ускорения поиска
CREATE INDEX IF NOT EXISTS idx_transaction_clusters_transaction_id ON transaction_clusters (transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_clusters_cluster_id ON transaction_clusters (cluster_id);
