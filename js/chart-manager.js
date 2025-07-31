// Chart management module
export class ChartManager {
    constructor() {
        this.charts = new Map();
        this.chartColors = [
            '#ef4444', '#f97316', '#eab308', '#84cc16', '#22c55e', '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef', '#71717a',
            '#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#0ea5e9', '#14b8a6', '#22c55e', '#84cc16', '#f59e0b'
        ];
        
        this.tooltipPlugin = {
            callbacks: {
                label: function(context) {
                    let labelText = context.dataset.label || context.label || '';
                    if (labelText) {
                        labelText += ': ';
                    }
                    let value = 0;
                    
                    if (context.chart.config.type === 'bar' && context.chart.config.options.indexAxis === 'y') {
                        if (context.parsed.x !== null && !isNaN(context.parsed.x)) {
                            value = context.parsed.x;
                        }
                    } else {
                        if (context.parsed.y !== null && !isNaN(context.parsed.y)) {
                            value = context.parsed.y;
                        } else if (context.parsed !== null && !isNaN(context.parsed)) {
                            value = context.parsed;
                        }
                    }
                    
                    labelText += new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UAH' }).format(value);
                    return labelText;
                }
            }
        };
    }

    async initialize() {
        // Wait for Chart.js to be loaded
        if (typeof Chart === 'undefined') {
            await this.waitForChartJS();
        }
        
        console.log('ChartManager initialized');
    }

    async waitForChartJS() {
        return new Promise((resolve) => {
            const checkChart = () => {
                if (typeof Chart !== 'undefined') {
                    resolve();
                } else {
                    setTimeout(checkChart, 100);
                }
            };
            checkChart();
        });
    }

    async updateCharts(transactions, metrics) {
        // Update charts in parallel for better performance
        await Promise.all([
            this.updateExpensesChart(metrics.expensesByCategory),
            this.updateStoresChart(metrics.expensesByPayee),
            this.updateTrendChart(metrics.dailyData)
        ]);
    }

    updateExpensesChart(expensesByCategory) {
        const canvas = document.getElementById('expensesChart');
        if (!canvas) return;

        // Hide skeleton and show canvas
        const skeleton = document.getElementById('expensesChartSkeleton');
        if (skeleton) skeleton.classList.add('hidden');
        canvas.classList.remove('hidden');

        const data = {
            labels: Object.keys(expensesByCategory),
            datasets: [{
                data: Object.values(expensesByCategory),
                backgroundColor: this.chartColors.slice(0, Object.keys(expensesByCategory).length),
                borderColor: '#1f2937',
                borderWidth: 3,
                hoverOffset: 15
            }]
        };

        this.createOrUpdateChart('expensesChart', 'doughnut', data, {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: { 
                legend: { display: false }, 
                tooltip: this.tooltipPlugin 
            }
        });
    }

    updateStoresChart(expensesByPayee) {
        const canvas = document.getElementById('storesChart');
        if (!canvas) return;

        // Hide skeleton and show canvas
        const skeleton = document.getElementById('storesChartSkeleton');
        if (skeleton) skeleton.classList.add('hidden');
        canvas.classList.remove('hidden');

        const sortedExpensesByPayee = Object.entries(expensesByPayee)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 10);

        const data = {
            labels: sortedExpensesByPayee.map(([payee]) => payee),
            datasets: [{
                label: 'Расходы',
                data: sortedExpensesByPayee.map(([, amount]) => amount),
                backgroundColor: this.chartColors.slice(0, sortedExpensesByPayee.length),
                borderColor: '#1f2937',
                borderWidth: 2
            }]
        };

