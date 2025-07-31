import { createClient } from '@supabase/supabase-js';

/**
 * Унифицированный модуль для визуализаций
 * Содержит как серверные API функции, так и клиентские функции для браузера
 */

// ============================================================================
// СЕРВЕРНЫЕ ФУНКЦИИ (для Vercel API)
// ============================================================================

/**
 * Получает данные для Heatmap визуализации
 * Группирует траты по дням и категориям
 */
async function getHeatmapDataServer(month, year, groupBy = 'day') {
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
 * Иерархия: Категория → Cluster или Тип привычки
 * Размер блока: общая сумма трат
 * Цвет: направление тренда (рост/падение)
 */
async function getTreemapDataServer(month, year, hierarchyType = 'cluster') {
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
 * Трансформирует данные для Treemap (серверная версия)
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
// КЛИЕНТСКИЕ ФУНКЦИИ (для браузера)
// ============================================================================

/**
 * Получает данные для Heatmap визуализации
 * @param {number} month - месяц (1-12)
 * @param {number} year - год
 * @param {string} groupBy - группировка: 'day' или 'hour'
 * @returns {Promise<Object>} данные для heatmap
 */
export async function getHeatmapData(month, year, groupBy = 'day') {
    try {
        const response = await fetch(`/api/visualization-unified?type=heatmap&month=${month}&year=${year}&groupBy=${groupBy}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching heatmap data:', error);
        throw error;
    }
}

/**
 * Получает данные для Treemap визуализации
 * @param {number} month - месяц (1-12)
 * @param {number} year - год
 * @param {string} hierarchyType - тип иерархии: 'cluster' или 'habit'
 * @returns {Promise<Object>} данные для treemap
 */
export async function getTreemapData(month, year, hierarchyType = 'cluster') {
    try {
        const response = await fetch(`/api/visualization-unified?type=treemap&month=${month}&year=${year}&hierarchyType=${hierarchyType}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error fetching treemap data:', error);
        throw error;
    }
}

/**
 * Создает Heatmap визуализацию
 * @param {string} canvasId - ID canvas элемента
 * @param {Object} data - данные для визуализации
 * @param {Object} options - дополнительные опции
 * @returns {Chart} объект графика
 */
export function createHeatmap(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`Canvas element with id '${canvasId}' not found`);
        return null;
    }

    // Проверяем, что плагин загружен
    if (!window.Chart || !window.Chart.registry.controllers.matrix) {
        console.error('Chart.js Matrix plugin not loaded');
        return null;
    }

    const chart = new Chart(ctx, {
        type: 'matrix',
        data: {
            datasets: data.datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: options.month || 'Heatmap трат',
                    color: '#ffffff',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: true,
                    position: 'right',
                    labels: {
                        color: '#ffffff',
                        usePointStyle: true
                    }
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const dataset = context[0].dataset;
                            const dataPoint = context[0].raw;
                            return `${dataset.label} - ${dataPoint.x}${options.groupBy === 'hour' ? ':00' : ''}`;
                        },
                        label: function(context) {
                            const value = context.parsed.v;
                            return `Сумма: ${value.toFixed(2)} ₽`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    position: 'bottom',
                    ticks: {
                        color: '#ffffff',
                        callback: function(value) {
                            if (options.groupBy === 'hour') {
                                return `${value}:00`;
                            }
                            return value;
                        }
                    },
                    grid: {
                        color: '#374151'
                    }
                },
                y: {
                    type: 'linear',
                    ticks: {
                        color: '#ffffff',
                        callback: function(value) {
                            return data.labels.y[value] || '';
                        }
                    },
                    grid: {
                        color: '#374151'
                    }
                }
            }
        }
    });

    return chart;
}

/**
 * Создает Treemap визуализацию
 * @param {string} canvasId - ID canvas элемента
 * @param {Object} data - данные для визуализации
 * @param {Object} options - дополнительные опции
 * @returns {Chart} объект графика
 */
