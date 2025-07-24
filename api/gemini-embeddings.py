import google.generativeai as genai
import numpy as np
import os
from supabase import create_client, Client # Changed from supabase-py to supabase
import json

# 1. API Key Configuration
# Проверка наличия GOOGLE_API_KEY на верхнем уровне скрипта
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    print("Ошибка: Переменная окружения GOOGLE_API_KEY не установлена.")
    # В Vercel Edge/Serverless Function, лучше поднять исключение, чтобы функция не развернулась или упала при вызове.
    # Для простоты примера, мы можем просто выйти или поднять RuntimeError.
    raise RuntimeError("GOOGLE_API_KEY не установлен. Функция не может работать без него.")

genai.configure(api_key=GOOGLE_API_KEY)

# 2. Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Ошибка: Переменные окружения SUPABASE_URL или SUPABASE_KEY не установлены.")
    raise RuntimeError("SUPABASE_URL или SUPABASE_KEY не установлены. Функция не может работать без них.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_gemini_embeddings(texts: list[str]) -> list[list[float]]:
    """
    Генерирует эмбеддинги для списка текстов с использованием модели Google Gemini.

    Args:
        texts (list[str]): Список текстовых строк, для которых нужно сгенерировать эмбеддинги.

    Returns:
        list[list[float]]: Список эмбеддинг-векторов, где каждый внутренний список
                           представляет собой вектор эмбеддинга для соответствующего входного текста.
                           Если входной список пуст, возвращается пустой список.
                           В случае ошибки при генерации эмбеддинга для конкретного текста,
                           вместо него возвращается нулевой вектор размерностью 768,
                           чтобы сохранить длину выходного списка.
    """
    if not texts:
        return []

    embeddings = []
    model_name = 'models/embedding-001'
    embedding_dimension = 768 # Размерность для 'embedding-001' (gemini-pro)

    for text in texts:
        try:
            # Вызов API Gemini для генерации эмбеддинга
            response = genai.embed_content(
                model=model_name,
                content=text,
                task_type="SEMANTIC_SIMILARITY"
            )
            # Эмбеддинг находится в response['embedding']
            embeddings.append(response['embedding'])
        except Exception as e:
            # Обработка ошибок: вывод в лог и добавление нулевого вектора
            truncated_text = (text[:100] + '...') if len(text) > 100 else text
            print(f"Error generating embedding for text: '{truncated_text}'. Error: {e}")
            embeddings.append(np.zeros(embedding_dimension).tolist()) # Добавление нулевого вектора

    return embeddings

# Vercel Serverless Function Handler
# Vercel ожидает функцию с именем `handler` и методом `do_POST` для POST-запросов.
# https://vercel.com/docs/functions/serverless-functions/runtimes/python#handling-requests
class Handler:
    def do_POST(self, request):
        try:
            # Парсинг JSON-тела запроса
            body = json.loads(request.body)
            transactions_data = body.get("transactions", [])

            if not transactions_data:
                return {
                    "statusCode": 400,
                    "headers": {"Content-Type": "application/json"},
                    "body": json.dumps({"error": "No transactions data provided."})
                }

            descriptions = [tx.get("description", "") for tx in transactions_data]

            # Получение эмбеддингов для всех описаний
            transaction_embeddings = get_gemini_embeddings(descriptions)

            augmented_transactions = []
            for i, tx in enumerate(transactions_data):
                # Добавление эмбеддинга к данным транзакции
                tx["description_embedding"] = transaction_embeddings[i]
                augmented_transactions.append(tx)

            # Вставка обогащенных данных в Supabase
            # Замените 'your_transactions_table' на фактическое имя вашей таблицы
            table_name = 'your_transactions_table'
            response, count = supabase.table(table_name).insert(augmented_transactions).execute()

            if response:
                return {
                    "statusCode": 200,
                    "headers": {"Content-Type": "application/json"},
                    "body": json.dumps({
                        "message": f"Successfully inserted {len(response[1])} records into Supabase.",
                        "inserted_count": len(response[1])
                    })
                }
            else:
                # Обработка случая, когда Supabase не возвращает успешный ответ
                print(f"Supabase insert operation failed or returned empty response. Count: {count}")
                return {
                    "statusCode": 500,
                    "headers": {"Content-Type": "application/json"},
                    "body": json.dumps({"error": "Failed to insert data into Supabase.", "details": str(count)})
                }

        except json.JSONDecodeError:
            return {
                "statusCode": 400,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": "Invalid JSON payload."})
            }
        except RuntimeError as e:
            # Перехват ошибок конфигурации API ключа/Supabase
            return {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": f"Server configuration error: {e}"})
            }
        except Exception as e:
            # Общая обработка других непредвиденных ошибок
            print(f"An unexpected error occurred: {e}")
            return {
                "statusCode": 500,
                "headers": {"Content-Type": "application/json"},
                "body": json.dumps({"error": f"Internal server error: {e}"})
            }

handler = Handler()
