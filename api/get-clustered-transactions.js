import { createClient } from '@supabase/supabase-js';

// Основной обработчик API-запроса для получения кластеризованных транзакций
export default async function handler(req, res) {
    // Разрешаем только GET-запросы
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Получаем параметры из query string
    const { 
        month, 
        year, 
        includeNoise = 'false',
        limit = '1000',
        includeEmbeddings = 'false'
    } = req.query;

    // Получаем URL и ключ Supabase из переменных окружения
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    // Проверяем наличие необходимых переменных окружения
    if (!supabaseUrl || !supabaseKey) {
        console.error('Configuration error: Supabase URL or Anon Key not configured.');
        return res.status(500).json({ error: 'Supabase URL or Anon Key not configured' });
    }

    // Инициализируем клиент Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
        // Формируем запрос к базе данных
        let query = supabase
            .from('transactions')
            .select('id, date, category_name, payee, comment, outcome, income, cluster_id');

        // Добавляем фильтр по дате, если указаны месяц и год
        if (month && year) {
            const startDate = `${year}-${month.padStart(2, '0')}-01`;
            const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
            query = query.gte('date', startDate).lte('date', endDate);
        }

        // Фильтруем по кластерам (исключаем шум, если не требуется)
        if (includeNoise === 'false') {
            query = query.not('cluster_id', 'is', null);
        }

        // Добавляем эмбеддинги, если требуется
        if (includeEmbeddings === 'true') {
            query = query.select('*, description_embedding');
        }

        // Ограничиваем количество результатов
        query = query.limit(parseInt(limit));

        // Выполняем запрос
        const { data: transactions, error } = await query;

        if (error) {
            console.error('Supabase select error:', error);
            return res.status(500).json({ error: error.message });
        }

        if (!transactions || transactions.length === 0) {
            return res.status(200).json({ 
                transactions: [],
                clusters: {},
                summary: {
                    total: 0,
                    clustered: 0,
                    noise: 0,
                    clusterCount: 0
                }
            });
        }

        // Группируем транзакции по кластерам
        const clusters = {};
        let noiseCount = 0;
        let clusteredCount = 0;

        transactions.forEach(transaction => {
            if (transaction.cluster_id !== null) {
                if (!clusters[transaction.cluster_id]) {
                    clusters[transaction.cluster_id] = {
                        id: transaction.cluster_id,
                        transactions: [],
                        summary: {
                            count: 0,
                            totalOutcome: 0,
                            totalIncome: 0,
                            avgOutcome: 0,
                            avgIncome: 0,
                            categories: {},
                            payees: {}
                        }
                    };
                }
                
                clusters[transaction.cluster_id].transactions.push(transaction);
                clusters[transaction.cluster_id].summary.count++;
                
                // Подсчитываем суммы
                if (transaction.outcome) {
                    clusters[transaction.cluster_id].summary.totalOutcome += transaction.outcome;
                }
                if (transaction.income) {
                    clusters[transaction.cluster_id].summary.totalIncome += transaction.income;
                }
                
                // Подсчитываем категории и получателей
                if (transaction.category_name) {
                    clusters[transaction.cluster_id].summary.categories[transaction.category_name] = 
                        (clusters[transaction.cluster_id].summary.categories[transaction.category_name] || 0) + 1;
                }
                if (transaction.payee) {
                    clusters[transaction.cluster_id].summary.payees[transaction.payee] = 
                        (clusters[transaction.cluster_id].summary.payees[transaction.payee] || 0) + 1;
                }
                
                clusteredCount++;
            } else {
                noiseCount++;
            }
        });

        // Вычисляем средние значения для каждого кластера
        Object.values(clusters).forEach(cluster => {
            cluster.summary.avgOutcome = cluster.summary.count > 0 ? 
                cluster.summary.totalOutcome / cluster.summary.count : 0;
            cluster.summary.avgIncome = cluster.summary.count > 0 ? 
                cluster.summary.totalIncome / cluster.summary.count : 0;
            
            // Находим наиболее частые категории и получателей
            cluster.summary.topCategory = Object.entries(cluster.summary.categories)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
            cluster.summary.topPayee = Object.entries(cluster.summary.payees)
                .sort(([,a], [,b]) => b - a)[0]?.[0] || 'Unknown';
        });

        // Получаем статистику кластеров из отдельной таблицы
        const { data: clusterStats } = await supabase
            .from('transaction_clusters')
            .select('*');

        const clusterStatsMap = {};
        if (clusterStats) {
            clusterStats.forEach(stat => {
                clusterStatsMap[stat.cluster_id] = stat;
            });
        }

        // Добавляем статистику к кластерам
        Object.values(clusters).forEach(cluster => {
            cluster.stats = clusterStatsMap[cluster.id] || null;
        });

        // Формируем итоговую статистику
        const summary = {
            total: transactions.length,
            clustered: clusteredCount,
            noise: noiseCount,
            clusterCount: Object.keys(clusters).length,
            clusters: Object.keys(clusters).map(id => ({
                id: parseInt(id),
                count: clusters[id].summary.count,
                avgOutcome: clusters[id].summary.avgOutcome,
                avgIncome: clusters[id].summary.avgIncome,
                topCategory: clusters[id].summary.topCategory,
                topPayee: clusters[id].summary.topPayee
            }))
        };

        // Возвращаем результаты
        res.status(200).json({
            transactions,
            clusters,
            summary,
            clusterStats: clusterStatsMap
        });

    } catch (error) {
        console.error('Unexpected server error:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
} 