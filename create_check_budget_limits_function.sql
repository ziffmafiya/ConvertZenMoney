-- Создание функции для проверки превышения лимитов бюджета по категориям
-- Эта функция анализирует траты пользователя и создает уведомления при достижении 90% и 100% лимита
CREATE OR REPLACE FUNCTION check_budget_limits(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
    budget RECORD;         -- Запись с бюджетом пользователя
    category TEXT;         -- Название категории
    limit_amount NUMERIC;  -- Лимит по категории
    spent_amount NUMERIC;  -- Потраченная сумма по категории
    limit_percentage NUMERIC; -- Процент использования лимита
BEGIN
    -- Получаем бюджет пользователя
    SELECT * INTO budget FROM optimized_budgets WHERE user_id = p_user_id;

    -- Если бюджет не найден, выходим
    IF NOT FOUND THEN
        RETURN;
    END IF;

    -- Проходим по всем категориям в JSONB с оптимизированными лимитами
    FOR category, limit_amount IN SELECT key, value::NUMERIC FROM jsonb_each_text(budget.optimized_spending)
    LOOP
        -- Считаем сумму расходов по категории за текущий месяц
        SELECT COALESCE(SUM(outcome), 0)
        INTO spent_amount
        FROM transactions
        WHERE user_id = p_user_id
          AND category_name = category
          AND date_trunc('month', date) = date_trunc('month', now());

        -- Считаем процент использования лимита
        IF limit_amount > 0 THEN
            limit_percentage := (spent_amount / limit_amount) * 100;
        ELSE
            limit_percentage := 0;
        END IF;

        -- Проверяем, превышены ли пороги 90% и 100% лимита
        IF limit_percentage >= 100 THEN
            -- Вставляем уведомление о полном исчерпании лимита
            INSERT INTO notifications (user_id, message, type)
            VALUES (p_user_id, 'Вы потратили 100% бюджета по категории "' || category || '".', 'limit_reached');
        ELSIF limit_percentage >= 90 THEN
            -- Вставляем уведомление о приближении к лимиту
            INSERT INTO notifications (user_id, message, type)
            VALUES (p_user_id, 'Вы потратили 90% бюджета по категории "' || category || '".', 'limit_warning');
        END IF;
    END LOOP;

    -- Пример логики для умного уведомления о низком балансе (закомментировано)
    -- Здесь можно добавить вызов функции get_total_balance и уведомление при низком остатке
    /*
    DECLARE
        total_balance NUMERIC;
    BEGIN
        total_balance := get_total_balance(p_user_id);
        IF total_balance < 500 THEN -- Пример порога
            INSERT INTO notifications (user_id, message, type)
            VALUES (p_user_id, 'Низкий остаток на счетах. Рекомендуем воздержаться от необязательных трат.', 'smart_suggestion');
        END IF;
    END;
    */
END;
$$ LANGUAGE plpgsql;
