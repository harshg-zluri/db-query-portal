# Database Query Portal - Feature Documentation

## Overview

The **DB Query Portal** is a secure, role-based web application that allows developers to submit database queries and scripts for execution against production databases. All queries require manager approval before execution, ensuring audit trails and preventing unauthorized database access.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Core Features](#core-features)
4. [User Flows](#user-flows)
5. [API Reference](#api-reference)
6. [Data Models](#data-models)
7. [Security Measures](#security-measures)
8. [Edge Cases & Error Handling](#edge-cases--error-handling)
9. [Configuration](#configuration)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           FRONTEND                                   │
│  React + TypeScript + React Query + Zustand + React Router          │
│  ┌─────────────┬──────────────┬──────────────┬──────────────┐       │
│  │  Dashboard  │ Submissions  │  Approvals   │    Admin     │       │
│  │  (Submit)   │   (My Reqs)  │  (Mgr Only)  │ (Admin Only) │       │
│  └─────────────┴──────────────┴──────────────┴──────────────┘       │
└───────────────────────────────┬─────────────────────────────────────┘
                                │ REST API (JWT Auth)
                                ▼
┌─────────────────────────────────────────────────────────────────────┐
│                           BACKEND                                    │
│  Express + TypeScript + PostgreSQL (Portal DB)                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │                     MIDDLEWARE LAYER                          │   │
│  │  Rate Limiting → Auth → RBAC → Validation → Error Handler    │   │
│  └──────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────┬─────────────┬──────────────────────────────┐   │
│  │  Auth Service   │ Queue Svc   │     Execution Service        │   │
│  │  (JWT, OAuth)   │ (pg-boss)   │  (PostgreSQL, MongoDB, JS)   │   │
│  └─────────────────┴──────┬──────┴──────────────────────────────┘   │
│                           │                                          │
│  ┌────────────────────────▼─────────────────────────────────────┐   │
│  │              WORKER SERVICE (Background Jobs)                 │   │
│  │  Processes approved queries with database-level locking       │   │
│  └───────────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────────┘
                                │
           ┌────────────────────┼────────────────────┐
           ▼                    ▼                    ▼
    ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
    │ PostgreSQL  │     │  MongoDB    │     │   Slack     │
    │ (Target DB) │     │ (Target DB) │     │ (Notifs)    │
    └─────────────┘     └─────────────┘     └─────────────┘
```

### Backend Components

| Component | File | Responsibility |
|-----------|------|----------------|
| **Auth Service** | `services/auth.service.ts` | JWT generation, password hashing, Google OAuth |
| **Execution Service** | `services/execution.service.ts` | Orchestrates query/script execution |
| **Queue Service** | `services/queue.service.ts` | Job queuing with pg-boss |
| **Worker Service** | `services/worker.service.ts` | Background job processing |
| **Slack Service** | `services/slack.service.ts` | Notifications for requests, approvals, rejections |
| **PostgreSQL Executor** | `services/postgres.executor.ts` | Executes SQL queries |
| **MongoDB Executor** | `services/mongo.executor.ts` | Executes MongoDB commands |
| **Script Executor** | `services/script.executor.ts` | Sandboxed JavaScript execution |

### Frontend Components

| Component | Path | Responsibility |
|-----------|------|----------------|
| **Dashboard** | `/dashboard` | Submit new queries/scripts |
| **Submissions** | `/submissions` | View user's own requests |
| **Approvals** | `/approvals` | Manager view for pending requests |
| **Admin** | `/admin` | Admin management panel |

---

## User Roles & Permissions

### Role Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                          ADMIN                                   │
│  • All manager permissions                                       │
│  • Manage users, PODs, database instances                        │
│  • System configuration                                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                         MANAGER                                  │
│  • All developer permissions                                     │
│  • Approve/reject requests for managed PODs                      │
│  • View pending requests for their PODs                          │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                        DEVELOPER                                 │
│  • Submit queries and scripts                                    │
│  • View own submissions                                          │
│  • Withdraw pending requests                                     │
│  • Clone & resubmit rejected/failed requests                     │
└─────────────────────────────────────────────────────────────────┘
```

### Permission Matrix

| Action | Developer | Manager | Admin |
|--------|:---------:|:-------:|:-----:|
| Submit query/script | ✅ | ✅ | ✅ |
| View own submissions | ✅ | ✅ | ✅ |
| Withdraw own requests | ✅ | ✅ | ✅ |
| View pending approvals | ❌ | ✅ (Own PODs) | ✅ (All) |
| Approve/Reject requests | ❌ | ✅ (Own PODs) | ✅ (All) |
| Manage users | ❌ | ❌ | ✅ |
| Manage PODs | ❌ | ❌ | ✅ |
| Manage database instances | ❌ | ❌ | ✅ |

---

## Core Features

### 1. Query Submission

Developers can submit SQL (PostgreSQL) or MongoDB queries for execution.

**Supported Operations:**
- **PostgreSQL**: SELECT, INSERT, UPDATE, DELETE, and most DDL operations
- **MongoDB**: find, findOne, aggregate, insertOne, insertMany, updateOne, updateMany, deleteOne, deleteMany, countDocuments

### 2. Script Submission

Developers can upload JavaScript files that interact with databases.

**Script Environment:**
- Node.js sandboxed execution
- Environment variables injected: `POSTGRES_URL`, `MONGODB_URL`, `DB_NAME`, `DB_TYPE`
- Timeout: 30 seconds (configurable)
- Memory limit: 128MB (configurable)

**Blocked APIs:**
- `child_process`, `eval()`, `Function()`, `process.exit()`, direct `fs` module

### 3. Approval Workflow

Managers approve or reject requests for their PODs.

**On Approval:**
1. Request status → `approved`
2. Job enqueued to execution queue
3. Worker executes query/script
4. Status updated to `executed` or `failed`
5. Slack notification sent with results

**On Rejection:**
1. Request status → `rejected`
2. Reason stored
3. Slack notification sent to requester

### 4. Notifications

Slack notifications are sent for:
- New request submitted (to approval channel)
- Request approved + execution result (DM to requester + channel)
- Request rejected (DM to requester with reason)
- Execution failure (DM to requester with error)

---

## User Flows

### Flow 1: Happy Path - Query Submission & Approval

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│  Developer  │    │   Backend   │    │   Manager   │    │   Worker    │
└──────┬──────┘    └──────┬──────┘    └──────┬──────┘    └──────┬──────┘
       │                  │                  │                  │
       │ 1. Submit Query  │                  │                  │
       │─────────────────>│                  │                  │
       │                  │                  │                  │
       │  2. Validate &   │                  │                  │
       │     Save Request │                  │                  │
       │<─────────────────│                  │                  │
       │  (status:pending)│                  │                  │
       │                  │                  │                  │
       │                  │ 3. Slack Notif   │                  │
       │                  │─────────────────>│                  │
       │                  │                  │                  │
       │                  │ 4. Approve       │                  │
       │                  │<─────────────────│                  │
       │                  │                  │                  │
       │                  │ 5. Enqueue Job   │                  │
       │                  │─────────────────────────────────────>│
       │                  │                  │                  │
       │                  │                  │  6. Execute Query│
       │                  │                  │                  │
       │                  │                  │  7. Update Status│
       │                  │<─────────────────────────────────────│
       │                  │                  │                  │
       │ 8. Slack Result  │                  │                  │
       │<─────────────────│                  │                  │
       │                  │                  │                  │
```

### Flow 2: Rejection Flow

```
Developer                    Backend                     Manager
    │                          │                          │
    │ 1. Submit Query          │                          │
    │─────────────────────────>│                          │
    │                          │                          │
    │ 2. Request Created       │                          │
    │<─────────────────────────│                          │
    │                          │                          │
    │                          │ 3. Manager Reviews       │
    │                          │<─────────────────────────│
    │                          │                          │
    │                          │ 4. Reject with Reason    │
    │                          │<─────────────────────────│
    │                          │                          │
    │ 5. Slack DM (Rejection)  │                          │
    │<─────────────────────────│                          │
    │                          │                          │
    │ 6. Clone & Resubmit      │                          │
    │─────────────────────────>│                          │
    │                          │                          │
```

### Flow 3: Script Execution

```
┌────────────────────────────────────────────────────────────────┐
│                    SCRIPT EXECUTION FLOW                        │
├────────────────────────────────────────────────────────────────┤
│  1. Script uploaded & content stored in database                │
│  2. Manager approves                                            │
│  3. Worker picks up job                                         │
│  4. Script validation (check for dangerous patterns)            │
│  5. Create temp directory with script file                      │
│  6. Spawn Node.js child process with:                           │
│     - Sandboxed environment variables                           │
│     - Memory limits (--max-old-space-size)                      │
│     - Timeout enforcement                                       │
│  7. Capture stdout/stderr                                       │
│  8. Cleanup temp files                                          │
│  9. Return execution result                                     │
└────────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Email/password login |
| POST | `/api/auth/logout` | Logout (client-side token discard) |
| POST | `/api/auth/refresh` | Refresh access token |
| GET | `/api/auth/me` | Get current user profile |
| GET | `/api/auth/google` | Initiate Google OAuth |
| GET | `/api/auth/google/callback` | Google OAuth callback |

### Requests

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/api/requests` | Submit new request | All |
| GET | `/api/requests/my` | Get user's submissions | All |
| GET | `/api/requests/:id` | Get request details | All |
| DELETE | `/api/requests/:id` | Withdraw pending request | Owner |

### Approvals

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/requests/pending` | Get pending requests | Manager+ |
| POST | `/api/requests/:id/approve` | Approve request | Manager+ |
| POST | `/api/requests/:id/reject` | Reject request | Manager+ |

### Databases

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/databases` | List database instances | All |
| GET | `/api/databases/:id` | Get instance details | All |

### PODs

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/pods` | List all PODs | All |
| GET | `/api/pods/:id` | Get POD details | All |

### Admin

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| GET | `/api/admin/users` | List users | Admin |
| POST | `/api/admin/users` | Create user | Admin |
| PATCH | `/api/admin/users/:id` | Update user | Admin |
| GET | `/api/admin/stats` | Get system statistics | Admin |

---

## Data Models

### User

```typescript
interface User {
    id: string;
    email: string;
    password: string;  // bcrypt hashed
    name: string;
    role: 'developer' | 'manager' | 'admin';
    managedPodIds: string[];
    googleId?: string;
    createdAt: Date;
    updatedAt: Date;
}
```

### QueryRequest

```typescript
interface QueryRequest {
    id: string;
    userId: string;
    userEmail: string;
    databaseType: 'postgresql' | 'mongodb';
    instanceId: string;
    instanceName: string;
    databaseName: string;
    submissionType: 'query' | 'script';
    query?: string;
    scriptFileName?: string;
    scriptContent?: string;
    comments: string;
    podId: string;
    podName: string;
    status: 'pending' | 'approved' | 'rejected' | 'executed' | 'failed' | 'withdrawn';
    approverEmail?: string;
    rejectionReason?: string;
    executionResult?: string;
    executionError?: string;
    warnings?: string[];
    createdAt: Date;
    updatedAt: Date;
    executedAt?: Date;
}
```

### Request Status Lifecycle

```
┌─────────┐
│ PENDING │─────┬─────────────────────────────────────┐
└────┬────┘     │                                     │
     │          │ Withdrawn                           │ Rejected
     │          ▼                                     ▼
     │    ┌───────────┐                        ┌───────────┐
     │    │ WITHDRAWN │                        │ REJECTED  │
     │    └───────────┘                        └───────────┘
     │
     │ Approved
     ▼
┌──────────┐
│ APPROVED │
└────┬─────┘
     │
     │ Execution
     ▼
┌─────────────────┐
│  EXECUTED or    │
│    FAILED       │
└─────────────────┘
```

---

## Security Measures

### Authentication

- **JWT Tokens**: Access tokens (1h) + Refresh tokens (7d)
- **Password Hashing**: bcrypt with 12 salt rounds
- **Google OAuth**: Supported for SSO

### Authorization

- **RBAC Middleware**: Role-based access control on all routes
- **POD-based Access**: Managers can only approve requests for their PODs

### Input Validation

- **Zod Schemas**: All input validated with Zod
- **SQL Injection Prevention**: Parameterized queries
- **NoSQL Injection Prevention**: Input sanitization for MongoDB

### Rate Limiting

- **General**: 1000 requests/15 minutes
- **Auth**: 100 requests/15 minutes (stricter for login)

### Script Execution Sandbox

- **Blocked APIs**: child_process, eval, Function constructor, process.exit, direct fs
- **Resource Limits**: Memory (128MB), Timeout (30s)
- **Isolated Environment**: Only database connection env vars passed

### Audit Logging

- All authentication events logged
- All request submissions logged
- All approvals/rejections logged with actor

---

## Edge Cases & Error Handling

### Edge Case 1: Manager Not Found for POD

**Scenario**: A request is submitted for a POD with no assigned manager.

**Handling**: The request remains in `pending` status. Admin can assign a manager to the POD.

### Edge Case 2: Database Connection Failure

**Scenario**: Query execution fails due to database connection issue.

**Handling**:
- Request status → `failed`
- Error message stored in `executionError`
- Slack notification sent with error details
- User can clone & resubmit after issue resolved

### Edge Case 3: Script Timeout

**Scenario**: JavaScript script exceeds 30-second timeout.

**Handling**:
- Child process killed with SIGTERM
- Request status → `failed`
- Error: "Script execution timed out after 30000ms"

### Edge Case 4: Duplicate Execution Prevention

**Scenario**: Same query approved twice before first execution completes.

**Handling**: Queue service uses `singletonKey` (database-level) to ensure ordered execution. Second job waits for first to complete.

### Edge Case 5: Token Refresh Race Condition

**Scenario**: Multiple tabs refresh token simultaneously.

**Handling**: Each refresh generates new tokens. Last refresh wins. Other tabs will fail and redirect to login.

### Edge Case 6: User Logged Out on Another Device

**Scenario**: User logs out on one device while still active on another.

**Handling**: Client-side logout clears tokens. Other device remains active until token expires or is refreshed.

---

## Configuration

### Environment Variables

```bash
# Server
PORT=3000
NODE_ENV=development

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Portal Database
DATABASE_URL=postgresql://user:pass@host:5432/db_query_portal

# Target Databases (for execution)
TARGET_POSTGRES_URL=postgresql://user:pass@host:5432/target_db
TARGET_MONGODB_URL=mongodb://user:pass@host:27017

# Script Execution
SCRIPT_TIMEOUT_MS=30000
SCRIPT_MAX_MEMORY_MB=128

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=1000
AUTH_RATE_LIMIT_MAX=100

# Google OAuth
GOOGLE_CLIENT_ID=your-client-id
GOOGLE_CLIENT_SECRET=your-client-secret
GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback
FRONTEND_URL=http://localhost:5173

# Slack
SLACK_BOT_TOKEN=xoxb-your-token
SLACK_APPROVAL_CHANNEL=C12345678

# Queue
QUEUE_NAME=query_execution
WORKER_CONCURRENCY=4
MAX_JOB_RETRIES=3
```

---

## Frontend State Management

### Auth Store (Zustand)

```typescript
interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    login: (data: LoginResponse) => void;
    logout: () => void;
}
```

### React Query Keys

| Key | Description |
|-----|-------------|
| `['submissions']` | User's submitted requests |
| `['pending-requests']` | Pending requests for approval |
| `['databases']` | Available database instances |
| `['pods']` | Available PODs |

---

## Testing

### Backend Test Coverage

- **Unit Tests**: All services, controllers, middleware
- **Integration Tests**: API endpoints with database
- **Security Tests**: Auth, RBAC, input validation

### Running Tests

```bash
# Backend
cd backend
npm test                    # Run all tests
npm run test:coverage       # Run with coverage report

# Frontend
cd frontend
npm test                    # Run Vitest tests
```

---

## Deployment Considerations

1. **Database Migrations**: Run Prisma/TypeORM migrations before deployment
2. **Environment Variables**: Ensure all required env vars are set
3. **Slack Setup**: Create Slack app and configure bot token
4. **Google OAuth**: Configure OAuth consent screen and credentials
5. **Target Databases**: Ensure network connectivity to target DBs
6. **Worker Scaling**: Adjust `WORKER_CONCURRENCY` based on load

---

*Last Updated: January 2026*
