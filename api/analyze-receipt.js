import { createClient } from '@supabase/supabase-js';
import { Configuration, RecognizeReceiptApi } from 'aspose-ocr-cloud';

/**
 * Простой парсер multipart/form-data
 */
function parseMultipartData(buffer, boundary) {
    const parts = [];
    const boundaryBuffer = Buffer.from(`--${boundary}`);
    const boundaryEndBuffer = Buffer.from(`--${boundary}--`);
    
    let start = buffer.indexOf(boundaryBuffer);
    let end = buffer.indexOf(boundaryEndBuffer);
    
    if (start === -1 || end === -1) {
        return null;
    }
    
    const content = buffer.slice(start + boundaryBuffer.length, end);
    const partsRaw = content.split(boundaryBuffer);
    
    partsRaw.forEach(part => {
        if (part.length < 4) return;
        
        const headerEnd = part.indexOf('\r\n\r\n');
        if (headerEnd === -1) return;
        
        const headers = part.slice(0, headerEnd).toString();
        const body = part.slice(headerEnd + 4, part.length - 2);
        
        const nameMatch = headers.match(/name="([^"]+)"/);
        const filenameMatch = headers.match(/filename="([^"]+)"/);
        const contentTypeMatch = headers.match(/Content-Type: ([^\r\n]+)/);
        
        if (nameMatch) {
            parts.push({
                name: nameMatch[1],
                filename: filenameMatch ? filenameMatch[1] : null,
                contentType: contentTypeMatch ? contentTypeMatch[1] : null,
                data: body
            });
        }
    });
    
    return parts;
}

/**
 * Анализирует чек с помощью Aspose.OCR и извлекает информацию о продуктах
 * @param {Buffer} imageBuffer - Буфер изображения чека
 * @returns {Promise<object>} - Результат анализа чека
 */
