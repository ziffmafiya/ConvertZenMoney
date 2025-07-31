# 🚀 Быстрый старт визуализаций

## 📋 Что реализовано

✅ **Heatmap (Тепловая карта)**
- Группировка трат по дням/часам и категориям
- Интенсивность цвета = сумма трат
- Интерактивные подсказки

✅ **Treemap (Древовидная карта)**
- Иерархия: категория → кластер/привычка
- Размер блока = сумма трат
- Цвет = тренд (красный = рост, зеленый = падение)

## 🛠️ Установка и запуск

### 1. Установка зависимостей
```bash
npm install
```

### 2. Настройка переменных окружения
Создайте файл `.env.local`:
```env
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
```

### 3. Запуск сервера разработки
```bash
npm start
```

### 4. Открытие демо-страницы
Откройте `visualization-demo.html` в браузере

## 🧪 Тестирование

### Проверка базы данных
```bash
node test-visualizations.js
```

### Проверка API (требует запущенный сервер)
```bash
# Heatmap API
curl "http://localhost:3000/api/visualization-data?type=heatmap&month=12&year=2024&groupBy=day"

# Treemap API
curl "http://localhost:3000/api/visualization-data?type=treemap&month=12&year=2024&hierarchyType=cluster"
```

## 📊 Использование в коде

### Базовый пример
```javascript
import { getHeatmapData, getTreemapData, createHeatmap, createTreemap } from './api/visualization-unified.js';

// Получение данных
const heatmapData = await getHeatmapData(12, 2024, 'day');
const treemapData = await getTreemapData(12, 2024, 'cluster');

// Создание визуализаций
createHeatmap('heatmapCanvas', heatmapData);
createTreemap('treemapCanvas', treemapData);
```

### Параметры API

**Heatmap:**
- `month` (1-12): месяц
- `year`: год
- `groupBy`: `'day'` или `'hour'`

**Treemap:**
- `month` (1-12): месяц
- `year`: год
- `hierarchyType`: `'cluster'` или `'habit'`

## 🎨 Настройка внешнего вида

### Цвета Heatmap
- Градиент от светло-желтого до темно-красного
- Интенсивность зависит от суммы трат

### Цвета Treemap
- 🔴 Красный: рост трат (>10%)
- 🟡 Светло-красный: небольшой рост (0-10%)
- ⚪ Серый: без изменений
- 🟢 Светло-зеленый: небольшое падение (0-10%)
- 🟢 Зеленый: сильное падение (>10%)

## 📁 Структура файлов

```
api/
└── visualization-unified.js # Унифицированный модуль (API + клиентские функции)

visualization-demo.html      # Демо-страница
test-visualizations.js       # Тесты
VISUALIZATION_README.md      # Полная документация
QUICK_START.md              # Это руководство
```

## 🚨 Возможные проблемы

### Ошибка "Supabase URL or Anon Key not configured"
- Проверьте файл `.env.local`
- Убедитесь, что переменные окружения загружены

### Ошибка "Table not found"
- Проверьте, что таблицы `transactions` и `transaction_clusters` существуют
- Запустите SQL скрипты из папки проекта

### Пустые визуализации
- Проверьте наличие данных в базе
- Запустите `test-visualizations.js` для создания тестовых данных

## 📞 Поддержка

При возникновении проблем:
1. Проверьте консоль браузера
2. Запустите тесты: `node test-visualizations.js`
3. Проверьте подключение к Supabase
4. Убедитесь, что все зависимости установлены

## 🎯 Следующие шаги

1. Интеграция в основное приложение
2. Добавление фильтров по категориям
3. Экспорт визуализаций
4. Анимации переходов
5. Дополнительные типы графиков 