-- Скрипт для обновления размерности эмбеддинга с 2048 на 768
-- Выполните этот скрипт, если у вас уже есть данные с эмбеддингами размерности 2048

-- Шаг 1: Проверяем текущую структуру таблицы
-- SELECT column_name, data_type, character_maximum_length 
-- FROM information_schema.columns 
-- WHERE table_name = 'transactions' AND column_name = 'description_embedding';

-- Шаг 2: Удаляем старый индекс (если существует)
DROP INDEX IF EXISTS transactions_description_embedding_idx;

-- Шаг 3: Изменяем тип столбца description_embedding на vector(768)
-- ВАЖНО: Это действие удалит все существующие эмбеддинги!
-- Если у вас есть важные данные, сначала сделайте резервную копию
ALTER TABLE transactions ALTER COLUMN description_embedding TYPE vector(768) USING description_embedding::vector(768);

-- Шаг 4: Создаем новый индекс для размерности 768
CREATE INDEX ON transactions USING ivfflat (description_embedding vector_cosine_ops) WITH (lists = 100);

-- Шаг 5: Обновляем функцию match_transactions для размерности 768
CREATE OR REPLACE FUNCTION match_transactions(
  query_embedding vector(768), -- Векторное представление (эмбеддинг) для поиска. Размерность 768.
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
  description_embedding vector(768),
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

-- Примечание: После выполнения этого скрипта все существующие эмбеддинги будут удалены.
-- Вам нужно будет заново загрузить транзакции с эмбеддингами размерности 768. 