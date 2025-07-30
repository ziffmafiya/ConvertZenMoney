-- Скрипт для проверки размерности эмбеддингов в базе данных
-- Выполните этот скрипт, чтобы понять, какие эмбеддинги у вас есть

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

-- Проверяем размерность эмбеддингов (если они есть)
-- Используем функцию pgvector для получения размерности
SELECT 
    CASE 
        WHEN description_embedding IS NOT NULL THEN 
            array_length(description_embedding::vector, 1)
        ELSE NULL 
    END as embedding_dimension,
    COUNT(*) as count
FROM transactions 
WHERE description_embedding IS NOT NULL
GROUP BY embedding_dimension
ORDER BY embedding_dimension;

-- Показываем примеры транзакций с эмбеддингами
SELECT 
    id,
    payee,
    category_name,
    CASE 
        WHEN description_embedding IS NOT NULL THEN 
            array_length(description_embedding::vector, 1)
        ELSE NULL 
    END as embedding_dimension
FROM transactions 
WHERE description_embedding IS NOT NULL
LIMIT 10; 