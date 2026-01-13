import { QueryRequestModel } from '../../../src/models/QueryRequest';
import { DatabaseType, SubmissionType, RequestStatus } from '../../../src/types';
import { prisma } from '../../../src/config/database';

// Mock Prisma
jest.mock('../../../src/config/database', () => ({
    prisma: {
        queryRequest: {
            findMany: jest.fn(),
            count: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            updateMany: jest.fn()
        }
    }
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-123')
}));

describe('QueryRequestModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockRequest = {
        id: 'req-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
        databaseType: DatabaseType.POSTGRESQL,
        instanceId: 'db-1',
        instanceName: 'Production DB',
        databaseName: 'app_db',
        submissionType: SubmissionType.QUERY,
        query: 'SELECT * FROM users',
        scriptFileName: null,
        scriptContent: null,
        comments: 'Test query',
        podId: 'pod-1',
        podName: 'Engineering',
        status: RequestStatus.PENDING,
        approverEmail: null,
        rejectionReason: null,
        executionResult: null,
        executionError: null,
        warnings: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        executedAt: null
    };

    describe('create', () => {
        it('should create a new query request', async () => {
            (prisma.queryRequest.create as jest.Mock).mockResolvedValue(mockRequest);

            const result = await QueryRequestModel.create({
                userId: 'user-1',
                userEmail: 'user@example.com',
                databaseType: DatabaseType.POSTGRESQL,
                instanceId: 'db-1',
                instanceName: 'Production DB',
                databaseName: 'app_db',
                submissionType: SubmissionType.QUERY,
                query: 'SELECT * FROM users',
                comments: 'Test query',
                podId: 'pod-1',
                podName: 'Engineering'
            });

            expect(result.id).toBe('req-1');
            expect(result.status).toBe('pending');
            expect(prisma.queryRequest.create).toHaveBeenCalled();
        });

        it('should handle optional fields and defaults', async () => {
            const mockRequestWithDefaults = {
                ...mockRequest,
                query: null,
                scriptFileName: null,
                scriptContent: null,
                approverEmail: null,
                rejectionReason: null,
                executionResult: null,
                executionError: null,
                warnings: [], // Default empty array from mapped type
                executedAt: null
            };
            (prisma.queryRequest.create as jest.Mock).mockResolvedValue(mockRequestWithDefaults);

            const result = await QueryRequestModel.create({
                userId: 'user-1',
                userEmail: 'user@example.com',
                databaseType: DatabaseType.POSTGRESQL,
                instanceId: 'db-1',
                instanceName: 'Production DB',
                databaseName: 'app_db',
                submissionType: SubmissionType.SCRIPT,
                // query missing
                comments: 'Test script',
                podId: 'pod-1',
                podName: 'Engineering'
            });

            expect(result.query).toBeUndefined();
            expect(prisma.queryRequest.create).toHaveBeenCalledWith(expect.objectContaining({
                data: expect.objectContaining({
                    query: null,
                    warnings: []
                })
            }));
        });
    });

    describe('findById', () => {
        it('should return request when found', async () => {
            (prisma.queryRequest.findUnique as jest.Mock).mockResolvedValue(mockRequest);

            const result = await QueryRequestModel.findById('req-1');

            expect(result).not.toBeNull();
            expect(result?.id).toBe('req-1');
        });

        it('should handle null warnings from DB', async () => {
            const mockRequestNoWarnings = {
                ...mockRequest,
                warnings: null
            };
            (prisma.queryRequest.findUnique as jest.Mock).mockResolvedValue(mockRequestNoWarnings);

            const result = await QueryRequestModel.findById('req-1');

            expect(result?.warnings).toBeUndefined();
        });

        it('should return null when not found', async () => {
            (prisma.queryRequest.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await QueryRequestModel.findById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('countPendingByUser', () => {
        it('should count pending and approved requests', async () => {
            (prisma.queryRequest.count as jest.Mock).mockResolvedValue(5);

            const count = await QueryRequestModel.countPendingByUser('user-1');

            expect(count).toBe(5);
            expect(prisma.queryRequest.count).toHaveBeenCalledWith({
                where: {
                    userId: 'user-1',
                    status: { in: [RequestStatus.PENDING, RequestStatus.APPROVED] }
                }
            });
        });
    });

    describe('findByUserId', () => {
        it('should return paginated results', async () => {
            (prisma.queryRequest.findMany as jest.Mock).mockResolvedValue([mockRequest]);
            (prisma.queryRequest.count as jest.Mock).mockResolvedValue(5);

            const result = await QueryRequestModel.findByUserId('user-1', 1, 10);

            expect(result.requests).toHaveLength(1);
            expect(result.total).toBe(5);
        });

        it('should use default page and limit', async () => {
            (prisma.queryRequest.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.queryRequest.count as jest.Mock).mockResolvedValue(0);

            await QueryRequestModel.findByUserId('user-1');

            expect(prisma.queryRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
                take: 20,
                skip: 0
            }));
        });

        it('should filter by status if provided', async () => {
            (prisma.queryRequest.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.queryRequest.count as jest.Mock).mockResolvedValue(0);

            await QueryRequestModel.findByUserId('user-1', 1, 20, RequestStatus.PENDING);

            expect(prisma.queryRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: { userId: 'user-1', status: RequestStatus.PENDING }
            }));
        });
    });

    describe('findWithFilters', () => {
        it('should filter by status', async () => {
            (prisma.queryRequest.findMany as jest.Mock).mockResolvedValue([mockRequest]);
            (prisma.queryRequest.count as jest.Mock).mockResolvedValue(1);

            const result = await QueryRequestModel.findWithFilters(
                { status: RequestStatus.PENDING },
                1,
                20
            );

            expect(result.requests).toHaveLength(1);
            expect(prisma.queryRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({ status: RequestStatus.PENDING })
            }));
        });

        it('should apply extensive filters (podId, approver, dates)', async () => {
            (prisma.queryRequest.findMany as jest.Mock).mockResolvedValue([]);
            (prisma.queryRequest.count as jest.Mock).mockResolvedValue(0);

            const filters = {
                podId: 'pod-1',
                approverEmail: 'approver@example.com',
                allowedPodIds: ['pod-1', 'pod-2'],
                dateFrom: new Date('2024-01-01'),
                dateTo: new Date('2024-01-31')
            };

            await QueryRequestModel.findWithFilters(filters);

            expect(prisma.queryRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
                where: expect.objectContaining({
                    podId: { in: ['pod-1', 'pod-2'] }, // allowedPodIds overrides check
                    approverEmail: 'approver@example.com',
                    createdAt: {
                        gte: filters.dateFrom,
                        lte: filters.dateTo
                    }
                })
            }));
        });
    });

    describe('approve', () => {
        it('should approve request', async () => {
            const approvedRequest = { ...mockRequest, status: RequestStatus.APPROVED, approverEmail: 'approver@example.com' };
            (prisma.queryRequest.update as jest.Mock).mockResolvedValue(approvedRequest);

            const result = await QueryRequestModel.approve('req-1', 'approver@example.com');

            expect(result).not.toBeNull();
            expect(result?.status).toBe('approved');
        });

        it('should return null when request not found', async () => {
            (prisma.queryRequest.update as jest.Mock).mockRejectedValue(new Error('P2025')); // Record not found

            const result = await QueryRequestModel.approve('nonexistent', 'approver@example.com');

            expect(result).toBeNull();
        });
    });

    describe('reject', () => {
        it('should reject request with reason', async () => {
            const rejectedRequest = {
                ...mockRequest,
                status: RequestStatus.REJECTED,
                approverEmail: 'approver@example.com',
                rejectionReason: 'Policy violation'
            };
            (prisma.queryRequest.update as jest.Mock).mockResolvedValue(rejectedRequest);

            const result = await QueryRequestModel.reject('req-1', 'approver@example.com', 'Policy violation');

            expect(result?.status).toBe('rejected');
            expect(result?.rejectionReason).toBe('Policy violation');
        });

        it('should return null on failure', async () => {
            (prisma.queryRequest.update as jest.Mock).mockRejectedValue(new Error('Error'));
            const result = await QueryRequestModel.reject('req-1', 'approver@example.com');
            expect(result).toBeNull();
        });
    });

    describe('withdraw', () => {
        it('should withdraw pending request', async () => {
            (prisma.queryRequest.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
            (prisma.queryRequest.findUnique as jest.Mock).mockResolvedValue({ ...mockRequest, status: RequestStatus.WITHDRAWN });

            const result = await QueryRequestModel.withdraw('req-1', 'user-1');

            expect(result?.status).toBe('withdrawn');
            expect(prisma.queryRequest.updateMany).toHaveBeenCalledWith({
                where: { id: 'req-1', userId: 'user-1', status: RequestStatus.PENDING },
                data: { status: RequestStatus.WITHDRAWN }
            });
        });

        it('should return null if nothing updated (e.g. not pending or not owner)', async () => {
            (prisma.queryRequest.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

            const result = await QueryRequestModel.withdraw('req-1', 'user-1');

            expect(result).toBeNull();
        });

        it('should return null on failure', async () => {
            (prisma.queryRequest.updateMany as jest.Mock).mockRejectedValue(new Error('Error'));
            const result = await QueryRequestModel.withdraw('req-1', 'user-1');
            expect(result).toBeNull();
        });
    });

    describe('setExecutionResult', () => {
        it('should set successful execution result', async () => {
            const executedRequest = {
                ...mockRequest,
                status: RequestStatus.EXECUTED,
                executionResult: '{"rows": []}',
                executedAt: new Date()
            };
            (prisma.queryRequest.update as jest.Mock).mockResolvedValue(executedRequest);

            const result = await QueryRequestModel.setExecutionResult('req-1', true, '{"rows": []}');

            expect(result).not.toBeNull();
            expect(result?.status).toBe('executed');
        });

        it('should set failed execution result', async () => {
            const failedRequest = {
                ...mockRequest,
                status: RequestStatus.FAILED,
                executionError: 'Syntax Error',
                executedAt: new Date()
            };
            (prisma.queryRequest.update as jest.Mock).mockResolvedValue(failedRequest);

            const result = await QueryRequestModel.setExecutionResult('req-1', false, undefined, 'Syntax Error');

            expect(result?.status).toBe('failed');
            expect(result?.executionError).toBe('Syntax Error');
        });

        it('should return null on error', async () => {
            (prisma.queryRequest.update as jest.Mock).mockRejectedValue(new Error('Update failed'));

            const result = await QueryRequestModel.setExecutionResult('req-1', true);

            expect(result).toBeNull();
        });
    });
});
