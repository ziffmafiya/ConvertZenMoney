# 🔗 Универсальный API

## 📋 Обзор

Универсальный API (`/api/unified`) обрабатывает все запросы приложения через один endpoint для экономии лимита функций Vercel (12 функций в бесплатном плане).

## 🎯 Доступные сервисы

### 1. Визуализации (`service=visualization`)

#### Heatmap
```bash
GET /api/unified?service=visualization&type=heatmap&month=12&year=2024&groupBy=day
```

#### Treemap
```bash
GET /api/unified?service=visualization&type=treemap&month=12&year=2024&hierarchyType=cluster
```

### 2. Транзакции (`service=transactions`)

```bash
GET /api/unified?service=transactions&month=12&year=2024&category=Продукты&search=магазин
```

### 3. Анализ (`service=analysis`)

```bash
GET /api/unified?service=analysis&month=12&year=2024
```

## 📊 Параметры запросов

### Общие параметры
- `service` (обязательный): тип сервиса
  - `visualization` - визуализации
  - `transactions` - транзакции
  - `analysis` - анализ

### Для визуализаций
- `type` (обязательный): тип визуализации
  - `heatmap` - тепловая карта
  - `treemap` - древовидная карта
- `month` (обязательный): месяц (1-12)
- `year` (обязательный): год
- `groupBy` (для heatmap): группировка
  - `day` - по дням
  - `hour` - по часам
- `hierarchyType` (для treemap): тип иерархии
  - `cluster` - по кластерам
  - `habit` - по привычкам

### Для транзакций
- `month` (обязательный): месяц (1-12)
- `year` (обязательный): год
- `category` (опциональный): фильтр по категории
- `search` (опциональный): поиск по описанию или получателю

### Для анализа
- `month` (обязательный): месяц (1-12)
- `year` (обязательный): год

## 🔧 Примеры использования

### JavaScript (клиентская часть)

```javascript
// Heatmap
const heatmapData = await fetch('/api/unified?service=visualization&type=heatmap&month=12&year=2024&groupBy=day');

// Treemap
const treemapData = await fetch('/api/unified?service=visualization&type=treemap&month=12&year=2024&hierarchyType=cluster');

// Транзакции
const transactions = await fetch('/api/unified?service=transactions&month=12&year=2024&category=Продукты');

// Анализ привычек
const habits = await fetch('/api/unified?service=analysis&month=12&year=2024');
```

### cURL

```bash
# Heatmap
curl "https://your-project.vercel.app/api/unified?service=visualization&type=heatmap&month=12&year=2024&groupBy=day"

# Treemap
curl "https://your-project.vercel.app/api/unified?service=visualization&type=treemap&month=12&year=2024&hierarchyType=cluster"

# Транзакции
curl "https://your-project.vercel.app/api/unified?service=transactions&month=12&year=2024"

# Анализ
curl "https://your-project.vercel.app/api/unified?service=analysis&month=12&year=2024"
```

## 🚨 Обработка ошибок

### Ошибки валидации (400)
```json
{
  "error": "Missing required parameter: service"
}
```

### Ошибки сервера (500)
```json
{
  "error": "Internal server error",
  "details": "Supabase URL or Anon Key not configured"
}
```

## 📈 Преимущества

### ✅ Экономия лимита Vercel
- Вместо 12+ отдельных функций - одна универсальная
- Все сервисы через один endpoint

### ✅ Упрощенное управление
- Один файл для всех API функций
- Централизованная обработка ошибок
- Единая логика аутентификации

### ✅ Масштабируемость
- Легко добавлять новые сервисы
- Общие вспомогательные функции
- Переиспользование кода

## 🔄 Миграция

### Старые endpoints → Новые

| Старый | Новый |
|--------|-------|
| `/api/visualization-data?type=heatmap&...` | `/api/unified?service=visualization&type=heatmap&...` |
| `/api/visualization-data?type=treemap&...` | `/api/unified?service=visualization&type=treemap&...` |
| `/api/get-transactions?month=12&year=2024` | `/api/unified?service=transactions&month=12&year=2024` |
| `/api/analyze-habits?month=12&year=2024` | `/api/unified?service=analysis&month=12&year=2024` |

## 📝 Примечания

1. **Обратная совместимость**: Старые endpoints больше не работают
2. **Обязательный параметр**: `service` должен быть указан во всех запросах
3. **Валидация**: Все параметры проверяются на стороне сервера
4. **Логирование**: Все ошибки логируются для отладки

---

**Теперь все API функции обрабатываются через один универсальный endpoint!** 🎉 