import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

// ============================================================================
// SHARED UTILITIES
// ============================================================================

// Глобальная инициализация клиента Google Generative AI
let genAI;
let embeddingModel;

if (process.env.GEMINI_API_KEY) {
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    embeddingModel = genAI.getGenerativeModel({ model: "embedding-001" });
}

/**
 * Генерирует векторное представление (эмбеддинг) для заданного текста
 * @param {string} text - Текст для генерации эмбеддинга
 * @returns {Promise<number[]>} - Массив чисел, представляющий эмбеддинг текста
 */
async function getEmbedding(text) {
    if (!embeddingModel) {
        console.error('Embedding model not initialized. Check GEMINI_API_KEY.');
        throw new Error('Embedding model not initialized.');
    }
    try {
        const result = await embeddingModel.embedContent(text);
        return result.embedding.values;
    } catch (error) {
        console.error('Error generating embedding for text:', text, error);
        throw new Error(`Failed to generate embedding: ${error.message}`);
    }
}

/**
 * Вычисляет косинусное расстояние между двумя векторами
 * @param {number[]} a - Первый вектор
 * @param {number[]} b - Второй вектор
 * @returns {number} - Косинусное расстояние (0 = идентичные, 2 = противоположные)
 */
function cosineDistance(a, b) {
    if (a.length !== b.length) {
        throw new Error('Vectors must have the same length');
    }
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    
    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);
    
    if (normA === 0 || normB === 0) {
        return 2; // Максимальное расстояние для нулевых векторов
    }
    
    const cosineSimilarity = dotProduct / (normA * normB);
    return 1 - cosineSimilarity; // Преобразуем в расстояние
}

/**
 * Находит всех соседей точки в радиусе eps
 * @param {number} pointIndex - Индекс точки
 * @param {number[][]} points - Массив всех точек
 * @param {number} eps - Радиус поиска соседей
 * @returns {number[]} - Массив индексов соседей
 */
function findNeighbors(pointIndex, points, eps) {
    const neighbors = [];
    const point = points[pointIndex];
    
    for (let i = 0; i < points.length; i++) {
        if (i !== pointIndex) {
            const distance = cosineDistance(point, points[i]);
            if (distance <= eps) {
                neighbors.push(i);
            }
        }
    }
    
    return neighbors;
}

/**
 * Реализация алгоритма DBSCAN для кластеризации
 * @param {number[][]} points - Массив векторов для кластеризации
 * @param {number} eps - Радиус поиска соседей
 * @param {number} minPts - Минимальное количество точек для формирования кластера
 * @returns {number[]} - Массив меток кластеров (-1 для шума, 0+ для кластеров)
 */
function dbscan(points, eps, minPts) {
    const labels = new Array(points.length).fill(-1); // -1 означает "не посещено"
    let clusterId = 0;
    
    for (let i = 0; i < points.length; i++) {
        if (labels[i] !== -1) continue; // Уже посещено
        
        const neighbors = findNeighbors(i, points, eps);
        
        if (neighbors.length < minPts) {
            labels[i] = -1; // Шум
            continue;
        }
        
        // Начинаем новый кластер
        clusterId++;
        labels[i] = clusterId;
        
        // Расширяем кластер
        const seedSet = [...neighbors];
        for (let j = 0; j < seedSet.length; j++) {
            const q = seedSet[j];
            
            if (labels[q] === -1) {
                labels[q] = clusterId;
            }
            
            if (labels[q] !== -1) continue;
            
            labels[q] = clusterId;
            const qNeighbors = findNeighbors(q, points, eps);
            
            if (qNeighbors.length >= minPts) {
                seedSet.push(...qNeighbors);
            }
        }
    }
    
    return labels;
}

/**
 * Вычисляет статистику для группы транзакций
 * @param {Array} transactions - Массив транзакций
 * @returns {Object} - Статистика транзакций
 */