        this.createOrUpdateChart('storesChart', 'bar', data, {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    ticks: { color: '#9ca3af' }, 
                    grid: { color: '#374151' } 
                },
                y: { 
                    ticks: { color: '#d1d5db' }, 
                    grid: { color: '#374151' } 
                }
            },
            plugins: { 
                legend: { display: false }, 
                tooltip: this.tooltipPlugin 
            }
        });
    }

    updateTrendChart(dailyData) {
        const canvas = document.getElementById('spendIncomeTrendChart');
        if (!canvas) return;

        // Hide skeleton and show canvas
        const skeleton = document.getElementById('trendChartSkeleton');
        if (skeleton) skeleton.classList.add('hidden');
        canvas.classList.remove('hidden');

        const sortedDates = Object.keys(dailyData).sort((a, b) => new Date(a) - new Date(b));
        const data = {
            labels: sortedDates.map(date => new Date(date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })),
            datasets: [
                {
                    label: 'Доходы',
                    data: sortedDates.map(date => dailyData[date].income),
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    fill: true,
                    tension: 0.4
                },
                {
                    label: 'Расходы',
                    data: sortedDates.map(date => dailyData[date].expenses),
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    fill: true,
                    tension: 0.4
                }
            ]
        };

        this.createOrUpdateChart('spendIncomeTrendChart', 'line', data, {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { 
                    ticks: { color: '#9ca3af' }, 
                    grid: { color: '#374151' } 
                },
                y: { 
                    beginAtZero: true,
                    ticks: { 
                        color: '#9ca3af',
                        callback: function(value) {
                            return new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'UAH' }).format(value);
                        }
                    }, 
                    grid: { color: '#374151' } 
                }
            },
            plugins: { 
                legend: { 
                    position: 'top',
                    labels: { color: '#d1d5db' }
                }, 
                tooltip: this.tooltipPlugin 
            }
        });
    }

    updateSparklines(transactions, filters) {
        const { month, year } = filters;
        
        let dataForSparklines = {};
        let labelsForSparklines = [];
        let currentPeriodTotal = { income: 0, expenses: 0, netBalance: 0 };
        let previousPeriodTotal = { income: 0, expenses: 0, netBalance: 0 };

        if (month) {
            // Monthly view: aggregate by days
            const currentMonthTransactions = transactions.filter(t => {
                const date = new Date(t.date);
                return date.getFullYear() == year && (date.getMonth() + 1) == parseInt(month);
            });

            const previousMonth = parseInt(month) === 1 ? 12 : parseInt(month) - 1;
            const previousYear = parseInt(month) === 1 ? parseInt(year) - 1 : parseInt(year);

            const previousMonthTransactions = transactions.filter(t => {
                const date = new Date(t.date);
                return date.getFullYear() == previousYear && (date.getMonth() + 1) == previousMonth;
            });

            // Aggregate daily data for current month
            currentMonthTransactions.forEach(t => {
                const date = t.date.split('T')[0];
                if (!dataForSparklines[date]) {
                    dataForSparklines[date] = { income: 0, expenses: 0, netBalance: 0 };
                }
                dataForSparklines[date].income += t.income;
                dataForSparklines[date].expenses += t.outcome;
                dataForSparklines[date].netBalance += (t.income - t.outcome);
                currentPeriodTotal.income += t.income;
                currentPeriodTotal.expenses += t.outcome;
                currentPeriodTotal.netBalance += (t.income - t.outcome);
            });

            // Aggregate total for previous month
            previousMonthTransactions.forEach(t => {
                previousPeriodTotal.income += t.income;
                previousPeriodTotal.expenses += t.outcome;
                previousPeriodTotal.netBalance += (t.income - t.outcome);
            });

            labelsForSparklines = Object.keys(dataForSparklines).sort();
        } else {
            // Yearly view: aggregate by months
            const monthlyData = {};
            transactions.forEach(t => {
                const monthYear = new Date(t.date).toISOString().substring(0, 7);
                if (!monthlyData[monthYear]) {
                    monthlyData[monthYear] = { income: 0, expenses: 0, netBalance: 0 };
                }
                monthlyData[monthYear].income += t.income;
                monthlyData[monthYear].expenses += t.outcome;
                monthlyData[monthYear].netBalance += (t.income - t.outcome);
            });

            const sortedMonths = Object.keys(monthlyData).sort();
            const lastSixMonths = sortedMonths.slice(-6);

            lastSixMonths.forEach(month => {
                dataForSparklines[month] = monthlyData[month];
            });
            labelsForSparklines = lastSixMonths;

            if (sortedMonths.length >= 2) {
                const currentMonthKey = sortedMonths[sortedMonths.length - 1];
                const previousMonthKey = sortedMonths[sortedMonths.length - 2];
                currentPeriodTotal = monthlyData[currentMonthKey];
                previousPeriodTotal = monthlyData[previousMonthKey];
            }
        }

        const netBalanceData = labelsForSparklines.map(label => dataForSparklines[label]?.netBalance || 0);
        const incomeData = labelsForSparklines.map(label => dataForSparklines[label]?.income || 0);
        const expensesData = labelsForSparklines.map(label => dataForSparklines[label]?.expenses || 0);

        const sparklineOptions = {
            responsive: true,
            maintainAspectRatio: false,
            elements: { point: { radius: 0 } },
            plugins: { legend: { display: false }, tooltip: { enabled: false } },
            scales: { x: { display: false }, y: { display: false } }
        };

        // Update sparkline charts
        this.createOrUpdateChart('netBalanceSparkline', 'line', {
            labels: labelsForSparklines,
            datasets: [{ data: netBalanceData, borderColor: '#8b5cf6', borderWidth: 1 }]
        }, sparklineOptions);

        this.createOrUpdateChart('incomeSparkline', 'line', {
            labels: labelsForSparklines,
            datasets: [{ data: incomeData, borderColor: '#22c55e', borderWidth: 1 }]
        }, sparklineOptions);

        this.createOrUpdateChart('expensesSparkline', 'line', {
            labels: labelsForSparklines,
            datasets: [{ data: expensesData, borderColor: '#ef4444', borderWidth: 1 }]
        }, sparklineOptions);

        // Update change indicators
        this.updateChangeIndicators(currentPeriodTotal, previousPeriodTotal);
    }

    updateChangeIndicators(current, previous) {
        const netBalanceChangeEl = document.getElementById('netBalanceChange');
        const incomeChangeEl = document.getElementById('incomeChange');
        const expensesChangeEl = document.getElementById('expensesChange');

        function calculateChange(current, previous) {
            if (previous === 0) {
                if (current === 0) return 0;
                return current > 0 ? 100 : -100;
            }
            return ((current - previous) / previous) * 100;
        }

        function updateChangeText(element, change) {
            if (isNaN(change) || !isFinite(change)) {
                element.className = 'text-sm font-semibold text-gray-400';
                element.textContent = 'Нет данных';
            } else if (change > 0) {
                element.className = 'text-sm font-semibold text-green-400';
                element.textContent = `+${change.toFixed(1)}%`;
            } else if (change < 0) {
                element.className = 'text-sm font-semibold text-red-400';
                element.textContent = `${change.toFixed(1)}%`;
            } else {
                element.className = 'text-sm font-semibold text-gray-400';
                element.textContent = '0%';
            }
        }

        if (Object.keys(current).length > 0 && Object.keys(previous).length > 0) {
            const netBalanceChange = calculateChange(current.netBalance, previous.netBalance);
            updateChangeText(netBalanceChangeEl, netBalanceChange);
        } else {
            netBalanceChangeEl.textContent = 'Нет данных';
        }
    }

    createOrUpdateChart(chartId, type, data, options) {
        const canvas = document.getElementById(chartId);
        if (!canvas) return;

        // Destroy existing chart if it exists
        if (this.charts.has(chartId)) {
            this.charts.get(chartId).destroy();
        }

        // Create new chart
        const chart = new Chart(canvas.getContext('2d'), {
            type,
            data,
            options
        });

        this.charts.set(chartId, chart);
    }

    // Cleanup method
    destroyAllCharts() {
        this.charts.forEach(chart => {
            if (chart && typeof chart.destroy === 'function') {
                chart.destroy();
            }
        });
        this.charts.clear();
    }

    // Get chart instance
    getChart(chartId) {
        return this.charts.get(chartId);
    }

    // Update chart data without recreating
    updateChartData(chartId, newData) {
        const chart = this.charts.get(chartId);
        if (chart) {
            chart.data = newData;
            chart.update('none'); // Update without animation for better performance
        }
    }
} 