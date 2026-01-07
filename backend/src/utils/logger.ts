// Enhanced Logger utility with audit trail support
// Provides structured logging for debugging, info, warnings, errors, and audit events

import { v4 as uuidv4 } from 'uuid';

export enum LogLevel {
    DEBUG = 'DEBUG',
    INFO = 'INFO',
    WARN = 'WARN',
    ERROR = 'ERROR',
    AUDIT = 'AUDIT'
}

export enum AuditCategory {
    AUTH = 'AUTH',
    REQUEST = 'REQUEST',
    APPROVAL = 'APPROVAL',
    EXECUTION = 'EXECUTION',
    ACCESS = 'ACCESS',
    SYSTEM = 'SYSTEM'
}

export enum AuditAction {
    // Auth actions
    LOGIN_SUCCESS = 'LOGIN_SUCCESS',
    LOGIN_FAILED = 'LOGIN_FAILED',
    LOGOUT = 'LOGOUT',
    TOKEN_REFRESH = 'TOKEN_REFRESH',
    TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',
    PROFILE_ACCESS = 'PROFILE_ACCESS',

    // Request actions
    REQUEST_CREATED = 'REQUEST_CREATED',
    REQUEST_VIEWED = 'REQUEST_VIEWED',
    REQUEST_LIST_VIEWED = 'REQUEST_LIST_VIEWED',

    // Approval actions
    REQUEST_APPROVED = 'REQUEST_APPROVED',
    REQUEST_REJECTED = 'REQUEST_REJECTED',
    PENDING_REQUESTS_VIEWED = 'PENDING_REQUESTS_VIEWED',

    // Execution actions
    QUERY_EXECUTED = 'QUERY_EXECUTED',
    SCRIPT_EXECUTED = 'SCRIPT_EXECUTED',
    EXECUTION_FAILED = 'EXECUTION_FAILED',

    // Access actions
    UNAUTHORIZED_ACCESS = 'UNAUTHORIZED_ACCESS',
    FORBIDDEN_ACCESS = 'FORBIDDEN_ACCESS',

    // System actions
    SERVER_STARTED = 'SERVER_STARTED',
    SERVER_ERROR = 'SERVER_ERROR'
}

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    requestId?: string;
    context?: Record<string, unknown>;
}

interface AuditLogEntry extends LogEntry {
    category: AuditCategory;
    action: AuditAction;
    userId?: string;
    userEmail?: string;
    ipAddress?: string;
    userAgent?: string;
    resourceId?: string;
    resourceType?: string;
    outcome?: 'SUCCESS' | 'FAILURE';
    details?: Record<string, unknown>;
}

class Logger {
    private useJsonFormat: boolean;

    constructor() {
        this.useJsonFormat = process.env.LOG_FORMAT === 'json';
    }

    private formatEntry(entry: LogEntry): string {
        if (this.useJsonFormat) {
            return JSON.stringify(entry);
        }

        const requestIdStr = entry.requestId ? ` [${entry.requestId}]` : '';
        const contextStr = entry.context
            ? ` | ${JSON.stringify(entry.context)}`
            : '';
        return `[${entry.timestamp}] [${entry.level}]${requestIdStr} ${entry.message}${contextStr}`;
    }

    private formatAuditEntry(entry: AuditLogEntry): string {
        if (this.useJsonFormat) {
            return JSON.stringify(entry);
        }

        const parts = [
            `[${entry.timestamp}]`,
            `[${entry.level}]`,
            `[${entry.category}]`,
            `[${entry.action}]`
        ];

        if (entry.requestId) {
            parts.push(`[ReqID:${entry.requestId}]`);
        }

        if (entry.userEmail) {
            parts.push(`[User:${entry.userEmail}]`);
        }

        if (entry.resourceType && entry.resourceId) {
            parts.push(`[${entry.resourceType}:${entry.resourceId}]`);
        }

        if (entry.outcome) {
            parts.push(`[${entry.outcome}]`);
        }

        parts.push(entry.message);

        if (entry.details && Object.keys(entry.details).length > 0) {
            parts.push(`| ${JSON.stringify(entry.details)}`);
        }

        return parts.join(' ');
    }

    private log(level: LogLevel, message: string, requestId?: string, context?: Record<string, unknown>): void {
        const entry: LogEntry = {
            timestamp: new Date().toISOString(),
            level,
            message,
            requestId,
            context
        };

        const formatted = this.formatEntry(entry);

        switch (level) {
            case LogLevel.ERROR:
                console.error(formatted);
                break;
            case LogLevel.WARN:
                console.warn(formatted);
                break;
            default:
                console.log(formatted);
        }
    }

    debug(message: string, context?: Record<string, unknown>, requestId?: string): void {
        if (process.env.NODE_ENV !== 'production') {
            this.log(LogLevel.DEBUG, message, requestId, context);
        }
    }

    info(message: string, context?: Record<string, unknown>, requestId?: string): void {
        this.log(LogLevel.INFO, message, requestId, context);
    }

    warn(message: string, context?: Record<string, unknown>, requestId?: string): void {
        this.log(LogLevel.WARN, message, requestId, context);
    }

    error(message: string, context?: Record<string, unknown>, requestId?: string): void {
        this.log(LogLevel.ERROR, message, requestId, context);
    }

    /**
     * Log an audit event for tracking critical operations
     */
    audit(params: {
        category: AuditCategory;
        action: AuditAction;
        message: string;
        userId?: string;
        userEmail?: string;
        ipAddress?: string;
        userAgent?: string;
        requestId?: string;
        resourceId?: string;
        resourceType?: string;
        outcome?: 'SUCCESS' | 'FAILURE';
        details?: Record<string, unknown>;
    }): void {
        const entry: AuditLogEntry = {
            timestamp: new Date().toISOString(),
            level: LogLevel.AUDIT,
            category: params.category,
            action: params.action,
            message: params.message,
            userId: params.userId,
            userEmail: params.userEmail,
            ipAddress: params.ipAddress,
            userAgent: params.userAgent,
            requestId: params.requestId,
            resourceId: params.resourceId,
            resourceType: params.resourceType,
            outcome: params.outcome,
            details: params.details
        };

        const formatted = this.formatAuditEntry(entry);
        console.log(formatted);
    }

    /**
     * Generate a unique request ID for correlation
     */
    generateRequestId(): string {
        return uuidv4().substring(0, 8);
    }

    /**
     * Log HTTP request start
     */
    httpRequest(params: {
        requestId: string;
        method: string;
        url: string;
        userEmail?: string;
        ipAddress: string;
        userAgent?: string;
    }): void {
        const message = `→ ${params.method} ${params.url}`;
        this.info(message, {
            ip: params.ipAddress,
            user: params.userEmail || 'anonymous',
            userAgent: params.userAgent?.substring(0, 50)
        }, params.requestId);
    }

    /**
     * Log HTTP response
     */
    httpResponse(params: {
        requestId: string;
        method: string;
        url: string;
        statusCode: number;
        durationMs: number;
        userEmail?: string;
    }): void {
        const statusEmoji = params.statusCode >= 400 ? '✗' : '✓';
        const message = `← ${statusEmoji} ${params.method} ${params.url} ${params.statusCode} (${params.durationMs}ms)`;

        if (params.statusCode >= 500) {
            this.error(message, { user: params.userEmail || 'anonymous' }, params.requestId);
        } else if (params.statusCode >= 400) {
            this.warn(message, { user: params.userEmail || 'anonymous' }, params.requestId);
        } else {
            this.info(message, { user: params.userEmail || 'anonymous' }, params.requestId);
        }
    }
}

export const logger = new Logger();
