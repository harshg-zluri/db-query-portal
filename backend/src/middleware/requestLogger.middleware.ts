// Request Logger Middleware
// Logs all HTTP requests with correlation IDs for audit trail

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Extend Express Request to include requestId
declare global {
    namespace Express {
        interface Request {
            requestId: string;
            startTime: number;
        }
    }
}

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
 * Middleware to log HTTP requests and responses
 * Assigns a unique request ID for correlation across logs
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
    // Generate and attach request ID
    req.requestId = logger.generateRequestId();
    req.startTime = Date.now();

    // Get user email if authenticated
    const userEmail = req.user?.email;

    // Log incoming request
    logger.httpRequest({
        requestId: req.requestId,
        method: req.method,
        url: req.originalUrl,
        userEmail,
        ipAddress: getClientIp(req),
        userAgent: req.headers['user-agent']
    });

    // Capture response finish to log completion
    res.on('finish', () => {
        const durationMs = Date.now() - req.startTime;

        logger.httpResponse({
            requestId: req.requestId,
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode,
            durationMs,
            userEmail: req.user?.email
        });
    });

    next();
}
