import json
import pandas as pd
from prophet import Prophet
import matplotlib.pyplot as plt
import base64
import io

def handler(event, context):
    try:
        # Parse the request body
        body = json.loads(event['body'])
        data = body.get('data')
        
        if not data:
            return {
                'statusCode': 400,
                'body': json.dumps({'error': 'No data provided'})
            }

        # Convert data to pandas DataFrame
        # Assuming data is a list of dictionaries with 'ds' (date) and 'y' (value)
        df = pd.DataFrame(data)
        df['ds'] = pd.to_datetime(df['ds'])

        # Initialize and fit Prophet model
        m = Prophet()
        m.fit(df)

        # Create future dataframe for forecasting
        future = m.make_future_dataframe(periods=30) # Forecast for 30 days
        forecast = m.predict(future)

        # Generate plot
        fig = m.plot(forecast)
        m.plot_components(forecast) # Plot components (trend, seasonality)

        # Save plot to a BytesIO object and then encode to base64
        buf = io.BytesIO()
        plt.savefig(buf, format='png')
        buf.seek(0)
        image_base64 = base64.b64encode(buf.getvalue()).decode('utf-8')
        plt.close(fig) # Close the figure to free memory

        return {
            'statusCode': 200,
            'headers': {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*' # Allow CORS for Vercel
            },
            'body': json.dumps({'image': image_base64})
        }

    except Exception as e:
        return {
            'statusCode': 500,
            'body': json.dumps({'error': str(e)})
        }
