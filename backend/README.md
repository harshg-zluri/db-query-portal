# Database Query Execution Portal

**A Zero-Trust Middleware for Safe Database Operations**

The **Database Query Execution Portal** is a secure backend system designed to allow developers to submit database queries or scripts for execution against production databases (PostgreSQL and MongoDB) without ever exposing direct credentials. All operations are proxied, audited, and strictly governed by a Manager Approval workflow.

---

## 📚 Documentation

Detailed documentation is available in the `docs/` directory:

-   **[Technical Requirements Document (TRD)](TRD.md)**: Comprehensive guide covering project overview, architecture, DB schema, security, and detailed workflows.
-   **[Setup & Deployment Guide](docs/SETUP.md)**: Detailed instructions on installation, environment configuration, database setup, and deployment.
-   **[System Architecture](docs/ARCHITECTURE.md)**: High-level design, component diagrams, data flow, and security architecture.
-   **[API Reference](docs/API.md)**: Endpoints, request/response formats, and role requirements.

---

## 🚀 Key Features

-   **Zero Trust Security**: Developers query databases without holding credentials.
-   **RBAC & PODs**: Granular control. Managers only approve requests for their specific POD (Team).
-   **Multi-Database Support**: Execute against PostgreSQL and MongoDB.
-   **Script Sandboxing**: Safe execution of JavaScript scripts for complex logic.
-   **Audit Logging**: Every action (submission, approval, execution) is immutably logged.
-   **Slack Integration**: (Planned) Notifications for seamless approval workflows.

## ⚡️ Quick Start

### Prerequisites
-   Node.js v18+
-   PostgreSQL v14+

### Run Locally

1.  **Install**: `npm install`
2.  **Config**: `cp .env.example .env` (Edit `.env` with your DB credentials)
3.  **Migrate**: `psql -d db_query_portal -f migrations/001_initial_schema.sql`
4.  **Seed**: `npx tsx scripts/seed.ts`
5.  **Run**: `npm run dev`

See [SETUP.md](docs/SETUP.md) for full details.

## 🧪 Testing

```bash
# Run Unit & Integration Tests
npm test

# Run Security Specific Tests
npm test:security
```

## Project Structure

-   `src/controllers`: API Route Handlers.
-   `src/services`: Business Logic (Auth, Execution, etc).
-   `src/models`: Database Data Access Object (DAO) layer.
-   `src/middleware`: Auth, Validation, RBAC.
-   `src/validators`: Zod Schemas.
-   `src/config`: Environment and DB Configuration.
