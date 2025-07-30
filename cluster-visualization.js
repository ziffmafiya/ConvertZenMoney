// Модуль для визуализации кластеров транзакций
class ClusterVisualization {
    constructor() {
        this.clusters = {};
        this.transactions = [];
        this.summary = {};
        this.isLoading = false;
        this.init();
    }

    // Инициализация модуля
    init() {
        this.createUI();
        this.bindEvents();
    }

    // Создание UI элементов для кластеризации
    createUI() {
        // Создаем секцию для кластеризации
        const clusterSection = document.createElement('section');
        clusterSection.id = 'clusterSection';
        clusterSection.className = 'mb-8 md:mb-12';
        clusterSection.innerHTML = `
            <div class="bg-[#161b22] rounded-2xl p-6 border border-[#30363d]">
                <div class="flex flex-wrap justify-between items-center mb-6">
                    <h2 class="text-2xl font-bold text-white mb-4 md:mb-0">Анализ паттернов транзакций</h2>
                    <div class="flex flex-wrap gap-4">
                        <button id="runClusteringBtn" class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Запустить кластеризацию
                        </button>
                        <button id="testSystemBtn" class="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                            Тест системы
                        </button>
                        <button id="showClusterVizBtn" class="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg transition-colors hidden">
                            Показать визуализацию
                        </button>
                    </div>
                </div>
                
                <!-- Параметры кластеризации -->
                <div id="clusteringParams" class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Минимальный размер кластера</label>
                        <input type="number" id="minClusterSize" value="5" min="2" max="20" 
                               class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Минимум соседей</label>
                        <input type="number" id="minSamples" value="3" min="1" max="10" 
                               class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                    </div>
                    <div>
                        <label class="block text-sm font-medium text-gray-300 mb-2">Радиус поиска (ε)</label>
                        <input type="number" id="epsilon" value="0.5" min="0.1" max="2.0" step="0.1" 
                               class="bg-gray-700 border border-gray-600 text-white text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5">
                    </div>
                </div>

                <!-- Статус кластеризации -->
                <div id="clusteringStatus" class="hidden">
                    <div class="flex items-center gap-2 text-blue-400">
                        <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-400"></div>
                        <span>Выполняется кластеризация...</span>
                    </div>
                </div>

                <!-- Результаты кластеризации -->
                <div id="clusteringResults" class="hidden">
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                        <div class="bg-gray-800 rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-blue-400" id="clusterCount">0</div>
                            <div class="text-sm text-gray-400">Кластеров</div>
                        </div>
                        <div class="bg-gray-800 rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-green-400" id="clusteredCount">0</div>
                            <div class="text-sm text-gray-400">Кластеризовано</div>
                        </div>
                        <div class="bg-gray-800 rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-yellow-400" id="noiseCount">0</div>
                            <div class="text-sm text-gray-400">Шум</div>
                        </div>
                        <div class="bg-gray-800 rounded-lg p-4 text-center">
                            <div class="text-2xl font-bold text-purple-400" id="totalCount">0</div>
                            <div class="text-sm text-gray-400">Всего</div>
                        </div>
                    </div>
                </div>

                <!-- Карточки кластеров -->
                <div id="clusterCards" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6"></div>

                <!-- Визуализация кластеров -->
                <div id="clusterVisualization" class="hidden">
                    <h3 class="text-xl font-bold text-white mb-4">Визуализация кластеров</h3>
                    <div class="bg-gray-800 rounded-lg p-4">
                        <canvas id="clusterChart" width="800" height="400"></canvas>
                    </div>
                </div>
            </div>
        `;

        // Вставляем секцию после основных метрик
        const metricsSection = document.querySelector('section');
        if (metricsSection) {
            metricsSection.parentNode.insertBefore(clusterSection, metricsSection.nextSibling);
        }
    }

    // Привязка событий
    bindEvents() {
        document.getElementById('runClusteringBtn')?.addEventListener('click', () => this.runClustering());
        document.getElementById('testSystemBtn')?.addEventListener('click', () => this.testSystem());
        document.getElementById('showClusterVizBtn')?.addEventListener('click', () => this.showVisualization());
    }

    // Запуск кластеризации
    async runClustering() {
        if (this.isLoading) return;

        this.isLoading = true;
        this.showStatus(true);

        try {
            // Сначала выполняем диагностику
            console.log('Running diagnostics...');
            const diagnosticResponse = await fetch('/api/test-clustering');
            const diagnostics = await diagnosticResponse.json();
            
            console.log('Diagnostics:', diagnostics);
            
            if (!diagnostics.status?.ready) {
                const issues = [];
                if (!diagnostics.status?.configValid) issues.push('Invalid configuration');
                if (!diagnostics.status?.connectionValid) issues.push('Database connection failed');
                if (!diagnostics.status?.edgeFunctionAvailable) issues.push('Edge Function not available');
                if (!diagnostics.status?.hasData) issues.push('No transaction data');
                if (!diagnostics.status?.hasEmbeddings) issues.push('No embeddings found');
                
                throw new Error(`System not ready: ${issues.join(', ')}`);
            }

            const params = {
                minClusterSize: parseInt(document.getElementById('minClusterSize').value),
                minSamples: parseInt(document.getElementById('minSamples').value),
                epsilon: parseFloat(document.getElementById('epsilon').value)
            };

            console.log('Starting clustering with params:', params);

            const response = await fetch('/api/cluster-transactions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(params)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(`HTTP error! status: ${response.status}, details: ${errorData.details || errorData.error || 'Unknown error'}`);
            }

            const result = await response.json();
            console.log('Clustering result:', result);

            if (result.success) {
                this.updateResults(result);
                this.showResults(true);
                document.getElementById('showClusterVizBtn').classList.remove('hidden');
            } else {
                throw new Error(result.error || 'Clustering failed');
            }

        } catch (error) {
            console.error('Clustering error:', error);
            this.showError(error.message);
        } finally {
            this.isLoading = false;
            this.showStatus(false);
        }
    }

