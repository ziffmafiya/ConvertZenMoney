# Руководство по устранению неполадок - Кредитная система

## Проблема: Новые функции не отображаются на сайте

### Шаг 1: Проверка консоли браузера
1. Откройте Developer Tools (F12)
2. Перейдите на вкладку Console
3. Обновите страницу
4. Проверьте наличие ошибок

### Шаг 2: Проверка загрузки данных
1. Нажмите кнопку "Отладка" в секции кредитов
2. Проверьте консоль на наличие сообщений:
   - "Loading credit data..."
   - "Loans loaded: [...]"
   - "Credit cards loaded: [...]"
   - "Summary loaded: [...]"

### Шаг 3: Проверка API
1. В консоли должны быть сообщения о загрузке данных
2. Если есть ошибки API, проверьте:
   - Подключение к Supabase
   - Правильность URL API
   - Наличие таблиц в базе данных

### Шаг 4: Добавление демо-данных
1. Нажмите кнопку "Добавить демо-данные"
2. Проверьте консоль на успешность операции
3. После добавления данных секция должна заполниться

## Возможные проблемы и решения

### Проблема: "Failed to load loans/credit cards/summary"
**Решение:**
- Проверьте подключение к Supabase
- Убедитесь, что таблицы созданы в базе данных
- Проверьте переменные окружения

### Проблема: Данные загружаются, но не отображаются
**Решение:**
- Проверьте наличие элементов в HTML:
  - `credit-summary-cards`
  - `loans-section`
  - `credit-cards-section`
  - `upcoming-payments`
  - `credit-alerts`

### Проблема: Ошибки в консоли JavaScript
**Решение:**
- Проверьте правильность структуры данных
- Убедитесь, что все поля существуют в ответе API

## Отладочные команды

### В консоли браузера:
```javascript
// Проверить состояние кредитного менеджера
creditManager.debugState();

// Принудительно загрузить данные
creditManager.loadCreditData();

// Добавить демо-данные
creditManager.addDemoData();
```

### Проверка элементов DOM:
```javascript
// Проверить наличие контейнеров
document.getElementById('credit-summary-cards');
document.getElementById('loans-section');
document.getElementById('credit-cards-section');
```

## Структура данных

### Ожидаемая структура кредита:
```javascript
{
  id: "uuid",
  loan_name: "Название кредита",
  loan_type: "mortgage",
  principal_amount: 1000000,
  interest_rate: 0.085,
  monthly_payment: 8500,
  current_balance: 950000,
  remaining_balance: 950000,
  progress_percent: 5.0,
  status: "active"
}
```

### Ожидаемая структура кредитной карты:
```javascript
{
  id: "uuid",
  card_name: "Название карты",
  credit_limit: 50000,
  current_balance: 15000,
  utilization_ratio: 30.0,
  is_in_grace_period: true,
  days_until_payment_due: 15,
  minimum_payment: 450
}
```

## Проверка базы данных

### SQL для проверки таблиц:
```sql
-- Проверить наличие таблиц
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'credit_%';

-- Проверить данные в таблицах
SELECT * FROM credit_loans LIMIT 5;
SELECT * FROM credit_cards LIMIT 5;
```

## Контакты для поддержки

Если проблемы не решаются:
1. Проверьте логи Vercel
2. Проверьте логи Supabase
3. Убедитесь, что все переменные окружения настроены 