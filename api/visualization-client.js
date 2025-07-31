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
export async function getHeatmapData(month, year, groupBy = 'day') {
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
export async function getTreemapData(month, year, hierarchyType = 'cluster') {
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