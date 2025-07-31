-- Создание таблицы для хранения кластеров транзакций
-- Эта таблица используется для группировки похожих транзакций с помощью ИИ
CREATE TABLE IF NOT EXISTS transaction_clusters (
    id SERIAL PRIMARY KEY,                           -- Уникальный идентификатор записи кластера (автоинкремент)
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE, -- Ссылка на транзакцию с каскадным удалением
    cluster_id INT,                                  -- Идентификатор кластера (группы похожих транзакций)
    cluster_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW() -- Время создания кластера
);

-- Индексы для ускорения поиска по таблице кластеров
-- Индекс по transaction_id для быстрого поиска кластера конкретной транзакции
CREATE INDEX IF NOT EXISTS idx_transaction_clusters_transaction_id ON transaction_clusters (transaction_id);
-- Индекс по cluster_id для быстрого поиска всех транзакций в кластере
CREATE INDEX IF NOT EXISTS idx_transaction_clusters_cluster_id ON transaction_clusters (cluster_id);
