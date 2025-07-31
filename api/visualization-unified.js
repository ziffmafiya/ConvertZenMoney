import { createClient } from '@supabase/supabase-js';

/**
 * Унифицированный модуль для визуализаций финансовых данных
 * Объединяет серверный API и клиентские функции
 */

// ============================================================================
// СЕРВЕРНАЯ ЧАСТЬ (API)
// ============================================================================

/**
 * Получает данные для Heatmap визуализации
 * Группирует траты по дням и категориям
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
 * Иерархия: Категория → Cluster или Тип привычки
 * Размер блока: общая сумма трат
 * Цвет: направление тренда (рост/падение)
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

/**
 * Группирует транзакции для Heatmap
 * @param {Array} transactions - массив транзакций
 * @param {string} groupBy - группировка: 'day' или 'hour'
 * @returns {Object} данные для heatmap
 */
function groupTransactionsForHeatmap(transactions, groupBy) {
    const grouped = {};
    const categories = new Set();
    const timeSlots = new Set();

    transactions.forEach(transaction => {
        const date = new Date(transaction.date);
        const category = transaction.category_name || 'Без категории';
        const clusterId = transaction.transaction_clusters?.[0]?.cluster_id || 'unclustered';
        
        let timeSlot;
        if (groupBy === 'hour') {
            timeSlot = date.getHours();
        } else {
            timeSlot = date.getDate();
        }
        
        const key = `${category}|${clusterId}`;
        
        if (!grouped[key]) {
            grouped[key] = {
                category,
                clusterId,
                clusterName: `Кластер ${clusterId}`,
                timeSlots: {}
            };
        }
        
        if (!grouped[key].timeSlots[timeSlot]) {
            grouped[key].timeSlots[timeSlot] = 0;
        }
        
        grouped[key].timeSlots[timeSlot] += transaction.outcome || 0;
        categories.add(category);
        timeSlots.add(timeSlot);
    });

    const timeSlotsArray = Array.from(timeSlots).sort((a, b) => a - b);
    const categoriesArray = Array.from(categories).sort();

    const heatmapData = {
        xAxis: groupBy === 'hour'
            ? timeSlotsArray.map(hour => `${hour}:00`)
            : timeSlotsArray.map(day => `День ${day}`),
        yAxis: Object.values(grouped).map(item => `${item.category} (${item.clusterName})`),
        data: [],
        metadata: {
            groupBy,
            totalCategories: categoriesArray.length,
            totalTimeSlots: timeSlotsArray.length,
            dateRange: {
                start: transactions[0]?.date,
                end: transactions[transactions.length - 1]?.date
            }
        }
    };

    Object.values(grouped).forEach((item, yIndex) => {
        timeSlotsArray.forEach((timeSlot, xIndex) => {
            const value = item.timeSlots[timeSlot] || 0;
            heatmapData.data.push({
                x: xIndex,
                y: yIndex,
                value: Math.round(value * 100) / 100,
                category: item.category,
                clusterId: item.clusterId,
                clusterName: item.clusterName,
                timeSlot: timeSlot
            });
        });
    });

    return heatmapData;
}

/**
 * Группирует транзакции для Treemap
 * @param {Array} currentTransactions - текущие транзакции
 * @param {Array} previousTransactions - предыдущие транзакции
 * @param {string} hierarchyType - тип иерархии
 * @param {Object} habitsData - данные о привычках
 * @returns {Object} данные для treemap
 */
