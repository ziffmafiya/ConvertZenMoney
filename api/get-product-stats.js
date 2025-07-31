import { createClient } from '@supabase/supabase-js';

/**
 * Основной обработчик для API-маршрута '/api/get-product-stats'
 */
export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }
    
    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_ANON_KEY;
        const supabase = createClient(supabaseUrl, supabaseKey);
        
        // Получаем параметры запроса
        const { month, year, limit = 20 } = req.query;
        
        // Строим запрос для получения статистики продуктов
        let query = supabase
            .from('receipt_products')
            .select(`
                name,
                quantity,
                price,
                total,
                receipts!inner(uploaded_at)
            `);
        
        // Фильтруем по месяцу и году, если указаны
        if (month && year) {
            const startDate = `${year}-${month.padStart(2, '0')}-01`;
            const endDate = `${year}-${month.padStart(2, '0')}-31`;
            
            query = query.gte('receipts.uploaded_at', startDate)
                        .lte('receipts.uploaded_at', endDate);
        }
        
        const { data: products, error } = await query;
        
        if (error) {
            console.error('Error fetching product stats:', error);
            return res.status(500).json({ error: error.message });
        }
        
        // Группируем продукты и считаем статистику
        const productStats = {};
        
        products.forEach(product => {
            const name = product.name.toLowerCase().trim();
            
            if (!productStats[name]) {
                productStats[name] = {
                    name: product.name,
                    totalQuantity: 0,
                    totalSpent: 0,
                    averagePrice: 0,
                    purchaseCount: 0,
                    minPrice: Infinity,
                    maxPrice: 0
                };
            }
            
            productStats[name].totalQuantity += product.quantity;
            productStats[name].totalSpent += product.total;
            productStats[name].purchaseCount += 1;
            productStats[name].minPrice = Math.min(productStats[name].minPrice, product.price);
            productStats[name].maxPrice = Math.max(productStats[name].maxPrice, product.price);
        });
        
        // Вычисляем среднюю цену для каждого продукта
        Object.values(productStats).forEach(product => {
            product.averagePrice = product.totalSpent / product.totalQuantity;
        });
        
        // Сортируем по общим тратам (по убыванию)
        const sortedProducts = Object.values(productStats)
            .sort((a, b) => b.totalSpent - a.totalSpent)
            .slice(0, parseInt(limit));
        
        // Получаем общую статистику
        const totalStats = {
            totalProducts: Object.keys(productStats).length,
            totalSpent: Object.values(productStats).reduce((sum, p) => sum + p.totalSpent, 0),
            totalPurchases: Object.values(productStats).reduce((sum, p) => sum + p.purchaseCount, 0)
        };
        
        res.status(200).json({
            success: true,
            products: sortedProducts,
            stats: totalStats
        });
        
    } catch (error) {
        console.error('Error processing product stats:', error);
        res.status(500).json({ error: error.message });
    }
} 