    // Загрузка кластеризованных данных
    async loadClusteredData() {
        try {
            const month = document.getElementById('filterMonth').value;
            const year = document.getElementById('filterYear').value;
            
            const params = new URLSearchParams({
                includeNoise: 'false',
                limit: '1000'
            });

            if (month && year) {
                params.append('month', month);
                params.append('year', year);
            }

            const response = await fetch(`/api/get-clustered-transactions?${params}`);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Clustered data:', data);

            this.clusters = data.clusters;
            this.transactions = data.transactions;
            this.summary = data.summary;

            this.updateResults({
                clusters: data.summary.clusterCount,
                clustered: data.summary.clustered,
                noise: data.summary.noise,
                total: data.summary.total,
                clusterStats: data.clusterStats
            });

            this.renderClusterCards();
            this.showResults(true);

        } catch (error) {
            console.error('Error loading clustered data:', error);
            this.showError('Ошибка загрузки данных кластеризации');
        }
    }

    // Обновление результатов
    updateResults(result) {
        document.getElementById('clusterCount').textContent = result.clusters;
        document.getElementById('clusteredCount').textContent = result.clustered;
        document.getElementById('noiseCount').textContent = result.noise;
        document.getElementById('totalCount').textContent = result.total;
    }

    // Рендеринг карточек кластеров
    renderClusterCards() {
        const container = document.getElementById('clusterCards');
        container.innerHTML = '';

        Object.values(this.clusters).forEach(cluster => {
            const card = this.createClusterCard(cluster);
            container.appendChild(card);
        });
    }