function groupTransactionsForTreemap(currentTransactions, previousTransactions, hierarchyType, habitsData) {
    const grouped = {};
    
    currentTransactions.forEach(transaction => {
        const category = transaction.category_name || 'Без категории';
        const clusterId = transaction.transaction_clusters?.[0]?.cluster_id || 'unclustered';
        const clusterName = `Кластер ${clusterId}`;
        
        let hierarchyKey;
        let hierarchyName;
        
        if (hierarchyType === 'habit') {
            const habit = findHabitForTransaction(transaction, habitsData);
            hierarchyKey = habit ? habit.name : 'Без привычки';
            hierarchyName = hierarchyKey;
        } else {
            hierarchyKey = clusterId;
            hierarchyName = clusterName;
        }
        
        if (!grouped[category]) {
            grouped[category] = {
                name: category,
                children: {},
                totalSpent: 0,
                transactionCount: 0
            };
        }
        
        if (!grouped[category].children[hierarchyKey]) {
            grouped[category].children[hierarchyKey] = {
                name: hierarchyName,
                totalSpent: 0,
                transactionCount: 0,
                transactions: []
            };
        }
        
        grouped[category].children[hierarchyKey].totalSpent += transaction.outcome || 0;
        grouped[category].children[hierarchyKey].transactionCount += 1;
        grouped[category].children[hierarchyKey].transactions.push(transaction);
        grouped[category].totalSpent += transaction.outcome || 0;
        grouped[category].transactionCount += 1;
    });

    return calculateTrends(grouped, previousTransactions, hierarchyType, habitsData);
}

/**
 * Рассчитывает тренды и формирует финальную структуру Treemap
 * @param {Object} grouped - сгруппированные данные
 * @param {Array} previousTransactions - предыдущие транзакции
 * @param {string} hierarchyType - тип иерархии
 * @param {Object} habitsData - данные о привычках
 * @returns {Object} финальные данные treemap
 */
function calculateTrends(grouped, previousTransactions, hierarchyType, habitsData) {
    const treemapData = {
        datasets: [{
            tree: [],
            key: 'value',
            groups: ['category', 'hierarchy'],
            spacing: 1,
            backgroundColor: (ctx) => {
                if (ctx.type !== 'data') return 'transparent';
                const value = ctx.raw.v;
                return getTrendColor(value.trend);
            },
            labels: {
                display: true,
                formatter: (ctx) => {
                    const value = ctx.raw.v;
                    return [
                        value.name,
                        `${value.totalSpent.toFixed(2)} ₽`,
                        `${value.transactionCount} транзакций`
                    ];
                }
            }
        }],
        metadata: {
            hierarchyType,
            totalCategories: Object.keys(grouped).length,
            totalSpent: Object.values(grouped).reduce((sum, cat) => sum + cat.totalSpent, 0),
            totalTransactions: Object.values(grouped).reduce((sum, cat) => sum + cat.transactionCount, 0)
        }
    };

    Object.values(grouped).forEach(category => {
        Object.values(category.children).forEach(child => {
            const trend = calculateTrend(child, previousTransactions, hierarchyType, habitsData);
            treemapData.datasets[0].tree.push({
                category: category.name,
                hierarchy: child.name,
                value: child.totalSpent,
                v: {
                    name: child.name,
                    totalSpent: child.totalSpent,
                    transactionCount: child.transactionCount,
                    trend: trend
                }
            });
        });
    });

    return treemapData;
}

/**
 * Рассчитывает тренд для элемента
 * @param {Object} child - дочерний элемент
 * @param {Array} previousTransactions - предыдущие транзакции
 * @param {string} hierarchyType - тип иерархии
 * @param {Object} habitsData - данные о привычках
 * @returns {number} процент изменения
 */
function calculateTrend(child, previousTransactions, hierarchyType, habitsData) {
    let previousAmount = 0;
    
    if (hierarchyType === 'habit') {
        // Для привычек ищем похожие транзакции в предыдущем периоде
        const habit = findHabitForTransaction(child.transactions[0], habitsData);
        if (habit) {
            previousAmount = previousTransactions
                .filter(t => findHabitForTransaction(t, habitsData)?.name === habit.name)
                .reduce((sum, t) => sum + (t.outcome || 0), 0);
        }
    } else {
        // Для кластеров ищем по cluster_id
        const clusterId = child.transactions[0]?.transaction_clusters?.[0]?.cluster_id;
        if (clusterId) {
            previousAmount = previousTransactions
                .filter(t => t.transaction_clusters?.[0]?.cluster_id === clusterId)
                .reduce((sum, t) => sum + (t.outcome || 0), 0);
        }
    }
    
    if (previousAmount === 0) return 0;
    return ((child.totalSpent - previousAmount) / previousAmount) * 100;
}

