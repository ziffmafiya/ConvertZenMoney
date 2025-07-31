/**
 * Тестовый файл для проверки работы API визуализаций
 * Запуск: node test-visualizations.js
 */

import { createClient } from '@supabase/supabase-js';
import { getHeatmapData, getTreemapData } from './js/visualization-client.js';

// Конфигурация (замените на ваши данные)
const SUPABASE_URL = process.env.SUPABASE_URL || 'your-supabase-url';
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || 'your-supabase-key';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Тестирует API Heatmap
 */
async function testHeatmapAPI() {
    console.log('🧪 Тестирование Heatmap API...');
    
    try {
        const response = await fetch(`http://localhost:3000/api/visualization-data?type=heatmap&month=12&year=2024&groupBy=day`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('✅ Heatmap API работает');
        console.log('📊 Данные:', {
            xAxis: data.xAxis?.length || 0,
            yAxis: data.yAxis?.length || 0,
            dataPoints: data.data?.length || 0,
            metadata: data.metadata
        });
        
        return data;
    } catch (error) {
        console.error('❌ Ошибка Heatmap API:', error.message);
        return null;
    }
}

/**
 * Тестирует API Treemap
 */
async function testTreemapAPI() {
    console.log('🧪 Тестирование Treemap API...');
    
    try {
        const response = await fetch(`http://localhost:3000/api/visualization-data?type=treemap&month=12&year=2024&hierarchyType=cluster`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        console.log('✅ Treemap API работает');
        console.log('📊 Данные:', {
            datasets: data.datasets?.length || 0,
            treeItems: data.datasets?.[0]?.tree?.length || 0,
            totalSpent: data.metadata?.totalSpent || 0,
            totalTransactions: data.metadata?.totalTransactions || 0
        });
        
        return data;
    } catch (error) {
        console.error('❌ Ошибка Treemap API:', error.message);
        return null;
    }
}

/**
 * Тестирует прямые запросы к базе данных
 */
async function testDatabaseQueries() {
    console.log('🧪 Тестирование запросов к базе данных...');
    
    try {
        // Проверяем наличие транзакций
        const { data: transactions, error: txError } = await supabase
            .from('transactions')
            .select('*')
            .limit(5);
            
        if (txError) throw txError;
        
        console.log('✅ Таблица transactions доступна');
        console.log(`📊 Найдено транзакций: ${transactions.length}`);
        
        // Проверяем наличие кластеров
        const { data: clusters, error: clusterError } = await supabase
            .from('transaction_clusters')
            .select('*')
            .limit(5);
            
        if (clusterError) throw clusterError;
        
        console.log('✅ Таблица transaction_clusters доступна');
        console.log(`📊 Найдено кластеров: ${clusters.length}`);
        
        // Проверяем транзакции с кластерами
        const { data: txWithClusters, error: joinError } = await supabase
            .from('transactions')
            .select(`
                *,
                transaction_clusters(cluster_id)
            `)
            .gt('outcome', 0)
            .limit(5);
            
        if (joinError) throw joinError;
        
        console.log('✅ JOIN запрос работает');
        console.log(`📊 Транзакций с кластерами: ${txWithClusters.length}`);
        
        return { transactions, clusters, txWithClusters };
    } catch (error) {
        console.error('❌ Ошибка запросов к БД:', error.message);
        return null;
    }
}

/**
 * Создает тестовые данные (если их нет)
 */
async function createTestData() {
    console.log('🧪 Создание тестовых данных...');
    
    try {
        // Проверяем, есть ли уже данные
        const { data: existing } = await supabase
            .from('transactions')
            .select('id')
            .limit(1);
            
        if (existing && existing.length > 0) {
            console.log('✅ Данные уже существуют');
            return;
        }
        
        // Создаем тестовые транзакции
        const testTransactions = [
            {
                date: '2024-12-01',
                category_name: 'Продукты',
                payee: 'Магнит',
                outcome: 1500.50,
                income: 0,
                comment: 'Покупка продуктов'
            },
            {
                date: '2024-12-02',
                category_name: 'Транспорт',
                payee: 'Яндекс.Такси',
                outcome: 300.00,
                income: 0,
                comment: 'Поездка на такси'
            },
            {
                date: '2024-12-03',
                category_name: 'Продукты',
                payee: 'Пятёрочка',
                outcome: 800.25,
                income: 0,
                comment: 'Продукты'
            },
            {
                date: '2024-12-04',
                category_name: 'Развлечения',
                payee: 'Кинотеатр',
                outcome: 1200.00,
                income: 0,
                comment: 'Билеты в кино'
            },
            {
                date: '2024-12-05',
                category_name: 'Продукты',
                payee: 'Магнит',
                outcome: 950.75,
                income: 0,
                comment: 'Продукты'
            }
        ];
        
        const { data: inserted, error } = await supabase
            .from('transactions')
            .insert(testTransactions)
            .select();
            
        if (error) throw error;
        
        console.log('✅ Тестовые данные созданы');
        console.log(`📊 Добавлено транзакций: ${inserted.length}`);
        
        // Создаем кластеры для транзакций
        const clusterData = inserted.map((tx, index) => ({
            transaction_id: tx.id,
            cluster_id: Math.floor(index / 2) + 1 // Простая группировка
        }));
        
        const { error: clusterError } = await supabase
            .from('transaction_clusters')
            .insert(clusterData);
            
        if (clusterError) throw clusterError;
        
        console.log('✅ Кластеры созданы');
        
    } catch (error) {
        console.error('❌ Ошибка создания тестовых данных:', error.message);
    }
}

/**
 * Основная функция тестирования
 */
async function runTests() {
    console.log('🚀 Запуск тестов визуализаций...\n');
    
    // Тестируем базу данных
    const dbResult = await testDatabaseQueries();
    
    if (!dbResult) {
        console.log('⚠️  Создание тестовых данных...');
        await createTestData();
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Тестируем API (требует запущенный сервер)
    console.log('🌐 Тестирование API (требует запущенный сервер на localhost:3000)...');
    
    const heatmapResult = await testHeatmapAPI();
    const treemapResult = await testTreemapAPI();
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Итоги
    console.log('📋 Итоги тестирования:');
    console.log(`✅ База данных: ${dbResult ? 'работает' : 'ошибка'}`);
    console.log(`✅ Heatmap API: ${heatmapResult ? 'работает' : 'ошибка'}`);
    console.log(`✅ Treemap API: ${treemapResult ? 'работает' : 'ошибка'}`);
    
    if (heatmapResult && treemapResult) {
        console.log('\n🎉 Все тесты пройдены! Визуализации готовы к использованию.');
    } else {
        console.log('\n⚠️  Некоторые тесты не пройдены. Проверьте настройки.');
    }
}

// Запускаем тесты
runTests().catch(console.error); 