import { Request, Response, NextFunction } from 'express';
import {
    requireRole,
    requireMinRole,
    requirePodAccess,
    requireOwnershipOrRole
} from '../../../src/middleware/rbac.middleware';
import { AuthenticationError, ForbiddenError } from '../../../src/utils/errors';
import { UserRole } from '../../../src/types';

describe('RBAC Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockRequest = {};
        mockResponse = {};
        nextFunction = jest.fn();
    });

    describe('requireRole', () => {
        it('should pass when user has required role', () => {
            mockRequest.user = {
                userId: 'user-123',
                email: 'test@zluri.com',
                role: UserRole.ADMIN,
                managedPodIds: []
            };

            const middleware = requireRole(UserRole.ADMIN);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should pass when user has one of multiple allowed roles', () => {
            mockRequest.user = {
                userId: 'user-123',
                email: 'test@zluri.com',
                role: UserRole.MANAGER,
                managedPodIds: []
            };

            const middleware = requireRole(UserRole.MANAGER, UserRole.ADMIN);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should fail when user lacks required role', () => {
            mockRequest.user = {
                userId: 'user-123',
                email: 'test@zluri.com',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };

            const middleware = requireRole(UserRole.ADMIN);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should fail when no user present', () => {
            const middleware = requireRole(UserRole.DEVELOPER);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });
    });

    describe('requireMinRole', () => {
        it('should pass when user has higher role', () => {
            mockRequest.user = {
                userId: 'user-123',
                email: 'test@zluri.com',
                role: UserRole.ADMIN,
                managedPodIds: []
            };

            const middleware = requireMinRole(UserRole.DEVELOPER);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should pass when user has exact role', () => {
            mockRequest.user = {
                userId: 'user-123',
                email: 'test@zluri.com',
                role: UserRole.MANAGER,
                managedPodIds: []
            };

            const middleware = requireMinRole(UserRole.MANAGER);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should fail when user has lower role', () => {
            mockRequest.user = {
                userId: 'user-123',
                email: 'test@zluri.com',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };

            const middleware = requireMinRole(UserRole.MANAGER);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should fail when no user present', () => {
            const middleware = requireMinRole(UserRole.DEVELOPER);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });
    });

    describe('requirePodAccess', () => {
        const getPodId = (req: Request) => req.params?.podId;

        it('should pass for admin (all POD access)', () => {
            mockRequest.user = {
                userId: 'user-123',
                email: 'admin@zluri.com',
                role: UserRole.ADMIN,
                managedPodIds: []
            };
            mockRequest.params = { podId: 'any-pod' };

            const middleware = requirePodAccess(getPodId);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should pass for developer (access handled elsewhere)', () => {
            mockRequest.user = {
                userId: 'user-123',
                email: 'dev@zluri.com',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };
            mockRequest.params = { podId: 'any-pod' };

            const middleware = requirePodAccess(getPodId);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should pass for manager with POD access', () => {
            mockRequest.user = {
                userId: 'user-123',
                email: 'manager@zluri.com',
                role: UserRole.MANAGER,
                managedPodIds: ['pod-1', 'pod-2']
            };
            mockRequest.params = { podId: 'pod-1' };

            const middleware = requirePodAccess(getPodId);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should fail for manager without POD access', () => {
            mockRequest.user = {
                userId: 'user-123',
                email: 'manager@zluri.com',
                role: UserRole.MANAGER,
                managedPodIds: ['pod-1']
            };
            mockRequest.params = { podId: 'pod-3' };

            const middleware = requirePodAccess(getPodId);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should fail when POD ID cannot be determined', () => {
            mockRequest.user = {
                userId: 'user-123',
                email: 'manager@zluri.com',
                role: UserRole.MANAGER,
                managedPodIds: ['pod-1']
            };
            mockRequest.params = {};

            const middleware = requirePodAccess(getPodId);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should fail when no user present', () => {
            const middleware = requirePodAccess(getPodId);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });
    });

    describe('requireOwnershipOrRole', () => {
        const getOwnerId = (req: Request) => req.params?.ownerId;

        it('should pass when user is owner', () => {
            mockRequest.user = {
                userId: 'user-123',
                email: 'dev@zluri.com',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };
            mockRequest.params = { ownerId: 'user-123' };

            const middleware = requireOwnershipOrRole(getOwnerId);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should pass when user has override role', () => {
            mockRequest.user = {
                userId: 'user-456',
                email: 'admin@zluri.com',
                role: UserRole.ADMIN,
                managedPodIds: []
            };
            mockRequest.params = { ownerId: 'user-123' };

            const middleware = requireOwnershipOrRole(getOwnerId, UserRole.ADMIN);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should fail when not owner and no override role', () => {
            mockRequest.user = {
                userId: 'user-456',
                email: 'other@zluri.com',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };
            mockRequest.params = { ownerId: 'user-123' };

            const middleware = requireOwnershipOrRole(getOwnerId);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should fail when no user present', () => {
            const middleware = requireOwnershipOrRole(getOwnerId);
            middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });
    });
});
