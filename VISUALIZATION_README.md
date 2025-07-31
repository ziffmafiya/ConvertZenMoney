# 📊 Визуализации финансовых данных

Этот модуль предоставляет функции для создания интерактивных визуализаций финансовых данных с использованием Heatmap и Treemap.

## 🎯 Возможности

### Heatmap (Тепловая карта)
- **Группировка по времени**: дни или часы
- **Группировка по категориям**: категории трат с кластерами
- **Интенсивность цвета**: чем темнее, тем больше сумма трат
- **Интерактивные подсказки**: детальная информация при наведении

### Treemap (Древовидная карта)
- **Иерархическая структура**: категория → кластер/привычка
- **Размер блоков**: пропорционален сумме трат
- **Цветовая индикация**: тренды (красный = рост, зеленый = падение)
- **Детальная статистика**: количество транзакций, тренды

## 📁 Структура файлов

```
api/
└── visualization-unified.js # Унифицированный модуль (API + клиентские функции)

visualization-demo.html      # Демонстрационная страница
VISUALIZATION_README.md      # Документация (этот файл)
```

## 🚀 Быстрый старт

### 1. Установка зависимостей

Убедитесь, что у вас установлены необходимые библиотеки:

```html
<!-- Chart.js -->
<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<!-- Chart.js Treemap plugin -->
<script src="https://cdn.jsdelivr.net/npm/chartjs-chart-treemap@2.3.0"></script>
<!-- Chart.js Matrix plugin -->
<script src="https://cdn.jsdelivr.net/npm/chartjs-chart-matrix@1.0.0"></script>
```

### 2. Импорт функций

```javascript
import { 
    getHeatmapData, 
    getTreemapData, 
    createHeatmap, 
    createTreemap, 
    updateVisualization, 
    destroyVisualization 
} from './api/visualization-unified.js';
```

### 3. Создание визуализаций

```javascript
// Получение данных
const heatmapData = await getHeatmapData(12, 2024, 'day');
const treemapData = await getTreemapData(12, 2024, 'cluster');

// Создание визуализаций
const heatmapChart = createHeatmap('heatmapCanvas', heatmapData, {
    month: 'Декабрь 2024'
});

const treemapChart = createTreemap('treemapCanvas', treemapData, {
    month: 'Декабрь 2024'
});
```

## 📊 API Reference

### Унифицированный API Endpoint

Все запросы к API выполняются через единую точку входа: `/api/visualization-unified`

**Параметры запроса:**
- `type` (string): тип визуализации - `'heatmap'` или `'treemap'`
- `month` (number): месяц (1-12)
- `year` (number): год
- `groupBy` (string, только для heatmap): группировка - `'day'` или `'hour'`
- `hierarchyType` (string, только для treemap): тип иерархии - `'cluster'` или `'habit'`

**Примеры запросов:**
```bash
# Heatmap по дням
GET /api/visualization-unified?type=heatmap&month=12&year=2024&groupBy=day

# Heatmap по часам
GET /api/visualization-unified?type=heatmap&month=12&year=2024&groupBy=hour

# Treemap с иерархией по кластерам
GET /api/visualization-unified?type=treemap&month=12&year=2024&hierarchyType=cluster

# Treemap с иерархией по привычкам
GET /api/visualization-unified?type=treemap&month=12&year=2024&hierarchyType=habit
```

### getHeatmapData(month, year, groupBy)

Получает данные для Heatmap визуализации.

**Параметры:**
- `month` (number): месяц (1-12)
- `year` (number): год
- `groupBy` (string): группировка - `'day'` или `'hour'`

**Возвращает:**
```javascript
{
    xAxis: ['День 1', 'День 2', ...],
    yAxis: ['Категория 1 (Кластер 1)', 'Категория 2 (Кластер 2)', ...],
    data: [
        {
            x: 0, y: 0, value: 1500.50,
            category: 'Продукты',
            clusterId: 1,
            clusterName: 'Кластер 1',
            timeSlot: 1
        },
        // ...
    ],
    metadata: {
        groupBy: 'day',
        totalCategories: 5,
        totalTimeSlots: 31,
        dateRange: { start: '2024-12-01', end: '2024-12-31' }
    }
}
```

### getTreemapData(month, year, hierarchyType)

Получает данные для Treemap визуализации.

**Параметры:**
- `month` (number): месяц (1-12)
- `year` (number): год
- `hierarchyType` (string): тип иерархии - `'cluster'` или `'habit'`

