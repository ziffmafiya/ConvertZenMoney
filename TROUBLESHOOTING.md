# Устранение проблем с системой кластеризации

## 🔍 Диагностика проблем

### 1. Используйте встроенную диагностику

Нажмите кнопку **"Тест системы"** в интерфейсе кластеризации для получения подробного отчета о состоянии системы.

### 2. Проверьте логи

Откройте Developer Tools (F12) и проверьте консоль на наличие ошибок.

## 🚨 Частые проблемы и решения

### Ошибка 500 при запуске кластеризации

**Симптомы:**
- HTTP 500 ошибка при нажатии "Запустить кластеризацию"
- Сообщение "Clustering error: HTTP error! status: 500"

**Возможные причины и решения:**

#### 1. Edge Function не развернута

**Решение:**
```bash
# Убедитесь, что Supabase CLI установлен
npm install -g supabase

# Войдите в Supabase
supabase login

# Разверните Edge Function
supabase functions deploy cluster_embeddings
```

#### 2. Неправильные переменные окружения

**Проверьте в Supabase Dashboard → Settings → Edge Functions:**

```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

**Решение:**
- Скопируйте URL проекта из Dashboard
- Получите Service Role Key из Settings → API
- Добавьте переменные в Edge Functions settings

#### 3. Отсутствует колонка cluster_id

**Решение:**
Выполните в Supabase SQL Editor:
```sql
-- Добавьте функцию
\i add_cluster_column_function.sql

-- Создайте колонку
SELECT add_cluster_column_if_not_exists();
```

#### 4. Нет данных с эмбеддингами

**Проверьте:**
```sql
-- Проверьте наличие транзакций
SELECT COUNT(*) FROM transactions;

-- Проверьте наличие эмбеддингов
SELECT COUNT(*) FROM transactions WHERE description_embedding IS NOT NULL;
```

**Решение:**
- Загрузите транзакции через основной интерфейс
- Убедитесь, что эмбеддинги генерируются при загрузке

### Edge Function недоступна

**Симптомы:**
- "Edge Function not available" в диагностике
- Ошибка подключения к Edge Function

**Решение:**
1. Проверьте статус Edge Function:
   ```bash
   supabase functions list
   ```

2. Переразверните функцию:
   ```bash
   supabase functions deploy cluster_embeddings --force
   ```

3. Проверьте логи:
   ```bash
   supabase functions logs cluster_embeddings
   ```

### Ошибки базы данных

**Симптомы:**
- "Database connection failed"
- Ошибки SQL в логах

**Решение:**
1. Проверьте подключение к Supabase
2. Убедитесь, что таблица `transactions` существует
3. Проверьте права доступа

### Медленная кластеризация

**Симптомы:**
- Кластеризация занимает более 30 секунд
- Таймаут запроса

**Решение:**
1. Уменьшите количество транзакций:
   - Используйте фильтры по дате
   - Увеличьте параметр `epsilon`
   - Уменьшите `minClusterSize`

2. Оптимизируйте параметры:
   ```javascript
   {
     minClusterSize: 3,  // Уменьшите с 5 до 3
     minSamples: 2,      // Уменьшите с 3 до 2
     epsilon: 0.8        // Увеличьте с 0.5 до 0.8
   }
   ```

## 🔧 Ручная диагностика

### Проверка API endpoints

1. **Тест диагностики:**
   ```bash
   curl http://localhost:3000/api/test-clustering
   ```

2. **Тест кластеризации:**
   ```bash
   curl -X POST http://localhost:3000/api/cluster-transactions \
     -H "Content-Type: application/json" \
     -d '{"minClusterSize": 5, "minSamples": 3, "epsilon": 0.5}'
   ```

### Проверка Edge Function

1. **Прямой вызов:**
   ```bash
   curl -X POST https://your-project.supabase.co/functions/v1/cluster_embeddings \
     -H "Authorization: Bearer your-anon-key" \
     -H "Content-Type: application/json" \
     -d '{"test": true}'
   ```

## 📋 Чек-лист настройки

- [ ] Supabase CLI установлен и авторизован
- [ ] Edge Function развернута
- [ ] Переменные окружения настроены
- [ ] SQL скрипты выполнены
- [ ] Таблица transactions содержит данные
- [ ] Эмбеддинги сгенерированы
- [ ] Колонка cluster_id добавлена

## 🆘 Получение помощи

### Логи для диагностики

Соберите следующую информацию:

1. **Результат диагностики:**
   - Нажмите "Тест системы" и скопируйте отчет

2. **Логи браузера:**
   - F12 → Console → скопируйте ошибки

3. **Логи Edge Function:**
   ```bash
   supabase functions logs cluster_embeddings --follow
   ```

4. **Версии:**
   - Node.js: `node --version`
   - Supabase CLI: `supabase --version`

### Контакты

Если проблема не решается:
1. Проверьте документацию: `CLUSTERING_README.md`
2. Изучите примеры в `CLUSTERING_SUMMARY.md`
3. Запустите скрипт настройки: `.\setup-clustering.ps1`

## 🔄 Сброс и переустановка

Если ничего не помогает:

1. **Удалите Edge Function:**
   ```bash
   supabase functions delete cluster_embeddings
   ```

2. **Пересоздайте:**
   ```bash
   supabase functions deploy cluster_embeddings
   ```

3. **Перезапустите приложение:**
   ```bash
   npm run dev
   ```

4. **Выполните полную диагностику:**
   - Нажмите "Тест системы"
   - Проверьте все компоненты 