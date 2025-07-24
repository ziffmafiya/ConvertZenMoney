-- Создаем расширение pgvector если не установлено
CREATE EXTENSION IF NOT EXISTS vector;

-- Создаем функцию для векторного поиска
CREATE OR REPLACE FUNCTION match_transactions(
  query_embedding vector(768),
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
  description_embedding vector(768),
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

-- Создаем индекс для ускорения поиска (опционально)
CREATE INDEX ON transactions USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);
