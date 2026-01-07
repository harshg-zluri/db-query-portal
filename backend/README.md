# Database Query Execution Portal

A TypeScript backend API for submitting and executing database queries against production databases with manager approval workflow, role-based access control, and comprehensive security measures.

## Features

- **Authentication**: JWT-based auth with secure password hashing (bcrypt)
- **Role-Based Access Control**: Developer, Manager, Admin roles with POD-level authorization
- **Query Execution**: Support for PostgreSQL and MongoDB
- **Script Execution**: Sandboxed Node.js script execution with resource limits
- **Security**: Protection against SQL injection, NoSQL injection, XSS, and path traversal

## Project Structure

```
db-query-portal/
├── src/
│   ├── config/          # Environment and database configuration
│   ├── controllers/     # API endpoint handlers
│   ├── middleware/      # Auth, RBAC, validation, error handling
│   ├── models/          # Data access layer
│   ├── services/        # Business logic and executors
│   ├── validators/      # Zod validation schemas
│   ├── types/           # TypeScript type definitions
│   ├── routes/          # Express route definitions
│   └── utils/           # Utilities (logger, sanitizer, errors)
├── tests/
│   ├── unit/            # Unit tests
│   ├── integration/     # Integration tests
│   └── security/        # Security tests
├── migrations/          # Database migrations
└── scripts/             # Utility scripts
```

## Quick Start

### Prerequisites

- Node.js 18+ 
- PostgreSQL 14+
- MongoDB 6+ (for MongoDB query execution)

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run database migrations
psql -d db_query_portal -f migrations/001_initial_schema.sql

# Seed development data
npx tsx scripts/seed.ts | psql -d db_query_portal

# Start development server
npm run dev
```

### Running Tests

```bash
# Run all tests with coverage
npm test

# Run specific test file
npm test -- tests/unit/services/auth.service.test.ts

# Run security tests only
npm run test:security

# View coverage report
open coverage/lcov-report/index.html
```

## API Endpoints

### Authentication
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | Public | Login with email/password |
| POST | `/api/auth/logout` | Required | Logout user |
| POST | `/api/auth/refresh` | Public | Refresh access token |
| GET | `/api/auth/me` | Required | Get current user profile |

### Databases
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/databases/types` | Required | List database types |
| GET | `/api/databases/instances` | Required | List instances |
| GET | `/api/databases/:id/databases` | Required | List databases in instance |

### Query Requests
| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/api/requests` | Developer+ | Submit new request |
| GET | `/api/requests` | Manager+ | List all requests |
| GET | `/api/requests/my` | All | Get own submissions |
| GET | `/api/requests/:id` | Owner/Manager | Get request details |
| POST | `/api/requests/:id/approve` | Manager+ | Approve request |
| POST | `/api/requests/:id/reject` | Manager+ | Reject request |

## Security Features

### Authentication
- JWT tokens with short expiry (1h default)
- Refresh tokens for seamless session extension
- bcrypt password hashing with 12 salt rounds
- Rate limiting on auth endpoints (100 req/15min)

### Authorization
- Role hierarchy: Admin > Manager > Developer
- POD-level access control for managers
- Ownership validation for resource access

### Input Validation
- Zod schemas for all request inputs
- SQL injection detection and prevention
- NoSQL injection protection (blocked operators: $where, $function, etc.)
- File upload validation (.js only, 5MB max)

### Script Execution Sandbox
- Blocked dangerous APIs: child_process, eval, Function constructor
- Memory limits (128MB default)
- Execution timeout (30s default)
- Isolated temp directory execution

## Development

### Default Test Users

| Email | Password | Role |
|-------|----------|------|
| developer@zluri.com | password123 | Developer |
| manager1@zluri.com | password123 | Manager (Pod 1) |
| admin@zluri.com | password123 | Admin |

### POD Configuration

PODs are configured in `src/config/pods.json`:

```json
{
  "pods": [
    { "id": "pod-1", "name": "Pod 1", "managerEmail": "manager1@zluri.com" },
    { "id": "de", "name": "DE", "managerEmail": "de-lead@zluri.com" },
    { "id": "db", "name": "DB", "managerEmail": "db-admin@zluri.com" }
  ]
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Server port | 3000 |
| NODE_ENV | Environment | development |
| JWT_SECRET | JWT signing secret | (required in prod) |
| JWT_EXPIRES_IN | Access token expiry | 1h |
| DATABASE_URL | PostgreSQL connection | (required) |
| RATE_LIMIT_MAX_REQUESTS | API rate limit | 1000 |
| SCRIPT_TIMEOUT_MS | Script execution timeout | 30000 |

## License

ISC
