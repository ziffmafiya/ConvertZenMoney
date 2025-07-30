<<<<<<< HEAD
-- Эта функция принимает массив хэшей и возвращает те из них, которые уже существуют в таблице транзакций.
-- Это необходимо для предотвращения загрузки дубликатов.
CREATE OR REPLACE FUNCTION get_existing_hashes(hashes text[])
RETURNS TABLE (hash text) AS $$
BEGIN
    RETURN QUERY
    SELECT unique_hash FROM transactions
    WHERE unique_hash = ANY(hashes);
END;
$$ LANGUAGE plpgsql;
=======
-- Эта функция принимает массив хэшей и возвращает те из них, которые уже существуют в таблице транзакций.
-- Это необходимо для предотвращения загрузки дубликатов.
CREATE OR REPLACE FUNCTION get_existing_hashes(hashes text[])
RETURNS TABLE (hash text) AS $$
BEGIN
    RETURN QUERY
    SELECT unique_hash FROM transactions
    WHERE unique_hash = ANY(hashes);
END;
$$ LANGUAGE plpgsql;
>>>>>>> 8a095f2c87df41106baf87b1b22b0f0dde11e0c2
