import { Request, Response, NextFunction } from 'express';
import { DatabaseController } from '../../../src/controllers/database.controller';
import { DatabaseInstanceModel } from '../../../src/models/DatabaseInstance';
import { NotFoundError } from '../../../src/utils/errors';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/models/DatabaseInstance');
jest.mock('../../../src/utils/logger', () => ({
    logger: { audit: jest.fn() },
    AuditCategory: { REQUEST: 'request' }, // Adjust based on actual usage
    AuditAction: { LIST: 'list', DATA_ACCESS: 'data_access' } // Adjust based on actual usage
}));

// Mock response helpers
jest.mock('../../../src/utils/responseHelper', () => ({
    sendSuccess: jest.fn((res, data) => res.status(200).json({ success: true, data })),
    sendPaginated: jest.fn((res, data, page, limit, total) => res.status(200).json({ success: true, pagination: { page, limit, total }, data }))
}));

describe('DatabaseController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    const mockInstance = {
        id: 'inst-1',
        name: 'Test DB',
        type: 'postgres',
        host: 'localhost',
        port: 5432,
        databases: ['db1']
    };

    beforeEach(() => {
        req = {
            query: {},
            params: {},
            user: { userId: 'user-1' }
        } as unknown as Partial<Request>;

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('getTypes', () => {
        it('should return database types', async () => {
            await DatabaseController.getTypes(req as Request, res as Response, next);
            expect(res.status).toHaveBeenCalledWith(200);
            expect((res.json as jest.Mock).mock.calls[0][0].data).toHaveLength(2);
        });
        it('should handle errors', async () => {
            const error = new Error('Database error');
            (res.json as jest.Mock).mockImplementationOnce(() => { throw error; });

            await DatabaseController.getTypes(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('getInstances', () => {
        it('should handle errors', async () => {
            const error = new Error('Database error');
            (DatabaseInstanceModel.findAll as jest.Mock).mockRejectedValue(error);

            await DatabaseController.getInstances(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(error);
        });

        it('should list all instances', async () => {
            (DatabaseInstanceModel.findAll as jest.Mock).mockResolvedValue([mockInstance]);

            await DatabaseController.getInstances(req as Request, res as Response, next);

            expect(DatabaseInstanceModel.findAll).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            const data = (res.json as jest.Mock).mock.calls[0][0].data;
            expect(data[0]).toEqual({
                id: mockInstance.id,
                name: mockInstance.name,
                type: mockInstance.type
            });
        });

        it('should filter by type', async () => {
            req.query = { type: 'postgresql' };
            (DatabaseInstanceModel.findByType as jest.Mock).mockResolvedValue([mockInstance]);

            await DatabaseController.getInstances(req as Request, res as Response, next);

            expect(DatabaseInstanceModel.findByType).toHaveBeenCalledWith('postgresql');
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getDatabases', () => {
        it('should list databases for instance', async () => {
            req.params = { instanceId: 'inst-1' };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);

            await DatabaseController.getDatabases(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
            const data = (res.json as jest.Mock).mock.calls[0][0].data;
            expect(data[0]).toEqual({ name: 'db1', instanceId: 'inst-1' });
        });

        it('should throw NotFoundError if instance missing', async () => {
            req.params = { instanceId: 'inst-1' };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(null);

            await DatabaseController.getDatabases(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        });
    });

    describe('getInstanceById', () => {
        it('should return instance if found', async () => {
            req.params = { instanceId: 'inst-1' };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);

            await DatabaseController.getInstanceById(req as Request, res as Response, next);

            expect(DatabaseInstanceModel.findById).toHaveBeenCalledWith('inst-1');
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should throw NotFoundError if not found', async () => {
            req.params = { instanceId: 'inst-1' };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(null);

            await DatabaseController.getInstanceById(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        });
    });
});
