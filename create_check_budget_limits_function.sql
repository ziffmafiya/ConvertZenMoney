CREATE OR REPLACE FUNCTION check_budget_limits(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    budget RECORD;
    category TEXT;
    limit_amount NUMERIC;
    spent_amount NUMERIC;
    limit_percentage NUMERIC;
BEGIN
    -- Get the user's budget
    SELECT * INTO budget FROM optimized_budgets WHERE user_id = p_user_id;

    -- If no budget is found, exit
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Loop through each category in the optimized_spending JSONB
    FOR category, limit_amount IN SELECT key, value::NUMERIC FROM jsonb_each_text(budget.optimized_spending)
    LOOP
        -- Calculate the total spent in the current category for the current month
        SELECT COALESCE(SUM(outcome), 0)
        INTO spent_amount
        FROM transactions
        WHERE user_id = p_user_id
          AND category_name = category
          AND date_trunc('month', date) = date_trunc('month', now());

        -- Calculate the percentage of the limit spent
        IF limit_amount > 0 THEN
            limit_percentage := (spent_amount / limit_amount) * 100;
        ELSE
            limit_percentage := 0;
        END IF;

        -- Check if the spent percentage exceeds the thresholds
        IF limit_percentage >= 100 THEN
            -- Insert a 'limit_reached' notification
            INSERT INTO notifications (user_id, message, type)
            VALUES (p_user_id, 'Вы потратили 100% бюджета по категории "' || category || '".', 'limit_reached');
        ELSIF limit_percentage >= 90 THEN
            -- Insert a 'limit_warning' notification
            INSERT INTO notifications (user_id, message, type)
            VALUES (p_user_id, 'Вы потратили 90% бюджета по категории "' || category || '".', 'limit_warning');
        END IF;
    END LOOP;

    -- Smart notification for low balance (example logic)
    -- This part needs more context on how to calculate the total balance.
    -- Assuming there's a way to get the total balance for a user.
    -- Let's say we have a function get_total_balance(p_user_id)
    /*
    DECLARE
        total_balance NUMERIC;
    BEGIN
        total_balance := get_total_balance(p_user_id);
        IF total_balance < 500 THEN -- Example threshold
            INSERT INTO notifications (user_id, message, type)
            VALUES (p_user_id, 'Низкий остаток на счетах. Рекомендуем воздержаться от необязательных трат.', 'smart_suggestion');
        END IF;
    END;
    */
END;
$$ LANGUAGE plpgsql;
