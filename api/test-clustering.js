import { createClient } from '@supabase/supabase-js';

// Тестовый обработчик для диагностики проблем с кластеризацией
export default async function handler(req, res) {
    // Разрешаем только GET-запросы
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const diagnostics = {
        timestamp: new Date().toISOString(),
        environment: {},
        supabase: {},
        database: {},
        edgeFunction: {}
    };

    try {
        // Проверяем переменные окружения
        diagnostics.environment = {
            SUPABASE_URL: process.env.SUPABASE_URL ? 'Configured' : 'Missing',
            SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? 'Configured' : 'Missing',
            SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'Configured' : 'Missing'
        };

        // Проверяем подключение к Supabase
        if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
            
            try {
                // Проверяем подключение к базе данных
                const { data: dbTest, error: dbError } = await supabase
                    .from('transactions')
                    .select('count')
                    .limit(1);

                diagnostics.database = {
                    connected: !dbError,
                    error: dbError?.message || null,
                    hasTransactions: dbTest && dbTest.length > 0
                };

                // Проверяем наличие эмбеддингов
                const { data: embeddingTest, error: embeddingError } = await supabase
                    .from('transactions')
                    .select('description_embedding')
                    .not('description_embedding', 'is', null)
                    .limit(1);

                diagnostics.database.hasEmbeddings = !embeddingError && embeddingTest && embeddingTest.length > 0;
                diagnostics.database.embeddingError = embeddingError?.message || null;

                // Проверяем Edge Function
                try {
                    const { data: edgeTest, error: edgeError } = await supabase.functions.invoke('cluster_embeddings', {
                        body: { test: true }
                    });

                    diagnostics.edgeFunction = {
                        available: !edgeError,
                        error: edgeError?.message || null,
                        response: edgeTest
                    };
                } catch (edgeError) {
                    diagnostics.edgeFunction = {
                        available: false,
                        error: edgeError.message,
                        type: 'connection_error'
                    };
                }

            } catch (supabaseError) {
                diagnostics.supabase = {
                    connected: false,
                    error: supabaseError.message
                };
            }
        } else {
            diagnostics.supabase = {
                connected: false,
                error: 'Missing environment variables'
            };
        }

        // Определяем статус системы
        const hasValidConfig = diagnostics.environment.SUPABASE_URL === 'Configured' && 
                              diagnostics.environment.SUPABASE_ANON_KEY === 'Configured';
        const hasValidConnection = diagnostics.supabase.connected;
        const hasEdgeFunction = diagnostics.edgeFunction.available;
        const hasData = diagnostics.database.hasTransactions;
        const hasEmbeddings = diagnostics.database.hasEmbeddings;

        diagnostics.status = {
            configValid: hasValidConfig,
            connectionValid: hasValidConnection,
            edgeFunctionAvailable: hasEdgeFunction,
            hasData: hasData,
            hasEmbeddings: hasEmbeddings,
            ready: hasValidConfig && hasValidConnection && hasEdgeFunction && hasData && hasEmbeddings
        };

        // Возвращаем результаты диагностики
        const statusCode = diagnostics.status.ready ? 200 : 500;
        res.status(statusCode).json(diagnostics);

    } catch (error) {
        console.error('Diagnostic error:', error);
        res.status(500).json({
            error: 'Diagnostic failed',
            details: error.message,
            timestamp: new Date().toISOString()
        });
    }
} 