/**
 * Определяет цвет по тренду
 * @param {number} trend - процент изменения
 * @returns {string} цвет в формате hex
 */
function getTrendColor(trend) {
    if (trend > 10) return '#ff4444'; // Красный - сильный рост
    if (trend > 0) return '#ff8888';  // Светло-красный - небольшой рост
    if (trend < -10) return '#44ff44'; // Зеленый - сильное падение
    if (trend < 0) return '#88ff88';   // Светло-зеленый - небольшое падение
    return '#cccccc'; // Серый - без изменений
}

/**
 * Получает предыдущий месяц и год
 * @param {number} year - текущий год
 * @param {number} month - текущий месяц
 * @returns {Object} предыдущий месяц и год
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
 * @param {Array} transactions - транзакции
 * @param {Object} supabase - клиент Supabase
 * @returns {Object} данные о привычках
 */
async function analyzeHabitsForTreemap(transactions, supabase) {
    const habits = {};
    
    // Группируем транзакции по payee для поиска регулярных паттернов
    const payeeGroups = {};
    transactions.forEach(transaction => {
        const payee = transaction.payee || 'Неизвестно';
        if (!payeeGroups[payee]) {
            payeeGroups[payee] = [];
        }
        payeeGroups[payee].push(transaction);
    });

    // Анализируем каждую группу на предмет регулярности
    for (const [payee, payeeTransactions] of Object.entries(payeeGroups)) {
        if (payeeTransactions.length >= 3) {
            const dates = payeeTransactions.map(t => new Date(t.date));
            if (hasRegularPattern(dates)) {
                const habitName = await generateHabitName(payeeTransactions);
                habits[payee] = {
                    name: habitName,
                    transactions: payeeTransactions,
                    frequency: countWeeks(dates)
                };
            }
        }
    }

    return habits;
}

/**
 * Проверяет регулярный паттерн
 * @param {Array} dates - массив дат
 * @returns {boolean} есть ли регулярный паттерн
 */
function hasRegularPattern(dates) {
    if (dates.length < 3) return false;
    
    const sortedDates = dates.sort((a, b) => a - b);
    const intervals = [];
    
    for (let i = 1; i < sortedDates.length; i++) {
        const diff = sortedDates[i] - sortedDates[i - 1];
        intervals.push(diff / (1000 * 60 * 60 * 24)); // в днях
    }
    
    // Проверяем, есть ли похожие интервалы (в пределах 2 дней)
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const consistentIntervals = intervals.filter(interval => 
        Math.abs(interval - avgInterval) <= 2
    );
    
    return consistentIntervals.length >= intervals.length * 0.7; // 70% интервалов должны быть похожими
}

/**
 * Считает уникальные недели
 * @param {Array} dates - массив дат
 * @returns {number} количество недель
 */
function countWeeks(dates) {
    const weeks = new Set();
    dates.forEach(date => {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        weeks.add(weekStart.toISOString().split('T')[0]);
    });
    return weeks.size;
}

/**
 * Генерирует название привычки
 * @param {Array} transactions - транзакции
 * @returns {string} название привычки
 */
async function generateHabitName(transactions) {
    const payee = transactions[0].payee || 'Неизвестно';
    const category = transactions[0].category_name || 'Без категории';
    const avgAmount = transactions.reduce((sum, t) => sum + (t.outcome || 0), 0) / transactions.length;
    
    return `${payee} (${category}) - ${avgAmount.toFixed(0)}₽`;
}

