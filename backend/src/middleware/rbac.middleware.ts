import { Request, Response, NextFunction } from 'express';
import { UserRole, JWTPayload } from '../types';
import { ForbiddenError, AuthenticationError } from '../utils/errors';

// Role hierarchy: Admin > Manager > Developer
const ROLE_HIERARCHY: Record<UserRole, number> = {
    [UserRole.DEVELOPER]: 1,
    [UserRole.MANAGER]: 2,
    [UserRole.ADMIN]: 3
};

/**
 * Require specific role(s) to access endpoint
 * Checks if user has one of the allowed roles
 */
export function requireRole(...allowedRoles: UserRole[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AuthenticationError());
            return;
        }

        if (!allowedRoles.includes(req.user.role)) {
            next(new ForbiddenError(
                `Access denied. Required roles: ${allowedRoles.join(', ')}`
            ));
            return;
        }

        next();
    };
}

/**
 * Require minimum role level
 * Uses role hierarchy to check access
 */
export function requireMinRole(minRole: UserRole) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AuthenticationError());
            return;
        }

        const userLevel = ROLE_HIERARCHY[req.user.role];
        const requiredLevel = ROLE_HIERARCHY[minRole];

        if (userLevel < requiredLevel) {
            next(new ForbiddenError(
                `Access denied. Minimum required role: ${minRole}`
            ));
            return;
        }

        next();
    };
}

/**
 * Require POD access for managers
 * Managers can only access requests from their assigned PODs
 * Admins have access to all PODs
 */
export function requirePodAccess(getPodIdFromRequest: (req: Request) => string | undefined) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AuthenticationError());
            return;
        }

        // Admins can access all PODs
        if (req.user.role === UserRole.ADMIN) {
            next();
            return;
        }

        // Developers can only access their own resources (handled separately)
        if (req.user.role === UserRole.DEVELOPER) {
            next();
            return;
        }

        // Managers need to have the POD in their managed list
        const podId = getPodIdFromRequest(req);

        if (!podId) {
            next(new ForbiddenError('Unable to determine POD access'));
            return;
        }

        if (!req.user.managedPodIds.includes(podId)) {
            next(new ForbiddenError('You do not have access to this POD'));
            return;
        }

        next();
    };
}

/**
 * Check if user is resource owner or has elevated privileges
 */
export function requireOwnershipOrRole(
    getOwnerIdFromRequest: (req: Request) => string | undefined,
    ...overrideRoles: UserRole[]
) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            next(new AuthenticationError());
            return;
        }

        // Override roles always have access
        if (overrideRoles.includes(req.user.role)) {
            next();
            return;
        }

        const ownerId = getOwnerIdFromRequest(req);

        if (ownerId !== req.user.userId) {
            next(new ForbiddenError('You can only access your own resources'));
            return;
        }

        next();
    };
}
