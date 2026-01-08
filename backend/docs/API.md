# API Reference

## Authentication

### POST `/api/auth/login`
Authenticate user and receive tokens.

**Body:**
- `email` (string, required)
- `password` (string, required)

**Response:**
```json
{
    "success": true,
    "data": {
        "accessToken": "...",
        "refreshToken": "...",
        "user": { ... }
    }
}
```

### POST `/api/auth/refresh`
Refresh access token.

**Body:**
- `refreshToken` (string, required)

### GET `/api/auth/me`
Get current user profile.
**Header:** `Authorization: Bearer <token>`

---

## Requests

### POST `/api/requests`
Submit a new query or script.

**Body:**
- `podId` (uuid)
- `instanceId` (uuid)
- `databaseType` ("postgresql" | "mongodb")
- `databaseName` (string)
- `submissionType` ("query" | "script")
- `query` (string, required if submissionType="query")
- `script` (file, required if submissionType="script")
- `comments` (string)

### GET `/api/requests/my`
List own requests.

**Query Params:**
- `page` (number, default 1)
- `limit` (number, default 20)
- `status` (string, optional)

### GET `/api/requests`
List all requests (Manager/Admin). Allows filtering by status, podId, date, etc.

### GET `/api/requests/:id`
Get request details.

---

## Approval Workflow

### POST `/api/requests/:id/approve`
**Role:** Manager/Admin (of the specific POD).
Approves the request and **immediately triggers execution**.

### POST `/api/requests/:id/reject`
**Role:** Manager/Admin.
Rejects the request.

**Body:**
- `reason` (string, optional)

---

## Databases & PODs

- `GET /api/databases/types`: Supported types.
- `GET /api/databases/instances`: Configured instances.
- `GET /api/pods`: List teams/pods.
