// User roles for RBAC
export const UserRole = {
    DEVELOPER: 'developer',
    MANAGER: 'manager',
    ADMIN: 'admin',
} as const;

export type UserRole = (typeof UserRole)[keyof typeof UserRole];

// Database types supported
export const DatabaseType = {
    POSTGRESQL: 'postgresql',
    MONGODB: 'mongodb',
} as const;

export type DatabaseType = (typeof DatabaseType)[keyof typeof DatabaseType];

// Request status lifecycle
export const RequestStatus = {
    PENDING: 'pending',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    EXECUTED: 'executed',
    FAILED: 'failed',
    WITHDRAWN: 'withdrawn',
} as const;

export type RequestStatus = (typeof RequestStatus)[keyof typeof RequestStatus];

// Submission type
export const SubmissionType = {
    QUERY: 'query',
    SCRIPT: 'script',
} as const;

export type SubmissionType = (typeof SubmissionType)[keyof typeof SubmissionType];

// User interface (without password for frontend)
export interface User {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    managedPodIds: string[];
    createdAt: string;
    updatedAt: string;
}

export type SafeUser = User;

// POD interface
export interface Pod {
    id: string;
    name: string;
    managerEmail: string;
    createdAt: string;
}

// Database instance
export interface DatabaseInstance {
    id: string;
    name: string;
    type: DatabaseType;
    host: string;
    port: number;
    databases: string[];
    createdAt: string;
}

// Query request
export interface QueryRequest {
    id: string;
    userId: string;
    userEmail: string;
    databaseType: DatabaseType;
    instanceId: string;
    instanceName: string;
    databaseName: string;
    submissionType: SubmissionType;
    query?: string;
    scriptFileName?: string;
    scriptContent?: string;
    comments: string;
    podId: string;
    podName: string;
    status: RequestStatus;
    approverEmail?: string;
    rejectionReason?: string;
    executionResult?: string;
    executionError?: string;
    isCompressed?: boolean;
    createdAt: string;
    updatedAt: string;
    executedAt?: string;
    warnings?: string[];
}

// API Response types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Paginated response
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Auth types
export interface LoginRequest {
    email: string;
    password: string;
}

export interface LoginResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: User;
}

export interface RefreshTokenResponse {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
}

export interface RefreshTokenRequest {
    refreshToken: string;
}

// Request creation
export interface CreateRequestData {
    databaseType: DatabaseType;
    instanceId: string;
    databaseName: string;
    submissionType: SubmissionType;
    query?: string;
    script?: File;
    comments: string;
    podId: string;
}
