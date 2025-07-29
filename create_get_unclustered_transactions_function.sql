CREATE OR REPLACE FUNCTION get_unclustered_transactions()
RETURNS TABLE (
    id UUID,
    description_embedding vector
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        t.id,
        t.description_embedding
    FROM
        transactions t
    LEFT JOIN
        transaction_clusters tc ON t.id = tc.transaction_id
    WHERE
        t.description_embedding IS NOT NULL
        AND tc.id IS NULL;
END;
$$ LANGUAGE plpgsql;
