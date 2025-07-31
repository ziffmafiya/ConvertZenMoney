-- Создание функции для получения транзакций без кластеров
-- Эта функция возвращает транзакции, которые еще не были сгруппированы в кластеры
-- Используется для последующего анализа и группировки похожих транзакций
CREATE OR REPLACE FUNCTION get_unclustered_transactions()
RETURNS TABLE (
    id UUID,                    -- Идентификатор транзакции
    description_embedding vector -- Векторное представление описания транзакции
) AS $$
BEGIN
    -- Выполняем запрос для поиска транзакций без кластеров
    RETURN QUERY
    SELECT
        t.id,
        t.description_embedding
    FROM
        transactions t
    LEFT JOIN
        transaction_clusters tc ON t.id = tc.transaction_id -- Соединяем с таблицей кластеров
    WHERE
        t.description_embedding IS NOT NULL  -- Только транзакции с эмбеддингами
        AND tc.id IS NULL;                   -- Только те, которые не входят ни в один кластер
END;
$$ LANGUAGE plpgsql;
