import { createClient } from '@supabase/supabase-js';

/**
 * Универсальный API для всех функций приложения
 * Обрабатывает все запросы через один endpoint для экономии лимита Vercel
 */

// ============================================================================
// ВИЗУАЛИЗАЦИИ
// ============================================================================

/**
 * Получает данные для Heatmap визуализации
 */
async function getHeatmapData(month, year, groupBy = 'day') {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select(`*, transaction_clusters!inner(cluster_id)`)
        .gte('date', startDate)
        .lte('date', endDate)
        .gt('outcome', 0);

    if (error) {
        throw new Error(`Supabase select error: ${error.message}`);
    }

    return groupTransactionsForHeatmap(transactions, groupBy);
}

/**
 * Получает данные для Treemap визуализации
 */
async function getTreemapData(month, year, hierarchyType = 'cluster') {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;

    // Получаем текущие транзакции
    const { data: currentTransactions, error: currentError } = await supabase
        .from('transactions')
        .select(`*, transaction_clusters(cluster_id)`)
        .gte('date', startDate)
        .lte('date', endDate)
        .gt('outcome', 0);

    if (currentError) {
        throw new Error(`Supabase select error: ${currentError.message}`);
    }

    // Получаем предыдущие транзакции для сравнения
    const prevMonth = getPreviousMonth(Number(year), Number(month));
    const prevStartDate = `${prevMonth.year}-${String(prevMonth.month).padStart(2, '0')}-01`;
    const prevEndDate = `${prevMonth.year}-${String(prevMonth.month).padStart(2, '0')}-${new Date(prevMonth.year, prevMonth.month, 0).getDate()}`;
    
    const { data: previousTransactions } = await supabase
        .from('transactions')
        .select(`*, transaction_clusters(cluster_id)`)
        .gte('date', prevStartDate)
        .lte('date', prevEndDate)
        .gt('outcome', 0);

    // Анализируем привычки если нужно
    let habitsData = {};
    if (hierarchyType === 'habit') {
        const { data: habits } = await supabase
            .from('transactions')
            .select('*')
            .gte('date', startDate)
            .lte('date', endDate)
            .not('description_embedding', 'is', null);
        habitsData = await analyzeHabitsForTreemap(habits, supabase);
    }

    return groupTransactionsForTreemap(
        currentTransactions,
        previousTransactions,
        hierarchyType,
        habitsData
    );
}

// ============================================================================
// ТРАНЗАКЦИИ
// ============================================================================

/**
 * Получает транзакции с фильтрацией
 */
async function getTransactions(month, year, category = null, search = null) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    
    let query = supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

    if (category && category !== 'all') {
        query = query.eq('category', category);
    }

    if (search) {
        query = query.or(`description.ilike.%${search}%,payee.ilike.%${search}%`);
    }

    const { data: transactions, error } = await query;

    if (error) {
        throw new Error(`Supabase select error: ${error.message}`);
    }

    return transactions;
}

// ============================================================================
// АНАЛИЗ
// ============================================================================

/**
 * Анализирует привычки
 */
async function analyzeHabits(month, year) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .not('description_embedding', 'is', null);

    if (error) {
        throw new Error(`Supabase select error: ${error.message}`);
    }

    return await analyzeHabitsForTreemap(transactions, supabase);
}

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================================================

/**
 * Группирует транзакции для Heatmap
 */
function groupTransactionsForHeatmap(transactions, groupBy) {
    const grouped = {};
    const categories = new Set();
    const timeSlots = new Set();
    
    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const category = transaction.category || 'Без категории';
        const cluster = transaction.transaction_clusters?.cluster_id || 'Без кластера';
        const categoryKey = `${category} (${cluster})`;
        
        let timeSlot;
        if (groupBy === 'hour') {
            timeSlot = date.getHours();
        } else {
            timeSlot = date.getDate();
        }
        
        categories.add(categoryKey);
        timeSlots.add(timeSlot);
        
        if (!grouped[categoryKey]) {
            grouped[categoryKey] = {};
        }
        
        if (!grouped[categoryKey][timeSlot]) {
            grouped[categoryKey][timeSlot] = 0;
        }
        
        grouped[categoryKey][timeSlot] += transaction.outcome;
    });
    
    // Создаем матрицу данных
    const sortedCategories = Array.from(categories).sort();
    const sortedTimeSlots = Array.from(timeSlots).sort((a, b) => a - b);
    
    const datasets = sortedCategories.map((category, categoryIndex) => {
        const data = sortedTimeSlots.map(timeSlot => ({
            x: timeSlot,
            y: categoryIndex,
            v: grouped[category][timeSlot] || 0
        }));
        
        return {
            label: category,
            data: data,
            backgroundColor: (context) => {
                const value = context.parsed.v;
                const maxValue = Math.max(...sortedCategories.map(cat => 
                    Math.max(...sortedTimeSlots.map(slot => grouped[cat][slot] || 0))
                ));
                const intensity = value / maxValue;
                return `rgba(59, 130, 246, ${intensity})`;
            }
        };
    });
    
    return {
        labels: {
            x: sortedTimeSlots.map(slot => groupBy === 'hour' ? `${slot}:00` : `${slot}`),
            y: sortedCategories
        },
        datasets: datasets,
        metadata: {
            totalCategories: sortedCategories.length,
            totalTransactions: transactions.length,
            groupBy: groupBy
        }
    };
}

