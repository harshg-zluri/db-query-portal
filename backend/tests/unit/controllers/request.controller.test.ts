import { Request, Response, NextFunction } from 'express';
import { RequestController } from '../../../src/controllers/request.controller';
import { QueryRequestModel } from '../../../src/models/QueryRequest';
import { DatabaseInstanceModel } from '../../../src/models/DatabaseInstance';
import { PodModel } from '../../../src/models/Pod';
import { UserRole, SubmissionType, RequestStatus, DatabaseType } from '../../../src/types';
import { NotFoundError, ValidationError, ForbiddenError } from '../../../src/utils/errors';
import { logger } from '../../../src/utils/logger';
import { sendSlackNotification } from '../../../src/services/slack.service';
import { DiscoveryService } from '../../../src/services/discovery.service';
import { sendCreated } from '../../../src/utils/responseHelper';

// Mock dependencies
jest.mock('../../../src/models/QueryRequest');
jest.mock('../../../src/models/DatabaseInstance');
jest.mock('../../../src/models/Pod');
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        audit: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    },
    AuditCategory: { REQUEST: 'request', ACCESS: 'access' },
    AuditAction: { REQUEST_CREATED: 'request_created', FORBIDDEN_ACCESS: 'forbidden', REQUEST_WITHDRAWN: 'request_withdrawn' }
}));
jest.mock('../../../src/services/slack.service');
jest.mock('../../../src/services/discovery.service');
jest.mock('../../../src/config/environment', () => ({
    config: {
        requestLimits: { maxPendingPerUser: 5 },
        targetDatabases: { postgresUrl: 'postgres://localhost:5432', mongodbUrl: 'mongodb://localhost:27017' }
    }
}));