function calculateTransactionStats(transactions) {
    const totalOutcome = transactions.reduce((sum, t) => sum + (t.outcome || 0), 0);
    const totalIncome = transactions.reduce((sum, t) => sum + (t.income || 0), 0);
    const categories = [...new Set(transactions.map(t => t.category_name).filter(Boolean))];
    const payees = [...new Set(transactions.map(t => t.payee).filter(Boolean))];
    const accounts = [...new Set([
        ...transactions.map(t => t.outcome_account_name).filter(Boolean),
        ...transactions.map(t => t.income_account_name).filter(Boolean)
    ])];

    // Находим наиболее частые категории и получатели
    const categoryCounts = {};
    const payeeCounts = {};
    
    transactions.forEach(t => {
        if (t.category_name) {
            categoryCounts[t.category_name] = (categoryCounts[t.category_name] || 0) + 1;
        }
        if (t.payee) {
            payeeCounts[t.payee] = (payeeCounts[t.payee] || 0) + 1;
        }
    });

    const topCategories = Object.entries(categoryCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([category, count]) => ({ category, count }));

    const topPayees = Object.entries(payeeCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([payee, count]) => ({ payee, count }));

    // Вычисляем средние значения
    const avgOutcome = transactions.length > 0 ? totalOutcome / transactions.length : 0;
    const avgIncome = transactions.length > 0 ? totalIncome / transactions.length : 0;

    // Находим временной диапазон
    const dates = transactions.map(t => new Date(t.date)).sort();
    const dateRange = dates.length > 0 ? {
        start: dates[0].toISOString().split('T')[0],
        end: dates[dates.length - 1].toISOString().split('T')[0]
    } : null;

    return {
        totalOutcome,
        totalIncome,
        avgOutcome,
        avgIncome,
        categories,
        payees,
        accounts,
        topCategories,
        topPayees,
        dateRange
    };
}

// ============================================================================
// API HANDLERS
// ============================================================================

/**
 * Основной обработчик для API-маршрута '/api/cluster-transactions'
 * Выполняет кластеризацию транзакций с использованием DBSCAN
 */