/**
 * Группирует транзакции для Treemap
 */
function groupTransactionsForTreemap(currentTransactions, previousTransactions, hierarchyType, habitsData) {
    const grouped = {};
    let totalSpent = 0;
    let totalTransactions = 0;
    
    currentTransactions.forEach(transaction => {
        const category = transaction.category || 'Без категории';
        let childKey;
        
        if (hierarchyType === 'cluster') {
            childKey = transaction.transaction_clusters?.cluster_id || 'Без кластера';
        } else {
            childKey = findHabitForTransaction(transaction, habitsData);
        }
        
        if (!grouped[category]) {
            grouped[category] = {};
        }
        
        if (!grouped[category][childKey]) {
            grouped[category][childKey] = {
                sum: 0,
                count: 0,
                transactions: []
            };
        }
        
        grouped[category][childKey].sum += transaction.outcome;
        grouped[category][childKey].count += 1;
        grouped[category][childKey].transactions.push(transaction);
        
        totalSpent += transaction.outcome;
        totalTransactions += 1;
    });
    
    // Рассчитываем тренды
    const trends = calculateTrends(grouped, previousTransactions, hierarchyType, habitsData);
    
    return {
        data: transformDataForTreemap(grouped, trends),
        metadata: {
            totalSpent,
            totalTransactions,
            hierarchyType
        }
    };
}

/**
 * Рассчитывает тренды для каждой группы
 */
function calculateTrends(grouped, previousTransactions, hierarchyType, habitsData) {
    const trends = {};
    
    Object.keys(grouped).forEach(category => {
        trends[category] = {};
        
        Object.keys(grouped[category]).forEach(childKey => {
            const currentSum = grouped[category][childKey].sum;
            const trend = calculateTrend(
                { category, childKey, sum: currentSum },
                previousTransactions,
                hierarchyType,
                habitsData
            );
            trends[category][childKey] = trend;
        });
    });
    
    return trends;
}

/**
 * Рассчитывает тренд для конкретной группы
 */
function calculateTrend(child, previousTransactions, hierarchyType, habitsData) {
    const { category, childKey, sum } = child;
    
    // Находим соответствующие транзакции в предыдущем периоде
    let previousSum = 0;
    
    previousTransactions.forEach(transaction => {
        if (transaction.category === category) {
            let matchesChild = false;
            
            if (hierarchyType === 'cluster') {
                matchesChild = transaction.transaction_clusters?.cluster_id === childKey;
            } else {
                matchesChild = findHabitForTransaction(transaction, habitsData) === childKey;
            }
            
            if (matchesChild) {
                previousSum += transaction.outcome;
            }
        }
    });
    
    if (previousSum === 0) {
        return { change: 0, percentage: 0, trend: 'new' };
    }
    
    const change = sum - previousSum;
    const percentage = (change / previousSum) * 100;
    
    let trend = 'stable';
    if (percentage > 10) trend = 'up';
    else if (percentage < -10) trend = 'down';
    
    return { change, percentage, trend };
}

/**
 * Получает цвет для тренда
 */
function getTrendColor(trend) {
    switch (trend) {
        case 'up': return '#ef4444'; // red
        case 'down': return '#22c55e'; // green
        case 'new': return '#3b82f6'; // blue
        default: return '#6b7280'; // gray
    }
}

/**
 * Получает предыдущий месяц
 */
function getPreviousMonth(year, month) {
    if (month === 1) {
        return { year: year - 1, month: 12 };
    } else {
        return { year, month: month - 1 };
    }
}

/**
 * Анализирует привычки для Treemap
 */
