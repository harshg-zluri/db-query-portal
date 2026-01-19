-- Migration Script: Add 15K test records for row limit testing
-- Run this against your target PostgreSQL database

-- Create a test_products table if it doesn't exist
CREATE TABLE IF NOT EXISTS test_products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert 15,000 test records using generate_series
INSERT INTO test_products (name, description, price, category, status)
SELECT 
    'Product ' || i,
    'Description for product ' || i || '. This is a test product for row limit testing.',
    (random() * 1000)::numeric(10,2),
    CASE (i % 5)
        WHEN 0 THEN 'Electronics'
        WHEN 1 THEN 'Clothing'
        WHEN 2 THEN 'Home & Garden'
        WHEN 3 THEN 'Sports'
        ELSE 'Books'
    END,
    CASE 
        WHEN i % 10 = 0 THEN 'inactive'
        ELSE 'active'
    END
FROM generate_series(1, 15000) AS i;

-- Verify the count
SELECT COUNT(*) as total_records FROM test_products;

-- Sample queries for testing:
-- This should PASS (returns ~13,500 active products, below limit with LIMIT):
-- SELECT * FROM test_products WHERE status = 'active' LIMIT 1000;

-- This should PASS (returns 1,500 inactive products):
-- SELECT * FROM test_products WHERE status = 'inactive';

-- This should FAIL (returns all 15,000 products, exceeds 10K limit):
-- SELECT * FROM test_products;

-- This should PASS (returns ~3,000 products per category):
-- SELECT * FROM test_products WHERE category = 'Electronics';
