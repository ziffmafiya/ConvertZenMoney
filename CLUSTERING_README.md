# 🔍 Система кластеризации транзакций

## Обзор

Система кластеризации автоматически группирует семантически похожие транзакции, используя алгоритм DBSCAN и векторные эмбендинги. Это позволяет выявлять паттерны в финансовых операциях и находить похожие транзакции для анализа.

## Архитектура

### Компоненты системы

1. **Векторные эмбендинги** - генерируются с помощью Google Gemini API для описаний транзакций
2. **Алгоритм DBSCAN** - используется для кластеризации векторов
3. **Supabase с pgvector** - хранилище для векторов и кластеров
4. **REST API** - единый эндпоинт для всех операций кластеризации

### База данных

#### Таблицы

- `transactions` - основная таблица транзакций с полем `description_embedding`
- `transaction_clusters` - связь транзакций с кластерами

#### Функции

- `get_unclustered_transactions()` - получение некластеризованных транзакций
- `match_transactions()` - векторный поиск похожих транзакций

## API Endpoints

### Единый эндпоинт: `/api/transaction-clustering`

Все операции кластеризации выполняются через один эндпоинт с параметром `action`:

#### 1. Кластеризация транзакций

**POST** `/api/transaction-clustering?action=cluster`

Запускает процесс кластеризации с использованием алгоритма DBSCAN.

**Параметры запроса:**
```json
{
  "eps": 0.3,           // Радиус поиска соседей (0.1-2.0)
  "minPts": 3,          // Минимальное количество точек для кластера (≥2)
  "forceRecluster": false // Принудительная перекластеризация
}
```

**Ответ:**
```json
{
  "message": "Clustering completed successfully",
  "clusters": 5,
  "transactions": 150,
  "noise": 12,
  "parameters": {
    "eps": 0.3,
    "minPts": 3
  },
  "clusterStats": [
    {
      "clusterId": 1,
      "transactionCount": 25,
      "totalOutcome": 15000.50,
      "totalIncome": 0,
      "categories": ["Продукты", "Еда"],
      "payees": ["Магнит", "Пятерочка"],
      "transactions": [...]
    }
  ]
}
```

#### 2. Получение информации о кластерах

**GET** `/api/transaction-clustering?action=get`

Возвращает детальную информацию о кластерах с возможностью фильтрации и пагинации.

**Параметры запроса:**
- `clusterId` (опционально) - ID конкретного кластера
- `limit` (по умолчанию 50) - количество результатов
- `offset` (по умолчанию 0) - смещение для пагинации

**Ответ:**
```json
{
  "clusters": [
    {
      "clusterId": 1,
      "timestamp": "2024-01-15T10:30:00Z",
      "transactionCount": 25,
      "totalOutcome": 15000.50,
      "totalIncome": 0,
      "avgOutcome": 600.02,
      "avgIncome": 0,
      "categories": ["Продукты", "Еда"],
      "payees": ["Магнит", "Пятерочка"],
      "accounts": ["Основной счет"],
      "topCategories": [
        {"category": "Продукты", "count": 15},
        {"category": "Еда", "count": 10}
      ],
      "topPayees": [
        {"payee": "Магнит", "count": 12},
        {"payee": "Пятерочка", "count": 8}
      ],
      "dateRange": {
        "start": "2024-01-01",
        "end": "2024-01-15"
      },
      "transactions": [...]
    }
  ],
  "summary": {
    "totalClusters": 5,
    "totalTransactions": 150,
    "returnedClusters": 5,
    "returnedTransactions": 150
  },
  "pagination": {
    "limit": 50,
    "offset": 0
  }
}
```

#### 3. Поиск похожих транзакций

**POST** `/api/transaction-clustering?action=find-similar`

Выполняет семантический поиск транзакций, похожих на заданный запрос.

**Параметры запроса:**
```json
{
  "query": "покупка продуктов",
  "matchThreshold": 0.7,    // Порог схожести (0-1)
  "matchCount": 10,         // Количество результатов (1-100)
  "includeClusters": true,  // Включить информацию о кластерах
  "category": "Продукты",   // Фильтр по категории (опционально)
  "dateFrom": "2024-01-01", // Фильтр по дате от (опционально)
  "dateTo": "2024-01-31"    // Фильтр по дате до (опционально)
}
```

