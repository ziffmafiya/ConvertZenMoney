-- Упрощенный скрипт для проверки эмбеддингов в базе данных
-- Этот скрипт не использует array_length, который может вызывать ошибки

-- Проверяем структуру столбца description_embedding
SELECT 
    column_name, 
    data_type,
    CASE 
        WHEN data_type = 'USER-DEFINED' THEN 'vector'
        ELSE data_type 
    END as actual_type
FROM information_schema.columns 
WHERE table_name = 'transactions' AND column_name = 'description_embedding';

-- Проверяем количество транзакций с эмбеддингами
SELECT 
    COUNT(*) as total_transactions,
    COUNT(description_embedding) as transactions_with_embeddings,
    COUNT(*) - COUNT(description_embedding) as transactions_without_embeddings
FROM transactions;

-- Проверяем, есть ли транзакции с эмбеддингами
SELECT 
    CASE 
        WHEN description_embedding IS NOT NULL THEN 'Has embedding'
        ELSE 'No embedding'
    END as embedding_status,
    COUNT(*) as count
FROM transactions 
GROUP BY embedding_status;

-- Показываем примеры транзакций с эмбеддингами (без проверки размерности)
SELECT 
    id,
    payee,
    category_name,
    CASE 
        WHEN description_embedding IS NOT NULL THEN 'Has embedding'
        ELSE 'No embedding'
    END as embedding_status
FROM transactions 
WHERE description_embedding IS NOT NULL
LIMIT 10;

-- Проверяем, есть ли кластеры
SELECT 
    COUNT(*) as total_clusters,
    COUNT(DISTINCT cluster_id) as unique_clusters
FROM transaction_clusters; 