export function createTreemap(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`Canvas element with id '${canvasId}' not found`);
        return null;
    }

    // Проверяем, что плагин загружен
    if (!window.Chart || !window.Chart.registry.controllers.treemap) {
        console.error('Chart.js Treemap plugin not loaded');
        return null;
    }

    const transformedData = transformDataForTreemapClient(data.data);

    const chart = new Chart(ctx, {
        type: 'treemap',
        data: {
            datasets: [{
                tree: transformedData,
                key: 'value',
                groups: ['children'],
                spacing: 1,
                backgroundColor: function(ctx) {
                    if (ctx.type !== 'data') return 'transparent';
                    return ctx.raw.color || '#6b7280';
                },
                labels: {
                    display: true,
                    formatter: function(ctx) {
                        const item = ctx.raw;
                        const percentage = item.percentage !== undefined ? 
                            ` (${item.percentage > 0 ? '+' : ''}${item.percentage.toFixed(1)}%)` : '';
                        return `${item.label}\n${item.value.toFixed(0)}₽${percentage}`;
                    },
                    color: '#ffffff',
                    font: {
                        size: 11
                    }
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: options.month || 'Treemap трат',
                    color: '#ffffff',
                    font: {
                        size: 16,
                        weight: 'bold'
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return context[0].raw.label;
                        },
                        label: function(context) {
                            const item = context.raw;
                            const labels = [];
                            labels.push(`Сумма: ${item.value.toFixed(2)} ₽`);
                            labels.push(`Транзакций: ${item.count || 0}`);
                            
                            if (item.percentage !== undefined) {
                                const trendText = item.trend === 'up' ? '📈 Рост' : 
                                                 item.trend === 'down' ? '📉 Падение' : 
                                                 item.trend === 'new' ? '🆕 Новое' : '➡️ Стабильно';
                                labels.push(`${trendText}: ${item.percentage > 0 ? '+' : ''}${item.percentage.toFixed(1)}%`);
                            }
                            
                            return labels;
                        }
                    }
                }
            }
        }
    });

    return chart;
}

/**
 * Трансформирует данные для Treemap (клиентская версия)
 * @param {Array} data - исходные данные
 * @returns {Array} трансформированные данные
 */
function transformDataForTreemapClient(data) {
    const result = [];
    
    data.forEach(category => {
        const categoryNode = {
            label: category.label,
            value: category.children.reduce((sum, child) => sum + child.value, 0),
            children: category.children
        };
        result.push(categoryNode);
    });
    
    return result;
}

/**
 * Получает цвет для Heatmap на основе значения
 * @param {number} value - значение
 * @param {Array} allValues - все значения для нормализации
 * @returns {string} цвет в формате rgba
 */
function getHeatmapColor(value, allValues) {
    const maxValue = Math.max(...allValues);
    const intensity = value / maxValue;
    return `rgba(59, 130, 246, ${intensity})`;
}

/**
 * Обновляет существующую визуализацию
 * @param {Chart} chart - объект графика
 * @param {Object} newData - новые данные
 * @param {string} type - тип визуализации ('heatmap' или 'treemap')
 */
export function updateVisualization(chart, newData, type) {
    if (!chart) return;
    
    if (type === 'heatmap') {
        chart.data.datasets = newData.datasets;
        chart.update();
    } else if (type === 'treemap') {
        const transformedData = transformDataForTreemapClient(newData.data);
        chart.data.datasets[0].tree = transformedData;
        chart.update();
    }
}

/**
 * Уничтожает визуализацию
 * @param {Chart} chart - объект графика
 */
export function destroyVisualization(chart) {
    if (chart) {
        chart.destroy();
    }
}

// ============================================================================
// VERCEL API HANDLER
// ============================================================================

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { type, month, year, groupBy, hierarchyType } = req.query;
        
        if (!type || !month || !year) {
            return res.status(400).json({ 
                error: 'Missing required parameters: type, month, year' 
            });
        }
        
        let data;
        
        if (type === 'heatmap') {
            data = await getHeatmapDataServer(month, year, groupBy || 'day');
        } else if (type === 'treemap') {
            data = await getTreemapDataServer(month, year, hierarchyType || 'cluster');
        } else {
            return res.status(400).json({ 
                error: 'Invalid type. Must be "heatmap" or "treemap"' 
            });
        }
        
        res.status(200).json(data);
        
    } catch (error) {
        console.error('Visualization API error:', error);
        res.status(500).json({ 
            error: 'Internal server error',
            details: error.message 
        });
    }
} 