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
/**
 * POST /api/auth/login
 * User login with email and password
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
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

        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', result.tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        sendSuccess(res, {
            user: result.user,
            accessToken: result.tokens.accessToken,
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
export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
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

        // Clear refresh token cookie
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict'
        });

        sendSuccess(res, null, 'Logout successful');
    } catch (error) {
        next(error);
    }
}

/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
    const ipAddress = getClientIp(req);
    const userAgent = req.headers['user-agent'];

    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            throw new Error('Refresh token not found');
        }

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

        // Set new refresh token as HTTP-only cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        sendSuccess(res, {
            accessToken: tokens.accessToken,
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
export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
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
export const googleAuth = passport.authenticate('google', {
    scope: ['profile', 'email']
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
export function googleCallback(req: Request, res: Response, next: NextFunction): void {
    passport.authenticate('google', { session: false }, (err: any, data: any) => {
        if (err) {
            return next(err);
        }
        if (!data) {
            return res.redirect(`${config.google.frontendUrl}/login?error=auth_failed`);
        }

        const { tokens } = data;

        // Set refresh token as HTTP-only cookie
        res.cookie('refreshToken', tokens.refreshToken, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });

        // Redirect to frontend with access token only
        const redirectUrl = new URL(`${config.google.frontendUrl}/oauth/callback`);
        redirectUrl.searchParams.set('accessToken', tokens.accessToken);
        redirectUrl.searchParams.set('expiresIn', tokens.expiresIn);

        res.redirect(redirectUrl.toString());
    })(req, res, next);
}

export const AuthController = {
    login,
    logout,
    refresh,
    getProfile,
    googleAuth,
    googleCallback
};
