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

-- Создание таблицы для отслеживания кредитных карт
CREATE TABLE IF NOT EXISTS credit_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    card_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255) NOT NULL,
    credit_limit DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2) DEFAULT 0,
    available_credit DECIMAL(15,2) GENERATED ALWAYS AS (credit_limit - current_balance) STORED,
    grace_period_days INTEGER DEFAULT 21, -- Беспроцентный период в днях
    interest_rate DECIMAL(5,4), -- Процентная ставка после истечения льготного периода
    statement_date INTEGER NOT NULL, -- День месяца, когда формируется выписка (1-31)
    payment_due_date INTEGER NOT NULL, -- День месяца, когда нужно внести платеж (1-31)
    minimum_payment_percent DECIMAL(5,4) DEFAULT 0.05, -- Минимальный платеж как процент от баланса
    last_statement_balance DECIMAL(15,2) DEFAULT 0,
    last_payment_amount DECIMAL(15,2) DEFAULT 0,
    last_payment_date DATE,
    card_type VARCHAR(50) DEFAULT 'credit' CHECK (card_type IN ('credit', 'debit', 'charge')),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'closed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы для отслеживания платежей по кредитам
CREATE TABLE IF NOT EXISTS loan_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    loan_id UUID REFERENCES credit_loans(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    principal_paid DECIMAL(15,2) NOT NULL,
    interest_paid DECIMAL(15,2) NOT NULL,
    remaining_balance DECIMAL(15,2) NOT NULL,
    payment_type VARCHAR(20) DEFAULT 'regular' CHECK (payment_type IN ('regular', 'extra', 'late')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы для отслеживания платежей по кредитным картам
CREATE TABLE IF NOT EXISTS card_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
    payment_date DATE NOT NULL,
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_type VARCHAR(20) DEFAULT 'regular' CHECK (payment_type IN ('regular', 'minimum', 'full', 'extra')),
    statement_period_start DATE,
    statement_period_end DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы для отслеживания транзакций по кредитным картам
CREATE TABLE IF NOT EXISTS card_transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    description TEXT NOT NULL,
    category VARCHAR(100),
    merchant VARCHAR(255),
    transaction_type VARCHAR(20) DEFAULT 'purchase' CHECK (transaction_type IN ('purchase', 'payment', 'fee', 'interest', 'cash_advance')),
    is_grace_period_eligible BOOLEAN DEFAULT true, -- Подходит ли транзакция для беспроцентного периода
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_credit_loans_user_id ON credit_loans(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_loans_status ON credit_loans(status);
CREATE INDEX IF NOT EXISTS idx_credit_cards_user_id ON credit_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_cards_status ON credit_cards(status);
CREATE INDEX IF NOT EXISTS idx_loan_payments_loan_id ON loan_payments(loan_id);
CREATE INDEX IF NOT EXISTS idx_loan_payments_date ON loan_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_card_payments_card_id ON card_payments(card_id);
CREATE INDEX IF NOT EXISTS idx_card_payments_date ON card_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_card_transactions_card_id ON card_transactions(card_id);
CREATE INDEX IF NOT EXISTS idx_card_transactions_date ON card_transactions(transaction_date);

-- Создание RLS (Row Level Security) политик
ALTER TABLE credit_loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE card_transactions ENABLE ROW LEVEL SECURITY;

-- Политики для credit_loans
CREATE POLICY "Users can view their own loans" ON credit_loans
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own loans" ON credit_loans
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own loans" ON credit_loans
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own loans" ON credit_loans
    FOR DELETE USING (auth.uid() = user_id);

-- Политики для credit_cards
CREATE POLICY "Users can view their own credit cards" ON credit_cards
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credit cards" ON credit_cards
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credit cards" ON credit_cards
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credit cards" ON credit_cards
    FOR DELETE USING (auth.uid() = user_id);

-- Политики для loan_payments
CREATE POLICY "Users can view their own loan payments" ON loan_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM credit_loans 
            WHERE credit_loans.id = loan_payments.loan_id 
            AND credit_loans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own loan payments" ON loan_payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM credit_loans 
            WHERE credit_loans.id = loan_payments.loan_id 
            AND credit_loans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own loan payments" ON loan_payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM credit_loans 
            WHERE credit_loans.id = loan_payments.loan_id 
            AND credit_loans.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own loan payments" ON loan_payments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM credit_loans 
            WHERE credit_loans.id = loan_payments.loan_id 
            AND credit_loans.user_id = auth.uid()
        )
    );

-- Политики для card_payments
CREATE POLICY "Users can view their own card payments" ON card_payments
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM credit_cards 
            WHERE credit_cards.id = card_payments.card_id 
            AND credit_cards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own card payments" ON card_payments
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM credit_cards 
            WHERE credit_cards.id = card_payments.card_id 
            AND credit_cards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own card payments" ON card_payments
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM credit_cards 
            WHERE credit_cards.id = card_payments.card_id 
            AND credit_cards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own card payments" ON card_payments
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM credit_cards 
            WHERE credit_cards.id = card_payments.card_id 
            AND credit_cards.user_id = auth.uid()
        )
    );

-- Политики для card_transactions
CREATE POLICY "Users can view their own card transactions" ON card_transactions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM credit_cards 
            WHERE credit_cards.id = card_transactions.card_id 
            AND credit_cards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert their own card transactions" ON card_transactions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM credit_cards 
            WHERE credit_cards.id = card_transactions.card_id 
            AND credit_cards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update their own card transactions" ON card_transactions
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM credit_cards 
            WHERE credit_cards.id = card_transactions.card_id 
            AND credit_cards.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete their own card transactions" ON card_transactions
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM credit_cards 
            WHERE credit_cards.id = card_transactions.card_id 
            AND credit_cards.user_id = auth.uid()
        )
    );

-- Создание функций для автоматического обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Создание триггеров для автоматического обновления updated_at
CREATE TRIGGER update_credit_loans_updated_at 
    BEFORE UPDATE ON credit_loans 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_credit_cards_updated_at 
    BEFORE UPDATE ON credit_cards 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column(); 