/**
 * Находит привычку для транзакции
 * @param {Object} transaction - транзакция
 * @param {Object} habitsData - данные о привычках
 * @returns {Object|null} привычка или null
 */
function findHabitForTransaction(transaction, habitsData) {
    const payee = transaction.payee || 'Неизвестно';
    return habitsData[payee] || null;
}

/**
 * Основной обработчик API
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { type, month, year, groupBy = 'day', hierarchyType = 'cluster' } = req.query;

    if (!month || !year) {
        return res.status(400).json({ error: 'Month and year are required' });
    }

    try {
        let data;
        
        if (type === 'heatmap') {
            data = await getHeatmapData(month, year, groupBy);
        } else if (type === 'treemap') {
            data = await getTreemapData(month, year, hierarchyType);
        } else {
            return res.status(400).json({ error: 'Invalid type. Use "heatmap" or "treemap"' });
        }

        res.status(200).json(data);
    } catch (error) {
        console.error('API Error:', error);
        res.status(500).json({ error: error.message });
    }
}

// ============================================================================
// КЛИЕНТСКАЯ ЧАСТЬ
// ============================================================================

/**
 * Клиентские функции для работы с визуализациями
 */

/**
 * Получает данные для Heatmap визуализации
 * @param {number} month - месяц (1-12)
 * @param {number} year - год
 * @param {string} groupBy - группировка: 'day' или 'hour'
 * @returns {Promise<Object>} данные для heatmap
 */
