-- Создание таблицы для хранения оптимизированных бюджетов
-- Эта таблица содержит ИИ-оптимизированные планы расходов на основе доходов и целей
CREATE TABLE optimized_budgets (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY, -- Уникальный идентификатор бюджета (автоинкремент)
    user_id UUID REFERENCES auth.users(id),             -- Ссылка на пользователя (из системы аутентификации Supabase)
    created_at TIMESTAMPTZ DEFAULT now(),               -- Дата и время создания оптимизированного бюджета
    income NUMERIC NOT NULL,                            -- Доход пользователя (основа для расчета бюджета)
    savings_goal NUMERIC NOT NULL,                      -- Цель по сбережениям (сумма, которую нужно отложить)
    optimized_spending JSONB NOT NULL                   -- Оптимизированные расходы в формате JSON (категории и суммы)
);