async function analyzeHabitsForTreemap(transactions, supabase) {
    const habits = {};
    
    // Группируем транзакции по описанию
    const descriptionGroups = {};
    transactions.forEach(transaction => {
        const description = transaction.description?.toLowerCase().trim();
        if (description) {
            if (!descriptionGroups[description]) {
                descriptionGroups[description] = [];
            }
            descriptionGroups[description].push(transaction);
        }
    });
    
    // Анализируем каждую группу
    for (const [description, groupTransactions] of Object.entries(descriptionGroups)) {
        if (groupTransactions.length >= 2) {
            const dates = groupTransactions.map(t => new Date(t.date)).sort();
            
            if (hasRegularPattern(dates)) {
                const habitName = await generateHabitName(groupTransactions);
                habits[description] = habitName;
            }
        }
    }
    
    return habits;
}

/**
 * Проверяет регулярность паттерна
 */
function hasRegularPattern(dates) {
    if (dates.length < 2) return false;
    
    const intervals = [];
    for (let i = 1; i < dates.length; i++) {
        const diff = dates[i] - dates[i-1];
        const days = Math.round(diff / (1000 * 60 * 60 * 24));
        intervals.push(days);
    }
    
    // Проверяем, есть ли регулярный интервал
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    
    return variance < 2 && avgInterval <= 7; // Интервал не более недели с низкой дисперсией
}

/**
 * Подсчитывает количество недель
 */
function countWeeks(dates) {
    const firstDate = new Date(dates[0]);
    const lastDate = new Date(dates[dates.length - 1]);
    const diffTime = Math.abs(lastDate - firstDate);
    const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
    return diffWeeks;
}

/**
 * Генерирует название привычки
 */
async function generateHabitName(transactions) {
    const avgAmount = transactions.reduce((sum, t) => sum + t.outcome, 0) / transactions.length;
    const frequency = transactions.length;
    const weeks = countWeeks(transactions.map(t => t.date));
    
    if (frequency >= weeks * 0.8) {
        return `Ежедневная привычка (~${avgAmount.toFixed(0)}₽)`;
    } else if (frequency >= weeks * 0.5) {
        return `Регулярная привычка (~${avgAmount.toFixed(0)}₽)`;
    } else {
        return `Периодическая привычка (~${avgAmount.toFixed(0)}₽)`;
    }
}

/**
 * Находит привычку для транзакции
 */
function findHabitForTransaction(transaction, habitsData) {
    const description = transaction.description?.toLowerCase().trim();
    return habitsData[description] || 'Без привычки';
}

/**
 * Трансформирует данные для Treemap
 */
function transformDataForTreemap(grouped, trends) {
    const result = [];
    
    Object.keys(grouped).forEach(category => {
        const categoryData = {
            label: category,
            children: []
        };
        
        Object.keys(grouped[category]).forEach(childKey => {
            const childData = grouped[category][childKey];
            const trend = trends[category][childKey];
            
            categoryData.children.push({
                label: childKey,
                value: childData.sum,
                count: childData.count,
                trend: trend.trend,
                color: getTrendColor(trend.trend),
                change: trend.change,
                percentage: trend.percentage
            });
        });
        
        result.push(categoryData);
    });
    
    return result;
}

// ============================================================================
// УНИВЕРСАЛЬНЫЙ API HANDLER
// ============================================================================

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { 
            service, 
            type, 
            month, 
            year, 
            groupBy, 
            hierarchyType, 
            category, 
            search 
        } = req.query;
        
        if (!service) {
            return res.status(400).json({ 
                error: 'Missing required parameter: service' 
            });
        }
        
        let data;
        
        switch (service) {
            case 'visualization':
                if (!type || !month || !year) {
                    return res.status(400).json({ 
                        error: 'Missing required parameters: type, month, year' 
                    });
                }
                
                if (type === 'heatmap') {
                    data = await getHeatmapData(month, year, groupBy || 'day');
                } else if (type === 'treemap') {
                    data = await getTreemapData(month, year, hierarchyType || 'cluster');
                } else {
                    return res.status(400).json({ 
                        error: 'Invalid type. Must be "heatmap" or "treemap"' 
                    });
                }
                break;
                
            case 'transactions':
                if (!month || !year) {
                    return res.status(400).json({ 
                        error: 'Missing required parameters: month, year' 
                    });
                }
                data = await getTransactions(month, year, category, search);
                break;
                
            case 'analysis':
                if (!month || !year) {
                    return res.status(400).json({ 
                        error: 'Missing required parameters: month, year' 
                    });
                }
                data = await analyzeHabits(month, year);
                break;
                
            default:
                return res.status(400).json({ 
                    error: 'Invalid service. Must be "visualization", "transactions", or "analysis"' 
                });
        }
        
        res.status(200).json(data);
        
    } catch (error) {
        console.error('Unified API error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
} 