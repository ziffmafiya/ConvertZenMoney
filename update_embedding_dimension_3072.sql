-- Скрипт для обновления размерности эмбеддингов с 768 на 3072
-- ВНИМАНИЕ: Этот скрипт очистит все существующие эмбеддинги!

-- Шаг 1: Удаляем старый индекс
DROP INDEX IF EXISTS transactions_description_embedding_idx;

-- Шаг 2: Изменяем тип столбца на vector(3072)
-- Это очистит все существующие эмбеддинги
ALTER TABLE transactions ALTER COLUMN description_embedding TYPE vector(3072) USING description_embedding::vector(3072);

-- Шаг 3: Создаем новый индекс для размерности 3072
CREATE INDEX ON transactions USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);

-- Шаг 4: Обновляем функцию match_transactions
CREATE OR REPLACE FUNCTION match_transactions(
  query_embedding vector(3072), -- Векторное представление (эмбеддинг) для поиска. Размерность 3072.
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  date date,
  category_name text,
  payee text,
  comment text,
  outcome_account_name text,
  outcome numeric,
  income_account_name text,
  income numeric,
  unique_hash text,
  description_embedding vector(3072),
  similarity float
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    transactions.id::uuid,
    transactions.date,
    transactions.category_name,
    transactions.payee,
    transactions.comment,
    transactions.outcome_account_name,
    transactions.outcome,
    transactions.income_account_name,
    transactions.income,
    transactions.unique_hash,
    transactions.description_embedding,
    1 - (transactions.description_embedding <=> query_embedding) AS similarity
  FROM transactions
  WHERE transactions.description_embedding IS NOT NULL
  AND 1 - (transactions.description_embedding <=> query_embedding) > match_threshold
  ORDER BY similarity DESC
  LIMIT match_count;
$$;

-- Шаг 5: Очищаем все кластеры (они больше не актуальны)
DELETE FROM transaction_clusters;

-- Проверяем результат
SELECT 
    COUNT(*) as total_transactions,
    COUNT(description_embedding) as transactions_with_embeddings
FROM transactions; 