**Возвращает:**
```javascript
{
    name: 'Все траты',
    children: [
        {
            name: 'Продукты',
            children: [
                {
                    name: 'Кластер 1',
                    value: 5000.00,
                    transactionCount: 15,
                    trend: 12.5,
                    color: '#ff8888',
                    category: 'Продукты'
                }
            ],
            totalSpent: 5000.00,
            transactionCount: 15
        }
    ],
    metadata: {
        hierarchyType: 'cluster',
        totalSpent: 25000.00,
        totalTransactions: 100
    }
}
```

### createHeatmap(canvasId, data, options)

Создает Heatmap визуализацию.

**Параметры:**
- `canvasId` (string): ID canvas элемента
- `data` (Object): данные от `getHeatmapData()`
- `options` (Object): дополнительные опции

**Возвращает:** экземпляр Chart.js

### createTreemap(canvasId, data, options)

Создает Treemap визуализацию.

**Параметры:**
- `canvasId` (string): ID canvas элемента
- `data` (Object): данные от `getTreemapData()`
- `options` (Object): дополнительные опции

**Возвращает:** экземпляр Chart.js

### updateVisualization(chart, newData, type)

Обновляет существующую визуализацию новыми данными.

**Параметры:**
- `chart` (Chart): экземпляр Chart.js
- `newData` (Object): новые данные
- `type` (string): тип визуализации - `'heatmap'` или `'treemap'`

### destroyVisualization(chart)

Уничтожает визуализацию.

**Параметры:**
- `chart` (Chart): экземпляр Chart.js

## 🎨 Настройка внешнего вида

### Цветовая схема Heatmap

Цвета автоматически рассчитываются на основе значений:
- **Светло-желтый → Темно-красный**: градиент интенсивности
- **Белый**: нулевые значения

### Цветовая схема Treemap

Цвета основаны на трендах:
- **Красный (#ff4444)**: сильный рост (>10%)
- **Светло-красный (#ff8888)**: рост (0-10%)
- **Серый (#cccccc)**: без изменений
- **Светло-зеленый (#88ff88)**: падение (0-10%)
- **Зеленый (#44ff44)**: сильное падение (>10%)

## 📱 Адаптивность

Все визуализации адаптивны и автоматически подстраиваются под размер экрана. Рекомендуемые размеры:

- **Desktop**: 800x500px
- **Tablet**: 600x400px
- **Mobile**: 400x300px

## 🔧 Настройка базы данных

Убедитесь, что в вашей базе данных Supabase есть:

1. **Таблица `transactions`** с полями:
   - `id` (UUID)
   - `date` (DATE)
   - `category_name` (TEXT)
   - `outcome` (DECIMAL)
   - `payee` (TEXT)
   - `description_embedding` (VECTOR)

2. **Таблица `transaction_clusters`** с полями:
   - `transaction_id` (UUID, FK к transactions.id)
   - `cluster_id` (INTEGER)

3. **Функция `match_transactions`** для анализа привычек

## 🚨 Обработка ошибок

Все функции включают обработку ошибок:

```javascript
try {
    const data = await getHeatmapData(12, 2024, 'day');
    // Обработка данных
} catch (error) {
    console.error('Ошибка загрузки данных:', error);
    // Показать пользователю сообщение об ошибке
}
```

## 📈 Примеры использования

### Базовый пример

```html
<!DOCTYPE html>
<html>
<head>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-chart-treemap@2.3.0"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-chart-matrix@1.0.0"></script>
</head>
<body>
    <canvas id="heatmap" width="800" height="500"></canvas>
    <canvas id="treemap" width="800" height="500"></canvas>
    
    <script type="module">
        import { getHeatmapData, getTreemapData, createHeatmap, createTreemap } from './api/visualization-unified.js';
        
        async function init() {
            const heatmapData = await getHeatmapData(12, 2024, 'day');
            const treemapData = await getTreemapData(12, 2024, 'cluster');
            
            createHeatmap('heatmap', heatmapData);
            createTreemap('treemap', treemapData);
        }
        
        init();
    </script>
</body>
</html>
```

### Интерактивный пример

```javascript
// Обновление при изменении параметров
document.getElementById('month').addEventListener('change', async function() {
    const month = parseInt(this.value);
    const year = parseInt(document.getElementById('year').value);
    
    try {
        const newData = await getHeatmapData(month, year, 'day');
        updateVisualization(heatmapChart, newData, 'heatmap');
    } catch (error) {
        console.error('Ошибка обновления:', error);
    }
});
```

## 🤝 Поддержка

При возникновении проблем:

1. Проверьте консоль браузера на наличие ошибок
2. Убедитесь, что все зависимости загружены
3. Проверьте подключение к базе данных Supabase
4. Убедитесь, что API endpoints доступны

## 📝 Лицензия

Этот код является частью проекта финансового анализа и подчиняется тем же условиям лицензии. 