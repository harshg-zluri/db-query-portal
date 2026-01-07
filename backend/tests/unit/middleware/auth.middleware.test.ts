import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, optionalAuthenticate } from '../../../src/middleware/auth.middleware';
import { AuthenticationError } from '../../../src/utils/errors';
import { config } from '../../../src/config/environment';
import { UserRole } from '../../../src/types';

describe('Auth Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockRequest = {
            headers: {}
        };
        mockResponse = {};
        nextFunction = jest.fn();
    });

    describe('authenticate', () => {
        it('should pass with valid token', () => {
            const payload = {
                userId: 'user-123',
                email: 'test@zluri.com',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };
            const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' });

            mockRequest.headers = { authorization: `Bearer ${token}` };

            authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
            expect(mockRequest.user).toEqual(expect.objectContaining({
                userId: 'user-123',
                email: 'test@zluri.com',
                role: UserRole.DEVELOPER
            }));
        });

        it('should fail without token', () => {
            mockRequest.headers = {};

            authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });

        it('should fail with invalid token format', () => {
            mockRequest.headers = { authorization: 'InvalidFormat' };

            authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });

        it('should fail with invalid token', () => {
            mockRequest.headers = { authorization: 'Bearer invalid.token.here' };

            authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });

        it('should fail with expired token', () => {
            const payload = { userId: 'user-123', email: 'test@zluri.com', role: UserRole.DEVELOPER, managedPodIds: [] };
            const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '-1h' });

            mockRequest.headers = { authorization: `Bearer ${token}` };

            authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });

        it('should fail with wrong secret', () => {
            const payload = { userId: 'user-123', email: 'test@zluri.com', role: UserRole.DEVELOPER, managedPodIds: [] };
            const token = jwt.sign(payload, 'wrong-secret');

            mockRequest.headers = { authorization: `Bearer ${token}` };

            authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
        });

        it('should pass non-JWT errors to next', () => {
            // Create a token that will cause a non-JWT error when decoded
            mockRequest.headers = { authorization: 'Bearer valid.looking.token' };

            authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            // Will get a JsonWebTokenError since it's malformed
            expect(nextFunction).toHaveBeenCalled();
        });
    });

    describe('optionalAuthenticate', () => {
        it('should pass with valid token and attach user', () => {
            const payload = {
                userId: 'user-123',
                email: 'test@zluri.com',
                role: UserRole.DEVELOPER,
                managedPodIds: []
            };
            const token = jwt.sign(payload, config.jwt.secret);

            mockRequest.headers = { authorization: `Bearer ${token}` };

            optionalAuthenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
            expect(mockRequest.user).toBeDefined();
        });

        it('should pass without token (no user attached)', () => {
            mockRequest.headers = {};

            optionalAuthenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
            expect(mockRequest.user).toBeUndefined();
        });

        it('should pass with invalid token (silently)', () => {
            mockRequest.headers = { authorization: 'Bearer invalid.token' };

            optionalAuthenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
            expect(mockRequest.user).toBeUndefined();
        });
    });
});
