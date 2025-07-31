import { createClient } from '@supabase/supabase-js';

/**
 * Унифицированный API для всех функций приложения
 * Объединяет все API endpoints в один файл
 */

// ============================================================================
// ВИЗУАЛИЗАЦИИ
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
// ТРАНЗАКЦИИ
// ============================================================================

/**
 * Получает транзакции с фильтрацией
 */
async function getTransactions(filters = {}) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    let query = supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

    // Применяем фильтры
    if (filters.startDate) {
        query = query.gte('date', filters.startDate);
    }
    if (filters.endDate) {
        query = query.lte('date', filters.endDate);
    }
    if (filters.category) {
        query = query.eq('category', filters.category);
    }
    if (filters.minAmount) {
        query = query.gte('outcome', filters.minAmount);
    }
    if (filters.maxAmount) {
        query = query.lte('outcome', filters.maxAmount);
    }
    if (filters.limit) {
        query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
        throw new Error(`Supabase select error: ${error.message}`);
    }

    return data;
}

/**
 * Загружает транзакции из файла
 */
async function uploadTransactions(fileContent) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    try {
        // Парсим CSV файл
        const lines = fileContent.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        const transactions = [];

        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim()) {
                const values = lines[i].split(',').map(v => v.trim());
                const transaction = {};
                
                headers.forEach((header, index) => {
                    transaction[header] = values[index];
                });
                
                transactions.push(transaction);
            }
        }

        // Вставляем транзакции в базу данных
        const { data, error } = await supabase
            .from('transactions')
            .insert(transactions);

        if (error) {
            throw new Error(`Supabase insert error: ${error.message}`);
        }

        return {
            success: true,
            count: transactions.length,
            data: data
        };

    } catch (error) {
        throw new Error(`Upload error: ${error.message}`);
    }
}

// ============================================================================
// АНАЛИЗ ПРИВЫЧЕК
// ============================================================================

/**
 * Анализирует привычки пользователя
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
        .gt('outcome', 0);

    if (error) {
        throw new Error(`Supabase select error: ${error.message}`);
    }

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
    const habits = [];
    for (const [description, groupTransactions] of Object.entries(descriptionGroups)) {
        if (groupTransactions.length >= 2) {
            const dates = groupTransactions.map(t => new Date(t.date)).sort();
            
            if (hasRegularPattern(dates)) {
                const habitName = await generateHabitName(groupTransactions);
                const avgAmount = groupTransactions.reduce((sum, t) => sum + t.outcome, 0) / groupTransactions.length;
                
                habits.push({
                    description: description,
                    name: habitName,
                    frequency: groupTransactions.length,
                    avgAmount: avgAmount,
                    totalAmount: groupTransactions.reduce((sum, t) => sum + t.outcome, 0),
                    dates: dates
                });
            }
        }
    }

    return habits;
}

// ============================================================================
// КРЕДИТНЫЕ КАРТЫ
// ============================================================================

/**
 * Получает информацию о кредитных картах
 */
async function getCreditCards() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
        .from('credit_cards')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Supabase select error: ${error.message}`);
    }

    return data;
}

/**
 * Добавляет новую кредитную карту
 */
async function addCreditCard(cardData) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
        .from('credit_cards')
        .insert([cardData])
        .select();

    if (error) {
        throw new Error(`Supabase insert error: ${error.message}`);
    }

    return data[0];
}

// ============================================================================
// КРЕДИТЫ
// ============================================================================

/**
 * Получает информацию о кредитах
 */
async function getLoans() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
        .from('loans')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Supabase select error: ${error.message}`);
    }

    return data;
}

/**
 * Добавляет новый кредит
 */
async function addLoan(loanData) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
        .from('loans')
        .insert([loanData])
        .select();

    if (error) {
        throw new Error(`Supabase insert error: ${error.message}`);
    }

    return data[0];
}

// ============================================================================
// РАБОЧИЙ ГРАФИК
// ============================================================================

/**
 * Обновляет рабочий график
 */
async function updateWorkSchedule(scheduleData) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
        .from('user_work_schedule')
        .upsert([scheduleData])
        .select();

    if (error) {
        throw new Error(`Supabase upsert error: ${error.message}`);
    }

    return data[0];
}

// ============================================================================
// МЕСЯЧНАЯ СВОДКА
// ============================================================================

/**
 * Получает месячную сводку
 */
