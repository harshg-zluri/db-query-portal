// User roles for RBAC
export enum UserRole {
    DEVELOPER = 'developer',
    MANAGER = 'manager',
    ADMIN = 'admin'
}

// Database types supported
export enum DatabaseType {
    POSTGRESQL = 'postgresql',
    MONGODB = 'mongodb'
}

// Request status lifecycle
export enum RequestStatus {
    PENDING = 'pending',
    APPROVED = 'approved',
    REJECTED = 'rejected',
    EXECUTED = 'executed',
    FAILED = 'failed',
    WITHDRAWN = 'withdrawn'
}

// Submission type
export enum SubmissionType {
    QUERY = 'query',
    SCRIPT = 'script'
}

// User interface
export interface User {
    id: string;
    email: string;
    password: string;
    name: string;
    role: UserRole;
    managedPodIds: string[];
    createdAt: Date;
    updatedAt: Date;
}

// User without password for API responses
export type SafeUser = Omit<User, 'password'>;

// POD interface
export interface Pod {
    id: string;
    name: string;
    managerEmail: string;
    createdAt: Date;
}

// Database instance
export interface DatabaseInstance {
    id: string;
    name: string;
    type: DatabaseType;
    host: string;
    port: number;
    databases: string[];
    createdAt: Date;
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
    createdAt: Date;
    updatedAt: Date;
    executedAt?: Date;
    warnings?: string[];
}

// JWT payload
export interface JWTPayload {
    userId: string;
    email: string;
    role: UserRole;
    managedPodIds: string[];
}

// API Response types
export interface ApiResponse<T = unknown> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// Pagination
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Execution result
export interface ExecutionResult {
    success: boolean;
    output?: string;
    rowCount?: number;
    error?: string;
    executedAt: Date;
}
