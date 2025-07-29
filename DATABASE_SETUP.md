# Настройка базы данных для кредитной системы

## Проблема
API возвращает ошибку 500, потому что таблицы кредитной системы не созданы в базе данных Supabase.

## Решение

### Шаг 1: Выполните SQL скрипт в Supabase

1. Откройте панель управления Supabase
2. Перейдите в раздел "SQL Editor"
3. Создайте новый запрос
4. Скопируйте и вставьте содержимое файла `create_credit_tables_if_not_exists.sql`
5. Нажмите "Run" для выполнения

### Шаг 2: Проверьте создание таблиц

После выполнения SQL скрипта проверьте, что таблицы созданы:

```sql
-- Проверить наличие таблиц
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'credit_%';

-- Должны быть созданы следующие таблицы:
-- credit_loans
-- loan_payments
-- credit_cards
-- card_payments
-- card_transactions
```

### Шаг 3: Проверьте политики безопасности

```sql
-- Проверить политики для таблицы кредитов
SELECT * FROM pg_policies WHERE tablename = 'credit_loans';

-- Проверить политики для таблицы кредитных карт
SELECT * FROM pg_policies WHERE tablename = 'credit_cards';
```

### Шаг 4: Проверьте индексы

```sql
-- Проверить индексы
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename LIKE 'credit_%';
```

## Альтернативное решение (если SQL скрипт не работает)

Если у вас нет доступа к SQL Editor или возникают проблемы, можно создать таблицы вручную:

### 1. Создайте таблицу кредитов

```sql
CREATE TABLE credit_loans (
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
```

### 2. Создайте таблицу кредитных карт

```sql
CREATE TABLE credit_cards (
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
```

## Проверка работы

После создания таблиц:

1. Обновите страницу сайта
2. Нажмите кнопку "Отладка" в секции кредитов
3. Проверьте консоль браузера - ошибки 500 должны исчезнуть
4. Нажмите "Добавить демо-данные" для тестирования

## Возможные проблемы

### Проблема: "Permission denied"
**Решение:** Убедитесь, что у вас есть права на создание таблиц в базе данных.

### Проблема: "Function does not exist"
**Решение:** Выполните SQL скрипт полностью, включая создание функций.

### Проблема: "Table already exists"
**Решение:** Это нормально - скрипт использует `CREATE TABLE IF NOT EXISTS`.

## Контакты

Если проблемы не решаются:
1. Проверьте логи Supabase
2. Убедитесь, что у вас есть доступ к базе данных
3. Проверьте переменные окружения в Vercel 