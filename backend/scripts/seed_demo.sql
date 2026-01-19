-- Seed Data for DB Query Portal Demo
-- Password for all users: password123
-- Hash generated with bcrypt, 12 rounds

-- Clean up existing data
DELETE FROM query_requests;
DELETE FROM database_instances;
DELETE FROM users;

-- =====================
-- USERS (13 total)
-- =====================
-- Manager: 'Sarah Manager' (manager1@zluri.com) - Pod 1
-- Manager: 'DE Lead' (de-lead@zluri.com) - DE
-- Manager: 'DB Admin' (db-admin@zluri.com) - DB
-- Manager: 'Analytics Lead' (analytics-lead@zluri.com) - Analytics

INSERT INTO users (id, email, password, name, role, managed_pod_ids) VALUES
('11111111-1111-1111-1111-111111111111', 'manager1@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Sarah Manager', 'manager', ARRAY['pod-1']),
('22222222-2222-2222-2222-222222222222', 'de-lead@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Data Engineering Lead', 'manager', ARRAY['de']),
('33333333-3333-3333-3333-333333333333', 'db-admin@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Database Admin', 'manager', ARRAY['db']),
('44444444-4444-4444-4444-444444444444', 'analytics-lead@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Analytics Lead', 'manager', ARRAY['analytics']);

INSERT INTO users (id, email, password, name, role, managed_pod_ids) VALUES
('aaaa1111-aaaa-1111-aaaa-111111111111', 'developer@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Test Developer', 'developer', ARRAY[]::text[]),
('aaaa2222-aaaa-2222-aaaa-222222222222', 'dev.alice@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Alice Developer', 'developer', ARRAY[]::text[]),
('aaaa3333-aaaa-3333-aaaa-333333333333', 'dev.bob@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Bob Developer', 'developer', ARRAY[]::text[]),
('aaaa4444-aaaa-4444-aaaa-444444444444', 'dev.charlie@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Charlie Developer', 'developer', ARRAY[]::text[]),
('aaaa5555-aaaa-5555-aaaa-555555555555', 'dev.diana@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Diana Developer', 'developer', ARRAY[]::text[]),
('aaaa6666-aaaa-6666-aaaa-666666666666', 'dev.evan@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Evan Developer', 'developer', ARRAY[]::text[]),
('aaaa7777-aaaa-7777-aaaa-777777777777', 'dev.fiona@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'Fiona Developer', 'developer', ARRAY[]::text[]),
('aaaa8888-aaaa-8888-aaaa-888888888888', 'dev.george@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'George Developer', 'developer', ARRAY[]::text[]),
('00000000-0000-0000-0000-000000000000', 'admin@zluri.com', '$2b$12$tPfQesqK8tDf..4A.ay2fux2zBhDsCilgpfTVtxqoY.TqcTGHJrZG', 'System Admin', 'admin', ARRAY[]::text[]);

-- =====================
-- DATABASE INSTANCES (Single instance per type - dynamic discovery with fallback)
-- =====================
-- Note: The 'databases' array contains fallback values used when dynamic discovery
-- fails (e.g., connection limit exceeded). Primary source is TARGET_POSTGRES_URL/TARGET_MONGODB_URL.

INSERT INTO database_instances (id, name, type, host, port, databases) VALUES
('bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'postgresql', 'localhost', 5432, ARRAY['public', 'load_testing', 'staging_app', 'staging_test', 'zluri_analytics', 'zluri_app', 'zluri_logs', 'zluri_reports', 'zluri_users']),
('cccc1111-cccc-1111-cccc-111111111111', 'Primary MongoDB', 'mongodb', 'localhost', 27017, ARRAY['test_db']);

-- =====================
-- QUERY REQUESTS (25 Scenarios)
-- =====================

-------------------------------------------------------
-- 1. POSTGRES - SIMPLE SELECT (Pending)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status) VALUES
('dddd1001-dddd-1111-dddd-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'developer@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'zluri_app', 'query', 'SELECT id, email, created_at FROM users WHERE status = ''active'' LIMIT 10;', 'Checking active users', 'pod-1', 'Pod 1', 'pending');

-------------------------------------------------------
-- 2. POSTGRES - JOIN QUERY (Pending - Analytics)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status) VALUES
('dddd1002-dddd-1111-dddd-111111111111', 'aaaa2222-aaaa-2222-aaaa-222222222222', 'dev.alice@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'zluri_analytics', 'query', 'SELECT u.name, COUNT(e.id) as event_count FROM users u JOIN events e ON u.id = e.user_id GROUP BY u.name ORDER BY event_count DESC LIMIT 5;', 'Top 5 active users report', 'analytics', 'Analytics', 'pending');

-------------------------------------------------------
-- 3. MONGODB - FIND BY ID (Pending - DE)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status) VALUES
('dddd1003-dddd-1111-dddd-111111111111', 'aaaa3333-aaaa-3333-aaaa-333333333333', 'dev.bob@zluri.com', 'mongodb', 'cccc1111-cccc-1111-cccc-111111111111', 'Primary MongoDB', 'zluri_main', 'query', 'db.users.find({ "_id": "12345" })', 'Debugging user sync issue', 'de', 'DE', 'pending');

-------------------------------------------------------
-- 4. MONGODB - AGGREGATE (Pending - DE)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status) VALUES
('dddd1004-dddd-1111-dddd-111111111111', 'aaaa3333-aaaa-3333-aaaa-333333333333', 'dev.bob@zluri.com', 'mongodb', 'cccc1111-cccc-1111-cccc-111111111111', 'Primary MongoDB', 'zluri_main', 'query', 'db.logs.aggregate([ { "$match": { "level": "error" } }, { "$group": { "_id": "$component", "count": { "$sum": 1 } } } ])', 'Error count by component', 'de', 'DE', 'pending');

