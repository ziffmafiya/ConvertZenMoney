// Data management module
export class DataManager {
    constructor() {
        this.baseUrl = '/api';
        this.requestCache = new Map();
        this.metricsCache = new Map();
    }

    async fetchTransactions(filters) {
        const { month, year } = filters;
        const params = new URLSearchParams({ year });
        if (month) params.append('month', month);

        const url = `${this.baseUrl}/get-transactions?${params.toString()}`;
        
        try {
            const response = await this.makeRequest(url);
            return response.transactions || [];
        } catch (error) {
            console.error('Error fetching transactions:', error);
            throw new Error('Не удалось загрузить транзакции');
        }
    }

    async fetchMonthlySummary(filters) {
        const { month, year } = filters;
        if (!month || !year) return null;

        const params = new URLSearchParams({ year, month });
        const url = `${this.baseUrl}/get-monthly-summary?${params.toString()}`;
        
        try {
            return await this.makeRequest(url);
        } catch (error) {
            console.error('Error fetching monthly summary:', error);
            return null;
        }
    }

    async fetchHabits(filters) {
        const { month, year } = filters;
        if (!month || !year) return [];

        const params = new URLSearchParams({ year, month });
        const url = `${this.baseUrl}/analyze-habits?${params.toString()}`;
        
        try {
            const response = await this.makeRequest(url);
            return Object.values(response.habits || {});
        } catch (error) {
            console.error('Error fetching habits:', error);
            return [];
        }
    }

    async makeRequest(url, options = {}) {
        // Check cache first
        const cacheKey = `${url}_${JSON.stringify(options)}`;
        if (this.requestCache.has(cacheKey)) {
            const cached = this.requestCache.get(cacheKey);
            if (Date.now() - cached.timestamp < 300000) { // 5 minutes
                return cached.data;
            }
        }

        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            throw new Error(error.error || `HTTP ${response.status}`);
        }

        const data = await response.json();
        
        // Cache the response
        this.requestCache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        return data;
    }

    calculateMetrics(transactions) {
        const cacheKey = JSON.stringify(transactions.map(t => t.id || t.date + t.income + t.outcome));
        if (this.metricsCache.has(cacheKey)) {
            return this.metricsCache.get(cacheKey);
        }

        let totalIncome = 0;
        let totalExpenses = 0;
        const expensesByCategory = {};
        const expensesByPayee = {};
        const incomeSources = {};
        const dailyData = {};

        transactions.forEach(t => {
            const date = t.date.split('T')[0];
            if (!dailyData[date]) {
                dailyData[date] = { income: 0, expenses: 0 };
            }

            if (t.income > 0 && t.outcome === 0) {
                totalIncome += t.income;
                dailyData[date].income += t.income;
                if (!this.normalize(t.categoryName).includes('возврат')) {
                    incomeSources[t.categoryName] = (incomeSources[t.categoryName] || 0) + t.income;
                }
            } else if (t.outcome > 0 && t.income === 0) {
                totalExpenses += t.outcome;
                dailyData[date].expenses += t.outcome;
                
                let category = t.categoryName;
                const creditKeywords = ["роутер", "очки", "бритва", "пылесос"];
                const description = this.normalize(t.payee + ' ' + t.comment + ' ' + t.incomeAccountName);

                if (creditKeywords.some(keyword => description.includes(keyword))) {
                    category = "Платеж по кредиту";
                }
                
                expensesByCategory[category] = (expensesByCategory[category] || 0) + t.outcome;
                expensesByPayee[t.payee] = (expensesByPayee[t.payee] || 0) + t.outcome;
            }
        });

        const netBalance = totalIncome - totalExpenses;
        const theoreticalSavings = totalIncome * 0.20;
        const expensesToIncomeRatio = totalIncome > 0 ? (totalExpenses / totalIncome) * 100 : 0;

        const metrics = {
            totalIncome,
            totalExpenses,
            netBalance,
            theoreticalSavings,
            expensesToIncomeRatio,
            expensesByCategory,
            expensesByPayee,
            incomeSources,
            dailyData,
            transactions
        };

        // Cache the metrics
        this.metricsCache.set(cacheKey, metrics);

        return metrics;
    }

    normalize(str) {
        return (str ?? '').replace(/\u00A0/g, ' ').trim().toLowerCase();
    }

    // Batch multiple API calls
    async batchRequests(requests) {
        const promises = requests.map(req => this.makeRequest(req.url, req.options));
        return Promise.allSettled(promises);
    }

    // Clear caches
    clearCache() {
        this.requestCache.clear();
        this.metricsCache.clear();
    }

    // Get cache statistics
    getCacheStats() {
        return {
            requestCacheSize: this.requestCache.size,
            metricsCacheSize: this.metricsCache.size
        };
    }
} 