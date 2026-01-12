import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { sendSuccess } from '../utils/responseHelper';
import { LoginInput, RefreshTokenInput } from '../validators/auth.schema';
import { logger, AuditCategory, AuditAction } from '../utils/logger';
import passport from 'passport';
import { config } from '../config/environment';

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
 * Authentication Controller
 * Handles login, logout, token refresh, and profile
 */
export class AuthController {
    /**
     * POST /api/auth/login
     * User login with email and password
     */
    static async login(req: Request, res: Response, next: NextFunction): Promise<void> {
        const { email } = req.body as LoginInput;
        const ipAddress = getClientIp(req);
        const userAgent = req.headers['user-agent'];

        try {
            const { password } = req.body as LoginInput;

            const result = await AuthService.login(email, password);

            // Audit log: successful login
            logger.audit({
                category: AuditCategory.AUTH,
                action: AuditAction.LOGIN_SUCCESS,
                message: `User logged in successfully`,
                userId: result.user.id,
                userEmail: email,
                ipAddress,
                userAgent,
                requestId: req.requestId,
                outcome: 'SUCCESS',
                details: {
                    role: result.user.role
                }
            });

            sendSuccess(res, {
                user: result.user,
                accessToken: result.tokens.accessToken,
                refreshToken: result.tokens.refreshToken,
                expiresIn: result.tokens.expiresIn
            }, 'Login successful');
        } catch (error) {
            // Audit log: failed login
            logger.audit({
                category: AuditCategory.AUTH,
                action: AuditAction.LOGIN_FAILED,
                message: `Login failed for email: ${email}`,
                userEmail: email,
                ipAddress,
                userAgent,
                requestId: req.requestId,
                outcome: 'FAILURE',
                details: {
                    reason: error instanceof Error ? error.message : 'Unknown error'
                }
            });
            next(error);
        }
    }

    /**
     * POST /api/auth/logout
     * Logout user (client should discard tokens)
     */
    static async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const user = req.user;
            const ipAddress = getClientIp(req);

            // Audit log: logout
            logger.audit({
                category: AuditCategory.AUTH,
                action: AuditAction.LOGOUT,
                message: `User logged out`,
                userId: user?.userId,
                userEmail: user?.email,
                ipAddress,
                userAgent: req.headers['user-agent'],
                requestId: req.requestId,
                outcome: 'SUCCESS'
            });

            // In a more complete implementation, we would:
            // 1. Add the token to a blacklist
            // 2. Clear any server-side session
            // For this implementation, logout is handled client-side

            sendSuccess(res, null, 'Logout successful');
        } catch (error) {
            next(error);
        }
    }

    /**
     * POST /api/auth/refresh
     * Refresh access token using refresh token
     */
    static async refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
        const ipAddress = getClientIp(req);
        const userAgent = req.headers['user-agent'];

        try {
            const { refreshToken } = req.body as RefreshTokenInput;

            const tokens = await AuthService.refreshAccessToken(refreshToken);

            // Audit log: token refresh success
            logger.audit({
                category: AuditCategory.AUTH,
                action: AuditAction.TOKEN_REFRESH,
                message: `Token refreshed successfully`,
                ipAddress,
                userAgent,
                requestId: req.requestId,
                outcome: 'SUCCESS'
            });

            sendSuccess(res, {
                accessToken: tokens.accessToken,
                refreshToken: tokens.refreshToken,
                expiresIn: tokens.expiresIn
            }, 'Token refreshed');
        } catch (error) {
            // Audit log: token refresh failed
            logger.audit({
                category: AuditCategory.AUTH,
                action: AuditAction.TOKEN_REFRESH_FAILED,
                message: `Token refresh failed`,
                ipAddress,
                userAgent,
                requestId: req.requestId,
                outcome: 'FAILURE',
                details: {
                    reason: error instanceof Error ? error.message : 'Unknown error'
                }
            });
            next(error);
        }
    }

    /**
     * GET /api/auth/me
     * Get current user profile
     */
    static async getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const userId = req.user!.userId;
            const userEmail = req.user!.email;

            const profile = await AuthService.getProfile(userId);

            // Audit log: profile access
            logger.audit({
                category: AuditCategory.AUTH,
                action: AuditAction.PROFILE_ACCESS,
                message: `User accessed their profile`,
                userId,
                userEmail,
                ipAddress: getClientIp(req),
                requestId: req.requestId,
                outcome: 'SUCCESS'
            });

            sendSuccess(res, profile);
        } catch (error) {
            next(error);
        }
    }


    /**
     * GET /api/auth/google
     * Initiate Google OAuth flow
     */
    static googleAuth = passport.authenticate('google', {
        scope: ['profile', 'email']
    });

    /**
     * GET /api/auth/google/callback
     * Handle Google OAuth callback
     */
    static googleCallback(req: Request, res: Response, next: NextFunction): void {
        passport.authenticate('google', { session: false }, (err: any, data: any) => {
            if (err) {
                return next(err);
            }
            if (!data) {
                return res.redirect(`${config.google.frontendUrl}/login?error=auth_failed`);
            }

            const { tokens } = data;

            // Redirect to frontend with tokens
            const redirectUrl = new URL(`${config.google.frontendUrl}/oauth/callback`);
            redirectUrl.searchParams.set('accessToken', tokens.accessToken);
            redirectUrl.searchParams.set('refreshToken', tokens.refreshToken);
            redirectUrl.searchParams.set('expiresIn', tokens.expiresIn);

            res.redirect(redirectUrl.toString());
        })(req, res, next);
    }
}