-------------------------------------------------------
-- 5. SCRIPT - DATA MIGRATION (Pending - Pod 1)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, script_file_name, script_content, comments, pod_id, pod_name, status) VALUES
('dddd1005-dddd-1111-dddd-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'developer@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'staging_app', 'script', NULL, 'migration_fix.js', 'const users = await db.query("SELECT * FROM old_users");\nfor (const user of users.rows) {\n  await db.query("INSERT INTO new_users VALUES ($1, $2)", [user.id, user.name]);\n} return "Migrated " + users.rowCount + " users";', 'Migrating users to new schema format', 'pod-1', 'Pod 1', 'pending');

-------------------------------------------------------
-- 6. POSTGRES - APPROVED & EXECUTED
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status, approver_email, execution_result, executed_at) VALUES
('dddd1006-dddd-1111-dddd-111111111111', 'aaaa4444-aaaa-4444-aaaa-444444444444', 'dev.charlie@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'zluri_app', 'query', 'SELECT COUNT(*) FROM users;', 'Weekly count', 'pod-1', 'Pod 1', 'executed', 'manager1@zluri.com', '{"rows": [{"count": 10523}], "rowCount": 1}', NOW() - INTERVAL '1 day');

-------------------------------------------------------
-- 7. POSTGRES - EXECUTED (Empty Result)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status, approver_email, execution_result, executed_at) VALUES
('dddd1007-dddd-1111-dddd-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'developer@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'zluri_logs', 'query', 'SELECT * FROM audit_logs WHERE user_email = ''fake@user.com'';', 'Check for intrusion attempts', 'db', 'DB', 'executed', 'db-admin@zluri.com', '{"rows": [], "rowCount": 0}', NOW() - INTERVAL '3 days');

-------------------------------------------------------
-- 8. MONGODB - EXECUTED (Nested Documents)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status, approver_email, execution_result, executed_at) VALUES
('dddd1008-dddd-1111-dddd-111111111111', 'aaaa2222-aaaa-2222-aaaa-222222222222', 'dev.alice@zluri.com', 'mongodb', 'cccc1111-cccc-1111-cccc-111111111111', 'Primary MongoDB', 'zluri_integrations', 'query', 'db.integrations.find({ "type": "slack" }).limit(1)', 'Sample slack integration config', 'de', 'DE', 'executed', 'de-lead@zluri.com', '{"rows": [{"_id": "i1", "type": "slack", "config": {"webhook": "..."}}], "rowCount": 1}', NOW() - INTERVAL '1 hour');

-------------------------------------------------------
-- 9. POSTGRES - REJECTED (Dangerous Delete)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status, approver_email, rejection_reason) VALUES
('dddd1009-dddd-1111-dddd-111111111111', 'aaaa5555-aaaa-5555-aaaa-555555555555', 'dev.diana@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'zluri_users', 'query', 'DELETE FROM users;', 'Resetting environment', 'pod-1', 'Pod 1', 'rejected', 'manager1@zluri.com', 'We cannot wipe production users. Please use the staging environment for resets.');

-------------------------------------------------------
-- 10. POSTGRES - REJECTED (Wrong Database)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status, approver_email, rejection_reason) VALUES
('dddd1010-dddd-1111-dddd-111111111111', 'aaaa6666-aaaa-6666-aaaa-666666666666', 'dev.evan@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'zluri_analytics', 'query', 'SELECT * FROM users;', 'Checking users', 'analytics', 'Analytics', 'rejected', 'analytics-lead@zluri.com', 'Wrong DB. Users table is not in this database.');

-------------------------------------------------------
-- 11. MONGODB - REJECTED (No Index)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status, approver_email, rejection_reason) VALUES
('dddd1011-dddd-1111-dddd-111111111111', 'aaaa3333-aaaa-3333-aaaa-333333333333', 'dev.bob@zluri.com', 'mongodb', 'cccc1111-cccc-1111-cccc-111111111111', 'Primary MongoDB', 'zluri_main', 'query', 'db.logs.find({ "message": { "$regex": ".*error.*" } })', 'Regex search for errors', 'de', 'DE', 'rejected', 'de-lead@zluri.com', 'Full collection scan prevented. Please use text search index or exact match.');