export async function getHeatmapDataClient(month, year, groupBy = 'day') {
    try {
        const response = await fetch(`/api/visualization-data?type=heatmap&month=${month}&year=${year}&groupBy=${groupBy}`);
        
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
export async function getTreemapDataClient(month, year, hierarchyType = 'cluster') {
    try {
        const response = await fetch(`/api/visualization-data?type=treemap&month=${month}&year=${year}&hierarchyType=${hierarchyType}`);
        
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
 * Создает Heatmap визуализацию с помощью Chart.js
 * @param {string} canvasId - ID canvas элемента
 * @param {Object} data - данные для визуализации
 * @param {Object} options - дополнительные опции
 */
export function createHeatmap(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`Canvas element with id '${canvasId}' not found`);
        return null;
    }

    // Подготавливаем данные для Chart.js
    const chartData = {
        labels: data.xAxis,
        datasets: data.yAxis.map((label, index) => ({
            label: label,
            data: data.data
                .filter(item => item.y === index)
                .map(item => item.value),
            backgroundColor: data.data
                .filter(item => item.y === index)
                .map(item => getHeatmapColor(item.value, data.data)),
            borderColor: '#ffffff',
            borderWidth: 1
        }))
    };

    const config = {
        type: 'matrix',
        data: chartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Heatmap трат за ${options.month || 'период'}`,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: true,
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            const dataIndex = context[0].dataIndex;
                            const datasetIndex = context[0].datasetIndex;
                            const value = context[0].parsed.y;
                            const category = data.yAxis[datasetIndex];
                            const timeSlot = data.xAxis[dataIndex];
                            return `${category} - ${timeSlot}`;
                        },
                        label: function(context) {
                            return `Сумма: ${context.parsed.y.toFixed(2)} ₽`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: data.metadata?.groupBy === 'hour' ? 'Часы' : 'Дни'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Категории'
                    }
                }
            }
        }
    };

    return new Chart(ctx, config);
}

/**
 * Создает Treemap визуализацию с помощью Chart.js
 * @param {string} canvasId - ID canvas элемента
 * @param {Object} data - данные для визуализации
 * @param {Object} options - дополнительные опции
 */
export function createTreemap(canvasId, data, options = {}) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) {
        console.error(`Canvas element with id '${canvasId}' not found`);
        return null;
    }

    // Преобразуем данные в формат для Treemap
    const treemapData = transformDataForTreemap(data);

    const config = {
        type: 'treemap',
        data: {
            datasets: [{
                tree: treemapData,
                key: 'value',
                groups: ['category'],
                spacing: 1,
                backgroundColor: function(ctx) {
                    if (ctx.type !== 'data') return 'transparent';
                    return ctx.raw.color || '#cccccc';
                },
                labels: {
                    display: true,
                    formatter: function(ctx) {
                        return [
                            ctx.raw.name,
                            `${ctx.raw.value.toFixed(2)} ₽`,
                            ctx.raw.trend ? `Тренд: ${ctx.raw.trend > 0 ? '+' : ''}${ctx.raw.trend.toFixed(1)}%` : ''
                        ].filter(Boolean);
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
                    text: `Treemap трат за ${options.month || 'период'}`,
                    font: {
                        size: 16
                    }
                },
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        title: function(context) {
                            return context[0].raw.name;
                        },
                        label: function(context) {
                            const data = context.raw;
                            return [
                                `Сумма: ${data.value.toFixed(2)} ₽`,
                                `Транзакций: ${data.transactionCount}`,
                                data.trend ? `Тренд: ${data.trend > 0 ? '+' : ''}${data.trend.toFixed(1)}%` : ''
                            ].filter(Boolean);
                        }
                    }
                }
            }
        }
    };

    return new Chart(ctx, config);
}

/**
 * Преобразует данные для Treemap формата
 */
function transformDataForTreemap(data) {
    const result = {
        name: data.name,
        children: []
    };

    data.children.forEach(category => {
        const categoryNode = {
            name: category.name,
            value: category.totalSpent,
            category: 'category',
            transactionCount: category.transactionCount,
            children: []
        };

        category.children.forEach(child => {
            categoryNode.children.push({
                name: child.name,
                value: child.value,
                category: 'child',
                transactionCount: child.transactionCount,
                trend: child.trend,
                color: child.color
            });
        });

        result.children.push(categoryNode);
    });

    return result;
}

/**
 * Определяет цвет для Heatmap на основе значения
 */
function getHeatmapColor(value, allValues) {
    if (value === 0) return '#f8f9fa';
    
    const maxValue = Math.max(...allValues.map(item => item.value));
    const normalizedValue = value / maxValue;
    
    // Градиент от светло-желтого до темно-красного
    const hue = 0; // Красный
    const saturation = Math.min(100, 20 + normalizedValue * 80);
    const lightness = Math.max(20, 80 - normalizedValue * 60);
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

/**
 * Обновляет визуализацию с новыми данными
 * @param {Chart} chart - экземпляр Chart.js
 * @param {Object} newData - новые данные
 * @param {string} type - тип визуализации: 'heatmap' или 'treemap'
 */
export function updateVisualization(chart, newData, type) {
    if (!chart) return;

    if (type === 'heatmap') {
        // Обновляем данные для Heatmap
        chart.data.labels = newData.xAxis;
        chart.data.datasets = newData.yAxis.map((label, index) => ({
            label: label,
            data: newData.data
                .filter(item => item.y === index)
                .map(item => item.value),
            backgroundColor: newData.data
                .filter(item => item.y === index)
                .map(item => getHeatmapColor(item.value, newData.data)),
            borderColor: '#ffffff',
            borderWidth: 1
        }));
    } else if (type === 'treemap') {
        // Обновляем данные для Treemap
        const treemapData = transformDataForTreemap(newData);
        chart.data.datasets[0].tree = treemapData;
    }

    chart.update();
}

/**
 * Уничтожает визуализацию
 * @param {Chart} chart - экземпляр Chart.js
 */
export function destroyVisualization(chart) {
    if (chart) {
        chart.destroy();
    }
}

// ============================================================================
// ЭКСПОРТЫ ДЛЯ ОБРАТНОЙ СОВМЕСТИМОСТИ
// ============================================================================

// Экспортируем клиентские функции с оригинальными именами для совместимости
export const getHeatmapData = getHeatmapDataClient;
export const getTreemapData = getTreemapDataClient; 