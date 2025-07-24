# ConvertZenMoney Project

Этот проект включает в себя функциональность для обработки финансовых транзакций, их преобразования и обогащения данных с использованием эмбеддингов Google Gemini, а также сохранения в базу данных Supabase.

## Структура проекта

*   `api/gemini-embeddings.py`: Vercel Serverless Function для генерации эмбеддингов транзакций и их сохранения в Supabase.
*   `api/upload-transactions.js`: (Предполагается, что это существующая функция для загрузки транзакций).
*   `requirements.txt`: Список Python-зависимостей для функции `gemini-embeddings.py`.
*   `vercel.json`: Конфигурация Vercel для развертывания Python-функций.
*   `index.html`, `package.json`, `package-lock.json`: Файлы фронтенда или основной части проекта.

## Функция `api/gemini-embeddings.py`

Эта функция отвечает за:
1.  Получение списка транзакций через POST-запрос.
2.  Извлечение описаний транзакций.
3.  Генерацию векторных эмбеддингов для этих описаний с использованием модели Google Gemini (`models/embedding-001`).
4.  Добавление сгенерированных эмбеддингов к данным транзакций.
5.  Сохранение обогащенных данных транзакций в базу данных Supabase.

### Переменные окружения

Для корректной работы функции необходимо настроить следующие переменные окружения в вашем проекте Vercel:

*   `GOOGLE_API_KEY`: Ваш API-ключ для Google Gemini API.
*   `SUPABASE_URL`: URL вашего проекта Supabase.
*   `SUPABASE_KEY`: Ваш `anon_key` для проекта Supabase.

### Зависимости Python

Функция `gemini-embeddings.py` требует следующие Python-библиотеки. Они перечислены в файле `requirements.txt`:

```
google-generativeai
numpy
supabase
```

Vercel автоматически установит эти зависимости при развертывании, если `requirements.txt` находится в корневой директории проекта.

### Конфигурация Vercel

Файл `vercel.json` используется для явного указания Vercel, как обрабатывать Python-функцию:

```json
{
  "functions": {
    "api/gemini-embeddings.py": {
      "runtime": "python@3.9"
    }
  }
}
```

Это гарантирует, что Vercel использует правильный рантайм для вашей Python-функции.

### Требования к базе данных Supabase

Для успешного сохранения эмбеддингов в Supabase ваша таблица `transactions` должна быть настроена следующим образом:

1.  **Включите расширение `pgvector`**:
    *   В панели управления Supabase перейдите в "Database" -> "Extensions".
    *   Найдите и включите `pgvector`.

2.  **Добавьте столбец `description_embedding`**:
    *   В таблице `public.transactions` должен быть столбец с именем `description_embedding`.
    *   Тип данных этого столбца должен быть `VECTOR(768)`, так как эмбеддинги Gemini имеют размерность 768.
    *   Пример SQL-команды для добавления столбца:
        ```sql
        ALTER TABLE public.transactions
        ADD COLUMN description_embedding VECTOR(768);
        ```

## Развертывание

Для развертывания проекта в Vercel:

1.  Убедитесь, что все необходимые переменные окружения настроены в вашем проекте Vercel.
2.  Убедитесь, что `requirements.txt` и `vercel.json` находятся в корневой директории вашего проекта.
3.  Разверните проект через Vercel CLI (`vercel`) или через интеграцию с Git.

После развертывания функция `api/gemini-embeddings.py` будет доступна для обработки POST-запросов.
