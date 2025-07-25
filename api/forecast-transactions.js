import { createClient } from '@supabase/supabase-js';
import { SimpleLinearRegression } from 'ml-regression-simple-linear';
import * as ss from 'simple-statistics';
import regression from 'regression';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { 
        model = 'linear', 
        periods = 6, 
        category = null, 
        type = 'expenses',
        confidence_level = 0.95 
    } = req.body;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Fetch historical transaction data
        let query = supabase.from('transactions').select('*').order('date', { ascending: true });
        
        const { data: transactions, error } = await query;

        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!transactions || transactions.length === 0) {
            return res.status(400).json({ error: 'No transaction data available for forecasting' });
        }

        // Prepare time series data
        const timeSeriesData = prepareTimeSeriesData(transactions, type, category);
        
        if (timeSeriesData.length < 3) {
            return res.status(400).json({ error: 'Insufficient data for forecasting. Need at least 3 data points.' });
        }

        // Generate forecast based on selected model
        let forecast;
        let accuracy;
        let seasonality;

        switch (model.toLowerCase()) {
            case 'linear':
                forecast = linearRegressionForecast(timeSeriesData, periods);
                break;
            case 'moving_average':
                forecast = movingAverageForecast(timeSeriesData, periods);
                break;
            case 'exponential_smoothing':
                forecast = exponentialSmoothingForecast(timeSeriesData, periods);
                break;
            case 'arima':
                forecast = arimaForecast(timeSeriesData, periods);
                break;
            case 'prophet':
                forecast = prophetLikeForecast(timeSeriesData, periods);
                break;
            case 'ensemble':
                forecast = ensembleForecast(timeSeriesData, periods);
                break;
            default:
                return res.status(400).json({ error: 'Invalid model type' });
        }

        // Calculate accuracy metrics
        accuracy = calculateAccuracyMetrics(timeSeriesData, model);
        
        // Detect seasonality
        seasonality = detectSeasonality(timeSeriesData);

        // Calculate confidence intervals
        const confidenceIntervals = calculateConfidenceIntervals(
            timeSeriesData, 
            forecast.values, 
            confidence_level
        );

        res.status(200).json({
            forecast: {
                model: model,
                periods: periods,
                values: forecast.values,
                dates: forecast.dates,
                confidence_intervals: confidenceIntervals,
                trend: forecast.trend || null
            },
            accuracy: accuracy,
            seasonality: seasonality,
            historical_data: timeSeriesData.slice(-12), // Last 12 periods for context
            metadata: {
                data_points: timeSeriesData.length,
                category: category,
                type: type,
                generated_at: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error('Forecasting error:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}

// Helper function to prepare time series data
function prepareTimeSeriesData(transactions, type, category) {
    // Group transactions by month
    const monthlyData = {};
    
    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
            monthlyData[monthKey] = { income: 0, expenses: 0, date: monthKey };
        }
        
        // Filter by category if specified
        if (category && transaction.category_name !== category) {
            return;
        }
        
        if (transaction.income > 0) {
            monthlyData[monthKey].income += transaction.income;
        } else if (transaction.outcome > 0) {
            monthlyData[monthKey].expenses += transaction.outcome;
        }
    });
    
    // Convert to array and sort by date
    const sortedData = Object.values(monthlyData)
        .sort((a, b) => a.date.localeCompare(b.date))
        .map((item, index) => ({
            period: index,
            date: item.date,
            value: type === 'income' ? item.income : item.expenses,
            income: item.income,
            expenses: item.expenses
        }));
    
    return sortedData;
}

// Linear Regression Forecast
function linearRegressionForecast(data, periods) {
    const x = data.map((_, index) => index);
    const y = data.map(item => item.value);
    
    const regression = new SimpleLinearRegression(x, y);
    
    const forecast = [];
    const dates = [];
    const lastDate = new Date(data[data.length - 1].date + '-01');
    
    for (let i = 1; i <= periods; i++) {
        const futureX = data.length + i - 1;
        const predictedValue = Math.max(0, regression.predict(futureX));
        
        const futureDate = new Date(lastDate);
        futureDate.setMonth(futureDate.getMonth() + i);
        const dateString = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
        
        forecast.push(predictedValue);
        dates.push(dateString);
    }
    
    return {
        values: forecast,
        dates: dates,
        trend: regression.slope > 0 ? 'increasing' : regression.slope < 0 ? 'decreasing' : 'stable'
    };
}

// Moving Average Forecast
function movingAverageForecast(data, periods, window = 3) {
    const values = data.map(item => item.value);
    const windowSize = Math.min(window, values.length);
    
    // Calculate moving average for the last window
    const lastValues = values.slice(-windowSize);
    const average = lastValues.reduce((sum, val) => sum + val, 0) / windowSize;
    
    const forecast = new Array(periods).fill(average);
    const dates = [];
    const lastDate = new Date(data[data.length - 1].date + '-01');
    
    for (let i = 1; i <= periods; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setMonth(futureDate.getMonth() + i);
        const dateString = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
        dates.push(dateString);
    }
    
    return { values: forecast, dates: dates };
}

// Exponential Smoothing Forecast
function exponentialSmoothingForecast(data, periods, alpha = 0.3) {
    const values = data.map(item => item.value);
    
    // Calculate exponentially smoothed values
    let smoothed = values[0];
    for (let i = 1; i < values.length; i++) {
        smoothed = alpha * values[i] + (1 - alpha) * smoothed;
    }
    
    const forecast = new Array(periods).fill(smoothed);
    const dates = [];
    const lastDate = new Date(data[data.length - 1].date + '-01');
    
    for (let i = 1; i <= periods; i++) {
        const futureDate = new Date(lastDate);
        futureDate.setMonth(futureDate.getMonth() + i);
        const dateString = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
        dates.push(dateString);
    }
    
    return { values: forecast, dates: dates };
}

// Simple ARIMA-like Forecast (AR model)
function arimaForecast(data, periods) {
    const values = data.map(item => item.value);
    
    if (values.length < 3) {
        return movingAverageForecast(data, periods);
    }
    
    // Simple AR(1) model
    const differences = [];
    for (let i = 1; i < values.length; i++) {
        differences.push(values[i] - values[i - 1]);
    }
    
    const avgDifference = differences.reduce((sum, diff) => sum + diff, 0) / differences.length;
    const lastValue = values[values.length - 1];
    
    const forecast = [];
    const dates = [];
    const lastDate = new Date(data[data.length - 1].date + '-01');
    
    for (let i = 1; i <= periods; i++) {
        const predictedValue = Math.max(0, lastValue + avgDifference * i);
        
        const futureDate = new Date(lastDate);
        futureDate.setMonth(futureDate.getMonth() + i);
        const dateString = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
        
        forecast.push(predictedValue);
        dates.push(dateString);
    }
    
    return { values: forecast, dates: dates };
}

// Prophet-like Forecast with trend and seasonality
function prophetLikeForecast(data, periods) {
    const values = data.map(item => item.value);
    
    // Detect trend using linear regression
    const x = data.map((_, index) => index);
    const linearReg = new SimpleLinearRegression(x, values);
    
    // Detect seasonality (simple 12-month cycle)
    const seasonalComponents = new Array(12).fill(0);
    const seasonalCounts = new Array(12).fill(0);
    
    data.forEach((item, index) => {
        const month = new Date(item.date + '-01').getMonth();
        const detrended = item.value - linearReg.predict(index);
        seasonalComponents[month] += detrended;
        seasonalCounts[month]++;
    });
    
    // Average seasonal components
    for (let i = 0; i < 12; i++) {
        if (seasonalCounts[i] > 0) {
            seasonalComponents[i] /= seasonalCounts[i];
        }
    }
    
    const forecast = [];
    const dates = [];
    const lastDate = new Date(data[data.length - 1].date + '-01');
    
    for (let i = 1; i <= periods; i++) {
        const futureX = data.length + i - 1;
        const trendValue = linearReg.predict(futureX);
        
        const futureDate = new Date(lastDate);
        futureDate.setMonth(futureDate.getMonth() + i);
        const month = futureDate.getMonth();
        const seasonalValue = seasonalComponents[month] || 0;
        
        const predictedValue = Math.max(0, trendValue + seasonalValue);
        const dateString = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;
        
        forecast.push(predictedValue);
        dates.push(dateString);
    }
    
    return {
        values: forecast,
        dates: dates,
        trend: linearReg.slope > 0 ? 'increasing' : linearReg.slope < 0 ? 'decreasing' : 'stable'
    };
}

// Ensemble Forecast (combines multiple models)
function ensembleForecast(data, periods) {
    const models = [
        linearRegressionForecast(data, periods),
        movingAverageForecast(data, periods),
        exponentialSmoothingForecast(data, periods),
        prophetLikeForecast(data, periods)
    ];
    
    const forecast = [];
    const dates = models[0].dates;
    
    for (let i = 0; i < periods; i++) {
        const values = models.map(model => model.values[i]);
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        forecast.push(average);
    }
    
    return { values: forecast, dates: dates };
}

// Calculate accuracy metrics
function calculateAccuracyMetrics(data, model) {
    if (data.length < 4) {
        return { mae: null, rmse: null, mape: null };
    }
    
    // Use last 25% of data for validation
    const splitIndex = Math.floor(data.length * 0.75);
    const trainData = data.slice(0, splitIndex);
    const testData = data.slice(splitIndex);
    
    if (testData.length === 0) {
        return { mae: null, rmse: null, mape: null };
    }
    
    // Generate predictions for test period
    let predictions;
    switch (model.toLowerCase()) {
        case 'linear':
            predictions = linearRegressionForecast(trainData, testData.length);
            break;
        case 'moving_average':
            predictions = movingAverageForecast(trainData, testData.length);
            break;
        default:
            predictions = linearRegressionForecast(trainData, testData.length);
    }
    
    const actual = testData.map(item => item.value);
    const predicted = predictions.values;
    
    // Calculate metrics
    const errors = actual.map((a, i) => Math.abs(a - predicted[i]));
    const mae = errors.reduce((sum, err) => sum + err, 0) / errors.length;
    
    const squaredErrors = actual.map((a, i) => Math.pow(a - predicted[i], 2));
    const rmse = Math.sqrt(squaredErrors.reduce((sum, err) => sum + err, 0) / squaredErrors.length);
    
    const percentageErrors = actual.map((a, i) => a !== 0 ? Math.abs((a - predicted[i]) / a) * 100 : 0);
    const mape = percentageErrors.reduce((sum, err) => sum + err, 0) / percentageErrors.length;
    
    return { mae, rmse, mape };
}

// Detect seasonality in the data
function detectSeasonality(data) {
    if (data.length < 24) {
        return { seasonal: false, period: null, strength: 0 };
    }
    
    const values = data.map(item => item.value);
    
    // Test for 12-month seasonality
    const correlations = [];
    for (let lag = 1; lag <= 12; lag++) {
        if (values.length > lag) {
            const correlation = ss.sampleCorrelation(
                values.slice(0, -lag),
                values.slice(lag)
            );
            correlations.push({ lag, correlation: Math.abs(correlation) });
        }
    }
    
    const maxCorrelation = Math.max(...correlations.map(c => c.correlation));
    const seasonalLag = correlations.find(c => c.correlation === maxCorrelation)?.lag;
    
    return {
        seasonal: maxCorrelation > 0.3,
        period: seasonalLag,
        strength: maxCorrelation
    };
}

// Calculate confidence intervals
function calculateConfidenceIntervals(historicalData, forecast, confidenceLevel) {
    const values = historicalData.map(item => item.value);
    const residuals = [];
    
    // Calculate residuals using simple moving average as baseline
    for (let i = 3; i < values.length; i++) {
        const predicted = (values[i-1] + values[i-2] + values[i-3]) / 3;
        residuals.push(values[i] - predicted);
    }
    
    if (residuals.length === 0) {
        return forecast.map(value => ({ lower: value * 0.8, upper: value * 1.2 }));
    }
    
    const residualStd = ss.standardDeviation(residuals);
    const zScore = confidenceLevel === 0.95 ? 1.96 : confidenceLevel === 0.99 ? 2.58 : 1.64;
    const margin = zScore * residualStd;
    
    return forecast.map(value => ({
        lower: Math.max(0, value - margin),
        upper: value + margin
    }));
}