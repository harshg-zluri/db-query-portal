import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import * as QueryRequestModel from '../../../src/models/QueryRequest';
import { DatabaseType, SubmissionType, RequestStatus } from '../../../src/types';
import { getEm } from '../../../src/config/database';
import { QueryRequest } from '../../../src/entities/QueryRequest';

// Mock database
jest.mock('../../../src/config/database');

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-123')
}));

describe('QueryRequestModel', () => {
    let mockEm: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockEm = {
            persistAndFlush: jest.fn(),
            findOne: jest.fn(),
            findAndCount: jest.fn(),
            flush: jest.fn(),
            nativeUpdate: jest.fn(),
            count: jest.fn(),
        };
        (getEm as jest.Mock).mockReturnValue(mockEm);
    });

    const mockRequest = {
        id: 'req-1',
        userId: 'user-1',
        status: RequestStatus.PENDING,
        toJSON: () => ({ id: 'req-1', status: RequestStatus.PENDING })
    };

    describe('create', () => {
        it('should create a new query request', async () => {
            const result = await QueryRequestModel.createRequest({
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

            expect(mockEm.persistAndFlush).toHaveBeenCalled();
            expect(result.id).toBe('test-uuid-123');
            expect(result.status).toBe('pending');
        });
        it('should create a new query request with optional fields', async () => {
            const data: any = {
                userId: 'user-1',
                userEmail: 'user@example.com',
                databaseType: DatabaseType.POSTGRESQL,
                instanceId: 'db-1',
                instanceName: 'Production DB',
                databaseName: 'app_db',
                submissionType: SubmissionType.SCRIPT,
                scriptFileName: 'test.js',
                scriptContent: 'console.log("test")',
                comments: 'Test script',
                podId: 'pod-1',
                podName: 'Engineering',
                warnings: ['Warning 1']
            };

            await QueryRequestModel.createRequest(data);

            expect(mockEm.persistAndFlush).toHaveBeenCalledWith(
                expect.objectContaining({
                    scriptFileName: 'test.js',
                    scriptContent: 'console.log("test")',
                    warnings: ['Warning 1']
                })
            );
        });
    });

    describe('findById', () => {
        it('should return request when found', async () => {
            mockEm.findOne.mockResolvedValue(mockRequest);

            const result = await QueryRequestModel.findRequestById('req-1');

            expect(result).toEqual(mockRequest);
            expect(mockEm.findOne).toHaveBeenCalledWith(QueryRequest, { id: 'req-1' });
        });

        it('should return null when not found', async () => {
            mockEm.findOne.mockResolvedValue(null);
            const result = await QueryRequestModel.findRequestById('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('findByUserId', () => {
        it('should return paginated results', async () => {
            mockEm.findAndCount.mockResolvedValue([[mockRequest], 1]);

            const result = await QueryRequestModel.findRequestsByUserId('user-1', 1, 10);

            expect(result.requests).toHaveLength(1);
            expect(result.total).toBe(1);
        });

        it('should use default pagination', async () => {
            mockEm.findAndCount.mockResolvedValue([[mockRequest], 1]);

            await QueryRequestModel.findRequestsByUserId('user-1');

            expect(mockEm.findAndCount).toHaveBeenCalledWith(
                QueryRequest,
                { userId: 'user-1' },
                expect.objectContaining({ limit: 20, offset: 0 })
            );
        });

        it('should filter by status', async () => {
            mockEm.findAndCount.mockResolvedValue([[mockRequest], 1]);

            await QueryRequestModel.findRequestsByUserId('user-1', 1, 10, RequestStatus.PENDING);

            expect(mockEm.findAndCount).toHaveBeenCalledWith(
                QueryRequest,
                { userId: 'user-1', status: RequestStatus.PENDING },
                expect.any(Object)
            );
        });
    });

    describe('findWithFilters', () => {
        it('should filter by status', async () => {
            mockEm.findAndCount.mockResolvedValue([[mockRequest], 1]);

            const result = await QueryRequestModel.findRequestsWithFilters(
                { status: RequestStatus.PENDING },
                1,
                20
            );

            expect(result.requests).toHaveLength(1);
            expect(mockEm.findAndCount).toHaveBeenCalledWith(
                QueryRequest,
                expect.objectContaining({ status: RequestStatus.PENDING }),
                expect.any(Object)
            );
        });

        it('should filter by date range', async () => {
            mockEm.findAndCount.mockResolvedValue([[mockRequest], 1]);
            const fromDate = new Date('2024-01-01');
            const toDate = new Date('2024-01-31');

            await QueryRequestModel.findRequestsWithFilters({
                dateFrom: fromDate,
                dateTo: toDate
            });

            expect(mockEm.findAndCount).toHaveBeenCalledWith(
                QueryRequest,
                expect.objectContaining({
                    createdAt: {
                        $gte: fromDate,
                        $lte: toDate
                    }
                }),
                expect.any(Object)
            );
        });

        it('should filter by date range and status', async () => {
            mockEm.findAndCount.mockResolvedValue([[mockRequest], 1]);
            const fromDate = new Date('2024-01-01');
            const toDate = new Date('2024-01-31');

            await QueryRequestModel.findRequestsWithFilters({
                status: RequestStatus.APPROVED,
                dateFrom: fromDate,
                dateTo: toDate
            });

            expect(mockEm.findAndCount).toHaveBeenCalledWith(
                QueryRequest,
                expect.objectContaining({
                    status: RequestStatus.APPROVED,
                    createdAt: {
                        $gte: fromDate,
                        $lte: toDate
                    }
                }),
                expect.any(Object)
            );
        });

        it('should filter by specific fields (podId, approverEmail, allowedPodIds)', async () => {
            mockEm.findAndCount.mockResolvedValue([[mockRequest], 1]);

            await QueryRequestModel.findRequestsWithFilters({
                podId: 'pod-1',
                approverEmail: 'admin@example.com',
                allowedPodIds: ['pod-1', 'pod-2']
            });

            expect(mockEm.findAndCount).toHaveBeenCalledWith(
                QueryRequest,
                expect.objectContaining({
                    podId: { $in: ['pod-1', 'pod-2'] },
                    approverEmail: 'admin@example.com'
                }),
                expect.any(Object)
            );
        });
    });

    describe('approve', () => {
        it('should approve request', async () => {
            mockEm.findOne.mockResolvedValue(mockRequest);

            const result = await QueryRequestModel.approveRequest('req-1', 'approver@example.com');

            expect(mockEm.flush).toHaveBeenCalled();
            expect(result?.status).toBe('approved');
            expect(result?.approverEmail).toBe('approver@example.com');
        });
        // ... (rest of the file remains same, just verify context matching)
        // Wait, I shouldn't replace lines if I can avoid large chunks. 
        // I will split this into two calls or just target specific blocks.

        // Actually, I'll use multi_replace to be precise.


        it('should return null when request not found', async () => {
            mockEm.findOne.mockResolvedValue(null);
            const result = await QueryRequestModel.approveRequest('nonexistent', 'approver@example.com');
            expect(result).toBeNull();
        });
    });



    describe('reject', () => {
        it('should reject request with reason', async () => {
            mockEm.findOne.mockResolvedValue(mockRequest);

            const result = await QueryRequestModel.rejectRequest('req-1', 'approver@example.com', 'Not allowed');

            expect(mockEm.flush).toHaveBeenCalled();
            expect(result?.status).toBe('rejected');
            expect(result?.rejectionReason).toBe('Not allowed');
        });

        it('should return null when request not found', async () => {
            mockEm.findOne.mockResolvedValue(null);
            const result = await QueryRequestModel.rejectRequest('nonexistent', 'approver@example.com');
            expect(result).toBeNull();
        });
    });

    describe('setExecutionResult', () => {
        it('should set successful execution result', async () => {
            mockEm.findOne.mockResolvedValue(mockRequest);

            const result = await QueryRequestModel.setRequestExecutionResult('req-1', true, '[]');

            expect(mockEm.flush).toHaveBeenCalled();
            expect(result?.status).toBe('executed');
            expect(result?.executionResult).toBe('[]');
        });

        it('should set failed execution result with error', async () => {
            mockEm.findOne.mockResolvedValue(mockRequest);

            const result = await QueryRequestModel.setRequestExecutionResult('req-1', false, undefined, 'Syntax error');

            expect(mockEm.flush).toHaveBeenCalled();
            expect(result?.status).toBe('failed');
            expect(result?.executionError).toBe('Syntax error');
        });

        it('should set compressed flag', async () => {
            mockEm.findOne.mockResolvedValue(mockRequest);

            const result = await QueryRequestModel.setRequestExecutionResult('req-1', true, '[]', undefined, true);

            expect(result?.isCompressed).toBe(true);
        });

        it('should return null if request not found', async () => {
            mockEm.findOne.mockResolvedValue(null);
            const result = await QueryRequestModel.setRequestExecutionResult('nonexistent', true);
            expect(result).toBeNull();
        });
    });

    describe('withdraw', () => {
        it('should withdraw request', async () => {
            mockEm.findOne.mockResolvedValue(mockRequest);

            const result = await QueryRequestModel.withdrawRequest('req-1', 'user-1');

            expect(mockEm.flush).toHaveBeenCalled();
            expect(result?.status).toBe('withdrawn');
        });

        it('should return null if request not found', async () => {
            mockEm.findOne.mockResolvedValue(null);
            const result = await QueryRequestModel.withdrawRequest('nonexistent', 'user-1');
            expect(result).toBeNull();
        });
    });

    describe('countPendingByUser', () => {
        it('should return pending count', async () => {
            mockEm.count.mockResolvedValue(5);

            const count = await QueryRequestModel.countPendingRequestsByUser('user-1');

            expect(count).toBe(5);
            expect(mockEm.count).toHaveBeenCalledWith(QueryRequest, {
                userId: 'user-1',
                status: { $in: [RequestStatus.PENDING, RequestStatus.APPROVED] }
            });
        });
    });
});
