// UI management module
export class UIManager {
    constructor() {
        this.currentTransactionPage = 1;
        this.currentAnomalyPage = 1;
        this.transactionsPerPage = 8;
        this.anomaliesPerPage = 5;
        this.allTransactions = [];
        this.allAnomalies = [];
        
        // DOM element references
        this.elements = {};
        this.initializeElements();
    }

    async initialize() {
        this.setupPaginationListeners();
        this.setupModalListeners();
    }

    initializeElements() {
        // Cache frequently used DOM elements
        this.elements = {
            // Metrics
            headerNetBalance: document.getElementById('headerNetBalance'),
            totalIncome: document.getElementById('totalIncome'),
            totalExpenses: document.getElementById('totalExpenses'),
            theoreticalSavings: document.getElementById('theoreticalSavings'),
            expensesToIncomeText: document.getElementById('expensesToIncomeText'),
            
            // Changes
            netBalanceChange: document.getElementById('netBalanceChange'),
            incomeChange: document.getElementById('incomeChange'),
            expensesChange: document.getElementById('expensesChange'),
            
            // Skeletons
            netBalanceSkeleton: document.getElementById('netBalanceSkeleton'),
            incomeSkeleton: document.getElementById('incomeSkeleton'),
            expensesSkeleton: document.getElementById('expensesSkeleton'),
            savingsSkeleton: document.getElementById('savingsSkeleton'),
            trendChartSkeleton: document.getElementById('trendChartSkeleton'),
            expensesChartSkeleton: document.getElementById('expensesChartSkeleton'),
            storesChartSkeleton: document.getElementById('storesChartSkeleton'),
            
            // Tables and lists
            transactionsTableBody: document.getElementById('transactionsTableBody'),
            anomaliesList: document.getElementById('anomaliesList'),
            incomeList: document.getElementById('incomeList'),
            expensesLegend: document.getElementById('expensesLegend'),
            
            // Pagination
            transactionPageInfo: document.getElementById('transactionPageInfo'),
            anomalyPageInfo: document.getElementById('anomalyPageInfo'),
            prevTransactionPage: document.getElementById('prevTransactionPage'),
            nextTransactionPage: document.getElementById('nextTransactionPage'),
            prevAnomalyPage: document.getElementById('prevAnomalyPage'),
            nextAnomalyPage: document.getElementById('nextAnomalyPage')
        };
    }

    setupPaginationListeners() {
        this.elements.prevTransactionPage?.addEventListener('click', () => {
            this.previousTransactionPage();
        });
        
        this.elements.nextTransactionPage?.addEventListener('click', () => {
            this.nextTransactionPage();
        });
        
        this.elements.prevAnomalyPage?.addEventListener('click', () => {
            this.previousAnomalyPage();
        });
        
        this.elements.nextAnomalyPage?.addEventListener('click', () => {
            this.nextAnomalyPage();
        });
    }

    setupModalListeners() {
        // Settings modal
        document.getElementById('settingsButton')?.addEventListener('click', () => {
            this.showSettingsModal();
        });
        
        document.getElementById('closeSettingsModalButton')?.addEventListener('click', () => {
            this.hideSettingsModal();
        });
    }

    updateMetrics(metrics) {
        const { totalIncome, totalExpenses, netBalance, theoreticalSavings, expensesToIncomeRatio } = metrics;
        
        // Update main metrics with animation
        this.animateValue(this.elements.headerNetBalance, netBalance, 'грн', netBalance >= 0 ? '#22c55e' : '#ef4444');
        this.animateValue(this.elements.totalIncome, totalIncome, 'грн', '#22c55e');
        this.animateValue(this.elements.totalExpenses, totalExpenses, 'грн', '#ef4444');
        this.animateValue(this.elements.theoreticalSavings, theoreticalSavings, 'грн', '#3b82f6');
        
        // Update ratio text
        if (this.elements.expensesToIncomeText) {
            this.elements.expensesToIncomeText.textContent = `${expensesToIncomeRatio.toFixed(1)}% от дохода`;
        }
    }

