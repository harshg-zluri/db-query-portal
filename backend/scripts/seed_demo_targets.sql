-- Create demo schemas and tables for query targets
-- These are the actual databases developers will query through the portal

-- =====================
-- SCHEMA: zluri_app (Production App Data)
-- =====================
CREATE SCHEMA IF NOT EXISTS zluri_app;

-- Employees table
CREATE TABLE IF NOT EXISTS zluri_app.employees (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    department VARCHAR(100),
    position VARCHAR(100),
    salary DECIMAL(10,2),
    hire_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS zluri_app.products (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    price DECIMAL(10,2),
    stock INT DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS zluri_app.orders (
    id SERIAL PRIMARY KEY,
    customer_email VARCHAR(255),
    product_id INT,
    quantity INT,
    total_amount DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    order_date TIMESTAMP DEFAULT NOW()
);

-- =====================
-- SCHEMA: zluri_analytics (Analytics Data)
-- =====================
CREATE SCHEMA IF NOT EXISTS zluri_analytics;

-- Analytics events
CREATE TABLE IF NOT EXISTS zluri_analytics.events (
    id SERIAL PRIMARY KEY,
    event_type VARCHAR(100),
    user_id VARCHAR(100),
    page_url VARCHAR(500),
    event_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Daily metrics
CREATE TABLE IF NOT EXISTS zluri_analytics.daily_metrics (
    id SERIAL PRIMARY KEY,
    metric_date DATE,
    active_users INT,
    page_views INT,
    signups INT,
    revenue DECIMAL(12,2)
);

-- =====================
-- SCHEMA: staging_app (Staging Environment)
-- =====================
CREATE SCHEMA IF NOT EXISTS staging_app;

-- Staging users table
CREATE TABLE IF NOT EXISTS staging_app.users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT NOW()
);

-- =====================
-- INSERT Demo Data
-- =====================

-- Employees
INSERT INTO zluri_app.employees (name, email, department, position, salary, hire_date, status) VALUES
('John Smith', 'john.smith@company.com', 'Engineering', 'Senior Developer', 95000.00, '2022-01-15', 'active'),
('Sarah Johnson', 'sarah.j@company.com', 'Engineering', 'Tech Lead', 120000.00, '2021-03-20', 'active'),
('Mike Williams', 'mike.w@company.com', 'Sales', 'Account Executive', 75000.00, '2022-06-01', 'active'),
('Emily Brown', 'emily.b@company.com', 'Marketing', 'Marketing Manager', 85000.00, '2021-08-10', 'active'),
('David Lee', 'david.l@company.com', 'Engineering', 'Junior Developer', 65000.00, '2023-02-01', 'active'),
('Lisa Chen', 'lisa.c@company.com', 'HR', 'HR Manager', 80000.00, '2020-11-15', 'active'),
('Tom Wilson', 'tom.w@company.com', 'Finance', 'Financial Analyst', 70000.00, '2022-09-01', 'active'),
('Amy Davis', 'amy.d@company.com', 'Product', 'Product Manager', 100000.00, '2021-05-01', 'active')
ON CONFLICT (email) DO NOTHING;

-- Products
INSERT INTO zluri_app.products (name, category, price, stock, active) VALUES
('Enterprise License', 'Software', 999.99, 100, true),
('API Integration Pack', 'Services', 499.99, 50, true),
('Analytics Module', 'Software', 299.99, 200, true),
('Premium Support', 'Services', 199.99, NULL, true),
('Legacy Connector', 'Software', 149.99, 25, false),
('Cloud Storage 1TB', 'Infrastructure', 49.99, 500, true),
('Dev Tools Bundle', 'Software', 79.99, 150, true)
ON CONFLICT DO NOTHING;

-- Orders
INSERT INTO zluri_app.orders (customer_email, product_id, quantity, total_amount, status, order_date) VALUES
('customer1@example.com', 1, 2, 1999.98, 'completed', '2024-01-15 10:30:00'),
('customer2@example.com', 2, 1, 499.99, 'completed', '2024-01-16 14:20:00'),
('customer3@example.com', 3, 5, 1499.95, 'pending', '2024-01-17 09:00:00'),
('customer1@example.com', 6, 10, 499.90, 'completed', '2024-01-18 16:45:00'),
('customer4@example.com', 1, 1, 999.99, 'cancelled', '2024-01-19 11:15:00'),
('customer5@example.com', 4, 1, 199.99, 'completed', '2024-01-20 13:30:00');

-- Analytics events
INSERT INTO zluri_analytics.events (event_type, user_id, page_url, event_data) VALUES
('page_view', 'user_001', '/dashboard', '{"duration": 45}'),
('click', 'user_001', '/dashboard', '{"element": "submit_btn"}'),
('page_view', 'user_002', '/products', '{"duration": 120}'),
('signup', 'user_003', '/register', '{"source": "google"}'),
('purchase', 'user_001', '/checkout', '{"amount": 999.99}'),
('page_view', 'user_004', '/pricing', '{"duration": 60}'),
('page_view', 'user_002', '/dashboard', '{"duration": 30}'),
('click', 'user_004', '/pricing', '{"element": "contact_sales"}');

-- Daily metrics
INSERT INTO zluri_analytics.daily_metrics (metric_date, active_users, page_views, signups, revenue) VALUES
('2024-01-15', 1250, 8500, 45, 15420.50),
('2024-01-16', 1320, 9200, 52, 18350.00),
('2024-01-17', 1180, 7800, 38, 12100.25),
('2024-01-18', 1450, 10500, 61, 22000.00),
('2024-01-19', 1380, 9800, 55, 19500.75),
('2024-01-20', 1290, 8900, 48, 16800.00);

-- Staging users
INSERT INTO staging_app.users (email, name, status) VALUES
('test1@staging.com', 'Test User 1', 'active'),
('test2@staging.com', 'Test User 2', 'active'),
('test3@staging.com', 'Test User 3', 'inactive')
ON CONFLICT (email) DO NOTHING;

-- Verify data
SELECT 'zluri_app.employees' as table_name, COUNT(*) as count FROM zluri_app.employees
UNION ALL
SELECT 'zluri_app.products', COUNT(*) FROM zluri_app.products
UNION ALL
SELECT 'zluri_app.orders', COUNT(*) FROM zluri_app.orders
UNION ALL
SELECT 'zluri_analytics.events', COUNT(*) FROM zluri_analytics.events
UNION ALL
SELECT 'zluri_analytics.daily_metrics', COUNT(*) FROM zluri_analytics.daily_metrics
UNION ALL
SELECT 'staging_app.users', COUNT(*) FROM staging_app.users;
