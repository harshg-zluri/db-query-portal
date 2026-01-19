# Database Query Portal - Feature Documentation

## Overview

The **DB Query Portal** is a secure, role-based web application that allows developers to submit database queries and scripts for execution against production databases. All queries require manager approval before execution, ensuring audit trails and preventing unauthorized database access.

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [User Roles & Permissions](#user-roles--permissions)
3. [Core Features](#core-features)
4. [User Flows](#user-flows)
5. [API Specification](#api-specification)
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
                           │                                          │
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

---

## User Roles & Permissions

### Role Hierarchy

- **Admin**: All permissions. Manage users, PODs, database instances.
- **Manager**: Approve/reject requests for their PODs. View pending requests.
- **Developer**: Submit queries/scripts. View own submissions. Withdraw pending requests.

---

## Core Features

1. **Query Submission**: Execute SQL/MongoDB queries managed by approvals.
2. **Script Submission**: Execute sandboxed Node.js scripts.
3. **Approval Workflow**: Managers review and approve/reject.
4. **Notifications**: Slack integration for real-time updates.

---

## API Specification

**Base URL**: `http://localhost:3000`
**Version**: `1.0.0`
**Auth**: Bearer JWT Token

### Authentication

#### POST /api/auth/login
Login user and receive tokens.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `email` | string (email) | Yes | User email |
| `password` | string (min 8) | Yes | User password |

**Response (200)**: Login successful

#### POST /api/auth/refresh
Refresh access token.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `refreshToken` | string | Yes | Valid refresh token |

**Response (200)**: Token refreshed

#### POST /api/auth/logout
Logout user.

**Response (200)**: Logged out

#### GET /api/auth/me
Get current user profile.

**Response (200)**: User profile

---

### Requests

#### GET /api/requests
List all requests (Manager/Admin).

| Parameter | In | Type | Description |
|-----------|----|------|-------------|
| `page` | query | integer | Page number (default: 1) |
| `limit` | query | integer | Items per page (default: 20) |
| `status` | query | string | Filter by status |
| `podId` | query | string | Filter by POD ID |
| `search` | query | string | Search term |

#### POST /api/requests
Submit a new request.
**Content-Type**: `multipart/form-data`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `databaseType` | string | Yes | `postgresql` or `mongodb` |
| `instanceId` | uuid | Yes | Target DB Instance ID |
| `databaseName` | string | Yes | Target Database Name |
| `submissionType` | string | Yes | `query` or `script` |
| `query` | string | No | SQL/Mongo Query (if type=query) |
| `script` | file | No | JS Script file (if type=script) |
| `comments` | string | Yes | Purpose of request |
| `podId` | uuid | Yes | POD ID to approve this |

#### GET /api/requests/my
Get current user's submissions.

| Parameter | In | Type | Description |
|-----------|----|------|-------------|
| `page` | query | integer | Page number |
| `limit` | query | integer | Items per page |
| `status` | query | string | Filter by status |

#### GET /api/requests/{id}
Get request details.

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | uuid | Yes | Request ID |

#### POST /api/requests/{id}/withdraw
Withdraw a pending request.

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | uuid | Yes | Request ID |

#### GET /api/requests/{id}/download-result
Download execution result.

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | uuid | Yes | Request ID |

#### GET /api/requests/pending
Get pending requests (Manager).

---

### Approvals

#### POST /api/requests/{id}/approve
Approve request (Manager).

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | uuid | Yes | Request ID |

#### POST /api/requests/{id}/reject
Reject request (Manager).

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | uuid | Yes | Request ID |
| `reason` | body | string | No | Rejection reason |

---

### Databases & PODs

#### GET /api/databases/types
Get supported database types.

#### GET /api/databases/instances
Get configured database instances.

#### GET /api/databases/{instanceId}/databases
Get databases in an instance.

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `instanceId` | path | uuid | Yes | Instance ID |

#### GET /api/pods
Get all PODs.

#### GET /api/pods/{id}
Get POD details.

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | uuid | Yes | POD ID |

---

### Admin

#### GET /api/admin/users
List all users.

| Parameter | In | Type | Description |
|-----------|----|------|-------------|
| `page` | query | integer | Page number |
| `limit` | query | integer | Items per page |
| `search` | query | string | Search term |

#### POST /api/admin/users
Create new user.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | email | Yes | User email |
| `password` | string | Yes | Min 8 chars |
| `name` | string | Yes | Full name |
| `role` | string | Yes | `developer`, `manager`, `admin` |
| `managedPodIds` | array | No | List of POD UUIDs |

#### GET /api/admin/users/{id}
Get user details.

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | uuid | Yes | User ID |

#### PUT /api/admin/users/{id}
Update user.

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | uuid | Yes | User ID |

**Body**: JSON object with optional `name`, `role`, `managedPodIds`, `password`.

#### DELETE /api/admin/users/{id}
Delete user.

| Parameter | In | Type | Required | Description |
|-----------|----|------|----------|-------------|
| `id` | path | uuid | Yes | User ID |

#### GET /api/admin/pods
Get all pods for assignment.

---

## Data Models

### User
| Property | Type | Description |
|----------|------|-------------|
| `id` | uuid | Unique identifier |
| `email` | string | User email |
| `role` | enum | `developer`, `manager`, `admin` |
| `managedPodIds` | uuid[] | List of managed PODs |

### QueryRequest
| Property | Type | Description |
|----------|------|-------------|
| `id` | uuid | Unique identifier |
| `databaseType` | enum | `postgresql` or `mongodb` |
| `status` | enum | `pending`, `approved`, `rejected`... |
| `submissionType` | enum | `query` or `script` |

---

## Security Measures

- **Authentication**: JWT (Access 1h, Refresh 7d), Google OAuth.
- **Authorization**: Strict RBAC.
- **Sandboxing**: Node.js `vm2` (or similar) for script execution with restricted access.
- **Input Validation**: Zod schemas for all inputs.

---

## Configuration

Environment variables example:

```bash
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=supersecret
```

---

## User Flows

### Happy Path - Query Submission

1. **Developer** submits query.
2. **Backend** validates & stores request (status: pending).
3. **Manager** receives notification & approves.
4. **Worker** executes query against target DB.
5. **System** notifies Developer of result.

---
