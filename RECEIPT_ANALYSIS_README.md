# Анализ чеков с Aspose.OCR

## Описание

Добавлена функция анализа чеков с использованием Aspose.OCR для автоматического распознавания продуктов и цен из изображений чеков на украинском языке.

## Функциональность

- Загрузка изображений чеков (JPG, PNG, GIF)
- Автоматическое распознавание текста с помощью Aspose.OCR
- Извлечение информации о продуктах (название, количество, цена)
- Сохранение данных в базу данных Supabase
- Статистика покупок по продуктам
- Фильтрация по месяцам и годам

## Настройка

### 1. Установка зависимостей

```bash
npm install aspose-ocr-cloud
```

### 2. Переменные окружения

Добавьте следующие переменные в ваш `.env` файл:

```env
# Aspose.OCR Cloud credentials
ASPOSE_APP_SID=your_app_sid_here
ASPOSE_APP_KEY=your_app_key_here

# Supabase (уже должны быть настроены)
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Создание таблиц в базе данных

Выполните SQL скрипт `create_receipts_tables.sql` в вашей базе данных Supabase:

```sql
-- Создание таблицы для хранения информации о чеках
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    raw_text TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    products_count INTEGER NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы для хранения продуктов из чеков
CREATE TABLE IF NOT EXISTS receipt_products (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER REFERENCES receipts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_receipts_uploaded_at ON receipts(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_receipt_products_receipt_id ON receipt_products(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_products_name ON receipt_products(name);
```

## Использование

### Загрузка чека

1. Нажмите кнопку "Загрузить чек" в секции "Анализ чеков"
2. Выберите изображение чека
3. Нажмите "Анализировать"
4. Дождитесь результатов анализа

### Просмотр статистики

- Статистика продуктов отображается автоматически
- Можно фильтровать по месяцам и годам
- Показывается:
  - Общая сумма потраченная на продукт
  - Количество покупок
  - Общее количество единиц
  - Средняя цена
  - Диапазон цен

## API Endpoints

### POST /api/analyze-receipt

Анализирует загруженный чек.

**Параметры:**
- `receipt` - файл изображения чека (multipart/form-data)

**Ответ:**
```json
{
  "success": true,
  "products": [
    {
      "name": "Молоко",
      "quantity": 2,
      "price": 25.50,
      "total": 51.00
    }
  ],
  "total": 51.00,
  "receipt_id": 123
}
```

### GET /api/get-product-stats

Получает статистику по продуктам.

**Параметры:**
- `month` - месяц (опционально)
- `year` - год (опционально)
- `limit` - количество продуктов (по умолчанию 20)

**Ответ:**
```json
{
  "success": true,
  "products": [
    {
      "name": "Молоко",
      "totalQuantity": 10,
      "totalSpent": 255.00,
      "averagePrice": 25.50,
      "purchaseCount": 5,
      "minPrice": 24.00,
      "maxPrice": 27.00
    }
  ],
  "stats": {
    "totalProducts": 15,
    "totalSpent": 1250.50,
    "totalPurchases": 45
  }
}
```

## Поддерживаемые форматы чеков

Система оптимизирована для украинских чеков и распознает следующие паттерны:

- `Название продукта 25.50 грн`
- `Название продукта 2 x 25.50 грн`
- `Название продукта 25.50 ₴`

## Ограничения

- Требуется активная подписка на Aspose.OCR Cloud
- Качество распознавания зависит от качества изображения чека
- Поддерживаются только изображения (JPG, PNG, GIF)
- Максимальный размер файла ограничен настройками сервера

## Устранение неполадок

### Ошибка "ASPOSE_APP_SID not configured"
Проверьте, что переменные окружения `ASPOSE_APP_SID` и `ASPOSE_APP_KEY` правильно настроены.

### Ошибка "File must be an image"
Убедитесь, что загружаемый файл является изображением в поддерживаемом формате.

### Ошибка "Failed to parse multipart data"
Проверьте, что файл загружается корректно и не поврежден.

### Плохое качество распознавания
- Убедитесь, что изображение чека четкое и хорошо освещено
- Избегайте размытых или перевернутых изображений
- Убедитесь, что текст на чеке читаемый 