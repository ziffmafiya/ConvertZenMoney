# 🚀 Унифицированный API

Этот файл объединяет все API функции приложения в один унифицированный модуль для упрощения управления и развертывания.

## 📁 Структура файлов

```
api/
├── unified-api.js           # ✅ Унифицированный API (все функции)
└── visualization-unified.js # ✅ Клиентские функции для визуализаций
```

## 🎯 Доступные действия (actions)

### Визуализации
- **`heatmap`** - Получение данных для Heatmap визуализации
- **`treemap`** - Получение данных для Treemap визуализации

### Транзакции
- **`get-transactions`** - Получение транзакций с фильтрацией
- **`upload-transactions`** - Загрузка транзакций из файла

### Анализ привычек
- **`analyze-habits`** - Анализ привычек пользователя

### Кредитные карты
- **`get-credit-cards`** - Получение информации о кредитных картах
- **`add-credit-card`** - Добавление новой кредитной карты

### Кредиты
- **`get-loans`** - Получение информации о кредитах
- **`add-loan`** - Добавление нового кредита

### Рабочий график
- **`update-work-schedule`** - Обновление рабочего графика

### Месячная сводка
- **`get-monthly-summary`** - Получение месячной сводки

### Цели
- **`get-goal-progress`** - Получение прогресса по целям
- **`recommend-goal`** - Рекомендация цели на основе данных

### Анализ
- **`detect-anomalies`** - Обнаружение аномалий в тратах
- **`deep-analysis`** - Глубокий анализ финансов

## 📊 API Endpoint

Все запросы выполняются через единую точку входа: `/api/unified-api`

### Параметры запроса

**Обязательные:**
- `action` (string): тип действия (см. список выше)

**Дополнительные (зависят от action):**
- `month` (number): месяц (1-12)
- `year` (number): год
- `groupBy` (string): группировка для heatmap ('day' или 'hour')
- `hierarchyType` (string): тип иерархии для treemap ('cluster' или 'habit')
- `filters` (object): фильтры для транзакций
- `fileContent` (string): содержимое файла для загрузки
- `cardData` (object): данные кредитной карты
- `loanData` (object): данные кредита
- `scheduleData` (object): данные рабочего графика

## 🔧 Примеры использования

### Визуализации

```bash
# Heatmap по дням
GET /api/unified-api?action=heatmap&month=12&year=2024&groupBy=day

# Treemap с иерархией по кластерам
GET /api/unified-api?action=treemap&month=12&year=2024&hierarchyType=cluster
```

### Транзакции

```bash
# Получение транзакций
GET /api/unified-api?action=get-transactions

# Загрузка транзакций (POST)
POST /api/unified-api
{
  "action": "upload-transactions",
  "fileContent": "date,amount,category\n2024-12-01,1000,Продукты"
}
```

### Анализ

```bash
# Анализ привычек
GET /api/unified-api?action=analyze-habits&month=12&year=2024

# Обнаружение аномалий
GET /api/unified-api?action=detect-anomalies&month=12&year=2024

# Глубокий анализ
GET /api/unified-api?action=deep-analysis&month=12&year=2024
```

### Кредитные карты

```bash
# Получение кредитных карт
GET /api/unified-api?action=get-credit-cards

# Добавление кредитной карты (POST)
POST /api/unified-api
{
  "action": "add-credit-card",
  "cardData": {
    "name": "Основная карта",
    "limit": 100000,
    "balance": 50000
  }
}
```

### Кредиты

```bash
# Получение кредитов
GET /api/unified-api?action=get-loans

# Добавление кредита (POST)
POST /api/unified-api
{
  "action": "add-loan",
  "loanData": {
    "name": "Ипотека",
    "amount": 5000000,
    "rate": 7.5,
    "term": 240
  }
}
```

### Рабочий график

```bash
# Обновление рабочего графика (POST)
POST /api/unified-api
{
  "action": "update-work-schedule",
  "scheduleData": {
    "workDays": ["monday", "tuesday", "wednesday", "thursday", "friday"],
    "workHours": 8,
    "salary": 100000
  }
}
```

### Месячная сводка

```bash
# Получение месячной сводки
GET /api/unified-api?action=get-monthly-summary&month=12&year=2024
```

### Цели

```bash
# Получение прогресса по целям
GET /api/unified-api?action=get-goal-progress

# Рекомендация цели
GET /api/unified-api?action=recommend-goal
```

## 🎨 Клиентское использование

### JavaScript

```javascript
// Получение данных для визуализации
const heatmapData = await fetch('/api/unified-api?action=heatmap&month=12&year=2024&groupBy=day')
  .then(response => response.json());

// Загрузка транзакций
const uploadResult = await fetch('/api/unified-api', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'upload-transactions',
    fileContent: csvContent
  })
}).then(response => response.json());
```

### cURL

```bash
# Heatmap
curl "https://your-project.vercel.app/api/unified-api?action=heatmap&month=12&year=2024&groupBy=day"

# Treemap
curl "https://your-project.vercel.app/api/unified-api?action=treemap&month=12&year=2024&hierarchyType=cluster"

# Анализ привычек
curl "https://your-project.vercel.app/api/unified-api?action=analyze-habits&month=12&year=2024"
```

## 🔍 Обработка ошибок

Все API endpoints возвращают стандартные HTTP статусы:

- **200** - Успешный запрос
- **400** - Неверные параметры
- **405** - Неподдерживаемый метод
- **500** - Внутренняя ошибка сервера

### Пример ответа с ошибкой

```json
{
  "error": "Internal server error",
  "details": "Supabase URL or Anon Key not configured"
}
```

## 🚀 Развертывание на Vercel

### Переменные окружения

Убедитесь, что в Vercel настроены следующие переменные:

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
```

### Структура файлов

```
/
├── api/
│   ├── unified-api.js           # ✅ Унифицированный API
│   └── visualization-unified.js # ✅ Клиентские функции
├── index.html                   # ✅ Основное приложение
└── package.json                 # ✅ Зависимости
```

## 📈 Преимущества унифицированного API

### ✅ Упрощение управления
- Один файл для всех API функций
- Единая точка входа
- Упрощенное развертывание

### ✅ Лучшая производительность
- Меньше файлов для загрузки
- Оптимизированная структура
- Кэширование на уровне функции

### ✅ Упрощенная отладка
- Централизованное логирование
- Единая обработка ошибок
- Простое тестирование

### ✅ Масштабируемость
- Легкое добавление новых функций
- Единообразная структура
- Совместимость с существующим кодом

## 🔄 Миграция с отдельных API

Если у вас есть код, использующий старые отдельные API endpoints, обновите его:

### Старый формат
```javascript
// Старый способ
const response = await fetch('/api/visualization-data?type=heatmap&month=12&year=2024');
```

### Новый формат
```javascript
// Новый способ
const response = await fetch('/api/unified-api?action=heatmap&month=12&year=2024');
```

## 📞 Поддержка

При возникновении проблем:

1. Проверьте правильность параметра `action`
2. Убедитесь, что все обязательные параметры переданы
3. Проверьте переменные окружения в Vercel
4. Изучите логи функции в Vercel Dashboard

---

**Теперь все API функции доступны через единую точку входа!** 🎉 