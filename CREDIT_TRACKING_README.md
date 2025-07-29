# Система отслеживания кредитов и кредитных карт

## Обзор

Эта система предоставляет полную функциональность для отслеживания кредитов и кредитных карт, включая:

### Для кредитов:
- ✅ Отслеживание суммы кредита, процентной ставки, срока
- ✅ Расчет ежемесячного платежа по формуле аннуитетного платежа
- ✅ Отслеживание прогресса погашения
- ✅ Ведение истории платежей
- ✅ Расчет оставшегося долга и уплаченных процентов

### Для кредитных карт:
- ✅ Отслеживание кредитного лимита и текущего баланса
- ✅ Отслеживание беспроцентного периода
- ✅ Расчет минимального платежа
- ✅ Ведение истории транзакций и платежей
- ✅ Расчет утилизации кредита
- ✅ Предупреждения о приближающихся платежах

### Общие функции:
- ✅ Сводная панель с общей статистикой
- ✅ Кредитный рейтинг здоровья
- ✅ Система предупреждений
- ✅ Отслеживание предстоящих платежей

## Установка

### 1. Создание базы данных

Выполните SQL скрипт для создания необходимых таблиц:

```sql
-- Выполните файл create_credit_tracking_tables.sql в вашей Supabase базе данных
```

### 2. Настройка переменных окружения

Добавьте следующие переменные в ваш `.env` файл:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. Размещение API файлов

Скопируйте все файлы из папки `api/` в вашу папку API функций:

- `get-credit-loans.js`
- `add-credit-loan.js`
- `add-loan-payment.js`
- `get-credit-cards.js`
- `add-credit-card.js`
- `add-card-transaction.js`
- `add-card-payment.js`
- `get-credit-summary.js`

### 4. Интеграция в HTML

Добавьте следующий код в ваш HTML файл:

```html
<!-- Добавьте в head -->
<script src="credit-management.js"></script>

<!-- Добавьте в body где хотите отобразить кредитную панель -->
<div id="credit-summary-cards"></div>
<div id="credit-alerts"></div>
<div id="loans-section"></div>
<div id="credit-cards-section"></div>
<div id="upcoming-payments"></div>
```

## Использование

### Инициализация

Система автоматически инициализируется при загрузке страницы. Убедитесь, что у вас настроена система аутентификации и ID пользователя доступен.

### Добавление кредита

```javascript
// Пример добавления кредита
const loanData = {
    loan_name: "Ипотека на квартиру",
    loan_type: "mortgage",
    principal_amount: 1000000,
    interest_rate: 0.085, // 8.5%
    loan_term_months: 240, // 20 лет
    start_date: "2024-01-15",
    bank_name: "ПриватБанк",
    account_number: "1234567890"
};

const result = await creditManager.addLoan(loanData);
```

### Добавление платежа по кредиту

```javascript
// Пример добавления платежа
const paymentData = {
    loan_id: "loan-uuid",
    payment_date: "2024-02-15",
    payment_amount: 8500,
    payment_type: "regular",
    notes: "Ежемесячный платеж"
};

const result = await creditManager.addLoanPayment(paymentData);
```

### Добавление кредитной карты

```javascript
// Пример добавления кредитной карты
const cardData = {
    card_name: "Visa Gold",
    bank_name: "Монобанк",
    credit_limit: 50000,
    grace_period_days: 21,
    interest_rate: 0.0299, // 2.99% в месяц
    statement_date: 15, // 15-е число каждого месяца
    payment_due_date: 5, // 5-е число каждого месяца
    minimum_payment_percent: 0.05 // 5% от баланса
};

const result = await creditManager.addCreditCard(cardData);
```

### Добавление транзакции по карте

```javascript
// Пример добавления транзакции
const transactionData = {
    card_id: "card-uuid",
    transaction_date: "2024-02-10",
    amount: 1500,
    description: "Покупка в супермаркете",
    category: "Продукты",
    merchant: "АТБ",
    transaction_type: "purchase",
    is_grace_period_eligible: true
};

const result = await creditManager.addCardTransaction(transactionData);
```

### Добавление платежа по карте

```javascript
// Пример добавления платежа по карте
const cardPaymentData = {
    card_id: "card-uuid",
    payment_date: "2024-02-05",
    payment_amount: 2500,
    payment_type: "regular"
};

const result = await creditManager.addCardPayment(cardPaymentData);
```

## API Endpoints

### Кредиты

