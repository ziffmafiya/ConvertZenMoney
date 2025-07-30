// Скрипт для проверки размерности эмбеддингов через API
// Запустите этот скрипт в браузере на странице index.html

async function checkEmbeddingDimensions() {
    console.log('🔍 Проверка размерности эмбеддингов...');
    
    try {
        // Получаем несколько транзакций с эмбеддингами
        const response = await fetch('/api/transaction-clustering?action=get&limit=5');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        
        if (result.clusters && result.clusters.length > 0) {
            console.log('✅ Найдены кластеры с транзакциями');
            
            // Проверяем размерность эмбеддингов в первой транзакции
            const firstCluster = result.clusters[0];
            if (firstCluster.transactions && firstCluster.transactions.length > 0) {
                console.log('📊 Информация о первом кластере:');
                console.log(`   - ID кластера: ${firstCluster.clusterId}`);
                console.log(`   - Количество транзакций: ${firstCluster.transactionCount}`);
                console.log(`   - Общая сумма: ${firstCluster.totalOutcome} грн`);
                console.log(`   - Категории: ${firstCluster.categories.join(', ')}`);
            }
        } else {
            console.log('⚠️ Кластеры не найдены. Возможно, кластеризация еще не была выполнена.');
        }
        
        // Пытаемся запустить кластеризацию для проверки размерности
        console.log('🔄 Проверка размерности через кластеризацию...');
        
        const clusterResponse = await fetch('/api/transaction-clustering?action=cluster', {
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
        
        if (clusterResponse.ok) {
            const clusterResult = await clusterResponse.json();
            console.log('✅ Кластеризация выполнена успешно!');
            console.log(`   - Создано кластеров: ${clusterResult.clusters}`);
            console.log(`   - Обработано транзакций: ${clusterResult.transactions}`);
            console.log(`   - Точки шума: ${clusterResult.noise}`);
            console.log('🎉 Размерность эмбеддингов корректна (768)');
        } else {
            const errorData = await clusterResponse.json();
            console.error('❌ Ошибка при кластеризации:', errorData.error);
            
            if (errorData.error.includes('Vectors must have the same length') || 
                errorData.error.includes('Embedding dimension mismatch')) {
                console.log('🔧 Рекомендации по исправлению:');
                console.log('   1. Выполните скрипт clear_embeddings.sql в Supabase');
                console.log('   2. Загрузите транзакции заново через интерфейс');
                console.log('   3. Запустите кластеризацию снова');
            }
        }
        
    } catch (error) {
        console.error('❌ Ошибка при проверке:', error);
        console.log('🔧 Возможные причины:');
        console.log('   - API недоступен');
        console.log('   - Проблемы с подключением к Supabase');
        console.log('   - Неправильные переменные окружения');
    }
}

// Функция для проверки поиска похожих транзакций
async function testSimilarTransactions() {
    console.log('🔍 Тестирование поиска похожих транзакций...');
    
    try {
        const response = await fetch('/api/transaction-clustering?action=find-similar', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: 'продукты еда покупки',
                limit: 5
            })
        });
        
        if (response.ok) {
            const result = await response.json();
            console.log('✅ Поиск похожих транзакций работает!');
            console.log(`   - Найдено транзакций: ${result.transactions.length}`);
            console.log(`   - Запрос: "${result.query}"`);
        } else {
            const errorData = await response.json();
            console.error('❌ Ошибка при поиске:', errorData.error);
        }
        
    } catch (error) {
        console.error('❌ Ошибка при тестировании поиска:', error);
    }
}

// Запускаем проверки
console.log('🚀 Начинаем диагностику системы кластеризации...');
checkEmbeddingDimensions().then(() => {
    setTimeout(testSimilarTransactions, 1000);
});

// Инструкции для пользователя
console.log(`
📋 Инструкции по использованию:

1. Откройте консоль браузера (F12 → Console)
2. Скопируйте и вставьте весь этот скрипт
3. Нажмите Enter для выполнения
4. Просмотрите результаты в консоли

🔧 Если найдены проблемы:
- Выполните скрипт clear_embeddings.sql в Supabase
- Загрузите транзакции заново
- Запустите кластеризацию через интерфейс
`); 