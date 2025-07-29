# Быстрое решение проблемы с кредитными функциями

## Проблема
Новые функции кредитов не отображаются из-за ошибки 500 в API.

## Быстрое решение (5 минут)

### 1. Выполните SQL в Supabase
1. Откройте [Supabase Dashboard](https://supabase.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **SQL Editor**
4. Создайте новый запрос
5. Вставьте и выполните этот код:

```sql
-- Создание таблиц кредитной системы
CREATE TABLE IF NOT EXISTS credit_loans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    loan_name VARCHAR(255) NOT NULL,
    loan_type VARCHAR(50) NOT NULL,
    principal_amount DECIMAL(15,2) NOT NULL,
    interest_rate DECIMAL(5,4) NOT NULL,
    loan_term_months INTEGER NOT NULL,
    monthly_payment DECIMAL(15,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL,
    total_paid DECIMAL(15,2) DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active',
    bank_name VARCHAR(255),
    account_number VARCHAR(100),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_cards (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    card_name VARCHAR(255) NOT NULL,
    bank_name VARCHAR(255),
    credit_limit DECIMAL(15,2) NOT NULL,
    current_balance DECIMAL(15,2) NOT NULL DEFAULT 0,
    interest_rate DECIMAL(5,4) NOT NULL,
    statement_date DATE NOT NULL,
    payment_due_date DATE NOT NULL,
    grace_period_days INTEGER DEFAULT 21,
    minimum_payment_percentage DECIMAL(5,2) DEFAULT 3.00,
    card_number VARCHAR(20),
    last_payment_amount DECIMAL(15,2),
    last_payment_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS card_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    card_id UUID REFERENCES credit_cards(id) ON DELETE CASCADE,
    payment_amount DECIMAL(15,2) NOT NULL,
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
```

### 2. Проверьте работу
1. Обновите страницу сайта
2. Нажмите кнопку **"Добавить демо-данные"** в секции кредитов
3. Должны появиться тестовые данные

## Если не работает

### Проверьте переменные окружения в Vercel:
1. Откройте [Vercel Dashboard](https://vercel.com/dashboard)
2. Выберите ваш проект
3. Перейдите в **Settings** → **Environment Variables**
4. Убедитесь, что есть:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`

### Проверьте логи:
1. В Vercel Dashboard перейдите в **Functions**
2. Найдите `credit-management` функцию
3. Проверьте логи на ошибки

## Результат
После выполнения SQL кода:
- ✅ Ошибки 500 исчезнут
- ✅ Секция кредитов будет отображаться
- ✅ Можно будет добавлять демо-данные
- ✅ Все функции кредитов будут работать

## Поддержка
Если проблема остается:
1. Проверьте полную инструкцию в `DATABASE_SETUP.md`
2. Проверьте руководство по устранению неполадок в `TROUBLESHOOTING_GUIDE.md` 