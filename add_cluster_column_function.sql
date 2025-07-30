-- Функция для безопасного добавления колонки cluster_id в таблицу transactions
CREATE OR REPLACE FUNCTION add_cluster_column_if_not_exists()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
    -- Проверяем, существует ли колонка cluster_id
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'cluster_id'
    ) THEN
        -- Добавляем колонку cluster_id
        ALTER TABLE transactions ADD COLUMN cluster_id INTEGER;
        
        -- Создаем индекс для ускорения поиска по кластерам
        CREATE INDEX IF NOT EXISTS idx_transactions_cluster_id ON transactions(cluster_id);
        
        RAISE NOTICE 'Added cluster_id column to transactions table';
    ELSE
        RAISE NOTICE 'cluster_id column already exists in transactions table';
    END IF;
END;
$$; 