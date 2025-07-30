-- Скрипт для очистки всех эмбеддингов из базы данных
-- ВАЖНО: Этот скрипт удалит все существующие эмбеддинги!
-- Выполняйте только после создания резервной копии

-- Шаг 1: Создаем резервную копию (раскомментируйте, если нужно)
-- CREATE TABLE transactions_backup AS SELECT * FROM transactions;

-- Шаг 2: Очищаем все эмбеддинги
UPDATE transactions 
SET description_embedding = NULL 
WHERE description_embedding IS NOT NULL;

-- Шаг 3: Проверяем результат
SELECT 
    COUNT(*) as total_transactions,
    COUNT(description_embedding) as transactions_with_embeddings,
    COUNT(*) - COUNT(description_embedding) as transactions_without_embeddings
FROM transactions;

-- Шаг 4: Очищаем таблицу кластеров (если есть)
DELETE FROM transaction_clusters;

-- Шаг 5: Проверяем, что кластеры очищены
SELECT COUNT(*) as remaining_clusters FROM transaction_clusters;

-- Примечание: После выполнения этого скрипта:
-- 1. Все эмбеддинги будут удалены
-- 2. Все кластеры будут удалены
-- 3. Нужно будет заново загрузить транзакции с эмбеддингами размерности 768 