async function analyzeReceipt(imageBuffer) {
    try {
        // Инициализация Aspose.OCR
        const config = new Configuration({
            appSid: process.env.ASPOSE_APP_SID,
            appKey: process.env.ASPOSE_APP_KEY
        });
        
        const api = new RecognizeReceiptApi(config);
        
        // Конвертируем буфер в base64
        const base64Image = imageBuffer.toString('base64');
        
        // Настройки для украинского языка
        const settings = {
            language: 'Ukrainian',
            resultType: 'Text',
            regions: ['receipt']
        };
        
        // Отправляем запрос на распознавание
        const result = await api.postRecognizeReceipt({
            image: base64Image,
            settings: settings
        });
        
        // Парсим результат и извлекаем продукты
        const products = parseReceiptText(result.text);
        
        return {
            success: true,
            products: products,
            rawText: result.text
        };
    } catch (error) {
        console.error('Error analyzing receipt:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Парсит текст чека и извлекает информацию о продуктах
 * @param {string} text - Распознанный текст чека
 * @returns {Array} - Массив продуктов с ценой и количеством
 */
function parseReceiptText(text) {
    const products = [];
    const lines = text.split('\n').filter(line => line.trim());
    
    // Паттерны для поиска продуктов в украинских чеках
    const productPatterns = [
        /^(.+?)\s+(\d+[.,]\d{2})\s*грн/i,  // Название продукта + цена
        /^(.+?)\s+(\d+)\s*x\s*(\d+[.,]\d{2})\s*грн/i,  // Название + количество x цена
        /^(.+?)\s+(\d+[.,]\d{2})\s*₴/i,  // С символом гривны
    ];
    
    lines.forEach(line => {
        for (const pattern of productPatterns) {
            const match = line.match(pattern);
            if (match) {
                const productName = match[1].trim();
                const quantity = match[3] ? parseInt(match[2]) : 1;
                const price = parseFloat(match[3] || match[2].replace(',', '.'));
                
                // Исключаем общие строки чека
                if (!isReceiptHeader(productName)) {
                    products.push({
                        name: productName,
                        quantity: quantity,
                        price: price,
                        total: quantity * price
                    });
                }
                break;
            }
        }
    });
    
    return products;
}

/**
 * Проверяет, является ли строка заголовком чека
 * @param {string} text - Текст для проверки
 * @returns {boolean} - true если это заголовок чека
 */
function isReceiptHeader(text) {
    const headers = [
        'чек', 'receipt', 'сума', 'total', 'итого', 'оплачено', 'paid',
        'дата', 'date', 'час', 'time', 'касир', 'cashier', 'магазин', 'store'
    ];
    
    return headers.some(header => 
        text.toLowerCase().includes(header.toLowerCase())
    );
}

/**
 * Основной обработчик для API-маршрута '/api/analyze-receipt'
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    try {
        // Получаем данные из запроса
        const contentType = req.headers['content-type'] || '';
        
        if (!contentType.includes('multipart/form-data')) {
            return res.status(400).json({ error: 'Content-Type must be multipart/form-data' });
        }
        
        // Извлекаем boundary из Content-Type
        const boundaryMatch = contentType.match(/boundary=([^;]+)/);
        if (!boundaryMatch) {
            return res.status(400).json({ error: 'Invalid multipart boundary' });
        }
        
        const boundary = boundaryMatch[1];
        
        // Получаем тело запроса как буфер
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        
        req.on('end', async () => {
            try {
                const buffer = Buffer.concat(chunks);
                const parts = parseMultipartData(buffer, boundary);
                
                if (!parts) {
                    return res.status(400).json({ error: 'Failed to parse multipart data' });
                }
                
                const receiptPart = parts.find(part => part.name === 'receipt');
                if (!receiptPart) {
                    return res.status(400).json({ error: 'No receipt file provided' });
                }
                
                // Проверяем тип файла
                if (!receiptPart.contentType || !receiptPart.contentType.startsWith('image/')) {
                    return res.status(400).json({ error: 'File must be an image' });
                }
                
                // Анализируем чек
                const result = await analyzeReceipt(receiptPart.data);
                
                if (result.success) {
                    // Сохраняем результаты в базу данных
                    const supabaseUrl = process.env.SUPABASE_URL;
                    const supabaseKey = process.env.SUPABASE_ANON_KEY;
                    const supabase = createClient(supabaseUrl, supabaseKey);
                    
                    // Сохраняем информацию о чеке
                    const { data: receiptData, error: receiptError } = await supabase
                        .from('receipts')
                        .insert({
                            raw_text: result.rawText,
                            total_amount: result.products.reduce((sum, p) => sum + p.total, 0),
                            products_count: result.products.length,
                            uploaded_at: new Date().toISOString()
                        })
                        .select();
                    
                    if (receiptError) {
                        console.error('Error saving receipt:', receiptError);
                    }
                    
                    // Сохраняем продукты
                    if (result.products.length > 0 && receiptData) {
                        const productsToInsert = result.products.map(product => ({
                            receipt_id: receiptData[0].id,
                            name: product.name,
                            quantity: product.quantity,
                            price: product.price,
                            total: product.total
                        }));
                        
                        const { error: productsError } = await supabase
                            .from('receipt_products')
                            .insert(productsToInsert);
                        
                        if (productsError) {
                            console.error('Error saving products:', productsError);
                        }
                    }
                    
                    res.status(200).json({
                        success: true,
                        products: result.products,
                        total: result.products.reduce((sum, p) => sum + p.total, 0),
                        receipt_id: receiptData ? receiptData[0].id : null
                    });
                } else {
                    res.status(400).json({
                        success: false,
                        error: result.error
                    });
                }
            } catch (error) {
                console.error('Error processing receipt:', error);
                res.status(500).json({ error: error.message });
            }
        });
        
        req.on('error', (error) => {
            console.error('Request error:', error);
            res.status(500).json({ error: 'Request processing error' });
        });
        
    } catch (error) {
        console.error('Error processing receipt:', error);
        res.status(500).json({ error: error.message });
    }
} 