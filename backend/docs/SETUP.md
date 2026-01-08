# Setup and Deployment Guide

## Prerequisites
- **Node.js**: v18 or higher
- **PostgreSQL**: v14+ (For Metadata DB)
- **Target Databases**: Any accessible Postgres or MongoDB instances you want to query.

## Installation

1.  **Clone the repository**
    ```bash
    git clone <repo-url>
    cd db-query-portal/backend
    ```

2.  **Install Dependencies**
    ```bash
    npm install
    ```

3.  **Environment Configuration**
    Copy the example env file:
    ```bash
    cp .env.example .env
    ```
    
    Update `.env` with your values:
    
    **System Config:**
    - `PORT`: API Port (default 3000)
    - `NODE_ENV`: `development` or `production`
    - `JWT_SECRET`: Random long string for signing tokens.
    
    **Metadata Database (Internal):**
    - `DATABASE_URL`: Connection string for the internal app DB (e.g., `postgresql://user:pass@localhost:5432/db_query_portal`)
    
    **Target Databases (Production DBs to query):**
    - `TARGET_POSTGRES_URL`: Connection string for target Postgres.
    - `TARGET_MONGODB_URL`: Connection string for target Mongo.

4.  **Database Setup (Metadata DB)**
    Ensure the database exists:
    ```bash
    createdb db_query_portal
    ```
    
    Run migrations to create schemas:
    ```bash
    psql -d db_query_portal -f migrations/001_initial_schema.sql
    ```

5.  **Seeding Data (Optional)**
    To seed initial Roles, Users, and PODs for testing:
    ```bash
    npx tsx scripts/seed.ts
    ```
    *Note: This creates users `admin@zluri.com`, `manager1@zluri.com`, `developer@zluri.com` with password `password123`.*

## Running the Application

### Development
Runs with hot-reload using `tsx`.
```bash
npm run dev
```

### Production
1.  **Build** the TypeScript code:
    ```bash
    npm run build
    ```
    This creates a `dist/` directory.

2.  **Start** the node process:
    ```bash
    npm start
    ```

### Running Tests
```bash
npm test              # Run all unit/integration tests
npm test:security     # Run strict security checks
```

## Deployment Considerations

-   **Process Manager**: Use `pm2` or Docker to keep the process alive.
-   **Security**: Ensure `JWT_SECRET` is strong and rotated.
-   **Locking**: The system uses `pg-boss` (if implemented) or DB locks for concurrency. Ensure only one instance of the "worker" runs if you scale horizontally, OR ensure the worker is idempotent. (Currently, simple execution is synchronous/async within request, so horizontal scaling is safe for API).
-   **Network**: The backend needs network access to BOTH the Metadata DB and ALL Target DBs.

## Troubleshooting

-   **Metadata DB Connection Fail**: Check `DATABASE_URL`. Ensure Postgres is running.
-   **Target DB Timeout**: Check firewall rules between Portal and Production DBs.
-   **Script Errors**: If scripts fail immediately, check if `node` is available in the path for the child process.