    animateValue(element, targetValue, suffix = '', color = '') {
        if (!element) return;
        
        const startValue = parseFloat(element.textContent.replace(/[^\d.-]/g, '')) || 0;
        const duration = 500;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = startValue + (targetValue - startValue) * easeOutQuart;
            
            element.textContent = `${currentValue.toLocaleString('ru-RU', { 
                minimumFractionDigits: 2, 
                maximumFractionDigits: 2 
            })} ${suffix}`;
            
            if (color) {
                element.style.color = color;
            }
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    updateTransactionsTable(transactions) {
        this.allTransactions = transactions;
        this.currentTransactionPage = 1;
        this.renderTransactionsPage();
    }

    renderTransactionsPage() {
        if (!this.elements.transactionsTableBody) return;
        
        const totalPages = Math.ceil(this.allTransactions.length / this.transactionsPerPage);
        const startIndex = (this.currentTransactionPage - 1) * this.transactionsPerPage;
        const endIndex = startIndex + this.transactionsPerPage;
        const transactionsToDisplay = this.allTransactions.slice(startIndex, endIndex);
        
        // Use DocumentFragment for better performance
        const fragment = document.createDocumentFragment();
        
        if (transactionsToDisplay.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="5" class="text-center text-gray-500 p-4">Нет транзакций для отображения.</td>`;
            fragment.appendChild(row);
        } else {
            transactionsToDisplay.forEach(t => {
                const row = this.createTransactionRow(t);
                fragment.appendChild(row);
            });
        }
        
        // Clear and append in one operation
        this.elements.transactionsTableBody.innerHTML = '';
        this.elements.transactionsTableBody.appendChild(fragment);
        
        // Update pagination info
        if (this.elements.transactionPageInfo) {
            this.elements.transactionPageInfo.textContent = `Страница ${this.currentTransactionPage} из ${totalPages}`;
        }
        
        // Update pagination buttons
        if (this.elements.prevTransactionPage) {
            this.elements.prevTransactionPage.disabled = this.currentTransactionPage === 1;
        }
        if (this.elements.nextTransactionPage) {
            this.elements.nextTransactionPage.disabled = this.currentTransactionPage === totalPages;
        }
    }

    createTransactionRow(transaction) {
        const row = document.createElement('tr');
        const amount = transaction.income > 0 ? transaction.income : transaction.outcome;
        const amountClass = transaction.income > 0 ? 'text-green-500' : 'text-red-500';
        const sign = transaction.income > 0 ? '+' : '-';
        
        row.innerHTML = `
            <td class="p-3 md:p-4 border-b border-gray-700 text-left">${new Date(transaction.date).toLocaleDateString('ru-RU')}</td>
            <td class="p-3 md:p-4 border-b border-gray-700 text-left">${transaction.categoryName}</td>
            <td class="p-3 md:p-4 border-b border-gray-700 text-left">${transaction.payee || 'N/A'}</td>
            <td class="p-3 md:p-4 border-b border-gray-700 text-left ${amountClass} font-semibold">${sign}${amount.toLocaleString('ru-RU')} грн</td>
            <td class="p-3 md:p-4 border-b border-gray-700 text-left">${transaction.income > 0 ? transaction.incomeAccountName : transaction.outcomeAccountName}</td>
        `;
        
        row.classList.add('hover:bg-gray-700', 'transition-colors', 'duration-200');
        return row;
    }

    updateAnomaliesList(anomalies) {
        this.allAnomalies = anomalies;
        this.currentAnomalyPage = 1;
        this.renderAnomaliesPage();
    }

    renderAnomaliesPage() {
        if (!this.elements.anomaliesList) return;
        
        const totalPages = Math.ceil(this.allAnomalies.length / this.anomaliesPerPage);
        const startIndex = (this.currentAnomalyPage - 1) * this.anomaliesPerPage;
        const endIndex = startIndex + this.anomaliesPerPage;
        const anomaliesToDisplay = this.allAnomalies.slice(startIndex, endIndex);
        
        const fragment = document.createDocumentFragment();
        
        if (anomaliesToDisplay.length === 0) {
            const p = document.createElement('p');
            p.className = 'text-gray-500';
            p.textContent = 'Аномалий не найдено.';
            fragment.appendChild(p);
        } else {
            anomaliesToDisplay.forEach(anomaly => {
                const div = this.createAnomalyElement(anomaly);
                fragment.appendChild(div);
            });
        }
        
        this.elements.anomaliesList.innerHTML = '';
        this.elements.anomaliesList.appendChild(fragment);
        
        // Update pagination
        if (this.elements.anomalyPageInfo) {
            this.elements.anomalyPageInfo.textContent = `Страница ${this.currentAnomalyPage} из ${totalPages}`;
        }
        
        if (this.elements.prevAnomalyPage) {
            this.elements.prevAnomalyPage.disabled = this.currentAnomalyPage === 1;
        }
        if (this.elements.nextAnomalyPage) {
            this.elements.nextAnomalyPage.disabled = this.currentAnomalyPage === totalPages;
        }
    }

    createAnomalyElement(anomaly) {
        const div = document.createElement('div');
        div.className = 'p-3 bg-gray-800 rounded-lg border border-orange-500/30 shadow-lg shadow-black/20';
        div.innerHTML = `
            <div class="flex justify-between items-center">
                <span class="font-semibold text-white">${anomaly.payee}</span>
                <span class="font-bold text-orange-400">${anomaly.outcome.toLocaleString('ru-RU')} грн</span>
            </div>
            <p class="text-sm text-gray-400">${anomaly.anomaly_reason}</p>
        `;
        return div;
    }

    // Pagination methods
    previousTransactionPage() {
        if (this.currentTransactionPage > 1) {
            this.currentTransactionPage--;
            this.renderTransactionsPage();
        }
    }

    nextTransactionPage() {
        const totalPages = Math.ceil(this.allTransactions.length / this.transactionsPerPage);
        if (this.currentTransactionPage < totalPages) {
            this.currentTransactionPage++;
            this.renderTransactionsPage();
        }
    }

    previousAnomalyPage() {
        if (this.currentAnomalyPage > 1) {
            this.currentAnomalyPage--;
            this.renderAnomaliesPage();
        }
    }

    nextAnomalyPage() {
        const totalPages = Math.ceil(this.allAnomalies.length / this.anomaliesPerPage);
        if (this.currentAnomalyPage < totalPages) {
            this.currentAnomalyPage++;
            this.renderAnomaliesPage();
        }
    }

    // Tab switching
    switchTab(clickedTab) {
        const tabs = document.querySelectorAll('.tab-button');
        tabs.forEach(tab => {
            tab.classList.remove('text-blue-500', 'border-blue-500');
            tab.classList.add('text-gray-400', 'border-gray-700', 'hover:bg-gray-700', 'hover:border-gray-600');
        });
        
        clickedTab.classList.add('text-blue-500', 'border-blue-500');
        clickedTab.classList.remove('text-gray-400', 'border-gray-700', 'hover:bg-gray-700', 'hover:border-gray-600');
        
        const target = document.querySelector(clickedTab.dataset.tabTarget);
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.add('hidden'));
        target.classList.remove('hidden');
    }

    // Loading states
    showLoading() {
        // Show skeletons
        Object.values(this.elements).forEach(element => {
            if (element && element.classList && element.classList.contains('skeleton')) {
                element.classList.remove('hidden');
            }
        });
        
        // Hide actual content
        ['headerNetBalance', 'totalIncome', 'totalExpenses', 'theoreticalSavings'].forEach(id => {
            if (this.elements[id]) {
                this.elements[id].classList.add('hidden');
            }
        });
    }

    hideLoading() {
        // Hide skeletons
        Object.values(this.elements).forEach(element => {
            if (element && element.classList && element.classList.contains('skeleton')) {
                element.classList.add('hidden');
            }
        });
    }

    hideSkeletons() {
        this.hideLoading();
        
        // Show actual content
        ['headerNetBalance', 'totalIncome', 'totalExpenses', 'theoreticalSavings'].forEach(id => {
            if (this.elements[id]) {
                this.elements[id].classList.remove('hidden');
            }
        });
    }

    // Error handling
    showError(message) {
        // Create error notification
        const notification = document.createElement('div');
        notification.className = 'fixed top-4 right-4 bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg z-50';
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }

    // Modal management
    showSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.remove('hidden');
            modal.classList.add('flex');
        }
    }

    hideSettingsModal() {
        const modal = document.getElementById('settingsModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }
    }

    // Clear data
    clearData() {
        this.allTransactions = [];
        this.allAnomalies = [];
        this.currentTransactionPage = 1;
        this.currentAnomalyPage = 1;
        
        this.renderTransactionsPage();
        this.renderAnomaliesPage();
        
        // Clear metrics
        ['headerNetBalance', 'totalIncome', 'totalExpenses', 'theoreticalSavings'].forEach(id => {
            if (this.elements[id]) {
                this.elements[id].textContent = '0.00 грн';
            }
        });
    }
} 