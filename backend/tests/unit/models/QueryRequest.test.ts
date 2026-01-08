import { QueryRequestModel } from '../../../src/models/QueryRequest';
import { DatabaseType, SubmissionType, RequestStatus } from '../../../src/types';

// Mock database query
jest.mock('../../../src/config/database', () => ({
    query: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-123')
}));

import { query } from '../../../src/config/database';

describe('QueryRequestModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    const mockRequestRow = {
        id: 'req-1',
        user_id: 'user-1',
        user_email: 'user@example.com',
        database_type: 'postgresql',
        instance_id: 'db-1',
        instance_name: 'Production DB',
        database_name: 'app_db',
        submission_type: 'query',
        query: 'SELECT * FROM users',
        script_file_name: null,
        script_content: null,
        comments: 'Test query',
        pod_id: 'pod-1',
        pod_name: 'Engineering',
        status: 'pending',
        approver_email: null,
        rejection_reason: null,
        execution_result: null,
        execution_error: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        executed_at: null
    };

    describe('create', () => {
        it('should create a new query request', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [mockRequestRow] });

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
            expect(query).toHaveBeenCalled();
        });

        it('should create script submission request', async () => {
            const scriptRow = { ...mockRequestRow, submission_type: 'script', query: null, script_file_name: 'script.js', script_content: 'console.log(1)' };
            (query as jest.Mock).mockResolvedValue({ rows: [scriptRow] });

            const result = await QueryRequestModel.create({
                userId: 'user-1',
                userEmail: 'user@example.com',
                databaseType: DatabaseType.POSTGRESQL,
                instanceId: 'db-1',
                instanceName: 'Production DB',
                databaseName: 'app_db',
                submissionType: SubmissionType.SCRIPT,
                scriptFileName: 'script.js',
                scriptContent: 'console.log(1)',
                comments: 'Test script',
                podId: 'pod-1',
                podName: 'Engineering'
            });

            expect(result.submissionType).toBe('script');
        });
    });

    describe('findById', () => {
        it('should return request when found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [mockRequestRow] });

            const result = await QueryRequestModel.findById('req-1');

            expect(result).not.toBeNull();
            expect(result?.id).toBe('req-1');
            expect(result?.query).toBe('SELECT * FROM users');
        });

        it('should return null when not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await QueryRequestModel.findById('nonexistent');

            expect(result).toBeNull();
        });

        it('should handle executed_at field', async () => {
            const executedRow = { ...mockRequestRow, executed_at: '2024-01-02T00:00:00Z' };
            (query as jest.Mock).mockResolvedValue({ rows: [executedRow] });

            const result = await QueryRequestModel.findById('req-1');

            expect(result?.executedAt).toBeInstanceOf(Date);
        });
    });

    describe('findByUserId', () => {
        it('should return paginated results', async () => {
            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [mockRequestRow] })
                .mockResolvedValueOnce({ rows: [{ total: '5' }] });

            const result = await QueryRequestModel.findByUserId('user-1', 1, 10);

            expect(result.requests).toHaveLength(1);
            expect(result.total).toBe(5);
        });

        it('should use default pagination', async () => {
            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: '0' }] });

            const result = await QueryRequestModel.findByUserId('user-1');

            expect(result.requests).toHaveLength(0);
            expect(result.total).toBe(0);
        });

        it('should filter by status', async () => {
            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [mockRequestRow] })
                .mockResolvedValueOnce({ rows: [{ total: '1' }] });

            const result = await QueryRequestModel.findByUserId('user-1', 1, 10, RequestStatus.PENDING);

            expect(result.requests).toHaveLength(1);
            expect(result.total).toBe(1);
            expect(query).toHaveBeenCalledWith(expect.stringContaining('WHERE'), expect.any(Array));
        });
    });

    describe('findWithFilters', () => {
        it('should filter by status', async () => {
            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [mockRequestRow] })
                .mockResolvedValueOnce({ rows: [{ total: '1' }] });

            const result = await QueryRequestModel.findWithFilters(
                { status: RequestStatus.PENDING },
                1,
                20
            );

            expect(result.requests).toHaveLength(1);
        });

        it('should handle all filter options', async () => {
            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: '0' }] });

            const result = await QueryRequestModel.findWithFilters({
                status: RequestStatus.APPROVED,
                podId: 'pod-1',
                approverEmail: 'approver@example.com',
                dateFrom: new Date('2024-01-01'),
                dateTo: new Date('2024-12-31'),
                allowedPodIds: ['pod-1', 'pod-2']
            });

            expect(result.requests).toHaveLength(0);
        });

        it('should use default pagination', async () => {
            (query as jest.Mock)
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ total: '0' }] });

            await QueryRequestModel.findWithFilters({});

            expect(query).toHaveBeenCalled();
        });
    });

    describe('approve', () => {
        it('should approve request', async () => {
            const approvedRow = { ...mockRequestRow, status: 'approved', approver_email: 'approver@example.com' };
            (query as jest.Mock).mockResolvedValue({ rows: [approvedRow] });

            const result = await QueryRequestModel.approve('req-1', 'approver@example.com');

            expect(result).not.toBeNull();
            expect(result?.status).toBe('approved');
        });

        it('should return null when request not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await QueryRequestModel.approve('nonexistent', 'approver@example.com');

            expect(result).toBeNull();
        });
    });

    describe('reject', () => {
        it('should reject request with reason', async () => {
            const rejectedRow = { ...mockRequestRow, status: 'rejected', rejection_reason: 'Not allowed' };
            (query as jest.Mock).mockResolvedValue({ rows: [rejectedRow] });

            const result = await QueryRequestModel.reject('req-1', 'approver@example.com', 'Not allowed');

            expect(result).not.toBeNull();
            expect(result?.status).toBe('rejected');
        });

        it('should reject request without reason', async () => {
            const rejectedRow = { ...mockRequestRow, status: 'rejected' };
            (query as jest.Mock).mockResolvedValue({ rows: [rejectedRow] });

            const result = await QueryRequestModel.reject('req-1', 'approver@example.com');

            expect(result).not.toBeNull();
        });

        it('should return null when request not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await QueryRequestModel.reject('nonexistent', 'approver@example.com');

            expect(result).toBeNull();
        });
    });

    describe('setExecutionResult', () => {
        it('should set successful execution result', async () => {
            const executedRow = { ...mockRequestRow, status: 'executed', execution_result: '{"rows": []}', executed_at: '2024-01-02T00:00:00Z' };
            (query as jest.Mock).mockResolvedValue({ rows: [executedRow] });

            const result = await QueryRequestModel.setExecutionResult('req-1', true, '{"rows": []}');

            expect(result).not.toBeNull();
            expect(result?.status).toBe('executed');
        });

        it('should set failed execution result', async () => {
            const failedRow = { ...mockRequestRow, status: 'failed', execution_error: 'Connection failed' };
            (query as jest.Mock).mockResolvedValue({ rows: [failedRow] });

            const result = await QueryRequestModel.setExecutionResult('req-1', false, undefined, 'Connection failed');

            expect(result).not.toBeNull();
            expect(result?.status).toBe('failed');
        });

        it('should return null when request not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await QueryRequestModel.setExecutionResult('nonexistent', true);

            expect(result).toBeNull();
        });
    });

    describe('withdraw', () => {
        it('should withdraw request', async () => {
            const withdrawnRow = { ...mockRequestRow, status: 'withdrawn' };
            (query as jest.Mock).mockResolvedValue({ rows: [withdrawnRow] });

            const result = await QueryRequestModel.withdraw('req-1', 'user-1');

            expect(result).not.toBeNull();
            expect(result?.status).toBe('withdrawn');
        });

        it('should return null when request not found or not owned by user', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await QueryRequestModel.withdraw('nonexistent', 'user-1');

            expect(result).toBeNull();
        });
    });

    describe('countPendingByUser', () => {
        it('should return pending count', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [{ total: '5' }] });

            const count = await QueryRequestModel.countPendingByUser('user-1');

            expect(count).toBe(5);
        });
    });
});