-------------------------------------------------------
-- 12. SCRIPT - FAILED (Syntax Error)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, script_file_name, script_content, comments, pod_id, pod_name, status, approver_email, execution_error, executed_at) VALUES
('dddd1012-dddd-1111-dddd-111111111111', 'aaaa7777-aaaa-7777-aaaa-777777777777', 'dev.fiona@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'staging_app', 'script', NULL, 'broken.js', 'const x = ;', 'Testing script', 'pod-1', 'Pod 1', 'failed', 'manager1@zluri.com', 'SyntaxError: Unexpected token '';''', NOW());

-------------------------------------------------------
-- 13. SCRIPT - FAILED (Timeout)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, script_file_name, script_content, comments, pod_id, pod_name, status, approver_email, execution_error, executed_at) VALUES
('dddd1013-dddd-1111-dddd-111111111111', 'aaaa8888-aaaa-8888-aaaa-888888888888', 'dev.george@zluri.com', 'mongodb', 'cccc1111-cccc-1111-cccc-111111111111', 'Primary MongoDB', 'zluri_main', 'script', NULL, 'loop.js', 'while(true) {}', 'Stress testing', 'de', 'DE', 'failed', 'de-lead@zluri.com', 'Script execution timed out after 30000ms', NOW());

-------------------------------------------------------
-- 14. POSTGRES - WITHDRAWN (By User)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status) VALUES
('dddd1014-dddd-1111-dddd-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'developer@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'zluri_app', 'query', 'SELECT * FROM passwords;', 'Oops wrong table', 'pod-1', 'Pod 1', 'withdrawn');

-------------------------------------------------------
-- 15. POSTGRES - REJECTED (Sensitive Data)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status, approver_email, rejection_reason) VALUES
('dddd1015-dddd-1111-dddd-111111111111', 'aaaa2222-aaaa-2222-aaaa-222222222222', 'dev.alice@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'zluri_users', 'query', 'SELECT email, credit_card FROM billing;', 'Need billing info', 'pod-1', 'Pod 1', 'rejected', 'manager1@zluri.com', 'Access to credit_card column is strictly prohibited.');

-------------------------------------------------------
-- 16. MONGODB - PENDING (Simple Count)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status) VALUES
('dddd1016-dddd-1111-dddd-111111111111', 'aaaa4444-aaaa-4444-aaaa-444444444444', 'dev.charlie@zluri.com', 'mongodb', 'cccc1111-cccc-1111-cccc-111111111111', 'Primary MongoDB', 'zluri_sessions', 'query', 'db.sessions.countDocuments({})', 'Checking session volume', 'pod-1', 'Pod 1', 'pending');

-------------------------------------------------------
-- 17. POSTGRES - APPROVED (Pending Execution)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status, approver_email) VALUES
('dddd1017-dddd-1111-dddd-111111111111', 'aaaa5555-aaaa-5555-aaaa-555555555555', 'dev.diana@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'staging_app', 'query', 'UPDATE config SET feature_flag = true WHERE id = 1;', 'Enabling feature flag for QA', 'pod-1', 'Pod 1', 'approved', 'manager1@zluri.com');

-------------------------------------------------------
-- 18. MONGODB - PENDING (Complex Projection)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status) VALUES
('dddd1018-dddd-1111-dddd-111111111111', 'aaaa6666-aaaa-6666-aaaa-666666666666', 'dev.evan@zluri.com', 'mongodb', 'cccc1111-cccc-1111-cccc-111111111111', 'Primary MongoDB', 'zluri_main', 'query', 'db.users.find({ "status": "active" }, { "name": 1, "email": 1, "_id": 0 }).limit(50)', 'Active user email list', 'de', 'DE', 'pending');

-------------------------------------------------------
-- 19. SCRIPT - PENDING (Complex Logic)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, script_file_name, script_content, comments, pod_id, pod_name, status) VALUES
('dddd1019-dddd-1111-dddd-111111111111', 'aaaa7777-aaaa-7777-aaaa-777777777777', 'dev.fiona@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'zluri_analytics', 'script', NULL, 'calculate_metrics.js', 'const events = await db.query("SELECT * FROM events WHERE date > $1", ["2023-01-01"]);\n// ... complex calculation ...\nreturn { processed: events.rowCount, score: 99 };', 'Custom metric calculation not possible in SQL', 'analytics', 'Analytics', 'pending');

-------------------------------------------------------
-- 20. CHECKER - PENDING (My Requests)
-------------------------------------------------------
INSERT INTO query_requests (id, user_id, user_email, database_type, instance_id, instance_name, database_name, submission_type, query, comments, pod_id, pod_name, status) VALUES
('dddd1020-dddd-1111-dddd-111111111111', 'aaaa1111-aaaa-1111-aaaa-111111111111', 'developer@zluri.com', 'postgresql', 'bbbb1111-bbbb-1111-bbbb-111111111111', 'Primary PostgreSQL', 'zluri_app', 'query', 'SELECT 1;', 'Just a ping', 'pod-1', 'Pod 1', 'pending');

-- Verify counts
SELECT 'Users' as table_name, COUNT(*) as count FROM users
UNION ALL
SELECT 'Database Instances', COUNT(*) FROM database_instances
UNION ALL
SELECT 'Query Requests', COUNT(*) FROM query_requests;