- `GET /api/get-credit-loans?user_id={user_id}` - Получить список кредитов
- `POST /api/add-credit-loan` - Добавить новый кредит
- `POST /api/add-loan-payment` - Добавить платеж по кредиту

### Кредитные карты

- `GET /api/get-credit-cards?user_id={user_id}` - Получить список кредитных карт
- `POST /api/add-credit-card` - Добавить новую кредитную карту
- `POST /api/add-card-transaction` - Добавить транзакцию
- `POST /api/add-card-payment` - Добавить платеж по карте

### Сводка

- `GET /api/get-credit-summary?user_id={user_id}` - Получить общую сводку

## Структура данных

### Кредит (credit_loans)
```javascript
{
    id: "uuid",
    user_id: "uuid",
    loan_name: "Название кредита",
    loan_type: "personal|mortgage|auto|business|other",
    principal_amount: 1000000,
    interest_rate: 0.085,
    loan_term_months: 240,
    monthly_payment: 8500,
    start_date: "2024-01-15",
    end_date: "2044-01-15",
    current_balance: 950000,
    total_paid: 50000,
    status: "active|paid_off|defaulted",
    bank_name: "Название банка",
    account_number: "Номер счета"
}
```

### Кредитная карта (credit_cards)
```javascript
{
    id: "uuid",
    user_id: "uuid",
    card_name: "Название карты",
    bank_name: "Название банка",
    credit_limit: 50000,
    current_balance: 15000,
    available_credit: 35000,
    grace_period_days: 21,
    interest_rate: 0.0299,
    statement_date: 15,
    payment_due_date: 5,
    minimum_payment_percent: 0.05,
    card_type: "credit|debit|charge",
    status: "active|inactive|closed"
}
```

## Особенности

### Беспроцентный период

Система автоматически отслеживает беспроцентный период для кредитных карт:

1. Рассчитывает дату формирования выписки
2. Добавляет количество дней беспроцентного периода
3. Показывает статус (в беспроцентном периоде / проценты начисляются)
4. Отслеживает количество дней до окончания периода

### Кредитный рейтинг

Система рассчитывает кредитный рейтинг здоровья на основе:
- Утилизации кредитных карт (рекомендуется < 30%)
- Средней процентной ставки по кредитам
- Истории платежей

### Предупреждения

Система генерирует предупреждения для:
- Просроченных платежей
- Приближающихся платежей (за 3 дня)
- Высокой утилизации кредита (> 80%)
- Карт в беспроцентном периоде

## Настройка

### Изменение беспроцентного периода

По умолчанию беспроцентный период составляет 21 день. Вы можете изменить это при создании карты:

```javascript
const cardData = {
    // ... другие поля
    grace_period_days: 25, // Изменить на 25 дней
};
```

### Настройка минимального платежа

По умолчанию минимальный платеж составляет 5% от баланса:

```javascript
const cardData = {
    // ... другие поля
    minimum_payment_percent: 0.03, // Изменить на 3%
};
```

## Безопасность

- Все таблицы защищены Row Level Security (RLS)
- Пользователи могут видеть только свои данные
- Все API endpoints требуют валидации данных
- Поддержка CORS настроена для безопасных доменов

## Расширение функциональности

### Добавление новых типов кредитов

1. Добавьте новый тип в enum в SQL:
```sql
ALTER TABLE credit_loans 
DROP CONSTRAINT credit_loans_loan_type_check;

ALTER TABLE credit_loans 
ADD CONSTRAINT credit_loans_loan_type_check 
CHECK (loan_type IN ('personal', 'mortgage', 'auto', 'business', 'student', 'other'));
```

2. Обновите валидацию в API:
```javascript
const validLoanTypes = ['personal', 'mortgage', 'auto', 'business', 'student', 'other'];
```

### Добавление новых категорий транзакций

1. Добавьте новую категорию в enum:
```sql
ALTER TABLE card_transactions 
DROP CONSTRAINT card_transactions_transaction_type_check;

ALTER TABLE card_transactions 
ADD CONSTRAINT card_transactions_transaction_type_check 
CHECK (transaction_type IN ('purchase', 'payment', 'fee', 'interest', 'cash_advance', 'refund'));
```

## Поддержка

При возникновении проблем:

1. Проверьте консоль браузера на наличие ошибок
2. Убедитесь, что все API endpoints доступны
3. Проверьте настройки Supabase и переменные окружения
4. Убедитесь, что таблицы созданы корректно

## Лицензия

Этот код предоставляется "как есть" для использования в вашем проекте. 