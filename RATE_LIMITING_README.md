# Rate Limiting Solution for Gemini API

## Overview

This project implements a comprehensive rate limiting solution to handle Google Gemini API quota limits and errors gracefully.

## Problem

The application was encountering 429 "Too Many Requests" errors from the Gemini API when users exceeded their free tier quota:

```
[GoogleGenerativeAI Error]: Error fetching from https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent: [429 Too Many Requests] You exceeded your current quota, please check your plan and billing details.
```

## Solution

### 1. Shared Utilities (`api/gemini-utils.js`)

Created a centralized utility file with retry logic and rate limiting handling:

- **`executeWithRetry()`**: Generic retry function with exponential backoff
- **`generateContentWithRetry()`**: Specific function for content generation
- **`embedContentWithRetry()`**: Specific function for embedding generation
- **`extractRetryDelay()`**: Extracts retry delay from API error messages
- **`sleep()`**: Utility function for delays

### 2. Exponential Backoff Strategy

The retry mechanism implements exponential backoff:
- First retry: Uses the delay suggested by the API (e.g., 9 seconds)
- Second retry: 2x the original delay (e.g., 18 seconds)
- Third retry: 4x the original delay (e.g., 36 seconds)

### 3. Fallback Mechanisms

When AI analysis fails, the system provides:

#### For Deep Analysis (`api/deep-analysis.js`):
- **Simple Analysis**: Basic financial analysis without AI
- **Configuration Error Handling**: Clear messages for API key issues
- **Graceful Degradation**: Continues to work even when AI is unavailable

#### For Upload Transactions (`api/upload-transactions.js`):
- **Retry Logic**: Automatically retries embedding generation
- **Error Logging**: Detailed error tracking for debugging

### 4. Error Classification

The system distinguishes between different types of errors:

- **Rate Limiting (429)**: Retries with exponential backoff
- **Authentication Errors**: Clear configuration error messages
- **Other Errors**: Immediate failure with detailed logging

## Usage

### Deep Analysis
```javascript
import { generateContentWithRetry } from './gemini-utils.js';

try {
    const analysis = await generateContentWithRetry(model, prompt, 3);
    // Use AI-generated analysis
} catch (error) {
    // Fallback to simple analysis
    const simpleAnalysis = generateSimpleAnalysis(/* params */);
}
```

### Upload Transactions
```javascript
import { embedContentWithRetry } from './gemini-utils.js';

const embedding = await embedContentWithRetry(embeddingModel, text, 3);
```

## Configuration

### Environment Variables
- `GEMINI_API_KEY`: Your Google Gemini API key
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_ANON_KEY`: Supabase anonymous key

### Rate Limiting Settings
- **Max Retries**: 3 attempts (configurable)
- **Base Delay**: 10 seconds (fallback if API doesn't specify)
- **Exponential Factor**: 2x multiplier per retry

## Monitoring

The system logs all retry attempts and rate limiting events:

```
Rate limit достигнут. Ожидание 9000ms перед повторной попыткой...
Попытка 1 из 3 не удалась: [429 Too Many Requests]
```

## Best Practices

1. **Monitor Usage**: Keep track of your Gemini API usage
2. **Upgrade Plan**: Consider upgrading from free tier for production use
3. **Caching**: Implement caching for repeated requests
4. **Queue System**: For high-volume applications, consider implementing a queue system

## Troubleshooting

### Common Issues

1. **"API_KEY not configured"**
   - Check that `GEMINI_API_KEY` is set in environment variables

2. **"Rate limit exceeded"**
   - Wait for quota reset (usually hourly for free tier)
   - Consider upgrading your API plan

3. **"Authentication failed"**
   - Verify your API key is valid and has proper permissions

### Debug Mode

Enable detailed logging by checking console output for retry attempts and error messages.

## Future Improvements

1. **Caching Layer**: Implement Redis or similar for caching embeddings
2. **Queue System**: Add job queue for high-volume processing
3. **Usage Monitoring**: Track API usage and provide alerts
4. **Alternative Models**: Add fallback to other AI providers 