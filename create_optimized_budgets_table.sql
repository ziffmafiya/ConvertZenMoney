CREATE TABLE optimized_budgets (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    income NUMERIC NOT NULL,
    savings_goal NUMERIC NOT NULL,
    optimized_spending JSONB NOT NULL
);
