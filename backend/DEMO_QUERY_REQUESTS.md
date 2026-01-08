# Demo Query Requests Documentation

This document catalogs all 52 demo query requests in the database, organized by developer and scenario type.

---

## Summary Statistics

| Status | Count | Description |
|--------|-------|-------------|
| **pending** | 42 | Awaiting manager approval |
| **approved** | 4 | Approved, awaiting execution |
| **rejected** | 3 | Rejected by manager with reason |
| **executed** | 2 | Successfully executed |
| **failed** | 1 | Execution failed with error |

---

## Developer 1: developer@zluri.com

**POD:** Pod 1 | **Total Requests:** 10

### Valid Queries ✅

| Schema | Query | Status | Expected Result |
|--------|-------|--------|-----------------|
| `zluri_app` | `SELECT * FROM employees LIMIT 10;` | pending | Returns 8 employee records |
| `zluri_app` | `SELECT COUNT(*) as total FROM orders;` | pending | Returns order count |
| `zluri_app` | `SELECT * FROM products WHERE price > 50;` | approved | Returns products over $50 |
| `zluri_app` | `SELECT * FROM employees WHERE hire_date > '2022-01-01';` | pending | Returns recently hired employees |
| `zluri_app` | `SELECT name, salary FROM employees ORDER BY salary DESC LIMIT 3;` | pending | Top 3 highest salaries |
| `zluri_app` | `SELECT status, COUNT(*) FROM employees GROUP BY status;` | pending | Employee count by status |
| `zluri_users` | `SELECT * FROM user_profiles;` | pending | Returns 3 user profiles |
| `zluri_users` | `SELECT * FROM user_sessions WHERE expires_at > NOW();` | pending | Active sessions |

### Invalid Queries ❌ (Will Fail on Execution)

| Schema | Query | Status | Expected Error |
|--------|-------|--------|----------------|
| `zluri_app` | `SELECT * FROM nonexistent_table;` | pending | `relation "nonexistent_table" does not exist` |
| `zluri_app` | `SELEC * FROM employees;` | pending | Syntax error - typo in SELECT |
| `zluri_app` | `SELECT * FROM employees WHERE department = ;` | pending | Incomplete WHERE clause |

---

## Developer 2: dev.alice@zluri.com

**POD:** Pod 1, Analytics | **Total Requests:** 5

### PostgreSQL Queries

| Schema | Query | Status | Expected Result |
|--------|-------|--------|-----------------|
| `zluri_analytics` | `SELECT * FROM daily_metrics ORDER BY date DESC LIMIT 30;` | pending | Last 30 days of metrics |
| `zluri_analytics` | `SELECT event_type, COUNT(*) FROM events GROUP BY event_type;` | pending | Event distribution |
| `zluri_reports` | `SELECT * FROM daily_reports WHERE report_date >= CURRENT_DATE - 7;` | pending | Weekly reports (5 rows) |
| `zluri_app` | `SELECT position, COUNT(*) FROM employees GROUP BY position;` | pending | Headcount by position |
| `zluri_logs` | `SELECT COUNT(*) FROM error_logs;` | pending | Total error count |

### MongoDB Queries

| Database | Query | Status | Expected Result |
|----------|-------|--------|-----------------|
| `zluri_main` | `db.users.find({}).limit(10)` | pending | 3 users |
| `zluri_main` | `db.applications.find({ status: "active" })` | pending | 4 active applications |

---

## Developer 3: dev.bob@zluri.com

**POD:** Data Engineering | **Total Requests:** 7

### PostgreSQL Queries

| Schema | Query | Status | Expected Result |
|--------|-------|--------|-----------------|
| `zluri_logs` | `SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100;` | pending | Recent activity (3 logs) |
| `zluri_logs` | `SELECT * FROM error_logs WHERE severity = 'error';` | pending | Error-level logs only |
| `zluri_logs` | `SELECT action, COUNT(*) as count FROM activity_logs GROUP BY action;` | approved | Activity summary by action |
| `zluri_users` | `SELECT timezone, COUNT(*) FROM user_profiles GROUP BY timezone;` | pending | Users grouped by timezone |

