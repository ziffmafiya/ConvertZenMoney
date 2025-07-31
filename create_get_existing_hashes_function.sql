-- Создание функции для получения существующих хэшей транзакций
-- Эта функция принимает массив хэшей и возвращает те из них, которые уже существуют в таблице транзакций
-- Это необходимо для предотвращения загрузки дубликатов при импорте данных
CREATE OR REPLACE FUNCTION get_existing_hashes(hashes text[])
RETURNS TABLE (hash text) AS $$
BEGIN
    -- Выполняем запрос для поиска существующих хэшей
    -- ANY(hashes) проверяет, содержится ли unique_hash в переданном массиве
    RETURN QUERY
    SELECT unique_hash FROM transactions
    WHERE unique_hash = ANY(hashes);
END;
$$ LANGUAGE plpgsql;