jest.mock('../../../src/utils/compression', () => ({
    decompressResult: jest.fn()
}));
import { decompressResult } from '../../../src/utils/compression';

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
            json: jest.fn(),
            send: jest.fn(),
            setHeader: jest.fn()
        };

        next = jest.fn();
        jest.clearAllMocks();
    });


    const validBody = {
        instanceId: 'inst-1',
        databaseType: DatabaseType.POSTGRESQL,
        databaseName: 'db1',
        podId: 'pod-1',
        submissionType: SubmissionType.QUERY,
        query: 'SELECT * FROM table',
        comments: 'Test request'
    };

    const mockInstance = {
        id: 'inst-1',
        name: 'Instance 1',
        type: DatabaseType.POSTGRESQL,
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

        it('should throw ValidationError for invalid script file extension', async () => {
            req.body = { ...validBody, submissionType: SubmissionType.SCRIPT };
            (req as any).file = { originalname: 'test.txt', buffer: Buffer.from('console.log') };

            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);
            (QueryRequestModel.countPendingByUser as jest.Mock).mockResolvedValue(0);

            await RequestController.create(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.objectContaining({
                message: expect.stringContaining('Invalid file type')
            }));
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

        it('should generate warnings for dangerous SQL queries', async () => {
            req.body = { ...validBody, query: 'DROP TABLE users' };

            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);
            (QueryRequestModel.countPendingByUser as jest.Mock).mockResolvedValue(0);
            (QueryRequestModel.create as jest.Mock).mockResolvedValue({ id: 'req-1' });

            await RequestController.create(req as Request, res as Response, next);

            expect(QueryRequestModel.create).toHaveBeenCalledWith(expect.objectContaining({
                warnings: expect.arrayContaining([expect.stringContaining('DDL statement')])
            }));
        });

        it('should generate warnings for dangerous script content', async () => {
            req.body = { ...validBody, submissionType: SubmissionType.SCRIPT, query: undefined };
            req.file = { originalname: 'test.js', buffer: Buffer.from('db.users.drop()') } as any;

            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);
            (QueryRequestModel.countPendingByUser as jest.Mock).mockResolvedValue(0);
            (QueryRequestModel.create as jest.Mock).mockResolvedValue({ id: 'req-1' });

            await RequestController.create(req as Request, res as Response, next);

            expect(QueryRequestModel.create).toHaveBeenCalledWith(expect.objectContaining({
                warnings: expect.arrayContaining([expect.stringContaining('MongoDB method')])
            }));
        });

        it('should validate against safety fallback if discovery fails', async () => {
            req.body = {
                ...validBody,
                databaseName: 'load_testing' // In fallback list
            };

            // Instance with no static DBs
            const emptyInstance = { ...mockInstance, databases: [] as string[] };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(emptyInstance);

            // Fail discovery
            (DiscoveryService.getPostgresSchemas as jest.Mock).mockRejectedValue(new Error('Discovery failed'));

            await RequestController.create(req as Request, res as Response, next);

            // Should succeed (not call next with error) because load_testing is in fallback
            expect(QueryRequestModel.create).toHaveBeenCalled();
            expect(sendCreated).toHaveBeenCalled();
        });

        it('should validate against safety fallback for MongoDB', async () => {
            req.body = {
                instanceId: 'inst-2',
                databaseType: DatabaseType.MONGODB,
                databaseName: 'test_db', // In fallback list
                submissionType: SubmissionType.QUERY,
                query: 'db.collection.find()',
                comments: 'test',
                podId: 'pod-1'
            };

            const mongoInstance = {
                id: 'inst-2',
                type: DatabaseType.MONGODB,
                databases: [] as string[],
                name: 'Mongo'
            };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mongoInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);

            // Fail discovery
            (DiscoveryService.getMongoDatabases as jest.Mock).mockRejectedValue(new Error('Discovery failed'));

            await RequestController.create(req as Request, res as Response, next);

            expect(QueryRequestModel.create).toHaveBeenCalled();
        });

        it('should validate using discovered databases for MongoDB', async () => {
            req.body = {
                instanceId: 'inst-2',
                databaseType: DatabaseType.MONGODB,
                databaseName: 'discovered_db',
                submissionType: SubmissionType.QUERY,
                query: 'db.collection.find()',
                comments: 'test',
                podId: 'pod-1'
            };

            const mongoInstance = {
                id: 'inst-2',
                type: DatabaseType.MONGODB,
                databases: [] as string[],
                name: 'Mongo'
            };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mongoInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);

            // Success discovery
            (DiscoveryService.getMongoDatabases as jest.Mock).mockResolvedValueOnce(['discovered_db']);

            await RequestController.create(req as Request, res as Response, next);

            expect(QueryRequestModel.create).toHaveBeenCalled();
        });

        it('should validate using discovered databases for Postgres', async () => {
            req.body = {
                ...validBody,
                instanceId: 'inst-discovery',
                databaseName: 'discovered_pg_db'
            };

            const pgInstance = {
                id: 'inst-discovery',
                type: DatabaseType.POSTGRESQL,
                databases: [] as string[], // Static list empty
                name: 'Postgres Discovered'
            };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(pgInstance);

            // Success discovery
            (DiscoveryService.getPostgresSchemas as jest.Mock).mockResolvedValueOnce(['discovered_pg_db']);

            await RequestController.create(req as Request, res as Response, next);

            expect(QueryRequestModel.create).toHaveBeenCalled();
        });

        it('should handle undefined query and script by defaulting to empty string for warnings', async () => {
            req.body = { ...validBody, query: undefined, submissionType: SubmissionType.QUERY };
            req.file = undefined;

            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);
            (QueryRequestModel.countPendingByUser as jest.Mock).mockResolvedValue(0);
            (QueryRequestModel.create as jest.Mock).mockResolvedValue({ id: 'req-1' });

            await RequestController.create(req as Request, res as Response, next);

            // warnings check should run on ""
            expect(QueryRequestModel.create).toHaveBeenCalledWith(expect.objectContaining({
                // No warnings for empty string usually
                warnings: undefined
            }));
        });

        it('should not set warnings for safe queries', async () => {
            req.body = { ...validBody, query: 'SELECT * FROM users WHERE id = 1' };

            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);
            (QueryRequestModel.countPendingByUser as jest.Mock).mockResolvedValue(0);
            (QueryRequestModel.create as jest.Mock).mockResolvedValue({ id: 'req-1' });

            await RequestController.create(req as Request, res as Response, next);

            expect(QueryRequestModel.create).toHaveBeenCalledWith(expect.objectContaining({
                warnings: undefined
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
                1, 20
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

    describe('downloadResult', () => {
        const mockRequestWithResult = {
            id: 'req-1',
            userId: 'user-1',
            podId: 'pod-1',
            executionResult: JSON.stringify([{ id: 1 }]),
            isCompressed: false
        };

        it('should allow owner to download', async () => {
            req.params = { id: 'req-1' };
            req.user = { ...mockUser, userId: 'user-1' };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockRequestWithResult);

            await RequestController.downloadResult(req as Request, res as Response, next);

            expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'application/json');
            expect(res.send).toHaveBeenCalledWith(mockRequestWithResult.executionResult);
        });

        it('should allow manager of pod to download', async () => {
            req.params = { id: 'req-1' };
            req.user = { ...mockUser, userId: 'mgr-1', role: UserRole.MANAGER, managedPodIds: ['pod-1'] };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockRequestWithResult);

            await RequestController.downloadResult(req as Request, res as Response, next);

            expect(res.send).toHaveBeenCalled();
        });

        it('should allow admin to download', async () => {
            req.params = { id: 'req-1' };
            req.user = { ...mockUser, userId: 'admin-1', role: UserRole.ADMIN };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockRequestWithResult);

            await RequestController.downloadResult(req as Request, res as Response, next);

            expect(res.send).toHaveBeenCalled();
        });

        it('should forbid unauthorized users', async () => {
            req.params = { id: 'req-1' };
            req.user = { ...mockUser, userId: 'other-user', role: UserRole.DEVELOPER };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockRequestWithResult);

            await RequestController.downloadResult(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(ForbiddenError));
        });

        it('should throw NotFoundError if request missing', async () => {
            req.params = { id: 'req-1' };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(null);

            await RequestController.downloadResult(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        });

        it('should throw NotFoundError if result missing', async () => {
            req.params = { id: 'req-1' };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue({ ...mockRequestWithResult, executionResult: null });

            await RequestController.downloadResult(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        });

        it('should decompress if isCompressed is true', async () => {
            req.params = { id: 'req-1' };
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue({
                ...mockRequestWithResult,
                executionResult: 'compressed_data',
                isCompressed: true
            });
            (decompressResult as jest.Mock).mockResolvedValue(JSON.stringify([{ id: 1 }]));

            await RequestController.downloadResult(req as Request, res as Response, next);

            expect(decompressResult).toHaveBeenCalledWith('compressed_data');
            expect(res.send).toHaveBeenCalledWith(JSON.stringify([{ id: 1 }]));
        });

        it('should handle errors', async () => {
            const error = new Error('Err');
            req.params = { id: 'req-1' };
            (QueryRequestModel.findById as jest.Mock).mockRejectedValue(error);

            await RequestController.downloadResult(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });
});
