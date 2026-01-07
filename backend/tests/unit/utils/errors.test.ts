import {
    AppError,
    ValidationError,
    AuthenticationError,
    ForbiddenError,
    NotFoundError,
    ConflictError,
    RateLimitError
} from '../../../src/utils/errors';

describe('Error Classes', () => {
    describe('AppError', () => {
        it('should create with default values', () => {
            const error = new AppError('Test error');

            expect(error.message).toBe('Test error');
            expect(error.statusCode).toBe(500);
            expect(error.code).toBe('INTERNAL_ERROR');
            expect(error.isOperational).toBe(true);
        });

        it('should create with custom values', () => {
            const error = new AppError('Custom error', 400, 'CUSTOM_ERROR', false);

            expect(error.statusCode).toBe(400);
            expect(error.code).toBe('CUSTOM_ERROR');
            expect(error.isOperational).toBe(false);
        });

        it('should have proper stack trace', () => {
            const error = new AppError('Stack test');

            expect(error.stack).toBeDefined();
            expect(error.stack).toContain('Stack test');
        });
    });

    describe('ValidationError', () => {
        it('should create validation error', () => {
            const error = new ValidationError('Invalid input');

            expect(error.message).toBe('Invalid input');
            expect(error.statusCode).toBe(400);
            expect(error.code).toBe('VALIDATION_ERROR');
        });
    });

    describe('AuthenticationError', () => {
        it('should create with default message', () => {
            const error = new AuthenticationError();

            expect(error.message).toBe('Authentication required');
            expect(error.statusCode).toBe(401);
            expect(error.code).toBe('AUTHENTICATION_ERROR');
        });

        it('should create with custom message', () => {
            const error = new AuthenticationError('Token expired');

            expect(error.message).toBe('Token expired');
            expect(error.statusCode).toBe(401);
        });
    });

    describe('ForbiddenError', () => {
        it('should create with default message', () => {
            const error = new ForbiddenError();

            expect(error.message).toBe('Access denied');
            expect(error.statusCode).toBe(403);
            expect(error.code).toBe('FORBIDDEN_ERROR');
        });

        it('should create with custom message', () => {
            const error = new ForbiddenError('You cannot do this');

            expect(error.message).toBe('You cannot do this');
        });
    });

    describe('NotFoundError', () => {
        it('should create with default resource', () => {
            const error = new NotFoundError();

            expect(error.message).toBe('Resource not found');
            expect(error.statusCode).toBe(404);
            expect(error.code).toBe('NOT_FOUND_ERROR');
        });

        it('should create with custom resource', () => {
            const error = new NotFoundError('User');

            expect(error.message).toBe('User not found');
        });
    });

    describe('ConflictError', () => {
        it('should create conflict error', () => {
            const error = new ConflictError('Email already exists');

            expect(error.message).toBe('Email already exists');
            expect(error.statusCode).toBe(409);
            expect(error.code).toBe('CONFLICT_ERROR');
        });
    });

    describe('RateLimitError', () => {
        it('should create rate limit error', () => {
            const error = new RateLimitError();

            expect(error.message).toBe('Too many requests, please try again later');
            expect(error.statusCode).toBe(429);
            expect(error.code).toBe('RATE_LIMIT_ERROR');
        });
    });
});