    // Создание карточки кластера
    createClusterCard(cluster) {
        const card = document.createElement('div');
        card.className = 'bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500 transition-colors';
        
        const avgAmount = cluster.summary.avgOutcome || cluster.summary.avgIncome;
        const amountText = avgAmount ? `${avgAmount.toFixed(0)} грн` : 'N/A';
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h4 class="text-lg font-bold text-white">Кластер ${cluster.id}</h4>
                <span class="bg-purple-600 text-white text-xs px-2 py-1 rounded-full">${cluster.summary.count} тх</span>
            </div>
            <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                    <span class="text-gray-400">Средняя сумма:</span>
                    <span class="text-white font-semibold">${amountText}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Топ категория:</span>
                    <span class="text-white">${cluster.summary.topCategory}</span>
                </div>
                <div class="flex justify-between">
                    <span class="text-gray-400">Топ получатель:</span>
                    <span class="text-white">${cluster.summary.topPayee}</span>
                </div>
            </div>
            <button class="w-full mt-3 bg-gray-700 hover:bg-gray-600 text-white text-sm py-2 px-3 rounded transition-colors"
                    onclick="clusterViz.showClusterDetails(${cluster.id})">
                Показать детали
            </button>
        `;

        return card;
    }

    // Показать детали кластера
    showClusterDetails(clusterId) {
        const cluster = this.clusters[clusterId];
        if (!cluster) return;

        const transactions = cluster.transactions.slice(0, 10); // Показываем первые 10
        const details = transactions.map(t => 
            `${t.date}: ${t.payee || 'N/A'} - ${t.outcome || t.income || 0} грн`
        ).join('\n');

        alert(`Кластер ${clusterId} (${cluster.summary.count} транзакций):\n\n${details}`);
    }

    // Показать визуализацию
    showVisualization() {
        const vizContainer = document.getElementById('clusterVisualization');
        vizContainer.classList.remove('hidden');
        
        this.renderClusterChart();
    }

    // Рендеринг графика кластеров
    renderClusterChart() {
        const canvas = document.getElementById('clusterChart');
        const ctx = canvas.getContext('2d');

        // Очищаем canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        if (!this.clusters || Object.keys(this.clusters).length === 0) {
            ctx.fillStyle = '#6b7280';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Нет данных для визуализации', canvas.width / 2, canvas.height / 2);
            return;
        }

        // Создаем простую визуализацию - круговую диаграмму размеров кластеров
        const clusterData = Object.values(this.clusters).map(cluster => ({
            id: cluster.id,
            size: cluster.summary.count,
            avgAmount: cluster.summary.avgOutcome || cluster.summary.avgIncome || 0
        }));

        const total = clusterData.reduce((sum, cluster) => sum + cluster.size, 0);
        const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444'];

        let currentAngle = 0;
        clusterData.forEach((cluster, index) => {
            const sliceAngle = (cluster.size / total) * 2 * Math.PI;
            const color = colors[index % colors.length];

            // Рисуем сектор
            ctx.beginPath();
            ctx.moveTo(canvas.width / 2, canvas.height / 2);
            ctx.arc(canvas.width / 2, canvas.height / 2, 150, currentAngle, currentAngle + sliceAngle);
            ctx.closePath();
            ctx.fillStyle = color;
            ctx.fill();

            // Добавляем подпись
            const labelAngle = currentAngle + sliceAngle / 2;
            const labelRadius = 180;
            const x = canvas.width / 2 + Math.cos(labelAngle) * labelRadius;
            const y = canvas.height / 2 + Math.sin(labelAngle) * labelRadius;

            ctx.fillStyle = '#ffffff';
            ctx.font = '12px Arial';
            ctx.textAlign = 'center';
            ctx.fillText(`Кластер ${cluster.id}`, x, y);
            ctx.fillText(`(${cluster.size})`, x, y + 15);

            currentAngle += sliceAngle;
        });
    }

    // Показать/скрыть статус
    showStatus(show) {
        const status = document.getElementById('clusteringStatus');
        status.classList.toggle('hidden', !show);
    }

    // Показать/скрыть результаты
    showResults(show) {
        const results = document.getElementById('clusteringResults');
        results.classList.toggle('hidden', !show);
    }

    // Тестирование системы
    async testSystem() {
        try {
            console.log('Testing system...');
            const response = await fetch('/api/test-clustering');
            const diagnostics = await response.json();
            
            console.log('System diagnostics:', diagnostics);
            
            // Создаем подробный отчет
            let report = '📊 Диагностика системы кластеризации\n\n';
            
            // Статус конфигурации
            report += '🔧 Конфигурация:\n';
            Object.entries(diagnostics.environment).forEach(([key, value]) => {
                report += `  ${key}: ${value}\n`;
            });
            
            // Статус подключения
            report += '\n🔗 Подключение к Supabase:\n';
            report += `  Статус: ${diagnostics.supabase.connected ? '✅ Подключено' : '❌ Ошибка'}\n`;
            if (diagnostics.supabase.error) {
                report += `  Ошибка: ${diagnostics.supabase.error}\n`;
            }
            
            // Статус базы данных
            report += '\n🗄️ База данных:\n';
            report += `  Подключение: ${diagnostics.database.connected ? '✅' : '❌'}\n`;
            report += `  Транзакции: ${diagnostics.database.hasTransactions ? '✅' : '❌'}\n`;
            report += `  Эмбеддинги: ${diagnostics.database.hasEmbeddings ? '✅' : '❌'}\n`;
            if (diagnostics.database.error) {
                report += `  Ошибка: ${diagnostics.database.error}\n`;
            }
            
            // Статус Edge Function
            report += '\n⚡ Edge Function:\n';
            report += `  Доступность: ${diagnostics.edgeFunction.available ? '✅' : '❌'}\n`;
            if (diagnostics.edgeFunction.error) {
                report += `  Ошибка: ${diagnostics.edgeFunction.error}\n`;
            }
            
            // Общий статус
            report += '\n🎯 Общий статус:\n';
            report += `  Система готова: ${diagnostics.status.ready ? '✅ Да' : '❌ Нет'}\n`;
            
            if (!diagnostics.status.ready) {
                report += '\n⚠️ Проблемы:\n';
                if (!diagnostics.status.configValid) report += '  - Неверная конфигурация\n';
                if (!diagnostics.status.connectionValid) report += '  - Ошибка подключения к базе данных\n';
                if (!diagnostics.status.edgeFunctionAvailable) report += '  - Edge Function недоступна\n';
                if (!diagnostics.status.hasData) report += '  - Нет данных транзакций\n';
                if (!diagnostics.status.hasEmbeddings) report += '  - Нет эмбеддингов\n';
            }
            
            alert(report);
            
        } catch (error) {
            console.error('Test error:', error);
            alert(`Ошибка тестирования: ${error.message}`);
        }
    }

    // Показать ошибку
    showError(message) {
        alert(`Ошибка: ${message}`);
    }

    // Обновление данных при изменении фильтров
    onFiltersChanged() {
        this.loadClusteredData();
    }
}

// Инициализация модуля при загрузке страницы
let clusterViz;
document.addEventListener('DOMContentLoaded', () => {
    clusterViz = new ClusterVisualization();
    
    // Привязываем к существующим фильтрам
    const filterMonth = document.getElementById('filterMonth');
    const filterYear = document.getElementById('filterYear');
    
    if (filterMonth) {
        filterMonth.addEventListener('change', () => clusterViz.onFiltersChanged());
    }
    if (filterYear) {
        filterYear.addEventListener('change', () => clusterViz.onFiltersChanged());
    }
});

// Экспорт для использования в других модулях
window.ClusterVisualization = ClusterVisualization; 