**Ответ:**
```json
{
  "message": "Similar transactions found successfully",
  "query": "покупка продуктов",
  "parameters": {
    "matchThreshold": 0.7,
    "matchCount": 10,
    "category": "Продукты",
    "dateFrom": "2024-01-01",
    "dateTo": "2024-01-31"
  },
  "summary": {
    "totalTransactions": 25,
    "totalOutcome": 15000.50,
    "totalIncome": 0,
    "uniqueCategories": ["Продукты", "Еда"],
    "uniquePayees": ["Магнит", "Пятерочка"],
    "topCategories": [
      {"category": "Продукты", "count": 15},
      {"category": "Еда", "count": 10}
    ],
    "topPayees": [
      {"payee": "Магнит", "count": 12},
      {"payee": "Пятерочка", "count": 8}
    ]
  },
  "transactions": [
    {
      "id": "uuid",
      "date": "2024-01-15",
      "category_name": "Продукты",
      "payee": "Магнит",
      "comment": "Покупка продуктов",
      "outcome": 1500.50,
      "income": 0,
      "similarity": 0.85
    }
  ],
  "categoryGroups": {
    "Продукты": [...],
    "Еда": [...]
  },
  "clusters": [
    {
      "clusterId": 1,
      "timestamp": "2024-01-15T10:30:00Z",
      "transactionIds": ["uuid1", "uuid2"]
    }
  ]
}
```

## Алгоритм DBSCAN

### Принцип работы

DBSCAN (Density-Based Spatial Clustering of Applications with Noise) - это алгоритм кластеризации, основанный на плотности. Он группирует точки, которые находятся близко друг к другу, и помечает как шум точки, которые находятся в областях с низкой плотностью.

### Параметры

- **eps (epsilon)** - максимальное расстояние между двумя точками, чтобы они считались соседями
- **minPts** - минимальное количество точек, необходимое для формирования кластера

### Метрика расстояния

Используется **косинусное расстояние** между векторами эмбендингов:
```
distance = 1 - cosine_similarity(vector1, vector2)
```

### Рекомендации по настройке

- **eps = 0.2-0.4** - для строгой кластеризации
- **eps = 0.4-0.6** - для умеренной кластеризации  
- **eps = 0.6-0.8** - для мягкой кластеризации
- **minPts = 2-5** - для небольших наборов данных
- **minPts = 5-10** - для больших наборов данных

## Примеры использования

### 1. Запуск кластеризации

```javascript
const response = await fetch('/api/transaction-clustering?action=cluster', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    eps: 0.3,
    minPts: 3,
    forceRecluster: false
  })
});
```

### 2. Получение кластеров

```javascript
const response = await fetch('/api/transaction-clustering?action=get&limit=10&offset=0');
```

### 3. Поиск похожих транзакций

```javascript
const response = await fetch('/api/transaction-clustering?action=find-similar', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'покупка продуктов',
    matchThreshold: 0.7,
    matchCount: 10,
    includeClusters: true
  })
});
```

## Настройка и развертывание

### Переменные окружения

```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

### SQL скрипты

1. `supabase_vector_setup.sql` - настройка векторного расширения
2. `create_transaction_clusters_table.sql` - создание таблицы кластеров
3. `create_get_unclustered_transactions_function.sql` - функция для получения некластеризованных транзакций

### Зависимости

```json
{
  "@supabase/supabase-js": "^2.x",
  "@google/generative-ai": "^0.1.x"
}
```

## Мониторинг и оптимизация

### Метрики производительности

- Время выполнения кластеризации
- Количество созданных кластеров
- Процент шума
- Время ответа API

### Рекомендации по оптимизации

1. **Регулярная кластеризация** - запускайте кластеризацию для новых транзакций
2. **Настройка параметров** - экспериментируйте с eps и minPts
3. **Мониторинг качества** - анализируйте размеры и содержимое кластеров
4. **Кэширование** - кэшируйте результаты поиска для частых запросов

## Демо и тестирование

### Демо интерфейс

Откройте `clustering-demo.html` для интерактивного тестирования всех функций кластеризации.

### Автоматические тесты

```bash
node test-clustering.js
```

Тесты проверяют:
- Функциональность кластеризации
- Получение информации о кластерах
- Поиск похожих транзакций
- Производительность системы

## Расширения и улучшения

### Возможные улучшения

1. **Иерархическая кластеризация** - создание вложенных кластеров
2. **Динамические параметры** - автоматическая настройка eps и minPts
3. **Визуализация** - графическое представление кластеров
4. **Уведомления** - оповещения о новых паттернах
5. **Экспорт данных** - выгрузка кластеров в различных форматах

### Интеграция с другими системами

- **Аналитика** - интеграция с системами бизнес-аналитики
- **Бюджетирование** - автоматическое создание бюджетных категорий
- **Мониторинг** - отслеживание аномальных транзакций
- **Отчетность** - генерация отчетов по кластерам

## Поддержка и документация

Для получения дополнительной информации обратитесь к:
- Основному README проекта
- Демо интерфейсу `clustering-demo.html`
- Тестовому скрипту `test-clustering.js`
- Логам API для диагностики проблем 