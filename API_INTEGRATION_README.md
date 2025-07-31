# 🔗 Интеграция унифицированного API в index.html

Этот документ описывает, как унифицированный API был интегрирован в основное приложение `index.html`.

## ✅ Что было интегрировано

### 🔧 Основные функции API
- **`callUnifiedAPI(action, params)`** - для GET запросов
- **`callUnifiedAPIPost(action, data)`** - для POST запросов

### 📊 Визуализации
- **Heatmap** - интегрирован через `visualization-unified.js`
- **Treemap** - интегрирован через `visualization-unified.js`

### 💳 Кредитные карты
- **Получение списка** - `get-credit-cards`
- **Добавление карты** - `add-credit-card`

### 🏦 Кредиты
- **Получение списка** - `get-loans`
- **Добавление кредита** - `add-loan`

### 🔍 Анализ привычек
- **Анализ привычек** - `analyze-habits`
- **Отображение результатов** в новой секции

### 🚨 Обнаружение аномалий
- **Обнаружение аномалий** - `detect-anomalies`
- **Отображение результатов** в новой секции

## 🎯 Новые секции в интерфейсе

### 📊 Визуализации финансовых данных
```
🔥 Heatmap трат - интенсивность трат по дням/часам и категориям
🌳 Treemap трат - иерархическая структура трат
```

### 🔍 Анализ привычек
```
🔍 Анализ привычек - обнаружение регулярных паттернов в тратах
```

### 🚨 Обнаружение аномалий
```
🚨 Обнаружение аномалий - поиск необычных изменений в тратах
```

## 🔧 Техническая реализация

### Унифицированные функции API

```javascript
// GET запросы
async function callUnifiedAPI(action, params = {}) {
    const url = `/api/unified-api?action=${action}`;
    const queryParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
        if (typeof params[key] === 'object') {
            queryParams.append(key, JSON.stringify(params[key]));
        } else {
            queryParams.append(key, params[key]);
        }
    });

    const fullUrl = queryParams.toString() ? `${url}&${queryParams.toString()}` : url;
    const response = await fetch(fullUrl);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

// POST запросы
async function callUnifiedAPIPost(action, data = {}) {
    const response = await fetch('/api/unified-api', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            action: action,
            ...data
        })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}
```

### Примеры использования

#### Кредитные карты
```javascript
// Получение списка
const creditCards = await callUnifiedAPI('get-credit-cards');

// Добавление карты
const cardData = {
    card_name: 'Основная карта',
    grace_period_days: 55,
    statement_day: 15,
    payment_due_day: 10,
    first_transaction_date: '2024-01-01',
    unpaid_balance: 0
};
await callUnifiedAPIPost('add-credit-card', { cardData });
```

#### Кредиты
```javascript
// Получение списка
const loans = await callUnifiedAPI('get-loans');

// Добавление кредита
const loanData = {
    loan_name: 'Ипотека',
    principal: 5000000,
    interest_rate: 7.5,
    term_months: 240,
    start_date: '2024-01-01',
    paid_amount: 0
};
await callUnifiedAPIPost('add-loan', { loanData });
```

#### Анализ привычек
```javascript
// Анализ привычек
const month = 12;
const year = 2024;
const habits = await callUnifiedAPI('analyze-habits', { month, year });
```

#### Обнаружение аномалий
```javascript
// Обнаружение аномалий
const month = 12;
const year = 2024;
const anomalies = await callUnifiedAPI('detect-anomalies', { month, year });
```

## 🎨 Пользовательский интерфейс

### Новые кнопки
- **🔄 Обновить** - обновление визуализаций
- **🔍 Анализировать** - анализ привычек
- **🚨 Проверить** - обнаружение аномалий

### Новые секции
- **📊 Визуализации финансовых данных** - Heatmap и Treemap
- **🔍 Анализ привычек** - обнаружение регулярных паттернов
- **🚨 Обнаружение аномалий** - поиск необычных изменений

### Статистика визуализаций
- Общая сумма трат
- Количество транзакций
- Количество категорий
- Среднее в день

## 🔄 Миграция с старых API

### Старый способ
```javascript
// Кредитные карты
const response = await fetch('/api/credit-cards');
const result = await response.json();

// Кредиты
const response = await fetch('/api/loans');
const result = await response.json();
```

### Новый способ
```javascript
// Кредитные карты
const creditCards = await callUnifiedAPI('get-credit-cards');

// Кредиты
const loans = await callUnifiedAPI('get-loans');
```

## 📈 Преимущества интеграции

### ✅ Упрощение кода
- Единые функции для всех API вызовов
- Упрощенная обработка ошибок
- Меньше дублирования кода

### ✅ Лучшая производительность
- Оптимизированные запросы
- Единая точка входа
- Кэширование на уровне API

### ✅ Новые возможности
- Анализ привычек
- Обнаружение аномалий
- Расширенные визуализации

### ✅ Упрощенная отладка
- Централизованное логирование
- Единая обработка ошибок
- Простое тестирование

## 🚀 Готово к использованию

### ✅ Интегрированные функции
- [x] Визуализации (Heatmap, Treemap)
- [x] Кредитные карты (получение, добавление)
- [x] Кредиты (получение, добавление)
- [x] Анализ привычек
- [x] Обнаружение аномалий

### ✅ Пользовательский интерфейс
- [x] Новые секции в интерфейсе
- [x] Кнопки для запуска анализа
- [x] Отображение результатов
- [x] Обработка ошибок

### ✅ Техническая реализация
- [x] Унифицированные функции API
- [x] Обработка GET и POST запросов
- [x] Интеграция с существующим кодом
- [x] Совместимость с Vercel

## 📞 Поддержка

При возникновении проблем:

1. Проверьте консоль браузера на ошибки
2. Убедитесь, что API endpoint `/api/unified-api` доступен
3. Проверьте переменные окружения в Vercel
4. Изучите логи функции в Vercel Dashboard

---

**Унифицированный API успешно интегрирован в index.html!** 🎉 