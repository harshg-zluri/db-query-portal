import { Request, Response, NextFunction } from 'express';
import { errorHandler, notFoundHandler } from '../../../src/middleware/errorHandler.middleware';
import {
    AppError,
    ValidationError,
    AuthenticationError,
    ForbiddenError,
    NotFoundError
} from '../../../src/utils/errors';

// Mock sendError
jest.mock('../../../src/utils/responseHelper', () => ({
    sendError: jest.fn()
}));

jest.mock('../../../src/utils/logger', () => ({
    logger: {
        audit: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    },
    AuditCategory: { ACCESS: 'ACCESS', SYSTEM: 'SYSTEM' },
    AuditAction: { UNAUTHORIZED_ACCESS: 'UNAUTHORIZED_ACCESS', FORBIDDEN_ACCESS: 'FORBIDDEN_ACCESS', SERVER_ERROR: 'SERVER_ERROR' }
}));

import { sendError } from '../../../src/utils/responseHelper';

describe('Error Handler Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest = {
            path: '/test',
            method: 'GET',
            headers: {},
            requestId: 'test-req-id',
            socket: { remoteAddress: '127.0.0.1' } as any,
            user: undefined
        } as Partial<Request>;
        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };
        nextFunction = jest.fn();
    });

    describe('getClientIp extraction', () => {
        it('should handle x-forwarded-for as string', () => {
            mockRequest.headers = { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' };
            const error = new ValidationError('Test');

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalled();
        });

        it('should handle x-forwarded-for as array', () => {
            mockRequest.headers = { 'x-forwarded-for': ['192.168.1.1', '10.0.0.1'] };
            const error = new ValidationError('Test');

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalled();
        });

        it('should handle missing x-forwarded-for and socket address', () => {
            mockRequest.headers = {};
            mockRequest.socket = { remoteAddress: undefined } as any;
            const error = new ValidationError('Test');

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalled();
        });
    });


    describe('errorHandler', () => {
        it('should handle ValidationError', () => {
            const error = new ValidationError('Invalid input');

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'Invalid input',
                400,
                'VALIDATION_ERROR'
            );
        });

        it('should handle AuthenticationError', () => {
            const error = new AuthenticationError('Token expired');

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'Token expired',
                401,
                'AUTHENTICATION_ERROR'
            );
        });

        it('should handle ForbiddenError', () => {
            const error = new ForbiddenError('Access denied');

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'Access denied',
                403,
                'FORBIDDEN_ERROR'
            );
        });

        it('should handle NotFoundError', () => {
            const error = new NotFoundError('User');

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'User not found',
                404,
                'NOT_FOUND_ERROR'
            );
        });

        it('should handle generic AppError', () => {
            const error = new AppError('Custom error', 422, 'CUSTOM_ERROR');

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'Custom error',
                422,
                'CUSTOM_ERROR'
            );
        });

        it('should handle ZodError', () => {
            const error = { name: 'ZodError' } as Error;

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'Validation error',
                400,
                'VALIDATION_ERROR'
            );
        });

        it('should handle JsonWebTokenError', () => {
            const error = { name: 'JsonWebTokenError' } as Error;

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'Invalid token',
                401,
                'INVALID_TOKEN'
            );
        });

        it('should handle TokenExpiredError', () => {
            const error = { name: 'TokenExpiredError' } as Error;

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'Token expired',
                401,
                'TOKEN_EXPIRED'
            );
        });

        it('should handle MulterError', () => {
            const error = { name: 'MulterError', message: 'File too large' } as Error;

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'File too large',
                400,
                'FILE_UPLOAD_ERROR'
            );
        });

        it('should handle duplicate key error', () => {
            const error = new Error('duplicate key value violates unique constraint');

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'Resource already exists',
                409,
                'CONFLICT'
            );
        });

        it('should handle unknown errors with message in development', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'development';

            const error = new Error('Unexpected error');

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'Unexpected error',
                500,
                'INTERNAL_ERROR'
            );

            process.env.NODE_ENV = originalEnv;
        });

        it('should hide error details in production', () => {
            const originalEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const error = new Error('Database connection failed');

            errorHandler(error, mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'Internal server error',
                500,
                'INTERNAL_ERROR'
            );

            process.env.NODE_ENV = originalEnv;
        });
    });

    describe('notFoundHandler', () => {
        it('should return 404 with route info', () => {
            mockRequest = { method: 'POST', path: '/api/unknown' } as Partial<Request>;

            notFoundHandler(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(sendError).toHaveBeenCalledWith(
                mockResponse,
                'Route POST /api/unknown not found',
                404,
                'NOT_FOUND'
            );
        });
    });
});