### MongoDB Queries

| Database | Query | Status | Expected Result |
|----------|-------|--------|-----------------|
| `zluri_integrations` | `db.connectors.find({ status: "connected" })` | pending | Connected integrations (2) |
| `zluri_integrations` | `db.sync_logs.find({ status: "failed" })` | pending | Failed sync logs (1) |
| `zluri_cache` | `db.feature_flags.find({})` | pending | All feature flags (3) |

---

## Developer 4: dev.charlie@zluri.com

**POD:** Database | **Total Requests:** 5

### Script Submissions 📜

| Script Name | Content | Status | Expected Result |
|-------------|---------|--------|-----------------|
| `fetch_employees.js` | `async function main(db) { return await db.query("SELECT * FROM employees LIMIT 5"); }` | pending | Valid script - returns 5 employees |
| `count_orders.js` | `async function main(db) { return await db.query("SELECT COUNT(*) FROM orders"); }` | pending | Valid script - returns order count |

### Invalid Scripts ❌ (Will Fail Validation)

| Script Name | Content | Status | Expected Error |
|-------------|---------|--------|----------------|
| `bad_require.js` | `const fs = require("fs");` | pending | Blocked: `require` is not allowed |
| `bad_eval.js` | `eval("console.log(1)")` | pending | Blocked: `eval` is not allowed |

### MongoDB Queries

| Database | Query | Status | Expected Result |
|----------|-------|--------|-----------------|
| `zluri_main` | `db.applications.find({ category: "Communication" })` | pending | Communication apps (1) |

---

## Developer 5: dev.diana@zluri.com

**POD:** Pod 1 | **Total Requests:** 5

### Staging Environment Queries

| Schema | Query | Status | Expected Result |
|--------|-------|--------|-----------------|
| `staging_app` | `SELECT * FROM users;` | pending | Staging users |
| `staging_test` | `SELECT * FROM test_cases WHERE status = 'failed';` | pending | Failed test cases (1) |
| `staging_test` | `SELECT * FROM test_data;` | approved | All test data (3 records) |

### Rejected Query

| Schema | Query | Status | Rejection Reason |
|--------|-------|--------|------------------|
| `staging_test` | `UPDATE test_cases SET status = 'pending' WHERE id = 5;` | rejected | UPDATE on staging requires extra approval |

### MongoDB

| Database | Query | Status | Expected Result |
|----------|-------|--------|-----------------|
| `zluri_main` | `db.users.find({ isActive: true })` | pending | Active users (3) |

---

## Developer 6: dev.evan@zluri.com

**POD:** Data Engineering | **Total Requests:** 5

### MongoDB Cache & Session Queries

| Database | Query | Status | Expected Result |
|----------|-------|--------|-----------------|
| `zluri_sessions` | `db.sessions.find({})` | pending | All sessions (2) |
| `zluri_sessions` | `db.active_tokens.countDocuments({})` | pending | Token count (2) |
| `zluri_cache` | `db.api_cache.find({})` | pending | Cache entries (3) |
| `zluri_cache` | `db.feature_flags.find({ enabled: true })` | approved | Enabled flags (2) |
| `zluri_integrations` | `db.connectors.aggregate([{$match: {status: "connected"}}, {$count: "total"}])` | pending | Count of connected integrations |

---

## Developer 7: dev.fiona@zluri.com

**POD:** Analytics | **Total Requests:** 4

### Analytics & Reporting Queries

| Schema | Query | Status | Expected Result |
|--------|-------|--------|-----------------|
| `zluri_reports` | `SELECT * FROM kpi_snapshots ORDER BY snapshot_date DESC;` | pending | KPI snapshots (4 records) |
| `zluri_reports` | `SELECT AVG(revenue) as avg_revenue FROM daily_reports;` | pending | Average revenue calculation |
| `zluri_app` | `SELECT department, COUNT(*) as emp_count, AVG(salary) as avg_salary FROM employees GROUP BY department;` | pending | Department statistics |

### Data Modification (Staging)

