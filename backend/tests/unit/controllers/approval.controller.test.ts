import { Request, Response, NextFunction } from 'express';
import { ApprovalController } from '../../../src/controllers/approval.controller';
import { QueryRequestModel } from '../../../src/models/QueryRequest';
import { ExecutionService } from '../../../src/services/execution.service';
import * as responseHelper from '../../../src/utils/responseHelper';
import { UserRole, RequestStatus, DatabaseType, SubmissionType } from '../../../src/types';
import { NotFoundError, ForbiddenError, ValidationError } from '../../../src/utils/errors';

// Mock dependencies
jest.mock('../../../src/models/QueryRequest');
jest.mock('../../../src/services/execution.service');
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
    AuditAction: { REQUEST_APPROVED: 'REQUEST_APPROVED', REQUEST_REJECTED: 'REQUEST_REJECTED', PENDING_REQUESTS_VIEWED: 'PENDING_REQUESTS_VIEWED', FORBIDDEN_ACCESS: 'FORBIDDEN_ACCESS', QUERY_EXECUTED: 'QUERY_EXECUTED', EXECUTION_FAILED: 'EXECUTION_FAILED' }
}));

describe('ApprovalController', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let nextFunction: NextFunction;

    const mockQueryRequest = {
        id: 'req-123',
        userId: 'user-456',
        userEmail: 'dev@zluri.com',
        databaseType: DatabaseType.POSTGRESQL,
        instanceId: 'inst-1',
        instanceName: 'prod-db',
        databaseName: 'app',
        submissionType: SubmissionType.QUERY,
        query: 'SELECT * FROM users',
        comments: 'Test query',
        podId: 'pod-1',
        podName: 'Pod 1',
        status: RequestStatus.PENDING,
        createdAt: new Date(),
        updatedAt: new Date()
    };

    beforeEach(() => {
        jest.clearAllMocks();
        mockRequest = {
            params: { id: 'req-123' },
            body: {},
            query: {},
            headers: {},
            requestId: 'test-req-id',
            socket: { remoteAddress: '127.0.0.1' } as any
        };
        mockResponse = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        nextFunction = jest.fn();
    });

    describe('getClientIp edge cases', () => {
        it('should handle x-forwarded-for as array', async () => {
            mockRequest.user = { userId: 'manager-1', email: 'manager@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            mockRequest.headers = { 'x-forwarded-for': ['192.168.1.1', '10.0.0.1'] };

            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(null);

            await ApprovalController.approve(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });

        it('should handle x-forwarded-for as string', async () => {
            mockRequest.user = { userId: 'manager-1', email: 'manager@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            mockRequest.headers = { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' };

            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(null);

            await ApprovalController.approve(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });

        it('should handle undefined socket.remoteAddress', async () => {
            mockRequest.user = { userId: 'manager-1', email: 'manager@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            mockRequest.headers = {};
            mockRequest.socket = { remoteAddress: undefined } as any;

            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(null);

            await ApprovalController.approve(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalled();
        });
    });


    describe('approve', () => {
        it('should approve and execute request successfully', async () => {
            mockRequest.user = {
                userId: 'manager-1',
                email: 'manager@zluri.com',
                role: UserRole.ADMIN,
                managedPodIds: []
            };

            (QueryRequestModel.findById as jest.Mock)
                .mockResolvedValueOnce(mockQueryRequest)
                .mockResolvedValueOnce({ ...mockQueryRequest, status: RequestStatus.EXECUTED });
            (QueryRequestModel.approve as jest.Mock).mockResolvedValue({
                ...mockQueryRequest,
                status: RequestStatus.APPROVED
            });
            (ExecutionService.executeRequest as jest.Mock).mockResolvedValue({
                success: true,
                output: 'Query executed'
            });

            await ApprovalController.approve(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(QueryRequestModel.approve).toHaveBeenCalledWith('req-123', 'manager@zluri.com');
            expect(ExecutionService.executeRequest).toHaveBeenCalled();
            expect(responseHelper.sendSuccess).toHaveBeenCalled();
        });

        it('should reject if request not found', async () => {
            mockRequest.user = { userId: 'manager-1', email: 'manager@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(null);

            await ApprovalController.approve(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(NotFoundError));
        });

        it('should reject if request not pending', async () => {
            mockRequest.user = { userId: 'manager-1', email: 'manager@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue({
                ...mockQueryRequest,
                status: RequestStatus.EXECUTED
            });

            await ApprovalController.approve(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(ValidationError));
        });

        it('should reject if manager lacks POD access', async () => {
            mockRequest.user = {
                userId: 'manager-1',
                email: 'manager@zluri.com',
                role: UserRole.MANAGER,
                managedPodIds: ['pod-2']  // Different POD
            };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockQueryRequest);

            await ApprovalController.approve(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should handle execution failure', async () => {
            mockRequest.user = { userId: 'admin-1', email: 'admin@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };

            (QueryRequestModel.findById as jest.Mock)
                .mockResolvedValueOnce(mockQueryRequest)
                .mockResolvedValueOnce({ ...mockQueryRequest, status: RequestStatus.FAILED });
            (QueryRequestModel.approve as jest.Mock).mockResolvedValue({
                ...mockQueryRequest,
                status: RequestStatus.APPROVED
            });
            (ExecutionService.executeRequest as jest.Mock).mockResolvedValue({
                success: false,
                error: 'Execution failed'
            });

            await ApprovalController.approve(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(responseHelper.sendSuccess).toHaveBeenCalled();
        });

        it('should handle approve returning null', async () => {
            mockRequest.user = { userId: 'admin-1', email: 'admin@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockQueryRequest);
            (QueryRequestModel.approve as jest.Mock).mockResolvedValue(null);

            await ApprovalController.approve(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(NotFoundError));
        });
    });

    describe('reject', () => {
        it('should reject request successfully', async () => {
            mockRequest.user = { userId: 'admin-1', email: 'admin@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            mockRequest.body = { reason: 'Not approved' };

            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockQueryRequest);
            (QueryRequestModel.reject as jest.Mock).mockResolvedValue({
                ...mockQueryRequest,
                status: RequestStatus.REJECTED,
                rejectionReason: 'Not approved'
            });

            await ApprovalController.reject(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(QueryRequestModel.reject).toHaveBeenCalledWith('req-123', 'admin@zluri.com', 'Not approved');
            expect(responseHelper.sendSuccess).toHaveBeenCalled();
        });

        it('should reject without reason', async () => {
            mockRequest.user = { userId: 'admin-1', email: 'admin@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            mockRequest.body = {};

            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockQueryRequest);
            (QueryRequestModel.reject as jest.Mock).mockResolvedValue({
                ...mockQueryRequest,
                status: RequestStatus.REJECTED
            });

            await ApprovalController.reject(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(QueryRequestModel.reject).toHaveBeenCalledWith('req-123', 'admin@zluri.com', undefined);
        });

        it('should fail if request not found', async () => {
            mockRequest.user = { userId: 'admin-1', email: 'admin@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(null);

            await ApprovalController.reject(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(NotFoundError));
        });

        it('should fail if request not pending', async () => {
            mockRequest.user = { userId: 'admin-1', email: 'admin@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue({
                ...mockQueryRequest,
                status: RequestStatus.EXECUTED
            });

            await ApprovalController.reject(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(ValidationError));
        });

        it('should fail if manager lacks POD access', async () => {
            mockRequest.user = {
                userId: 'manager-1',
                email: 'manager@zluri.com',
                role: UserRole.MANAGER,
                managedPodIds: ['pod-2']
            };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockQueryRequest);

            await ApprovalController.reject(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should handle reject returning null', async () => {
            mockRequest.user = { userId: 'admin-1', email: 'admin@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockQueryRequest);
            (QueryRequestModel.reject as jest.Mock).mockResolvedValue(null);

            await ApprovalController.reject(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(NotFoundError));
        });
    });

    describe('getPending', () => {
        it('should get pending requests for admin', async () => {
            mockRequest.user = { userId: 'admin-1', email: 'admin@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            mockRequest.query = { page: '1', limit: '20' };

            (QueryRequestModel.findWithFilters as jest.Mock).mockResolvedValue({
                requests: [mockQueryRequest],
                total: 1
            });

            await ApprovalController.getPending(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(QueryRequestModel.findWithFilters).toHaveBeenCalledWith(
                { status: RequestStatus.PENDING },
                1,
                20
            );
            expect(responseHelper.sendPaginated).toHaveBeenCalledWith(
                expect.any(Object),
                [mockQueryRequest],
                1,
                20,
                1
            );
        });

        it('should filter by PODs for manager', async () => {
            mockRequest.user = {
                userId: 'manager-1',
                email: 'manager@zluri.com',
                role: UserRole.MANAGER,
                managedPodIds: ['pod-1', 'pod-2']
            };
            mockRequest.query = {};

            (QueryRequestModel.findWithFilters as jest.Mock).mockResolvedValue({
                requests: [],
                total: 0
            });

            await ApprovalController.getPending(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(QueryRequestModel.findWithFilters).toHaveBeenCalledWith(
                { status: RequestStatus.PENDING, allowedPodIds: ['pod-1', 'pod-2'] },
                1,
                20
            );
        });

        it('should handle errors', async () => {
            mockRequest.user = { userId: 'admin-1', email: 'admin@zluri.com', role: UserRole.ADMIN, managedPodIds: [] };
            mockRequest.query = {};
            const error = new Error('Database error');
            (QueryRequestModel.findWithFilters as jest.Mock).mockRejectedValue(error);

            await ApprovalController.getPending(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(error);
        });
    });
});
