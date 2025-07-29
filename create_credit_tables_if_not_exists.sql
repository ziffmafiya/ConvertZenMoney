-- Создание таблиц кредитной системы, если они не существуют

-- Функция для создания таблицы кредитов
CREATE OR REPLACE FUNCTION create_credit_loans_table_if_not_exists()
RETURNS void AS $$
BEGIN
    -- Создание таблицы для отслеживания кредитов
    CREATE TABLE IF NOT EXISTS credit_loans (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        loan_name VARCHAR(255) NOT NULL,
        loan_type VARCHAR(50) NOT NULL CHECK (loan_type IN ('personal', 'mortgage', 'auto', 'business', 'other')),
        principal_amount DECIMAL(15,2) NOT NULL,
        interest_rate DECIMAL(5,4) NOT NULL, -- Процентная ставка (например, 0.085 для 8.5%)
        loan_term_months INTEGER NOT NULL,
        monthly_payment DECIMAL(15,2) NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        current_balance DECIMAL(15,2) NOT NULL,
        total_paid DECIMAL(15,2) DEFAULT 0,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paid_off', 'defaulted')),
        bank_name VARCHAR(255),
        account_number VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Создание индексов для производительности
    CREATE INDEX IF NOT EXISTS idx_credit_loans_user_id ON credit_loans(user_id);
    CREATE INDEX IF NOT EXISTS idx_credit_loans_status ON credit_loans(status);
    CREATE INDEX IF NOT EXISTS idx_credit_loans_created_at ON credit_loans(created_at);

    -- Включение Row Level Security
    ALTER TABLE credit_loans ENABLE ROW LEVEL SECURITY;

    -- Политики безопасности
    CREATE POLICY IF NOT EXISTS "Users can view their own loans" ON credit_loans
        FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can insert their own loans" ON credit_loans
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can update their own loans" ON credit_loans
        FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can delete their own loans" ON credit_loans
        FOR DELETE USING (auth.uid() = user_id);

    -- Создание таблицы для платежей по кредитам
    CREATE TABLE IF NOT EXISTS loan_payments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        loan_id UUID REFERENCES credit_loans(id) ON DELETE CASCADE,
        payment_amount DECIMAL(15,2) NOT NULL,
        principal_paid DECIMAL(15,2) NOT NULL,
        interest_paid DECIMAL(15,2) NOT NULL,
        payment_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Индексы для платежей
    CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
    CREATE INDEX IF NOT EXISTS idx_loan_payments_payment_date ON loan_payments(payment_date);

    -- RLS для платежей
    ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;

    -- Политики для платежей
    CREATE POLICY IF NOT EXISTS "Users can view payments for their loans" ON loan_payments
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM credit_loans 
                WHERE credit_loans.id = loan_payments.loan_id 
                AND credit_loans.user_id = auth.uid()
            )
        );

    CREATE POLICY IF NOT EXISTS "Users can insert payments for their loans" ON loan_payments
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM credit_loans 
                WHERE credit_loans.id = loan_payments.loan_id 
                AND credit_loans.user_id = auth.uid()
            )
        );

    -- Функция для обновления updated_at
    CREATE OR REPLACE FUNCTION update_credit_loans_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Триггер для обновления updated_at
    DROP TRIGGER IF EXISTS trigger_update_credit_loans_updated_at ON credit_loans;
    CREATE TRIGGER trigger_update_credit_loans_updated_at
        BEFORE UPDATE ON credit_loans
        FOR EACH ROW
        EXECUTE FUNCTION update_credit_loans_updated_at();

END;
$$ LANGUAGE plpgsql;

