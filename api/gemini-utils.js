/**
 * Утилиты для работы с Gemini API, включая обработку rate limiting и повторных попыток
 */

/**
 * Функция для ожидания указанное количество миллисекунд
 * @param {number} ms - Время ожидания в миллисекундах
 * @returns {Promise} Promise, который разрешается после указанного времени
 */
export function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Функция для извлечения времени ожидания из ошибки Gemini API
 * @param {Error} error - Объект ошибки от Gemini API
 * @returns {number} Время ожидания в миллисекундах или значение по умолчанию
 */
export function extractRetryDelay(error) {
    try {
        // Пытаемся извлечь retryDelay из сообщения об ошибке
        const retryInfoMatch = error.message.match(/retryDelay":"(\d+)s"/);
        if (retryInfoMatch) {
            return parseInt(retryInfoMatch[1]) * 1000; // Конвертируем секунды в миллисекунды
        }
    } catch (e) {
        console.warn('Не удалось извлечь retryDelay из ошибки:', e);
    }
    return 10000; // Значение по умолчанию: 10 секунд
}

/**
 * Функция для выполнения операции с Gemini API с повторными попытками при ошибках rate limiting
 * @param {Function} operation - Функция для выполнения (например, generateContent или embedContent)
 * @param {number} maxRetries - Максимальное количество попыток
 * @returns {Promise<any>} Результат операции
 */
export async function executeWithRetry(operation, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            console.log(`Попытка ${attempt} из ${maxRetries} не удалась:`, error.message);
            
            // Проверяем, является ли ошибка связанной с rate limiting
            if (error.message.includes('429') || error.message.includes('quota') || error.message.includes('rate')) {
                if (attempt < maxRetries) {
                    const retryDelay = extractRetryDelay(error);
                    const exponentialDelay = retryDelay * Math.pow(2, attempt - 1); // Экспоненциальная задержка
                    
                    console.log(`Rate limit достигнут. Ожидание ${exponentialDelay}ms перед повторной попыткой...`);
                    await sleep(exponentialDelay);
                    continue;
                } else {
                    throw new Error(`Достигнут лимит запросов к Gemini API после ${maxRetries} попыток. Попробуйте позже.`);
                }
            } else {
                // Если это не ошибка rate limiting, сразу выбрасываем ошибку
                throw error;
            }
        }
    }
}

/**
 * Функция для генерации контента с повторными попытками при ошибках rate limiting
 * @param {object} model - Модель Gemini
 * @param {string} prompt - Промпт для генерации
 * @param {number} maxRetries - Максимальное количество попыток
 * @returns {Promise<string>} Сгенерированный текст
 */
export async function generateContentWithRetry(model, prompt, maxRetries = 3) {
    return executeWithRetry(async () => {
        const result = await model.generateContent(prompt);
        const response = await result.response;
        return response.text();
    }, maxRetries);
}

/**
 * Функция для генерации эмбеддинга с повторными попытками при ошибках rate limiting
 * @param {object} model - Модель Gemini для эмбеддингов
 * @param {string} text - Текст для генерации эмбеддинга
 * @param {number} maxRetries - Максимальное количество попыток
 * @returns {Promise<number[]>} Массив чисел, представляющий эмбеддинг
 */
export async function embedContentWithRetry(model, text, maxRetries = 3) {
    return executeWithRetry(async () => {
        const result = await model.embedContent(text);
        return result.embedding.values;
    }, maxRetries);
} 