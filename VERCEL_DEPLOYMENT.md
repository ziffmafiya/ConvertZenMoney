# 🚀 Развертывание на Vercel

## 📋 Структура файлов для Vercel

Для корректной работы на Vercel убедитесь, что у вас есть следующая структура:

```
/
├── api/
│   ├── visualization-data.js    # ✅ Серверный API
│   └── visualization-client.js  # ✅ Клиентские функции
├── index.html                   # ✅ Основное приложение
├── package.json                 # ✅ Зависимости
└── vercel.json                  # ✅ Конфигурация Vercel (опционально)
```

## 🔧 Настройка переменных окружения

В настройках проекта Vercel добавьте следующие переменные окружения:

1. **SUPABASE_URL** - URL вашей базы данных Supabase
2. **SUPABASE_ANON_KEY** - Анонимный ключ Supabase

### Как добавить переменные окружения:

1. Откройте проект в Vercel Dashboard
2. Перейдите в **Settings** → **Environment Variables**
3. Добавьте переменные:
   ```
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_ANON_KEY=your-anon-key
   ```

## 📦 Зависимости

Убедитесь, что в `package.json` есть необходимые зависимости:

```json
{
  "dependencies": {
    "@supabase/supabase-js": "^2.x.x"
  }
}
```

## 🌐 API Endpoints

После развертывания будут доступны следующие API endpoints:

- **GET** `/api/visualization-data?type=heatmap&month=12&year=2024&groupBy=day`
- **GET** `/api/visualization-data?type=treemap&month=12&year=2024&hierarchyType=cluster`

## 🔍 Проверка развертывания

### 1. Проверьте API endpoints

```bash
# Heatmap API
curl "https://your-project.vercel.app/api/visualization-data?type=heatmap&month=12&year=2024&groupBy=day"

# Treemap API
curl "https://your-project.vercel.app/api/visualization-data?type=treemap&month=12&year=2024&hierarchyType=cluster"
```

### 2. Проверьте основное приложение

Откройте `https://your-project.vercel.app` и убедитесь, что:
- Страница загружается без ошибок
- Секция "📊 Визуализации финансовых данных" отображается
- Графики загружаются корректно

## 🐛 Устранение неполадок

### Ошибка "Module not found"

**Проблема:** `Error loading visualization module`

**Решение:**
1. Убедитесь, что файл `api/visualization-client.js` существует
2. Проверьте, что путь импорта в `index.html` правильный
3. Убедитесь, что файл загружается через HTTPS (не file://)

### Ошибка "Supabase URL or Anon Key not configured"

**Проблема:** API возвращает ошибку конфигурации

**Решение:**
1. Проверьте переменные окружения в Vercel Dashboard
2. Убедитесь, что переменные добавлены для всех окружений (Production, Preview, Development)
3. Перезапустите деплой после добавления переменных

### Пустые графики

**Проблема:** Графики отображаются, но без данных

**Решение:**
1. Проверьте, что в базе данных есть транзакции для выбранного периода
2. Убедитесь, что таблицы `transactions` и `transaction_clusters` существуют
3. Проверьте права доступа к базе данных

### Ошибка CORS

**Проблема:** Браузер блокирует запросы к API

**Решение:**
1. Убедитесь, что домен добавлен в настройки CORS в Supabase
2. Проверьте, что запросы идут на правильный домен Vercel

## 📊 Мониторинг

### Логи Vercel

Для отладки используйте логи Vercel:

1. Откройте проект в Vercel Dashboard
2. Перейдите в **Functions** → выберите функцию → **View Logs**

### Проверка API

Используйте инструменты разработчика браузера:

1. Откройте **Network** tab
2. Обновите страницу
3. Найдите запросы к `/api/visualization-data`
4. Проверьте статус ответов и содержимое

## 🔄 Обновление

После внесения изменений:

1. Закоммитьте изменения в Git
2. Запушьте в репозиторий
3. Vercel автоматически запустит новый деплой
4. Дождитесь завершения деплоя
5. Проверьте работу на новом URL

## 📞 Поддержка

Если проблемы остаются:

1. Проверьте логи Vercel Functions
2. Убедитесь, что все файлы загружены в репозиторий
3. Проверьте консоль браузера на ошибки
4. Убедитесь, что переменные окружения настроены правильно

---

**Теперь ваше приложение готово к работе на Vercel!** 🎉 