-- Этот скрипт настраивает базу данных Supabase для работы с векторными эмбеддингами с помощью расширения pgvector.

-- Шаг 1: Устанавливаем расширение pgvector, если оно еще не установлено.
-- Это расширение добавляет поддержку векторных типов данных и операций над ними.
CREATE EXTENSION IF NOT EXISTS vector;

-- Шаг 2: Создаем или заменяем функцию для поиска похожих транзакций.
-- Эта функция позволяет находить транзакции, семантически близкие к заданному вектору запроса.
CREATE OR REPLACE FUNCTION match_transactions(
  query_embedding vector(3072), -- Векторное представление (эмбеддинг) для поиска. Размерность 3072.
  match_threshold float,        -- Порог схожести (от 0 до 1). Результаты ниже этого порога будут отфильтрованы.
  match_count int               -- Максимальное количество возвращаемых результатов.
)
RETURNS TABLE ( -- Описываем структуру возвращаемой таблицы.
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
  similarity float -- Степень схожести с вектором запроса.
)
LANGUAGE SQL STABLE -- Указываем, что функция не изменяет данные в базе.
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
    1 - (transactions.description_embedding <=> query_embedding) AS similarity -- Вычисляем косинусное сходство.
  FROM transactions
  WHERE transactions.description_embedding IS NOT NULL -- Ищем только среди транзакций с эмбеддингами.
  AND 1 - (transactions.description_embedding <=> query_embedding) > match_threshold -- Применяем порог схожести.
  ORDER BY similarity DESC -- Сортируем по убыванию схожести.
  LIMIT match_count; -- Ограничиваем количество результатов.
$$;

-- Шаг 3: Создаем индекс типа HNSW для ускорения векторного поиска.
-- Используем HNSW вместо IVFFlat, так как IVFFlat ограничен 2000 измерениями для размерности 3072.
-- Это необязательный, но крайне рекомендуемый шаг для повышения производительности на больших объемах данных.
CREATE INDEX ON transactions USING hnsw (description_embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64);

-- Примечание: При изменении размерности вектора (например, с 768 на 3072),
-- может потребоваться пересоздать столбец 'description_embedding' и переиндексировать данные.
-- Пример команды для изменения типа столбца:
-- ALTER TABLE transactions ALTER COLUMN description_embedding TYPE vector(3072) USING description_embedding::vector(3072);
