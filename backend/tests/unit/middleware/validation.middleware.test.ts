import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { validate, validateMultiple } from '../../../src/middleware/validation.middleware';
import { ValidationError } from '../../../src/utils/errors';

describe('Validation Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    beforeEach(() => {
        mockRequest = {
            body: {},
            query: {},
            params: {}
        };
        mockResponse = {};
        nextFunction = jest.fn();
    });

    describe('validate', () => {
        const testSchema = z.object({
            email: z.string().email(),
            name: z.string().min(2)
        });

        it('should pass valid body data', async () => {
            mockRequest.body = { email: 'test@zluri.com', name: 'John' };

            const middleware = validate(testSchema);
            await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
            expect(mockRequest.body).toEqual({ email: 'test@zluri.com', name: 'John' });
        });

        it('should fail invalid body data', async () => {
            mockRequest.body = { email: 'invalid', name: 'J' };

            const middleware = validate(testSchema);
            await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(ValidationError));
        });

        it('should validate query params', async () => {
            const querySchema = z.object({
                page: z.coerce.number().int().min(1)
            });
            mockRequest.query = { page: '5' };

            const middleware = validate(querySchema, 'query');
            await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
            expect(mockRequest.query).toEqual({ page: 5 });
        });

        it('should validate params', async () => {
            const paramsSchema = z.object({
                id: z.string().uuid()
            });
            mockRequest.params = { id: '550e8400-e29b-41d4-a716-446655440000' };

            const middleware = validate(paramsSchema, 'params');
            await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should handle non-Zod errors', async () => {
            const errorSchema = z.object({}).transform(() => {
                throw new Error('Unexpected error');
            });

            const middleware = validate(errorSchema);
            await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
        });
    });

    describe('validateMultiple', () => {
        it('should validate multiple locations', async () => {
            const schemas = {
                body: z.object({ name: z.string() }),
                query: z.object({ page: z.coerce.number() })
            };

            mockRequest.body = { name: 'Test' };
            mockRequest.query = { page: '1' };

            const middleware = validateMultiple(schemas);
            await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
            expect(mockRequest.body).toEqual({ name: 'Test' });
            expect(mockRequest.query).toEqual({ page: 1 });
        });

        it('should collect errors from multiple locations', async () => {
            const schemas = {
                body: z.object({ email: z.string().email() }),
                query: z.object({ limit: z.coerce.number().max(100) })
            };

            mockRequest.body = { email: 'invalid' };
            mockRequest.query = { limit: '200' };

            const middleware = validateMultiple(schemas);
            await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(ValidationError));
        });

        it('should pass when schemas are empty', async () => {
            const middleware = validateMultiple({});
            await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith();
        });

        it('should handle non-Zod errors in multiple validation', async () => {
            const schemas = {
                body: z.object({}).transform(() => {
                    throw new Error('Transform error');
                })
            };

            const middleware = validateMultiple(schemas);
            await middleware(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});
