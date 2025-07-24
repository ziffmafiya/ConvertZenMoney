import { createClient } from '@supabase/supabase-js';
import axios from 'axios'; // Используем axios для HTTP-запросов

// Get your Jina AI API key for free: https://jina.ai/?sui=apikey

/**
 * Генерирует числовое "встраивание" (embedding) для заданного текста с использованием Jina AI Embeddings API.
 * @param {string} text - Текст для генерации встраивания.
 * @returns {Promise<number[]>} - Массив чисел, представляющий встраивание текста.
 */
async function getEmbedding(text) {
    const jinaApiKey = process.env.JINA_API_KEY;

    if (!jinaApiKey) {
        console.error('JINA_API_KEY not configured.');
        throw new Error('JINA_API_KEY not configured.');
    }

    const maxRetries = 5;
    let retries = 0;
    let delay = 1000; // Начальная задержка 1 секунда

    while (retries < maxRetries) {
        try {
            const response = await axios.post(
                'https://api.jina.ai/v1/embeddings',
                {
                    model: 'jina-embeddings-v4', // Используем модель jina-embeddings-v4
                    input: [text] // Входные данные должны быть массивом строк
                },
                {
                    headers: {
                        'Authorization': `Bearer ${jinaApiKey}`,
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                }
            );
            // Jina AI API возвращает массив объектов данных, каждый из которых содержит поле embedding.
            // Мы ожидаем один объект, так как отправляем один текст.
            if (response.data && response.data.data && response.data.data.length > 0) {
                return response.data.data[0].embedding;
            } else {
                throw new Error('Invalid response format from Jina AI Embeddings API');
            }
        } catch (error) {
            if (error.response && error.response.status === 429 && retries < maxRetries - 1) {
                console.warn(`Rate limit exceeded (429). Retrying in ${delay / 1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Увеличиваем задержку экспоненциально
                retries++;
            } else {
                console.error('Error generating embedding for text with Jina AI:', text, error.response ? error.response.data : error.message);
                throw new Error(`Failed to generate embedding with Jina AI: ${error.response?.data?.error?.message || error.message}`);
            }
        }
    }
    throw new Error(`Failed to generate embedding with Jina AI after ${maxRetries} retries due to rate limiting.`);
}

/**
 * Основная функция-обработчик для API-маршрута '/api/upload-transactions'.
 * Она обрабатывает входящие запросы на загрузку транзакций в базу данных Supabase.
 * @param {object} req - Объект запроса (содержит данные, отправленные клиентом).
 * @param {object} res - Объект ответа (используется для отправки ответа клиенту).
 */
export default async function handler(req, res) {
    // Разрешаем только POST-запросы для загрузки данных.
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Извлекаем транзакции и флаг excludeDebts (исключить долги) из тела запроса.
    const { transactions, excludeDebts } = req.body;
    console.log('Received request to upload transactions. Count:', transactions ? transactions.length : 0, 'Exclude Debts:', excludeDebts);

    // Проверяем, что транзакции предоставлены и имеют правильный формат.
    if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
        console.error('Validation error: No transactions provided or invalid format.');
        return res.status(400).json({ error: 'No transactions provided or invalid format' });
    }

    // Получаем URL и ключ Supabase из переменных окружения.
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Проверяем, что ключи Supabase настроены.
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }
    // Проверяем, что ключ API Jina AI настроен.
     if (!process.env.JINA_API_KEY) {
        console.error('Configuration error: JINA_API_KEY not configured.');
        return res.status(500).json({ error: 'JINA_API_KEY not configured' });
    }
    console.log('Supabase client initialized.');

    // Инициализируем клиент Supabase для взаимодействия с базой данных.
    const supabase = createClient(supabaseUrl, supabaseKey);

    /**
     * Нормализует строку, удаляя неразрывные пробелы, обрезая пробелы по краям и приводя к нижнему регистру.
     * Используется для стандартизации текстовых полей перед сравнением.
     * @param {string} str - Входная строка.
     * @returns {string} - Нормализованная строка.
     */
    function normalize(str) {
        return (str ?? '').replace(/\u00A0/g, ' ').trim().toLowerCase();
    }

    // --- Логика дедупликации ---
    /**
     * Создает уникальный хэш для каждой транзакции на основе ее ключевых полей.
     * Это позволяет идентифицировать дубликаты.
     * @param {object} t - Объект транзакции.
     * @returns {string} - Уникальный строковый хэш транзакции.
     */
    const createUniqueHash = (t) => {
        // Создает согласованную, уникальную строку из основных полей транзакции,
        // безопасно обрабатывая нулевые/неопределенные значения и обеспечивая согласованное форматирование чисел.
        // Нормализуем дату в формат ГГГГ-ММ-ДД для согласованного хэширования.
        let normalizedDate = '';
        if (t.date) {
            const parts = t.date.split('.');
            if (parts.length === 3) {
                normalizedDate = `${parts[2]}-${parts[1]}-${parts[0]}`; // Предполагаем формат ДД.ММ.ГГГГ
            } else {
                normalizedDate = t.date; // Используем как есть, если формат не ДД.ММ.ГГГГ
            }
        }
        
        const category = (t.categoryName || '').trim();
        const payee = (t.payee || '').trim();
        const comment = (t.comment || '').trim();
        // Форматируем числа до 2 десятичных знаков, чтобы избежать несоответствий с плавающей запятой.
        const outcome = (t.outcome || 0).toFixed(2);
        const income = (t.income || 0).toFixed(2);
        return `${normalizedDate}|${category}|${payee}|${comment}|${outcome}|${income}`;
    };

    try {
        // 1. Генерируем хэши для всех входящих транзакций.
        const transactionsWithHashes = transactions.map(t => ({
            ...t,
            unique_hash: createUniqueHash(t)
        }));
        const incomingHashes = transactionsWithHashes.map(t => t.unique_hash);
        
        // --- ЛОГИ ОТЛАДКИ ---
        console.log("DEBUG: Incoming Hashes generated from file (first 5):", JSON.stringify(incomingHashes.slice(0, 5), null, 2));
        console.log("DEBUG: Total incoming hashes:", incomingHashes.length);

        // 2. Проверяем, какие хэши уже существуют в базе данных, обрабатывая их частями, чтобы избежать тайм-аутов.
        const CHUNK_SIZE = 500; // Размер части для обработки.
        const existingHashes = new Set(); // Используем Set для быстрого поиска существующих хэшей.

        for (let i = 0; i < incomingHashes.length; i += CHUNK_SIZE) {
            const chunk = incomingHashes.slice(i, i + CHUNK_SIZE);
            console.log(`DEBUG: Checking chunk of hashes (size: ${chunk.length}, first 3: ${JSON.stringify(chunk.slice(0, 3))})`);
            
            // Вызываем хранимую процедуру Supabase для получения существующих хэшей.
            const { data: existingTransactions, error: fetchError } = await supabase
                .rpc('get_existing_hashes', { hashes: chunk });

            if (fetchError) {
                // Если произошла ошибка при получении данных из Supabase, логируем ее и отправляем ответ с ошибкой.
                console.error('Supabase fetch error during deduplication chunk processing:', fetchError);
                return res.status(500).json({ error: `Failed to check for existing transactions. Supabase returned an error: ${fetchError.message}` });
            }

            if (existingTransactions) {
                console.log(`DEBUG: Supabase returned ${existingTransactions.length} existing transactions for this chunk (first 3: ${JSON.stringify(existingTransactions.slice(0, 3))})`);
                // Добавляем существующие хэши в Set. Явно приводим к строке для согласованности.
                existingTransactions.forEach(t => {
                    existingHashes.add(String(t.hash));
                    // console.log(`DEBUG: Added hash to set: ${String(t.hash)}. Current set size: ${existingHashes.size}`); // Убрал этот лог, чтобы не засорять консоль
                });
            }
        }

        // --- ЛОГИ ОТЛАДКИ ---
        console.log("DEBUG: Hashes found in database (first 5):", JSON.stringify(Array.from(existingHashes).slice(0, 5), null, 2));
        console.log("DEBUG: Total existing hashes found (after all chunks):", existingHashes.size); // Изменил лог

        // 3. Отфильтровываем транзакции, которые уже существуют в базе данных.
        const newTransactions = transactionsWithHashes.filter(t => !existingHashes.has(t.unique_hash));
        console.log(`DEBUG: After initial deduplication (removing existing from DB), ${newTransactions.length} transactions remain.`);

        // Если нет новых транзакций для загрузки, отправляем соответствующее сообщение.
        if (newTransactions.length === 0) {
            console.log('No new transactions to upload.');
            return res.status(200).json({ message: 'No new transactions to upload. All provided transactions already exist.' });
        }
        
        let transactionsToProcess = newTransactions;

        // Если установлен флаг excludeDebts, фильтруем транзакции, связанные с долгами.
        if (excludeDebts) {
            const originalCountBeforeDebtFilter = transactionsToProcess.length;
            transactionsToProcess = transactionsToProcess.filter(row => {
                const income = normalize(row.incomeAccountName);
                const outcome = normalize(row.outcomeAccountName);
                const hasDebt = income.includes('долги') || outcome.includes('долги');
                return !hasDebt;
            });
            console.log(`DEBUG: Filtered out debt-related transactions. Removed ${originalCountBeforeDebtFilter - transactionsToProcess.length}. Remaining: ${transactionsToProcess.length}`);
        }

        // Если после всех фильтров не осталось транзакций для загрузки.
        if (transactionsToProcess.length === 0) {
            console.log('No new transactions to upload after all filters applied.');
            return res.status(200).json({ message: 'No new transactions to upload after filtering. All provided transactions already exist or were excluded.' });
        }
        
        console.log(`DEBUG: Final count of transactions to insert: ${transactionsToProcess.length}`);

        // 4. Генерируем встраивания (embeddings) только для новых транзакций.
        let transactionsToInsert = await Promise.all(transactionsToProcess.map(async (t) => {
            // Создаем описание для генерации встраивания, включая все релевантные поля.
            const description = `Транзакция: ${t.comment || ''}. Категория: ${t.categoryName || ''}. Получатель: ${t.payee || ''}. Со счета: ${t.outcomeAccountName || ''}. На счет: ${t.incomeAccountName || ''}.`;
            const embedding = await getEmbedding(description); // Получаем встраивание.
            
            // Возвращаем объект транзакции с добавленным уникальным хэшем и встраиванием,
            // а также преобразуем имена полей в snake_case для соответствия колонкам Supabase.
            return {
                date: t.date,
                category_name: t.categoryName,
                payee: t.payee,
                comment: t.comment,
                outcome_account_name: t.outcomeAccountName,
                outcome: t.outcome,
                income_account_name: t.incomeAccountName,
                income: t.income,
                unique_hash: t.unique_hash, // Передаем хэш
                description_embedding: embedding // Добавляем встраивание
            };
        }));

        console.log('DEBUG: Transactions to insert before final check (first 5):', JSON.stringify(transactionsToInsert.slice(0, 5), null, 2));
        console.log('DEBUG: Total transactions to insert before final check:', transactionsToInsert.length);

        // Дополнительная проверка на дубликаты перед окончательной вставкой (дополнительная мера безопасности).
        let finalHashes = new Set(transactionsToInsert.map(t => t.unique_hash));
        let finalTransactionsToInsert = transactionsToInsert; // Используем новую переменную для итогового массива.
        if (finalHashes.size !== finalTransactionsToInsert.length) {
            console.error("ERROR: Duplicates found in transactionsToInsert before final insert! This indicates an issue with hash generation or prior filtering.");
            // В качестве меры предосторожности, повторно фильтруем, чтобы обеспечить уникальность перед вставкой.
            finalTransactionsToInsert = Array.from(new Map(finalTransactionsToInsert.map(item => [item.unique_hash, item])).values());
            console.log(`DEBUG: Corrected to ${finalTransactionsToInsert.length} unique transactions before insert.`);
        }
        console.log('DEBUG: Transactions to insert after final check (first 5):', JSON.stringify(finalTransactionsToInsert.slice(0, 5), null, 2));
        console.log('DEBUG: Final count of transactions to insert after all checks:', finalTransactionsToInsert.length);

        // 5. Вставляем только новые, обогащенные транзакции в базу данных Supabase.
        const { data, error } = await supabase
            .from('transactions')
            .insert(finalTransactionsToInsert);

        if (error) {
            // Если произошла ошибка при вставке в Supabase, логируем ее и отправляем ответ с ошибкой.
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: error.message });
        }

        // Отправляем успешный ответ с количеством загруженных транзакций.
        const insertedCount = data ? data.length : 0;
        console.log(`${insertedCount} transactions uploaded successfully.`);
        res.status(200).json({ message: `${insertedCount} new transactions uploaded successfully.` });
    } catch (error) {
        // Обработка любых непредвиденных ошибок сервера.
        console.error('Unhandled server error during embedding or Supabase insert:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}
