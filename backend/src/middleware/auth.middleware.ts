import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/environment';
import { JWTPayload } from '../types';
import { AuthenticationError } from '../utils/errors';

/**
 * Extract JWT token from Authorization header
 */
function extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return null;
    }

    // Format: "Bearer <token>"
    const parts = authHeader.split(' ');

    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return null;
    }

    return parts[1];
}

/**
 * Verify JWT token and attach user to request
 */
export function authenticate(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    try {
        const token = extractToken(req);

        if (!token) {
            throw new AuthenticationError('No authentication token provided');
        }

        const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;

        // Attach user info to request
        req.user = decoded;

        next();
    } catch (error) {
        if (error instanceof jwt.TokenExpiredError) {
            next(new AuthenticationError('Authentication token has expired'));
            return;
        }
        if (error instanceof jwt.JsonWebTokenError) {
            next(new AuthenticationError('Invalid authentication token'));
            return;
        }
        next(error);
    }
}

/**
 * Optional authentication - doesn't fail if no token
 */
export function optionalAuthenticate(
    req: Request,
    res: Response,
    next: NextFunction
): void {
    try {
        const token = extractToken(req);

        if (token) {
            const decoded = jwt.verify(token, config.jwt.secret) as JWTPayload;
            req.user = decoded;
        }

        next();
    } catch {
        // Silently continue without user
        next();
    }
}
