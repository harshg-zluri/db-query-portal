import { Request, Response, NextFunction } from 'express';
import { AuthController } from '../../../src/controllers/auth.controller';
import { AuthService } from '../../../src/services/auth.service';
import * as responseHelper from '../../../src/utils/responseHelper';
import { UserRole } from '../../../src/types';

// Mock dependencies
jest.mock('../../../src/services/auth.service');
jest.mock('../../../src/utils/responseHelper');
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        audit: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        generateRequestId: jest.fn().mockReturnValue('test-id'),
        httpRequest: jest.fn(),
        httpResponse: jest.fn()
    },
    AuditCategory: { AUTH: 'AUTH', REQUEST: 'REQUEST', APPROVAL: 'APPROVAL', EXECUTION: 'EXECUTION', ACCESS: 'ACCESS', SYSTEM: 'SYSTEM' },
    AuditAction: { LOGIN_SUCCESS: 'LOGIN_SUCCESS', LOGIN_FAILED: 'LOGIN_FAILED', LOGOUT: 'LOGOUT', TOKEN_REFRESH: 'TOKEN_REFRESH', TOKEN_REFRESH_FAILED: 'TOKEN_REFRESH_FAILED', PROFILE_ACCESS: 'PROFILE_ACCESS' }
}));

describe('AuthController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest = {
            body: {},
            user: undefined,
            headers: {},
            requestId: 'test-req-id',
            socket: { remoteAddress: '127.0.0.1' } as any
        };
        mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        nextFunction = jest.fn();
    });

    describe('login', () => {
        it('should login successfully', async () => {
            mockRequest.body = { email: 'test@zluri.com', password: 'password' };

            const mockResult = {
                user: { id: '123', email: 'test@zluri.com', role: UserRole.DEVELOPER },
                tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: '1h' }
            };
            (AuthService.login as jest.Mock).mockResolvedValue(mockResult);

            await AuthController.login(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(AuthService.login).toHaveBeenCalledWith('test@zluri.com', 'password');
            expect(responseHelper.sendSuccess).toHaveBeenCalled();
        });

        it('should login with x-forwarded-for string header', async () => {
            mockRequest.body = { email: 'test@zluri.com', password: 'password' };
            mockRequest.headers = { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' };

            const mockResult = {
                user: { id: '123', email: 'test@zluri.com', role: UserRole.DEVELOPER },
                tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: '1h' }
            };
            (AuthService.login as jest.Mock).mockResolvedValue(mockResult);

            await AuthController.login(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(responseHelper.sendSuccess).toHaveBeenCalled();
        });

        it('should login with x-forwarded-for array header', async () => {
            mockRequest.body = { email: 'test@zluri.com', password: 'password' };
            mockRequest.headers = { 'x-forwarded-for': ['192.168.1.1', '10.0.0.1'] };

            const mockResult = {
                user: { id: '123', email: 'test@zluri.com', role: UserRole.DEVELOPER },
                tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: '1h' }
            };
            (AuthService.login as jest.Mock).mockResolvedValue(mockResult);

            await AuthController.login(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(responseHelper.sendSuccess).toHaveBeenCalled();
        });

        it('should handle login error', async () => {
            mockRequest.body = { email: 'test@zluri.com', password: 'wrong' };
            const error = new Error('Invalid credentials');
            (AuthService.login as jest.Mock).mockRejectedValue(error);

            await AuthController.login(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(error);
        });

        it('should handle login error with non-Error type', async () => {
            mockRequest.body = { email: 'test@zluri.com', password: 'wrong' };
            (AuthService.login as jest.Mock).mockRejectedValue('string error');

            await AuthController.login(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });

        it('should handle undefined socket.remoteAddress', async () => {
            mockRequest.body = { email: 'test@zluri.com', password: 'password' };
            mockRequest.headers = {};
            mockRequest.socket = { remoteAddress: undefined } as any;

            const mockResult = {
                user: { id: '123', email: 'test@zluri.com', role: UserRole.DEVELOPER },
                tokens: { accessToken: 'token', refreshToken: 'refresh', expiresIn: '1h' }
            };
            (AuthService.login as jest.Mock).mockResolvedValue(mockResult);

            await AuthController.login(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(responseHelper.sendSuccess).toHaveBeenCalled();
        });
    });

    describe('logout', () => {
        it('should logout successfully', async () => {
            await AuthController.logout(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(responseHelper.sendSuccess).toHaveBeenCalledWith(
                mockResponse,
                null,
                'Logout successful'
            );
        });

        it('should handle logout error', async () => {
            (responseHelper.sendSuccess as jest.Mock).mockImplementation(() => {
                throw new Error('Unexpected');
            });

            await AuthController.logout(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });
    });

    describe('refresh', () => {
        it('should refresh tokens successfully', async () => {
            mockRequest.body = { refreshToken: 'valid-refresh-token' };

            const mockTokens = { accessToken: 'new', refreshToken: 'new-refresh', expiresIn: '1h' };
            (AuthService.refreshAccessToken as jest.Mock).mockResolvedValue(mockTokens);

            await AuthController.refresh(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(AuthService.refreshAccessToken).toHaveBeenCalledWith('valid-refresh-token');
            expect(responseHelper.sendSuccess).toHaveBeenCalled();
        });

        it('should handle refresh error', async () => {
            mockRequest.body = { refreshToken: 'invalid' };
            const error = new Error('Invalid token');
            (AuthService.refreshAccessToken as jest.Mock).mockRejectedValue(error);

            await AuthController.refresh(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(error);
        });

        it('should handle refresh error with non-Error type', async () => {
            mockRequest.body = { refreshToken: 'invalid' };
            (AuthService.refreshAccessToken as jest.Mock).mockRejectedValue('string error');

            await AuthController.refresh(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });
    });

    describe('getProfile', () => {
        it('should get profile successfully', async () => {
            mockRequest.user = { userId: 'user-123', email: 'test@zluri.com', role: UserRole.DEVELOPER, managedPodIds: [] };

            const mockProfile = { id: 'user-123', email: 'test@zluri.com' };
            (AuthService.getProfile as jest.Mock).mockResolvedValue(mockProfile);

            await AuthController.getProfile(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(AuthService.getProfile).toHaveBeenCalledWith('user-123');
            expect(responseHelper.sendSuccess).toHaveBeenCalledWith(mockResponse, mockProfile);
        });

        it('should handle get profile error', async () => {
            mockRequest.user = { userId: 'user-123', email: 'test@zluri.com', role: UserRole.DEVELOPER, managedPodIds: [] };
            const error = new Error('User not found');
            (AuthService.getProfile as jest.Mock).mockRejectedValue(error);

            await AuthController.getProfile(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(error);
        });
    });
});
