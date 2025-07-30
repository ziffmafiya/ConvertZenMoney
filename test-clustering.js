/**
 * Скрипт для тестирования системы кластеризации транзакций
 * Запуск: node test-clustering.js
 */

const BASE_URL = 'http://localhost:3000';

/**
 * Тестирует функциональность кластеризации
 */
async function testClustering() {
    console.log('🧪 Тестирование кластеризации...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/transaction-clustering?action=cluster`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                eps: 0.3,
                minPts: 3,
                forceRecluster: false
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Кластеризация успешна');
            console.log(`   Кластеров: ${data.clusters}`);
            console.log(`   Транзакций: ${data.transactions}`);
            console.log(`   Шум: ${data.noise}`);
            return data;
        } else {
            console.error('❌ Ошибка кластеризации:', data.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Ошибка сети при кластеризации:', error.message);
        return null;
    }
}

/**
 * Тестирует получение информации о кластерах
 */
async function testClusters() {
    console.log('📊 Тестирование получения кластеров...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/transaction-clustering?action=get&limit=10`);
        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Получение кластеров успешно');
            console.log(`   Всего кластеров: ${data.summary.totalClusters}`);
            console.log(`   Всего транзакций: ${data.summary.totalTransactions}`);
            console.log(`   Возвращено кластеров: ${data.summary.returnedClusters}`);
            return data;
        } else {
            console.error('❌ Ошибка получения кластеров:', data.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Ошибка сети при получении кластеров:', error.message);
        return null;
    }
}

/**
 * Тестирует поиск похожих транзакций
 */
async function testSimilarTransactions() {
    console.log('🔍 Тестирование поиска похожих транзакций...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/transaction-clustering?action=find-similar`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: 'покупка продуктов',
                matchThreshold: 0.7,
                matchCount: 5,
                includeClusters: true
            })
        });

        const data = await response.json();
        
        if (response.ok) {
            console.log('✅ Поиск похожих транзакций успешен');
            console.log(`   Найдено транзакций: ${data.summary.totalTransactions}`);
            console.log(`   Общий расход: ${data.summary.totalOutcome}`);
            console.log(`   Общий доход: ${data.summary.totalIncome}`);
            return data;
        } else {
            console.error('❌ Ошибка поиска похожих транзакций:', data.error);
            return null;
        }
    } catch (error) {
        console.error('❌ Ошибка сети при поиске похожих транзакций:', error.message);
        return null;
    }
}

/**
 * Тестирует производительность системы
 */
async function testPerformance() {
    console.log('⚡ Тестирование производительности...');
    
    const queries = [
        'покупка продуктов',
        'оплата счетов',
        'перевод денег',
        'снятие наличных',
        'пополнение счета'
    ];
    
    const startTime = Date.now();
    const results = [];
    
    for (const query of queries) {
        const queryStart = Date.now();
        try {
            const response = await fetch(`${BASE_URL}/api/transaction-clustering?action=find-similar`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query,
                    matchThreshold: 0.7,
                    matchCount: 10,
                    includeClusters: false
                })
            });

            const data = await response.json();
            const queryTime = Date.now() - queryStart;
            
            if (response.ok) {
                results.push({
                    query,
                    time: queryTime,
                    transactions: data.summary.totalTransactions,
                    success: true
                });
            } else {
                results.push({
                    query,
                    time: queryTime,
                    error: data.error,
                    success: false
                });
            }
        } catch (error) {
            const queryTime = Date.now() - queryStart;
            results.push({
                query,
                time: queryTime,
                error: error.message,
                success: false
            });
        }
    }
    
    const totalTime = Date.now() - startTime;
    const avgTime = totalTime / queries.length;
    
    console.log('✅ Тест производительности завершен');
    console.log(`   Общее время: ${totalTime}ms`);
    console.log(`   Среднее время на запрос: ${avgTime.toFixed(2)}ms`);
    
    results.forEach(result => {
        if (result.success) {
            console.log(`   ✅ "${result.query}": ${result.time}ms (${result.transactions} транзакций)`);
        } else {
            console.log(`   ❌ "${result.query}": ${result.time}ms (ошибка: ${result.error})`);
        }
    });
    
    return { totalTime, avgTime, results };
}

/**
 * Проверяет статус системы
 */
async function checkSystemStatus() {
    console.log('🔍 Проверка статуса системы...');
    
    try {
        const response = await fetch(`${BASE_URL}/api/transaction-clustering?action=get&limit=1`);
        
        if (response.ok) {
            console.log('✅ Система работает нормально');
            return true;
        } else {
            console.error('❌ Система недоступна');
            return false;
        }
    } catch (error) {
        console.error('❌ Ошибка подключения к системе:', error.message);
        return false;
    }
}

/**
 * Основная функция тестирования
 */
async function main() {
    console.log('🚀 Запуск тестов системы кластеризации транзакций\n');
    
    // Проверяем статус системы
    const systemOk = await checkSystemStatus();
    if (!systemOk) {
        console.log('❌ Система недоступна. Убедитесь, что сервер запущен.');
        return;
    }
    
    console.log('---\n');
    
    // Тестируем кластеризацию
    const clusteringResult = await testClustering();
    console.log('---\n');
    
    // Тестируем получение кластеров
    const clustersResult = await testClusters();
    console.log('---\n');
    
    // Тестируем поиск похожих транзакций
    const similarResult = await testSimilarTransactions();
    console.log('---\n');
    
    // Тестируем производительность
    const performanceResult = await testPerformance();
    console.log('---\n');
    
    // Итоговый отчет
    console.log('📋 ИТОГОВЫЙ ОТЧЕТ:');
    console.log(`   Кластеризация: ${clusteringResult ? '✅' : '❌'}`);
    console.log(`   Получение кластеров: ${clustersResult ? '✅' : '❌'}`);
    console.log(`   Поиск похожих: ${similarResult ? '✅' : '❌'}`);
    console.log(`   Производительность: ${performanceResult ? '✅' : '❌'}`);
    
    if (clusteringResult && clustersResult && similarResult && performanceResult) {
        console.log('\n🎉 Все тесты пройдены успешно!');
    } else {
        console.log('\n⚠️  Некоторые тесты не прошли. Проверьте логи выше.');
    }
}

// Запускаем тесты, если файл выполняется напрямую
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testClustering,
    testClusters,
    testSimilarTransactions,
    testPerformance,
    checkSystemStatus
}; 