async function getMonthlySummary(month, year) {
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
        .lte('date', endDate);

    if (error) {
        throw new Error(`Supabase select error: ${error.message}`);
    }

    const income = transactions
        .filter(t => t.income > 0)
        .reduce((sum, t) => sum + t.income, 0);
    
    const outcome = transactions
        .filter(t => t.outcome > 0)
        .reduce((sum, t) => sum + t.outcome, 0);

    const categories = {};
    transactions.forEach(t => {
        if (t.outcome > 0) {
            const category = t.category || 'Без категории';
            categories[category] = (categories[category] || 0) + t.outcome;
        }
    });

    return {
        month: month,
        year: year,
        income: income,
        outcome: outcome,
        balance: income - outcome,
        transactionCount: transactions.length,
        categories: categories
    };
}

// ============================================================================
// ЦЕЛИ
// ============================================================================

/**
 * Получает прогресс по целям
 */
async function getGoalProgress() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
        .from('goals')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Supabase select error: ${error.message}`);
    }

    return data;
}

/**
 * Рекомендует цель на основе данных
 */
async function recommendGoal() {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Получаем последние 3 месяца транзакций
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const { data: transactions, error } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', threeMonthsAgo.toISOString().split('T')[0])
        .gt('outcome', 0);

    if (error) {
        throw new Error(`Supabase select error: ${error.message}`);
    }

    // Анализируем категории трат
    const categories = {};
    transactions.forEach(t => {
        const category = t.category || 'Без категории';
        categories[category] = (categories[category] || 0) + t.outcome;
    });

    // Находим категорию с наибольшими тратами
    const maxCategory = Object.entries(categories)
        .sort(([,a], [,b]) => b - a)[0];

    if (maxCategory) {
        const avgMonthlySpending = maxCategory[1] / 3;
        const recommendedGoal = avgMonthlySpending * 0.8; // 80% от средних трат

        return {
            category: maxCategory[0],
            currentSpending: avgMonthlySpending,
            recommendedGoal: recommendedGoal,
            potentialSavings: avgMonthlySpending - recommendedGoal
        };
    }

    return null;
}

// ============================================================================
// ОБНАРУЖЕНИЕ АНОМАЛИЙ
// ============================================================================

/**
 * Обнаруживает аномалии в тратах
 */
async function detectAnomalies(month, year) {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase URL or Anon Key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const endDate = `${year}-${month.padStart(2, '0')}-${new Date(year, month, 0).getDate()}`;
    
    const { data: currentTransactions, error: currentError } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .gt('outcome', 0);

    if (currentError) {
        throw new Error(`Supabase select error: ${currentError.message}`);
    }

    // Получаем данные за предыдущие 3 месяца для сравнения
    const prevStartDate = new Date(startDate);
    prevStartDate.setMonth(prevStartDate.getMonth() - 3);
    
    const { data: previousTransactions } = await supabase
        .from('transactions')
        .select('*')
        .gte('date', prevStartDate.toISOString().split('T')[0])
        .lt('date', startDate)
        .gt('outcome', 0);

    // Анализируем аномалии по категориям
    const anomalies = [];
    const currentByCategory = {};
    const previousByCategory = {};

    currentTransactions.forEach(t => {
        const category = t.category || 'Без категории';
        currentByCategory[category] = (currentByCategory[category] || 0) + t.outcome;
    });

    previousTransactions.forEach(t => {
        const category = t.category || 'Без категории';
        previousByCategory[category] = (previousByCategory[category] || 0) + t.outcome;
    });

    Object.keys(currentByCategory).forEach(category => {
        const current = currentByCategory[category];
        const previous = previousByCategory[category] || 0;
        const avgPrevious = previous / 3; // среднее за 3 месяца

        if (avgPrevious > 0) {
            const increase = ((current - avgPrevious) / avgPrevious) * 100;
            
            if (increase > 50) { // увеличение более чем на 50%
                anomalies.push({
                    category: category,
                    currentAmount: current,
                    previousAverage: avgPrevious,
                    increase: increase,
                    type: 'spending_increase'
                });
            }
        }
    });

    return anomalies;
}

// ============================================================================
// ГЛУБОКИЙ АНАЛИЗ
// ============================================================================

/**
 * Выполняет глубокий анализ финансов
 */
async function deepAnalysis(month, year) {
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
        .lte('date', endDate);

    if (error) {
        throw new Error(`Supabase select error: ${error.message}`);
    }

    // Анализ доходов и расходов
    const income = transactions
        .filter(t => t.income > 0)
        .reduce((sum, t) => sum + t.income, 0);
    
    const outcome = transactions
        .filter(t => t.outcome > 0)
        .reduce((sum, t) => sum + t.outcome, 0);

    // Анализ по дням недели
    const dayOfWeekAnalysis = {};
    transactions.forEach(t => {
        if (t.outcome > 0) {
            const day = new Date(t.date).getDay();
            const dayName = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'][day];
            dayOfWeekAnalysis[dayName] = (dayOfWeekAnalysis[dayName] || 0) + t.outcome;
        }
    });

    // Анализ по времени дня
    const timeAnalysis = {
        morning: 0, // 6-12
        afternoon: 0, // 12-18
        evening: 0, // 18-24
        night: 0 // 0-6
    };

    transactions.forEach(t => {
        if (t.outcome > 0 && t.time) {
            const hour = parseInt(t.time.split(':')[0]);
            if (hour >= 6 && hour < 12) timeAnalysis.morning += t.outcome;
            else if (hour >= 12 && hour < 18) timeAnalysis.afternoon += t.outcome;
            else if (hour >= 18 && hour < 24) timeAnalysis.evening += t.outcome;
            else timeAnalysis.night += t.outcome;
        }
    });

    // Анализ категорий
    const categoryAnalysis = {};
    transactions.forEach(t => {
        if (t.outcome > 0) {
            const category = t.category || 'Без категории';
            if (!categoryAnalysis[category]) {
                categoryAnalysis[category] = {
                    total: 0,
                    count: 0,
                    avg: 0
                };
            }
            categoryAnalysis[category].total += t.outcome;
            categoryAnalysis[category].count += 1;
        }
    });

    // Вычисляем средние значения
    Object.keys(categoryAnalysis).forEach(category => {
        categoryAnalysis[category].avg = categoryAnalysis[category].total / categoryAnalysis[category].count;
    });

    return {
        period: { month, year },
        summary: {
            income,
            outcome,
            balance: income - outcome,
            transactionCount: transactions.length
        },
        dayOfWeekAnalysis,
        timeAnalysis,
        categoryAnalysis,
        insights: generateInsights(income, outcome, categoryAnalysis)
    };
}

/**
 * Генерирует инсайты на основе анализа
 */
function generateInsights(income, outcome, categoryAnalysis) {
    const insights = [];
    
    if (outcome > income * 0.9) {
        insights.push('Ваши расходы составляют более 90% от доходов. Рекомендуется сократить траты.');
    }
    
    const topCategory = Object.entries(categoryAnalysis)
        .sort(([,a], [,b]) => b.total - a.total)[0];
    
    if (topCategory && topCategory[1].total > outcome * 0.4) {
        insights.push(`Категория "${topCategory[0]}" составляет более 40% ваших трат. Рассмотрите возможность оптимизации.`);
    }
    
    return insights;
}

// ============================================================================
// УНИВЕРСАЛЬНЫЙ API HANDLER
// ============================================================================

export default async function handler(req, res) {
    if (req.method !== 'GET' && req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        const { action, ...params } = req.method === 'GET' ? req.query : req.body;
        
        if (!action) {
            return res.status(400).json({ 
                error: 'Missing required parameter: action' 
            });
        }
        
        let data;
        
        // Визуализации
        if (action === 'heatmap') {
            data = await getHeatmapData(params.month, params.year, params.groupBy || 'day');
        } else if (action === 'treemap') {
            data = await getTreemapData(params.month, params.year, params.hierarchyType || 'cluster');
        }
        // Транзакции
        else if (action === 'get-transactions') {
            data = await getTransactions(params.filters);
        } else if (action === 'upload-transactions') {
            data = await uploadTransactions(params.fileContent);
        }
        // Анализ привычек
        else if (action === 'analyze-habits') {
            data = await analyzeHabits(params.month, params.year);
        }
        // Кредитные карты
        else if (action === 'get-credit-cards') {
            data = await getCreditCards();
        } else if (action === 'add-credit-card') {
            data = await addCreditCard(params.cardData);
        }
        // Кредиты
        else if (action === 'get-loans') {
            data = await getLoans();
        } else if (action === 'add-loan') {
            data = await addLoan(params.loanData);
        }
        // Рабочий график
        else if (action === 'update-work-schedule') {
            data = await updateWorkSchedule(params.scheduleData);
        }
        // Месячная сводка
        else if (action === 'get-monthly-summary') {
            data = await getMonthlySummary(params.month, params.year);
        }
        // Цели
        else if (action === 'get-goal-progress') {
            data = await getGoalProgress();
        } else if (action === 'recommend-goal') {
            data = await recommendGoal();
        }
        // Аномалии
        else if (action === 'detect-anomalies') {
            data = await detectAnomalies(params.month, params.year);
        }
        // Глубокий анализ
        else if (action === 'deep-analysis') {
            data = await deepAnalysis(params.month, params.year);
        }
        else {
            return res.status(400).json({ 
                error: 'Invalid action. Available actions: heatmap, treemap, get-transactions, upload-transactions, analyze-habits, get-credit-cards, add-credit-card, get-loans, add-loan, update-work-schedule, get-monthly-summary, get-goal-progress, recommend-goal, detect-anomalies, deep-analysis' 
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