import { Request, Response, NextFunction } from 'express';
import { RequestController } from '../../../src/controllers/request.controller';
import { QueryRequestModel } from '../../../src/models/QueryRequest';
import { DatabaseInstanceModel } from '../../../src/models/DatabaseInstance';
import { PodModel } from '../../../src/models/Pod';
import { UserRole, SubmissionType, RequestStatus } from '../../../src/types';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../src/utils/errors';
import { logger } from '../../../src/utils/logger';
import { sendSlackNotification } from '../../../src/services/slack.service';

// Mock dependencies
jest.mock('../../../src/models/QueryRequest');
jest.mock('../../../src/models/DatabaseInstance');
jest.mock('../../../src/models/Pod');
jest.mock('../../../src/utils/logger', () => ({
    logger: { audit: jest.fn() },
    AuditCategory: { REQUEST: 'request', ACCESS: 'access' },
    AuditAction: { REQUEST_CREATED: 'request_created', FORBIDDEN_ACCESS: 'forbidden', REQUEST_WITHDRAWN: 'request_withdrawn' }
}));
jest.mock('../../../src/services/slack.service');
jest.mock('../../../src/config/environment', () => ({
    config: {
        requestLimits: { maxPendingPerUser: 5 }
    }
}));

// Mock response helpers via implementation
jest.mock('../../../src/utils/responseHelper', () => ({
    sendSuccess: jest.fn((res, data) => res.status(200).json({ success: true, data })),
    sendCreated: jest.fn((res, data) => res.status(201).json({ success: true, data })),
    sendPaginated: jest.fn((res, data, page, limit, total) => res.status(200).json({ success: true, pagination: { page, limit, total }, data }))
}));

