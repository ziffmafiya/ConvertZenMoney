/**
 * Унифицированный модуль для визуализаций
 * Клиентская часть для браузера
 */



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
        const response = await fetch(`/api/unified?service=visualization&type=heatmap&month=${month}&year=${year}&groupBy=${groupBy}`);

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
        const response = await fetch(`/api/unified?service=visualization&type=treemap&month=${month}&year=${year}&hierarchyType=${hierarchyType}`);

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

 