| Schema | Query | Status | Expected Result |
|--------|-------|--------|-----------------|
| `staging_test` | `INSERT INTO test_data (data_key, data_value, environment, created_by) VALUES ('key', '{}', 'staging', 'fiona');` | pending | Insert 1 row |

---

## Developer 8: dev.george@zluri.com

**POD:** Pod 1 | **Total Requests:** 8

### Successfully Executed ✅

| Schema | Query | Status | Execution Result |
|--------|-------|--------|------------------|
| `zluri_app` | `SELECT * FROM employees WHERE department = 'Engineering';` | executed | `[{"id":1,"name":"John Smith"}]` |
| `zluri_app` | `SELECT product_name, price FROM products ORDER BY price DESC LIMIT 5;` | executed | `[{"product_name":"Enterprise"}]` |

### Failed Execution ❌

| Schema | Query | Status | Error Message |
|--------|-------|--------|---------------|
| `zluri_app` | `SELECT * FROM bad_table;` | failed | `relation "bad_table" does not exist` |

### Rejected (Dangerous Operations) 🚫

| Schema | Query | Status | Rejection Reason |
|--------|-------|--------|------------------|
| `zluri_app` | `DROP TABLE employees;` | rejected | "DROP not allowed" |
| `zluri_app` | `TRUNCATE TABLE orders;` | rejected | "Destructive operation" |

### Pending Queries

| Schema | Query | Status | Expected Result |
|--------|-------|--------|-----------------|
| `zluri_app` | `SELECT * FROM orders WHERE order_date > '2026-01-01';` | pending | January 2026 orders |
| `staging_test` | `UPDATE test_cases SET last_run_at = NOW() WHERE test_name = 'test_user_login';` | pending | Update 1 row |

### MongoDB

| Database | Query | Status | Expected Result |
|----------|-------|--------|-----------------|
| `zluri_main` | `db.licenses.aggregate([{$group: {_id: "$appId", total: {$sum: 1}}}])` | pending | License count grouped by app |

---

## Quick Reference: Schema → Tables

### PostgreSQL

| Schema | Tables | Sample Data |
|--------|--------|-------------|
| `zluri_app` | `employees`, `orders`, `products` | 8 employees, 5 orders, 5 products |
| `zluri_users` | `user_profiles`, `user_sessions` | 3 profiles, 2 sessions |
| `zluri_logs` | `activity_logs`, `error_logs` | 3 activities, 2 errors |
| `zluri_analytics` | `daily_metrics`, `events` | Metrics & events data |
| `zluri_reports` | `daily_reports`, `kpi_snapshots` | 5 reports, 4 KPIs |
| `staging_app` | `users` | Test users |
| `staging_test` | `test_cases`, `test_data` | 5 test cases, 3 test data |

### MongoDB

| Database | Collections | Sample Data |
|----------|-------------|-------------|
| `zluri_main` | `users`, `applications`, `licenses` | 3 users, 4 apps, 3 licenses |
| `zluri_integrations` | `connectors`, `sync_logs` | 3 connectors, 3 sync logs |
| `zluri_sessions` | `sessions`, `active_tokens` | 2 sessions, 2 tokens |
| `zluri_cache` | `api_cache`, `feature_flags` | 3 cache entries, 3 flags |

---

## Testing Scenarios

### 1. Happy Path - Valid Query Approval
1. Login as `manager1@zluri.com`
2. View pending requests
3. Approve a valid SELECT query
4. Verify execution result contains data

### 2. Error Handling - Invalid Query
1. Approve query: `SELECT * FROM nonexistent_table;`
2. Verify status becomes `failed`
3. Check `execution_error` contains error message

### 3. Script Validation
1. Approve script with `require("fs")`
2. Verify validation fails before execution
3. Check error indicates blocked pattern

### 4. Rejection Flow
1. Login as manager
2. Reject a pending request with reason
3. Verify status is `rejected` with reason stored

### 5. MongoDB Query Execution
1. Approve MongoDB query: `db.users.find({})`
2. Verify execution returns JSON array
3. Check row count matches expected

---

*Generated: 2026-01-08*
