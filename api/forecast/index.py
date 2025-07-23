import os
import pandas as pd
from pmdarima import auto_arima
from supabase import create_client, Client
from datetime import datetime, timedelta
import json

# Initialize Supabase client
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_ANON_KEY:
    raise ValueError("Supabase URL or Anon Key not configured.")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_ANON_KEY)

def get_transactions_data():
    """Fetches transaction data from Supabase."""
    try:
        response = supabase.from_('transactions').select('date, outcome').execute()
        if response.data:
            return response.data
        else:
            print("No data found in Supabase.")
            return []
    except Exception as e:
        print(f"Error fetching data from Supabase: {e}")
        return []

def prepare_data(transactions_data):
    """Prepares data for ARIMA model."""
    if not transactions_data:
        return pd.Series()

    df = pd.DataFrame(transactions_data)
    df['date'] = pd.to_datetime(df['date'])
    df['outcome'] = pd.to_numeric(df['outcome'], errors='coerce').fillna(0)

    # Aggregate daily outcomes
    daily_expenses = df.groupby('date')['outcome'].sum()

    # Reindex to ensure all dates are present, filling missing with 0
    min_date = daily_expenses.index.min()
    max_date = daily_expenses.index.max()
    if pd.isna(min_date) or pd.isna(max_date):
        return pd.Series() # No valid dates

    all_dates = pd.date_range(start=min_date, end=max_date, freq='D')
    daily_expenses = daily_expenses.reindex(all_dates, fill_value=0)

    return daily_expenses

def forecast_expenses(daily_expenses, forecast_period_days=30):
    """
    Forecasts future expenses using ARIMA/SARIMA.
    Automatically determines ARIMA/SARIMA parameters.
    """
    if daily_expenses.empty or len(daily_expenses) < 2:
        return [] # Not enough data to forecast

    # Use auto_arima to find the best ARIMA model parameters
    # seasonal=True for SARIMA, m=7 for weekly seasonality (if applicable)
    # For daily data, m could be 7 (weekly) or 365 (yearly). Let's start with no seasonality for simplicity
    # and allow auto_arima to determine if it's needed.
    model = auto_arima(daily_expenses, seasonal=False, suppress_warnings=True,
                       stepwise=True, trace=False, error_action="ignore")

    # Make future forecasts
    forecast_result = model.predict(n_periods=forecast_period_days)

    # Create a list of future dates
    last_date = daily_expenses.index.max()
    future_dates = [last_date + timedelta(days=i) for i in range(1, forecast_period_days + 1)]

    forecasts = []
    for i, date in enumerate(future_dates):
        forecasts.append({
            "date": date.strftime("%Y-%m-%d"),
            "predicted_outcome": max(0, forecast_result.iloc[i]) # Ensure non-negative predictions
        })
    return forecasts

def handler(request):
    """
    Vercel serverless function handler for expense forecasting.
    """
    if request.method != 'GET':
        return json.dumps({"error": "Method Not Allowed"}), 405, {'Content-Type': 'application/json'}

    transactions_data = get_transactions_data()
    if not transactions_data:
        return json.dumps({"error": "No historical data available for forecasting"}), 404, {'Content-Type': 'application/json'}

    daily_expenses = prepare_data(transactions_data)
    if daily_expenses.empty:
        return json.dumps({"error": "Not enough valid data to prepare for forecasting"}), 400, {'Content-Type': 'application/json'}

    forecasts = forecast_expenses(daily_expenses, forecast_period_days=30)

    if not forecasts:
        return json.dumps({"error": "Could not generate forecasts"}), 500, {'Content-Type': 'application/json'}

    return json.dumps({"forecasts": forecasts}), 200, {'Content-Type': 'application/json'}
