import json
import pandas as pd
from prophet import Prophet
import matplotlib.pyplot as plt
import base64
import io

# Основная функция-обработчик для Serverless Function
def handler(event, context):
    try:
        # Парсинг тела запроса, которое должно содержать данные о расходах
        body = json.loads(event['body'])
        data = body.get('data')
        
        # Проверка наличия данных
        if not data:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No data provided'})
            }

        # Преобразование входных данных в DataFrame pandas
        # Ожидается, что данные представляют собой список словарей с ключами 'ds' (дата) и 'y' (значение расхода)
        df = pd.DataFrame(data)
        df['ds'] = pd.to_datetime(df['ds']) # Преобразование столбца 'ds' в формат даты

        # Инициализация и обучение модели Prophet
        m = Prophet()
        m.fit(df)

        # Создание будущего DataFrame для прогнозирования
        # Прогнозирование на 30 дней вперед
        future = m.make_future_dataframe(periods=30) 
        forecast = m.predict(future) # Получение прогноза

        # Генерация графика прогноза
        fig = m.plot(forecast) # Основной график прогноза
        m.plot_components(forecast) # Графики компонентов (тренд, сезонность)

        # Сохранение графика в объект BytesIO и кодирование в Base64
        buf = io.BytesIO()
        plt.savefig(buf, format='png') # Сохранение графика в формате PNG
        buf.seek(0) # Перемещение указателя в начало буфера
        image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8') # Кодирование в Base64
        plt.close(fig) # Закрытие фигуры для освобождения памяти

        # Возвращение успешного ответа с изображением в Base64
        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' # Разрешение CORS для Vercel
            },
            'body': json.dumps({'image': image_base64})
        }

    except Exception as e:
        # Обработка ошибок и возвращение ответа с ошибкой
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
