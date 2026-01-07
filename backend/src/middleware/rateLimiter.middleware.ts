import rateLimit from 'express-rate-limit';
import { config } from '../config/environment';
import { RateLimitError } from '../utils/errors';

/**
 * General API rate limiter
 * Limits requests per IP address
 */
export const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs, // 15 minutes default
    max: config.rateLimit.maxRequests, // 1000 requests per window
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new RateLimitError());
    },
    keyGenerator: (req) => {
        // Use X-Forwarded-For if behind proxy, otherwise use IP
        const forwarded = req.headers['x-forwarded-for'];
        if (typeof forwarded === 'string') {
            return forwarded.split(',')[0].trim();
        }
        return req.ip || 'unknown';
    }
});

/**
 * Stricter rate limiter for authentication endpoints
 * Prevents brute force attacks
 */
export const authLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.authMaxRequests, // 100 attempts per window
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res, next) => {
        next(new RateLimitError());
    },
    keyGenerator: (req) => {
        // Combine IP and email (if provided) to prevent distributed attacks
        const forwarded = req.headers['x-forwarded-for'];
        const ip = typeof forwarded === 'string'
            ? forwarded.split(',')[0].trim()
            : (req.ip || 'unknown');
        const email = req.body?.email || '';
        return `${ip}:${email}`;
    }
});
