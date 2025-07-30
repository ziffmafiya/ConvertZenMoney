<<<<<<< HEAD
CREATE TABLE optimized_budgets (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    income NUMERIC NOT NULL,
    savings_goal NUMERIC NOT NULL,
    optimized_spending JSONB NOT NULL
);
=======
CREATE TABLE optimized_budgets (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    income NUMERIC NOT NULL,
    savings_goal NUMERIC NOT NULL,
    optimized_spending JSONB NOT NULL
);
>>>>>>> 8a095f2c87df41106baf87b1b22b0f0dde11e0c2