async function handleClusterTransactions(req, res) {
    const { eps = 0.3, minPts = 3, forceRecluster = false } = req.body;

    // Валидация параметров
    if (eps <= 0 || eps > 2) {
        return res.status(400).json({ error: 'eps must be between 0 and 2' });
    }
    if (minPts < 2) {
        return res.status(400).json({ error: 'minPts must be at least 2' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log(`Starting clustering with eps=${eps}, minPts=${minPts}, forceRecluster=${forceRecluster}`);

        // Если forceRecluster = true, удаляем все существующие кластеры
        if (forceRecluster) {
            const { error: deleteError } = await supabase
                .from('transaction_clusters')
                .delete()
                .neq('id', 0); // Удаляем все записи

            if (deleteError) {
                console.error('Error deleting existing clusters:', deleteError);
                return res.status(500).json({ error: 'Failed to delete existing clusters' });
            }
            console.log('Deleted existing clusters');
        }

        // Получаем некластеризованные транзакции
        const { data: unclusteredTransactions, error: fetchError } = await supabase
            .rpc('get_unclustered_transactions');

        if (fetchError) {
            console.error('Error fetching unclustered transactions:', fetchError);
            return res.status(500).json({ error: 'Failed to fetch unclustered transactions' });
        }

        if (!unclusteredTransactions || unclusteredTransactions.length === 0) {
            return res.status(200).json({ 
                message: 'No unclustered transactions found',
                clusters: 0,
                transactions: 0
            });
        }

        console.log(`Found ${unclusteredTransactions.length} unclustered transactions`);

        // Извлекаем эмбендинги и ID транзакций
        const embeddings = unclusteredTransactions.map(t => t.description_embedding);
        const transactionIds = unclusteredTransactions.map(t => t.id);

        // Проверяем размерность эмбеддингов
        if (embeddings.length > 0) {
            const firstEmbeddingLength = embeddings[0].length;
            const inconsistentEmbeddings = embeddings.filter(emb => emb.length !== firstEmbeddingLength);
            
            if (inconsistentEmbeddings.length > 0) {
                console.error(`Found ${inconsistentEmbeddings.length} embeddings with inconsistent dimensions. Expected: ${firstEmbeddingLength}, found: ${inconsistentEmbeddings.map(emb => emb.length).join(', ')}`);
                return res.status(500).json({ 
                    error: `Embedding dimension mismatch. Found embeddings with different dimensions. Please clear all embeddings and reload transactions with consistent dimension 768.`,
                    details: {
                        expected: firstEmbeddingLength,
                        found: embeddings.map(emb => emb.length).filter((val, index, arr) => arr.indexOf(val) === index)
                    }
                });
            }
            
            console.log(`All embeddings have consistent dimension: ${firstEmbeddingLength}`);
        }

        // Выполняем кластеризацию
        const clusterLabels = dbscan(embeddings, eps, minPts);

        // Подсчитываем статистику
        const uniqueClusters = new Set(clusterLabels.filter(label => label !== -1));
        const noiseCount = clusterLabels.filter(label => label === -1).length;

        console.log(`Clustering completed: ${uniqueClusters.size} clusters, ${noiseCount} noise points`);

        // Подготавливаем данные для вставки в БД
        const clusterData = clusterLabels.map((label, index) => ({
            transaction_id: transactionIds[index],
            cluster_id: label === -1 ? null : label
        })).filter(item => item.cluster_id !== null); // Исключаем шум

        // Вставляем результаты кластеризации в БД
        if (clusterData.length > 0) {
            const { error: insertError } = await supabase
                .from('transaction_clusters')
                .insert(clusterData);

            if (insertError) {
                console.error('Error inserting cluster data:', insertError);
                return res.status(500).json({ error: 'Failed to save clustering results' });
            }
        }

        // Получаем детальную информацию о кластерах
        const { data: clusterDetails, error: detailsError } = await supabase
            .from('transaction_clusters')
            .select(`
                cluster_id,
                transaction_id,
                transactions!inner(
                    date,
                    category_name,
                    payee,
                    comment,
                    outcome,
                    income
                )
            `)
            .order('cluster_id')
            .order('transaction_id');

        if (detailsError) {
            console.error('Error fetching cluster details:', detailsError);
            return res.status(500).json({ error: 'Failed to fetch cluster details' });
        }

        // Группируем транзакции по кластерам
        const clusters = {};
        clusterDetails.forEach(item => {
            if (!clusters[item.cluster_id]) {
                clusters[item.cluster_id] = [];
            }
            clusters[item.cluster_id].push({
                id: item.transaction_id,
                ...item.transactions
            });
        });

        // Вычисляем статистику по кластерам
        const clusterStats = Object.entries(clusters).map(([clusterId, transactions]) => {
            const stats = calculateTransactionStats(transactions);
            return {
                clusterId: parseInt(clusterId),
                transactionCount: transactions.length,
                ...stats,
                transactions: transactions.slice(0, 5) // Показываем только первые 5 транзакций
            };
        });

        res.status(200).json({
            message: 'Clustering completed successfully',
            clusters: uniqueClusters.size,
            transactions: clusterData.length,
            noise: noiseCount,
            parameters: { eps, minPts },
            clusterStats
        });

    } catch (error) {
        console.error('Unhandled error during clustering:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}

/**
 * Основной обработчик для API-маршрута '/api/get-clusters'
 * Возвращает информацию о кластерах транзакций
 */
async function handleGetClusters(req, res) {
    const { clusterId, limit = 50, offset = 0 } = req.query;

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase configuration error' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        let query = supabase
            .from('transaction_clusters')
            .select(`
                cluster_id,
                transaction_id,
                cluster_timestamp,
                transactions!inner(
                    id,
                    date,
                    category_name,
                    payee,
                    comment,
                    outcome,
                    income,
                    outcome_account_name,
                    income_account_name
                )
            `)
            .order('cluster_id')
            .order('transaction_id');

        // Если указан конкретный clusterId, фильтруем по нему
        if (clusterId) {
            query = query.eq('cluster_id', clusterId);
        }

        // Применяем пагинацию
        query = query.range(offset, offset + limit - 1);

        const { data: clusterDetails, error: fetchError } = await query;

        if (fetchError) {
            console.error('Error fetching cluster details:', fetchError);
            return res.status(500).json({ error: 'Failed to fetch cluster details' });
        }

        if (!clusterDetails || clusterDetails.length === 0) {
            return res.status(200).json({
                clusters: [],
                summary: {
                    totalClusters: 0,
                    totalTransactions: 0
                }
            });
        }

        // Группируем транзакции по кластерам
        const clusters = {};
        clusterDetails.forEach(item => {
            if (!clusters[item.cluster_id]) {
                clusters[item.cluster_id] = {
                    clusterId: item.cluster_id,
                    timestamp: item.cluster_timestamp,
                    transactions: []
                };
            }
            clusters[item.cluster_id].transactions.push({
                id: item.transaction_id,
                ...item.transactions
            });
        });

        // Вычисляем статистику для каждого кластера
        const clusterStats = Object.values(clusters).map(cluster => {
            const stats = calculateTransactionStats(cluster.transactions);
            return {
                ...cluster,
                transactionCount: cluster.transactions.length,
                ...stats,
                transactions: cluster.transactions.slice(0, 10) // Показываем только первые 10 транзакций
            };
        });

        // Получаем общую статистику
        const { data: totalStats, error: statsError } = await supabase
            .from('transaction_clusters')
            .select('cluster_id', { count: 'exact' });

        if (statsError) {
            console.error('Error fetching total stats:', statsError);
        }

        const totalClusters = totalStats ? new Set(totalStats.map(s => s.cluster_id)).size : 0;
        const totalTransactions = totalStats ? totalStats.length : 0;

        res.status(200).json({
            clusters: clusterStats,
            summary: {
                totalClusters,
                totalTransactions,
                returnedClusters: clusterStats.length,
                returnedTransactions: clusterDetails.length
            },
            pagination: {
                limit: parseInt(limit),
                offset: parseInt(offset)
            }
        });

    } catch (error) {
        console.error('Unhandled error while fetching clusters:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}

/**
 * Основной обработчик для API-маршрута '/api/find-similar-transactions'
 * Находит транзакции, семантически похожие на заданный запрос
 */
async function handleFindSimilarTransactions(req, res) {
    const { 
        query, 
        matchThreshold = 0.7, 
        matchCount = 10, 
        includeClusters = true,
        category = null,
        dateFrom = null,
        dateTo = null
    } = req.body;

    // Валидация входных данных
    if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: 'Query is required and must be a string' });
    }

    if (matchThreshold < 0 || matchThreshold > 1) {
        return res.status(400).json({ error: 'matchThreshold must be between 0 and 1' });
    }

    if (matchCount < 1 || matchCount > 100) {
        return res.status(400).json({ error: 'matchCount must be between 1 and 100' });
    }

    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase configuration error' });
    }

    if (!process.env.GEMINI_API_KEY) {
        console.error('Configuration error: GEMINI_API_KEY not configured.');
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        console.log(`Searching for similar transactions with query: "${query}"`);

        // Генерируем эмбеддинг для запроса
        const queryEmbedding = await getEmbedding(query);

        // Выполняем векторный поиск
        const { data: similarTransactions, error: searchError } = await supabase
            .rpc('match_transactions', {
                query_embedding: queryEmbedding,
                match_threshold: matchThreshold,
                match_count: matchCount
            });

        if (searchError) {
            console.error('Error during vector search:', searchError);
            return res.status(500).json({ error: 'Failed to perform vector search' });
        }

        if (!similarTransactions || similarTransactions.length === 0) {
            return res.status(200).json({
                message: 'No similar transactions found',
                transactions: [],
                clusters: []
            });
        }

        console.log(`Found ${similarTransactions.length} similar transactions`);

        // Если нужно включить информацию о кластерах
        let clusterInfo = [];
        if (includeClusters) {
            const transactionIds = similarTransactions.map(t => t.id);
            
            const { data: clusterData, error: clusterError } = await supabase
                .from('transaction_clusters')
                .select(`
                    transaction_id,
                    cluster_id,
                    cluster_timestamp
                `)
                .in('transaction_id', transactionIds);

            if (clusterError) {
                console.error('Error fetching cluster information:', clusterError);
            } else if (clusterData) {
                // Группируем транзакции по кластерам
                const clusterMap = {};
                clusterData.forEach(item => {
                    if (!clusterMap[item.cluster_id]) {
                        clusterMap[item.cluster_id] = {
                            clusterId: item.cluster_id,
                            timestamp: item.cluster_timestamp,
                            transactionIds: []
                        };
                    }
                    clusterMap[item.cluster_id].transactionIds.push(item.transaction_id);
                });

                clusterInfo = Object.values(clusterMap);
            }
        }

        // Применяем дополнительные фильтры
        let filteredTransactions = similarTransactions;

        if (category) {
            filteredTransactions = filteredTransactions.filter(t => 
                t.category_name && t.category_name.toLowerCase().includes(category.toLowerCase())
            );
        }

        if (dateFrom) {
            filteredTransactions = filteredTransactions.filter(t => 
                t.date >= dateFrom
            );
        }

        if (dateTo) {
            filteredTransactions = filteredTransactions.filter(t => 
                t.date <= dateTo
            );
        }

        // Группируем результаты по категориям для лучшего анализа
        const categoryGroups = {};
        filteredTransactions.forEach(transaction => {
            const category = transaction.category_name || 'Без категории';
            if (!categoryGroups[category]) {
                categoryGroups[category] = [];
            }
            categoryGroups[category].push(transaction);
        });

        // Вычисляем общую статистику
        const stats = calculateTransactionStats(filteredTransactions);

        res.status(200).json({
            message: 'Similar transactions found successfully',
            query,
            parameters: {
                matchThreshold,
                matchCount,
                category,
                dateFrom,
                dateTo
            },
            summary: {
                totalTransactions: filteredTransactions.length,
                ...stats
            },
            transactions: filteredTransactions,
            categoryGroups,
            clusters: clusterInfo
        });

    } catch (error) {
        console.error('Unhandled error during similarity search:', error);
        res.status(500).json({ error: error.message || 'Internal Server Error' });
    }
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

/**
 * Основной обработчик API для всех операций кластеризации
 * Маршрутизирует запросы к соответствующим обработчикам
 */
export default async function handler(req, res) {
    const { action } = req.query;

    switch (action) {
        case 'cluster':
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method Not Allowed' });
            }
            return await handleClusterTransactions(req, res);

        case 'get':
            if (req.method !== 'GET') {
                return res.status(405).json({ error: 'Method Not Allowed' });
            }
            return await handleGetClusters(req, res);

        case 'find-similar':
            if (req.method !== 'POST') {
                return res.status(405).json({ error: 'Method Not Allowed' });
            }
            return await handleFindSimilarTransactions(req, res);

        default:
            return res.status(400).json({ 
                error: 'Invalid action parameter',
                availableActions: ['cluster', 'get', 'find-similar'],
                usage: {
                    'POST /api/transaction-clustering?action=cluster': 'Perform transaction clustering',
                    'GET /api/transaction-clustering?action=get': 'Get cluster information',
                    'POST /api/transaction-clustering?action=find-similar': 'Find similar transactions'
                }
            });
    }
} 