// Main application module
import { DataManager } from './data-manager.js';
import { UIManager } from './ui-manager.js';
import { ChartManager } from './chart-manager.js';
import { CacheManager } from './cache-manager.js';

class App {
    constructor() {
        this.dataManager = new DataManager();
        this.uiManager = new UIManager();
        this.chartManager = new ChartManager();
        this.cacheManager = new CacheManager();
        
        this.isInitialized = false;
        this.currentFilters = {
            month: '',
            year: new Date().getFullYear().toString()
        };
    }

    async initialize() {
        try {
            // Initialize managers
            await this.cacheManager.initialize();
            await this.uiManager.initialize();
            await this.chartManager.initialize();
            
            // Set up event listeners
            this.setupEventListeners();
            
            // Load initial data
            await this.loadInitialData();
            
            this.isInitialized = true;
            console.log('App initialized successfully');
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.uiManager.showError('Ошибка инициализации приложения');
        }
    }

    setupEventListeners() {
        // Filter changes
        const filterMonth = document.getElementById('filterMonth');
        const filterYear = document.getElementById('filterYear');
        
        filterMonth?.addEventListener('change', (e) => {
            this.currentFilters.month = e.target.value;
            this.handleFilterChange();
        });
        
        filterYear?.addEventListener('input', (e) => {
            this.currentFilters.year = e.target.value;
            this.handleFilterChange();
        });

        // Pagination
        document.getElementById('prevTransactionPage')?.addEventListener('click', () => {
            this.uiManager.previousTransactionPage();
        });
        
        document.getElementById('nextTransactionPage')?.addEventListener('click', () => {
            this.uiManager.nextTransactionPage();
        });

        // Tab switching
        document.querySelectorAll('.tab-button').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.uiManager.switchTab(e.target);
            });
        });

        // Settings button
        document.getElementById('settingsButton')?.addEventListener('click', () => {
            this.uiManager.showSettingsModal();
        });
    }

    async handleFilterChange() {
        if (!this.currentFilters.year) {
            this.uiManager.clearData();
            return;
        }

        try {
            this.uiManager.showLoading();
            
            // Check cache first
            const cacheKey = `transactions_${this.currentFilters.year}_${this.currentFilters.month || 'all'}`;
            let transactions = await this.cacheManager.get(cacheKey);
            
            if (!transactions) {
                transactions = await this.dataManager.fetchTransactions(this.currentFilters);
                await this.cacheManager.set(cacheKey, transactions, 5 * 60 * 1000); // 5 minutes
            }
            
            await this.updateUI(transactions);
            
        } catch (error) {
            console.error('Error handling filter change:', error);
            this.uiManager.showError('Ошибка загрузки данных');
        } finally {
            this.uiManager.hideLoading();
        }
    }

    async loadInitialData() {
        // Set default year if not set
        const filterYear = document.getElementById('filterYear');
        if (filterYear && !filterYear.value) {
            filterYear.value = this.currentFilters.year;
        }
        
        // Load data if year is set
        if (this.currentFilters.year) {
            await this.handleFilterChange();
        }
    }

    async updateUI(transactions) {
        // Update metrics
        const metrics = this.dataManager.calculateMetrics(transactions);
        this.uiManager.updateMetrics(metrics);
        
        // Update charts
        await this.chartManager.updateCharts(transactions, metrics);
        
        // Update tables and lists
        this.uiManager.updateTransactionsTable(transactions);
        this.uiManager.updateAnomaliesList(transactions.filter(t => t.is_anomaly));
        
        // Update sparklines
        this.chartManager.updateSparklines(transactions, this.currentFilters);
        
        // Hide skeletons
        this.uiManager.hideSkeletons();
    }
}

// Export initialization function
export async function initializeApp() {
    const app = new App();
    await app.initialize();
    
    // Make app globally available for debugging
    window.app = app;
} 