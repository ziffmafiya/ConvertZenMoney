# Краткая инструкция по установке системы отслеживания кредитов

## Шаг 1: Создание базы данных

1. Откройте вашу Supabase панель управления
2. Перейдите в SQL Editor
3. Выполните содержимое файла `create_credit_tracking_tables.sql`

## Шаг 2: Настройка переменных окружения

Убедитесь, что в вашем проекте настроены переменные окружения:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

## Шаг 3: Размещение API файлов

Скопируйте все файлы из папки `api/` в вашу папку API функций Vercel:

- `get-credit-loans.js`
- `add-credit-loan.js`
- `add-loan-payment.js`
- `get-credit-cards.js`
- `add-credit-card.js`
- `add-card-transaction.js`
- `add-card-payment.js`
- `get-credit-summary.js`

## Шаг 4: Размещение фронтенд файлов

Скопируйте следующие файлы в корень вашего проекта:

- `credit-management.js`
- `demo-credit-data.js`

## Шаг 5: Проверка интеграции

Убедитесь, что в вашем `index.html` добавлены:

1. Подключение скриптов в `<head>`:
```html
<script src="credit-management.js"></script>
<script src="demo-credit-data.js"></script>
```

2. HTML контейнеры в `<body>`:
```html
<section class="mb-8 md:mb-12">
    <h2 class="text-2xl font-bold text-white mb-6">Кредиты и кредитные карты</h2>
    <div id="credit-summary-cards"></div>
    <div id="credit-alerts"></div>
    <div id="loans-section"></div>
    <div id="credit-cards-section"></div>
    <div id="upcoming-payments"></div>
</section>
```

## Шаг 6: Тестирование

1. Откройте консоль браузера
2. Выполните команды для тестирования:
```javascript
// Добавить демо кредит
demoFunctions.addDemoLoan()

// Добавить демо кредитную карту
demoFunctions.addDemoCard()

// Обновить данные
demoFunctions.refreshData()
```

## Возможные проблемы

### Ошибка "Failed to load loans"
- Проверьте, что таблицы созданы в Supabase
- Убедитесь, что переменные окружения настроены правильно
- Проверьте, что API endpoints доступны

### Ошибка "User ID is required"
- Убедитесь, что система аутентификации настроена
- Проверьте, что `localStorage.getItem('user_id')` возвращает значение

### Ошибка CORS
- Убедитесь, что домен добавлен в настройки CORS в Supabase
- Проверьте, что API endpoints доступны с вашего домена

## Поддержка

При возникновении проблем:
1. Проверьте консоль браузера на наличие ошибок
2. Убедитесь, что все файлы размещены корректно
3. Проверьте настройки Supabase и переменные окружения
4. Обратитесь к полной документации в `CREDIT_TRACKING_README.md` 