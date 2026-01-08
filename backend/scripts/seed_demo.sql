-- Seed Data for DB Query Portal Demo
-- Password for all users: password123
-- Hash generated with bcrypt, 12 rounds

-- Clean up existing data (optional, for fresh start)
DELETE FROM query_requests;
DELETE FROM database_instances;
DELETE FROM users;

-- =====================
-- USERS (13 total: 4 managers, 8 developers, 1 admin)
-- =====================

-- Password hash for 'password123' using bcrypt with 12 rounds
-- $2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG

-- Managers (4)
INSERT INTO users (id, email, password, name, role, managed_pod_ids) VALUES
('11111111-1111-1111-1111-111111111111', 'manager1@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Sarah Manager', 'manager', ARRAY['pod-1']),
('22222222-2222-2222-2222-222222222222', 'de-lead@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Data Engineering Lead', 'manager', ARRAY['de']),
('33333333-3333-3333-3333-333333333333', 'db-admin@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Database Admin', 'manager', ARRAY['db']),
('44444444-4444-4444-4444-444444444444', 'analytics-lead@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Analytics Lead', 'manager', ARRAY['analytics']);

-- Developers (8)
INSERT INTO users (id, email, password, name, role, managed_pod_ids) VALUES
('aaaa1111-aaaa-1111-aaaa-111111111111', 'developer@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Test Developer', 'developer', ARRAY[]::text[]),
('aaaa2222-aaaa-2222-aaaa-222222222222', 'dev.alice@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Alice Developer', 'developer', ARRAY[]::text[]),
('aaaa3333-aaaa-3333-aaaa-333333333333', 'dev.bob@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Bob Developer', 'developer', ARRAY[]::text[]),
('aaaa4444-aaaa-4444-aaaa-444444444444', 'dev.charlie@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Charlie Developer', 'developer', ARRAY[]::text[]),
('aaaa5555-aaaa-5555-aaaa-555555555555', 'dev.diana@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Diana Developer', 'developer', ARRAY[]::text[]),
('aaaa6666-aaaa-6666-aaaa-666666666666', 'dev.evan@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Evan Developer', 'developer', ARRAY[]::text[]),
('aaaa7777-aaaa-7777-aaaa-777777777777', 'dev.fiona@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Fiona Developer', 'developer', ARRAY[]::text[]),
('aaaa8888-aaaa-8888-aaaa-888888888888', 'dev.george@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'George Developer', 'developer', ARRAY[]::text[]);

-- Admin (1)
INSERT INTO users (id, email, password, name, role, managed_pod_ids) VALUES
('00000000-0000-0000-0000-000000000000', 'admin@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'System Admin', 'admin', ARRAY[]::text[]);

-- =====================
-- DATABASE INSTANCES (5 total: 3 PostgreSQL, 2 MongoDB)
-- =====================

-- PostgreSQL Instances (3)
INSERT INTO database_instances (id, name, type, host, port, databases) VALUES
('bbbb1111-bbbb-1111-bbbb-111111111111', 'prod-postgres-primary', 'postgresql', 'pg-383bd9e4-zluri-db-query.i.aivencloud.com', 18301, ARRAY['zluri_app', 'zluri_users', 'zluri_logs']),
('bbbb2222-bbbb-2222-bbbb-222222222222', 'prod-postgres-analytics', 'postgresql', 'pg-383bd9e4-zluri-db-query.i.aivencloud.com', 18301, ARRAY['zluri_analytics', 'zluri_reports']),
('bbbb3333-bbbb-3333-bbbb-333333333333', 'staging-postgres', 'postgresql', 'pg-383bd9e4-zluri-db-query.i.aivencloud.com', 18301, ARRAY['staging_app', 'staging_test']);

-- MongoDB Instances (2)
INSERT INTO database_instances (id, name, type, host, port, databases) VALUES
('cccc1111-cccc-1111-cccc-111111111111', 'prod-mongodb-main', 'mongodb', 'cluster0.tv6pls6.mongodb.net', 27017, ARRAY['zluri_main', 'zluri_integrations']),
('cccc2222-cccc-2222-cccc-222222222222', 'prod-mongodb-cache', 'mongodb', 'cluster0.tv6pls6.mongodb.net', 27017, ARRAY['zluri_sessions', 'zluri_cache']);

-- =====================
-- SAMPLE QUERY REQUESTS (5 for demo)
-- =====================

-- Pending request (awaiting approval)
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status) VALUES
('dddd1111-dddd-1111-dddd-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'developer@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'prod-postgres-primary', 'zluri_app', 'query', 'SELECT * FROM users WHERE created_at > NOW() - INTERVAL ''7 days'';', 'Need to check new user signups from last week', 'pod-1', 'Pod 1', 'pending'),
('dddd2222-dddd-2222-dddd-222222222222', 'aaaa2222-aaaa-2222-aaaa-222222222222', 'dev.alice@zluri.com', 'mongodb', 'cccc1111-cccc-1111-cccc-111111111111', 'prod-mongodb-main', 'zluri_main', 'query', '{"find": "users", "filter": {"status": "active"}}', 'Fetching active users for analytics report', 'de', 'DE', 'pending');

-- Approved and executed request
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status, approver_email, execution_result, executed_at) VALUES
('dddd3333-dddd-3333-dddd-333333333333', 'aaaa3333-aaaa-3333-aaaa-333333333333', 'dev.bob@zluri.com', 'postgresql', 'bbbb2222-bbbb-2222-bbbb-222222222222', 'prod-postgres-analytics', 'zluri_analytics', 'query', 'SELECT COUNT(*) as total_events FROM analytics_events;', 'Monthly analytics count for reporting', 'analytics', 'Analytics', 'executed', 'analytics-lead@zluri.com', '{"rows": [{"total_events": 15423}], "rowCount": 1}', NOW() - INTERVAL '2 hours');

-- Rejected request
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status, approver_email, rejection_reason) VALUES
('dddd4444-dddd-4444-dddd-444444444444', 'aaaa4444-aaaa-4444-aaaa-444444444444', 'dev.charlie@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'prod-postgres-primary', 'zluri_users', 'query', 'DELETE FROM users WHERE id IS NOT NULL;', 'Cleanup old users', 'db', 'DB', 'rejected', 'db-admin@zluri.com', 'This query would delete all users. Please refine the WHERE clause to target specific records.');

-- Failed execution
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status, approver_email, execution_error, executed_at) VALUES
('dddd5555-dddd-5555-dddd-555555555555', 'aaaa5555-aaaa-5555-aaaa-555555555555', 'dev.diana@zluri.com', 'postgresql', 'bbbb3333-bbbb-3333-bbbb-333333333333', 'staging-postgres', 'staging_app', 'query', 'SELECT * FROM non_existent_table;', 'Testing staging database connection', 'pod-1', 'Pod 1', 'failed', 'manager1@zluri.com', 'ERROR: relation "non_existent_table" does not exist', NOW() - INTERVAL '1 day');

-- Verify counts
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Database Instances', COUNT(*) FROM database_instances
UNION ALL
SELECT 'Query Requests', COUNT(*) FROM query_requests;