describe('RequestController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    const mockUser = {
        userId: 'user-1',
        email: 'test@zluri.com',
        role: UserRole.DEVELOPER,
        managedPodIds: []
    };

    beforeEach(() => {
        req = {
            user: mockUser,
            headers: {},
            body: {},
            query: {},
            params: {},
            get: jest.fn(),
            socket: { remoteAddress: '127.0.0.1' }
        } as unknown as Partial<Request>;

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        next = jest.fn();
        jest.clearAllMocks();
    });


    const validBody = {
        instanceId: 'inst-1',
        databaseType: 'postgres',
        databaseName: 'db1',
        podId: 'pod-1',
        submissionType: SubmissionType.QUERY,
        query: 'SELECT * FROM table',
        comments: 'Test request'
    };

    const mockInstance = {
        id: 'inst-1',
        name: 'Instance 1',
        type: 'postgres',
        databases: ['db1']
    };

    const mockPod = {
        id: 'pod-1',
        name: 'Core POD'
    };

    describe('create', () => {

        it('should create a valid SQL request', async () => {
            req.body = validBody;

            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);
            (QueryRequestModel.countPendingByUser as jest.Mock).mockResolvedValue(0);
            (QueryRequestModel.create as jest.Mock).mockResolvedValue({ id: 'req-1', ...validBody });

            await RequestController.create(req as Request, res as Response, next);

            expect(QueryRequestModel.create).toHaveBeenCalled();
            expect(sendSlackNotification).toHaveBeenCalled();
            expect(logger.audit).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });

        it('should throw NotFoundError if instance does not exist', async () => {
            req.body = validBody;
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(null);

            await RequestController.create(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        });

        it('should throw ValidationError if db type mismatch', async () => {
            req.body = validBody;
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue({ ...mockInstance, type: 'mongodb' });

            await RequestController.create(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        });

        it('should throw ValidationError if database not in instance', async () => {
            req.body = validBody;
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue({ ...mockInstance, databases: ['other'] });

            await RequestController.create(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        });

        it('should throw NotFoundError if pod does not exist', async () => {
            req.body = validBody;
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(null);

            await RequestController.create(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        });

        it('should return 429 if limit exceeded', async () => {
            req.body = validBody;
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);
            (QueryRequestModel.countPendingByUser as jest.Mock).mockResolvedValue(10); // Limit is 5

            await RequestController.create(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(429);
            expect(QueryRequestModel.create).not.toHaveBeenCalled();
        });

        it('should handle script upload', async () => {
            req.body = { ...validBody, submissionType: SubmissionType.SCRIPT };
            req.file = { originalname: 'test.js', buffer: Buffer.from('console.log') } as any;

            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);
            (QueryRequestModel.countPendingByUser as jest.Mock).mockResolvedValue(0);
            (QueryRequestModel.create as jest.Mock).mockResolvedValue({ id: 'req-1' });

            await RequestController.create(req as Request, res as Response, next);

            expect(QueryRequestModel.create).toHaveBeenCalledWith(expect.objectContaining({
                scriptContent: 'console.log'
            }));
        });
        it('should handle X-Forwarded-For header', async () => {
            req.headers!['x-forwarded-for'] = '10.0.0.1, 10.0.0.2';
            req.body = validBody;

            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);
            (QueryRequestModel.create as jest.Mock).mockResolvedValue({ id: 'req-1' });

            await RequestController.create(req as Request, res as Response, next);

            expect(logger.audit).toHaveBeenCalledWith(expect.objectContaining({
                ipAddress: '10.0.0.1'
            }));
        });

        it('should handle X-Forwarded-For header as array', async () => {
            req.headers!['x-forwarded-for'] = ['10.0.0.1', '10.0.0.2'];
            req.body = validBody;

            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);
            (QueryRequestModel.create as jest.Mock).mockResolvedValue({ id: 'req-1' });

            await RequestController.create(req as Request, res as Response, next);

            expect(logger.audit).toHaveBeenCalledWith(expect.objectContaining({
                ipAddress: '10.0.0.1'
            }));
        });

        it('should fallback to remoteAddress', async () => {
            req.headers = {};
            req.socket = { remoteAddress: '127.0.0.1' } as any;
            req.body = validBody;

            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);
            (QueryRequestModel.create as jest.Mock).mockResolvedValue({ id: 'req-1' });

            await RequestController.create(req as Request, res as Response, next);

            expect(logger.audit).toHaveBeenCalledWith(expect.objectContaining({
                ipAddress: '127.0.0.1'
            }));
        });

        it('should return unknown for ip if undefined', async () => {
            req.headers = {};
            req.socket = {} as any; // No remoteAddress
            req.body = validBody;

            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);
            (QueryRequestModel.create as jest.Mock).mockResolvedValue({ id: 'req-1' });

            await RequestController.create(req as Request, res as Response, next);

            expect(logger.audit).toHaveBeenCalledWith(expect.objectContaining({
                ipAddress: 'unknown'
            }));
        });

        it('should throw ValidationError if script file missing', async () => {
            req.body = { ...validBody, submissionType: SubmissionType.SCRIPT };
            req.file = undefined;

            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);

            await RequestController.create(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        });
    });

    describe('getMyRequests', () => {
        it('should list user requests', async () => {
            req.query = { page: '1', limit: '10' };
            (QueryRequestModel.findByUserId as jest.Mock).mockResolvedValue({ requests: [], total: 0 });

            await RequestController.getMyRequests(req as Request, res as Response, next);

            expect(QueryRequestModel.findByUserId).toHaveBeenCalledWith('user-1', 1, 10, undefined);
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should filter by status', async () => {
            req.query = { status: 'pending' };
            (QueryRequestModel.findByUserId as jest.Mock).mockResolvedValue({ requests: [], total: 0 });

            await RequestController.getMyRequests(req as Request, res as Response, next);

            expect(QueryRequestModel.findByUserId).toHaveBeenCalledWith('user-1', 1, 20, 'pending');
        });

        it('should throw ValidationError for invalid status', async () => {
            req.query = { status: 'invalid' };

            await RequestController.getMyRequests(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
        });

        it('should handle errors', async () => {
            const error = new Error('Database error');
            (QueryRequestModel.findByUserId as jest.Mock).mockRejectedValue(error);

            await RequestController.getMyRequests(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('withdraw', () => {
        it('should throw NotFoundError if request not found during withdraw check', async () => {
            req.params = { id: 'req-1' };
            (QueryRequestModel.withdraw as jest.Mock).mockResolvedValue(null);
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(null);

            await RequestController.withdraw(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        });

        it('should throw ForbiddenError if withdrawing other user request', async () => {
            req.params = { id: 'req-1' };
            (QueryRequestModel.withdraw as jest.Mock).mockResolvedValue(null);
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue({
                id: 'req-1',
                userId: 'other-user', // Not current user
                status: RequestStatus.PENDING
            });

            await RequestController.withdraw(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should throw generic ValidationError if withdraw fails but checks pass', async () => {
            req.params = { id: 'req-1' };
            (QueryRequestModel.withdraw as jest.Mock).mockResolvedValue(null);
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue({
                id: 'req-1',
                userId: 'user-1',
                status: RequestStatus.PENDING
            });

            await RequestController.withdraw(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError));
            const error = (next as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Unable to withdraw request');
        });

        it('should withdraw request successfully', async () => {
            req.params = { id: 'req-1' };
            (QueryRequestModel.withdraw as jest.Mock).mockResolvedValue({ id: 'req-1', status: 'withdrawn' });

            await RequestController.withdraw(req as Request, res as Response, next);

            expect(QueryRequestModel.withdraw).toHaveBeenCalledWith('req-1', 'user-1');
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should throw specific errors if withdraw fails', async () => {
            req.params = { id: 'req-1' };
            (QueryRequestModel.withdraw as jest.Mock).mockResolvedValue(null); // Fail first try
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue({
                id: 'req-1',
                userId: 'user-1',
                status: 'approved' // Not pending
            });

            await RequestController.withdraw(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(ValidationError)); // Cannot withdraw non-pending
        });
    });

    describe('getById', () => {
        it('should throw NotFoundError if request does not exist', async () => {
            req.params = { id: 'req-1' };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(null);

            await RequestController.getById(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        });

        it('should get request if owner', async () => {
            req.params = { id: 'req-1' };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue({
                id: 'req-1', userId: 'user-1', podId: 'pod-1'
            });

            await RequestController.getById(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should get request if manager of pod', async () => {
            req.params = { id: 'req-1' };
            req.user = { ...mockUser, role: UserRole.MANAGER, managedPodIds: ['pod-1'] };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue({
                id: 'req-1', userId: 'other-user', podId: 'pod-1'
            });

            await RequestController.getById(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should throw Forbidden if not owner/approver', async () => {
            req.params = { id: 'req-1' };
            req.user = { ...mockUser, userId: 'other-user' };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue({
                id: 'req-1', userId: 'user-1', podId: 'pod-1'
            });

            await RequestController.getById(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should handle errors', async () => {
            const error = new Error('Database error');
            (QueryRequestModel.findById as jest.Mock).mockRejectedValue(error);

            await RequestController.getById(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('list', () => {
        it('should forbid developers', async () => {
            req.user = mockUser; // Developer
            await RequestController.list(req as Request, res as Response, next);
            expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should allow managers', async () => {
            req.user = { ...mockUser, role: UserRole.MANAGER, managedPodIds: ['pod-1'] };
            (QueryRequestModel.findWithFilters as jest.Mock).mockResolvedValue({ requests: [], total: 0 });

            await RequestController.list(req as Request, res as Response, next);

            expect(QueryRequestModel.findWithFilters).toHaveBeenCalledWith(
                expect.objectContaining({ allowedPodIds: ['pod-1'] }),
                undefined, undefined
            );
        });

        it('should handle errors', async () => {
            const error = new Error('Database error');
            req.user = { ...mockUser, role: UserRole.MANAGER };
            (QueryRequestModel.findWithFilters as jest.Mock).mockRejectedValue(error);

            await RequestController.list(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });
});
