import { Request, Response, NextFunction } from 'express';
import { AppError, AuthenticationError, ForbiddenError } from '../utils/errors';
import { sendError } from '../utils/responseHelper';
import { logger, AuditCategory, AuditAction } from '../utils/logger';

/**
 * Get client IP address from request
 */
function getClientIp(req: Request): string {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    if (Array.isArray(forwarded)) {
        return forwarded[0];
    }
    return req.socket.remoteAddress || 'unknown';
}

/**
 * Global error handler middleware
 * Catches all errors and returns appropriate response
 */
export function errorHandler(
    err: Error,
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    const ipAddress = getClientIp(req);
    const userEmail = req.user?.email;
    const userId = req.user?.userId;

    // Log error with context
    logger.error('Request error', {
        error: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId,
        requestId: req.requestId
    }, req.requestId);

    // Handle known operational errors with audit logging
    if (err instanceof AppError) {
        // Audit log for unauthorized access
        if (err instanceof AuthenticationError || err.statusCode === 401) {
            logger.audit({
                category: AuditCategory.ACCESS,
                action: AuditAction.UNAUTHORIZED_ACCESS,
                message: `Unauthorized access attempt: ${err.message}`,
                userId,
                userEmail,
                ipAddress,
                userAgent: req.headers['user-agent'],
                requestId: req.requestId,
                outcome: 'FAILURE',
                details: {
                    path: req.path,
                    method: req.method,
                    errorCode: err.code
                }
            });
        }

        // Audit log for forbidden access
        if (err instanceof ForbiddenError || err.statusCode === 403) {
            logger.audit({
                category: AuditCategory.ACCESS,
                action: AuditAction.FORBIDDEN_ACCESS,
                message: `Forbidden access attempt: ${err.message}`,
                userId,
                userEmail,
                ipAddress,
                userAgent: req.headers['user-agent'],
                requestId: req.requestId,
                outcome: 'FAILURE',
                details: {
                    path: req.path,
                    method: req.method,
                    errorCode: err.code
                }
            });
        }

        sendError(res, err.message, err.statusCode, err.code);
        return;
    }

    // Handle Zod validation errors that weren't caught
    if (err.name === 'ZodError') {
        sendError(res, 'Validation error', 400, 'VALIDATION_ERROR');
        return;
    }

    // Handle JWT errors with audit logging
    if (err.name === 'JsonWebTokenError') {
        logger.audit({
            category: AuditCategory.ACCESS,
            action: AuditAction.UNAUTHORIZED_ACCESS,
            message: `Invalid token provided`,
            userEmail,
            ipAddress,
            userAgent: req.headers['user-agent'],
            requestId: req.requestId,
            outcome: 'FAILURE',
            details: {
                path: req.path,
                method: req.method,
                tokenError: 'INVALID_TOKEN'
            }
        });
        sendError(res, 'Invalid token', 401, 'INVALID_TOKEN');
        return;
    }

    if (err.name === 'TokenExpiredError') {
        logger.audit({
            category: AuditCategory.ACCESS,
            action: AuditAction.UNAUTHORIZED_ACCESS,
            message: `Expired token used`,
            userEmail,
            ipAddress,
            userAgent: req.headers['user-agent'],
            requestId: req.requestId,
            outcome: 'FAILURE',
            details: {
                path: req.path,
                method: req.method,
                tokenError: 'TOKEN_EXPIRED'
            }
        });
        sendError(res, 'Token expired', 401, 'TOKEN_EXPIRED');
        return;
    }

    // Handle multer errors (file upload)
    if (err.name === 'MulterError') {
        sendError(res, err.message, 400, 'FILE_UPLOAD_ERROR');
        return;
    }

    // Handle database errors
    if (err.message.includes('duplicate key')) {
        sendError(res, 'Resource already exists', 409, 'CONFLICT');
        return;
    }

    // Server errors - audit log
    logger.audit({
        category: AuditCategory.SYSTEM,
        action: AuditAction.SERVER_ERROR,
        message: `Internal server error: ${err.message}`,
        userId,
        userEmail,
        ipAddress,
        requestId: req.requestId,
        outcome: 'FAILURE',
        details: {
            path: req.path,
            method: req.method,
            errorName: err.name,
            errorMessage: err.message
        }
    });

    // Unknown errors - don't leak internal details
    sendError(
        res,
        process.env.NODE_ENV === 'production'
            ? 'Internal server error'
            : err.message,
        500,
        'INTERNAL_ERROR'
    );
}

/**
 * 404 handler for unmatched routes
 */
export function notFoundHandler(
    req: Request,
    res: Response,
    _next: NextFunction
): void {
    sendError(res, `Route ${req.method} ${req.path} not found`, 404, 'NOT_FOUND');
}