-- Функция для создания таблицы кредитных карт
CREATE OR REPLACE FUNCTION create_credit_cards_table_if_not_exists()
RETURNS void AS $$
BEGIN
    -- Создание таблицы для отслеживания кредитных карт
    CREATE TABLE IF NOT EXISTS credit_cards (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        card_name VARCHAR(255) NOT NULL,
        bank_name VARCHAR(255),
        credit_limit DECIMAL(15,2) NOT NULL,
        current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
        interest_rate DECIMAL(5,4) NOT NULL, -- Процентная ставка (например, 0.0299 для 2.99% в месяц)
        statement_date DATE NOT NULL,
        payment_due_date DATE NOT NULL,
        grace_period_days INTEGER DEFAULT 21,
        minimum_payment_percentage DECIMAL(5,2) DEFAULT 3.00, -- Минимальный платеж в процентах
        card_number VARCHAR(20),
        last_payment_amount DECIMAL(15,2),
        last_payment_date DATE,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Создание индексов для производительности
    CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);
    CREATE INDEX IF NOT EXISTS idx_credit_cards_payment_due_date ON credit_cards(payment_due_date);
    CREATE INDEX IF NOT EXISTS idx_credit_cards_created_at ON credit_cards(created_at);

    -- Включение Row Level Security
    ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;

    -- Политики безопасности
    CREATE POLICY IF NOT EXISTS "Users can view their own credit cards" ON credit_cards
        FOR SELECT USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can insert their own credit cards" ON credit_cards
        FOR INSERT WITH CHECK (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can update their own credit cards" ON credit_cards
        FOR UPDATE USING (auth.uid() = user_id);

    CREATE POLICY IF NOT EXISTS "Users can delete their own credit cards" ON credit_cards
        FOR DELETE USING (auth.uid() = user_id);

    -- Создание таблицы для платежей по кредитным картам
    CREATE TABLE IF NOT EXISTS card_payments (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
        payment_amount DECIMAL(15,2) NOT NULL,
        payment_date DATE NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Создание таблицы для транзакций по кредитным картам
    CREATE TABLE IF NOT EXISTS card_transactions (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
        transaction_amount DECIMAL(15,2) NOT NULL,
        transaction_date DATE NOT NULL,
        description VARCHAR(255) NOT NULL,
        category VARCHAR(100),
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    -- Индексы для платежей и транзакций
    CREATE INDEX IF NOT EXISTS idx_card_payments_card_id ON card_payments(card_id);
    CREATE INDEX IF NOT EXISTS idx_card_payments_payment_date ON card_payments(payment_date);
    CREATE INDEX IF NOT EXISTS idx_card_transactions_card_id ON card_transactions(card_id);
    CREATE INDEX IF NOT EXISTS idx_card_transactions_transaction_date ON card_transactions(transaction_date);

    -- RLS для платежей и транзакций
    ALTER TABLE card_payments ENABLE ROW LEVEL SECURITY;
    ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

    -- Политики для платежей
    CREATE POLICY IF NOT EXISTS "Users can view payments for their cards" ON card_payments
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM credit_cards 
                WHERE credit_cards.id = card_payments.card_id 
                AND credit_cards.user_id = auth.uid()
            )
        );

    CREATE POLICY IF NOT EXISTS "Users can insert payments for their cards" ON card_payments
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM credit_cards 
                WHERE credit_cards.id = card_payments.card_id 
                AND credit_cards.user_id = auth.uid()
            )
        );

    -- Политики для транзакций
    CREATE POLICY IF NOT EXISTS "Users can view transactions for their cards" ON card_transactions
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM credit_cards 
                WHERE credit_cards.id = card_transactions.card_id 
                AND credit_cards.user_id = auth.uid()
            )
        );

    CREATE POLICY IF NOT EXISTS "Users can insert transactions for their cards" ON card_transactions
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM credit_cards 
                WHERE credit_cards.id = card_transactions.card_id 
                AND credit_cards.user_id = auth.uid()
            )
        );

    -- Функция для обновления updated_at
    CREATE OR REPLACE FUNCTION update_credit_cards_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Триггер для обновления updated_at
    DROP TRIGGER IF EXISTS trigger_update_credit_cards_updated_at ON credit_cards;
    CREATE TRIGGER trigger_update_credit_cards_updated_at
        BEFORE UPDATE ON credit_cards
        FOR EACH ROW
        EXECUTE FUNCTION update_credit_cards_updated_at();

END;
$$ LANGUAGE plpgsql;

-- Выполнение функций для создания таблиц
SELECT create_credit_loans_table_if_not_exists();
SELECT create_credit_cards_table_if_not_exists(); 