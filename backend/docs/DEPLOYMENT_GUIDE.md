# Railway Deployment Guide

Deploy the DB Query Portal entirely on Railway - no separate worker needed!

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                     Railway                           │
│  ┌─────────────┐    ┌───────────────────────────┐    │
│  │  Frontend   │◄──►│   Backend (API + Worker)  │    │
│  │   (React)   │    │   + isolated-vm sandbox   │    │
│  └─────────────┘    └───────────┬───────────────┘    │
│                                 │                     │
│                     ┌───────────▼───────────┐        │
│                     │      PostgreSQL       │        │
│                     │   (pg-boss + data)    │        │
│                     └───────────────────────┘        │
└──────────────────────────────────────────────────────┘
```

## Key Advantage: No Docker Required

Scripts run in **V8 isolates** using `isolated-vm`:
- ✓ Memory limits enforced
- ✓ Timeout enforcement
- ✓ No filesystem access
- ✓ No network access from scripts
- ✓ Works on Railway (no Docker-in-Docker needed)

---

## Deployment Steps

### 1. Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init
```

### 2. Add PostgreSQL Database

```bash
railway add --plugin postgresql
```

### 3. Configure Environment Variables

In Railway dashboard, set:

```
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=<generate-secure-secret>
NODE_ENV=production
TARGET_POSTGRES_URL=<target-db-connection>
TARGET_MONGODB_URL=<target-mongo-connection>
SLACK_BOT_TOKEN=<optional>
```

### 4. Deploy Backend

```bash
cd backend
railway up
```

### 5. Deploy Frontend

```bash
cd frontend
railway up --service frontend
```

---

## Run Modes

| Command | Description |
|---------|-------------|
| `npm start` | API + Worker (single instance) |
| `npm run start:api` | API only |
| `npm run start:worker` | Worker only |

For most deployments, use `npm start` (default).

---

## Security Features

The `isolated-vm` sandbox provides:

1. **Memory Isolation** - Each script runs in separate V8 isolate
2. **Time Limits** - Configurable timeout (default 30s)
3. **No Node.js APIs** - `require()`, `fs`, `child_process` unavailable
4. **No Network** - Scripts cannot make HTTP requests

---

## Monitoring

Check logs in Railway dashboard or:

```bash
railway logs
```

Monitor pg-boss queue:

```sql
SELECT state, COUNT(*) 
FROM pgboss.job 
GROUP BY state;
```
