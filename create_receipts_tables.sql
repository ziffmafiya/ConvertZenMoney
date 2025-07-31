-- Создание таблицы для хранения информации о чеках
CREATE TABLE IF NOT EXISTS receipts (
    id SERIAL PRIMARY KEY,
    raw_text TEXT NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    products_count INTEGER NOT NULL,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание таблицы для хранения продуктов из чеков
CREATE TABLE IF NOT EXISTS receipt_products (
    id SERIAL PRIMARY KEY,
    receipt_id INTEGER REFERENCES receipts(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    price DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Создание индексов для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_receipts_uploaded_at ON receipts(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_receipt_products_receipt_id ON receipt_products(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_products_name ON receipt_products(name);

-- Создание представления для статистики продуктов
CREATE OR REPLACE VIEW product_stats AS
SELECT 
    LOWER(TRIM(rp.name)) as normalized_name,
    rp.name as display_name,
    COUNT(*) as purchase_count,
    SUM(rp.quantity) as total_quantity,
    SUM(rp.total) as total_spent,
    AVG(rp.price) as average_price,
    MIN(rp.price) as min_price,
    MAX(rp.price) as max_price,
    MIN(r.uploaded_at) as first_purchase,
    MAX(r.uploaded_at) as last_purchase
FROM receipt_products rp
JOIN receipts r ON rp.receipt_id = r.id
GROUP BY LOWER(TRIM(rp.name)), rp.name
ORDER BY total_spent DESC; 