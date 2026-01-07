import { Response } from 'express';
import { sendSuccess, sendCreated, sendPaginated, sendError } from '../../../src/utils/responseHelper';

describe('Response Helper', () => {
    let mockResponse: Partial<Response>;
    let jsonSpy: jest.Mock;
    let statusSpy: jest.Mock;

    beforeEach(() => {
        jsonSpy = jest.fn();
        statusSpy = jest.fn().mockReturnThis();
        mockResponse = {
            status: statusSpy,
            json: jsonSpy
        };
    });

    describe('sendSuccess', () => {
        it('should send success response with default status 200', () => {
            const data = { id: '123', name: 'Test' };

            sendSuccess(mockResponse as Response, data);

            expect(statusSpy).toHaveBeenCalledWith(200);
            expect(jsonSpy).toHaveBeenCalledWith({
                success: true,
                data,
                message: undefined
            });
        });

        it('should send success response with message', () => {
            const data = { id: '123' };
            const message = 'Operation successful';

            sendSuccess(mockResponse as Response, data, message);

            expect(jsonSpy).toHaveBeenCalledWith({
                success: true,
                data,
                message
            });
        });

        it('should send success response with custom status code', () => {
            const data = null;

            sendSuccess(mockResponse as Response, data, 'Done', 202);

            expect(statusSpy).toHaveBeenCalledWith(202);
        });

        it('should handle null data', () => {
            sendSuccess(mockResponse as Response, null);

            expect(jsonSpy).toHaveBeenCalledWith({
                success: true,
                data: null,
                message: undefined
            });
        });

        it('should handle array data', () => {
            const data = [{ id: 1 }, { id: 2 }];

            sendSuccess(mockResponse as Response, data);

            expect(jsonSpy).toHaveBeenCalledWith({
                success: true,
                data,
                message: undefined
            });
        });
    });

    describe('sendCreated', () => {
        it('should send 201 created response', () => {
            const data = { id: 'new-123', name: 'New Item' };

            sendCreated(mockResponse as Response, data);

            expect(statusSpy).toHaveBeenCalledWith(201);
            expect(jsonSpy).toHaveBeenCalledWith({
                success: true,
                data,
                message: undefined
            });
        });

        it('should send 201 with message', () => {
            const data = { id: 'new-123' };

            sendCreated(mockResponse as Response, data, 'Resource created');

            expect(statusSpy).toHaveBeenCalledWith(201);
            expect(jsonSpy).toHaveBeenCalledWith({
                success: true,
                data,
                message: 'Resource created'
            });
        });
    });

    describe('sendPaginated', () => {
        it('should send paginated response', () => {
            const data = [{ id: 1 }, { id: 2 }, { id: 3 }];

            sendPaginated(mockResponse as Response, data, 1, 10, 25);

            expect(statusSpy).toHaveBeenCalledWith(200);
            expect(jsonSpy).toHaveBeenCalledWith({
                success: true,
                data,
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 25,
                    totalPages: 3
                }
            });
        });

        it('should calculate totalPages correctly', () => {
            const data = [{ id: 1 }];

            sendPaginated(mockResponse as Response, data, 1, 10, 1);

            expect(jsonSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    pagination: expect.objectContaining({
                        totalPages: 1
                    })
                })
            );
        });

        it('should handle empty data array', () => {
            sendPaginated(mockResponse as Response, [], 1, 10, 0);

            expect(jsonSpy).toHaveBeenCalledWith({
                success: true,
                data: [],
                pagination: {
                    page: 1,
                    limit: 10,
                    total: 0,
                    totalPages: 0
                }
            });
        });

        it('should handle fractional pages (round up)', () => {
            const data = [{ id: 1 }];

            sendPaginated(mockResponse as Response, data, 1, 10, 15);

            expect(jsonSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    pagination: expect.objectContaining({
                        totalPages: 2
                    })
                })
            );
        });
    });

    describe('sendError', () => {
        it('should send error response with default 500 status', () => {
            sendError(mockResponse as Response, 'Internal server error');

            expect(statusSpy).toHaveBeenCalledWith(500);
            expect(jsonSpy).toHaveBeenCalledWith({
                success: false,
                error: 'Internal server error'
            });
        });

        it('should send error response with custom status', () => {
            sendError(mockResponse as Response, 'Not found', 404);

            expect(statusSpy).toHaveBeenCalledWith(404);
        });

        it('should send error response with code', () => {
            sendError(mockResponse as Response, 'Validation failed', 400, 'VALIDATION_ERROR');

            expect(statusSpy).toHaveBeenCalledWith(400);
            expect(jsonSpy).toHaveBeenCalledWith({
                success: false,
                error: 'Validation failed'
            });
        });

        it('should handle 401 unauthorized', () => {
            sendError(mockResponse as Response, 'Unauthorized', 401, 'AUTH_ERROR');

            expect(statusSpy).toHaveBeenCalledWith(401);
        });

        it('should handle 403 forbidden', () => {
            sendError(mockResponse as Response, 'Forbidden', 403);

            expect(statusSpy).toHaveBeenCalledWith(403);
        });
    });
});
