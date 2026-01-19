import { Request, Response, NextFunction } from 'express';
import { DatabaseController } from '../../../src/controllers/database.controller';
import { DatabaseInstanceModel } from '../../../src/models/DatabaseInstance';
import { NotFoundError } from '../../../src/utils/errors';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/models/DatabaseInstance');
jest.mock('../../../src/utils/logger', () => ({
    logger: { audit: jest.fn(), warn: jest.fn() },
    AuditCategory: { REQUEST: 'request' }, // Adjust based on actual usage
    AuditAction: { LIST: 'list', DATA_ACCESS: 'data_access' } // Adjust based on actual usage
}));

// Mock response helpers
jest.mock('../../../src/utils/responseHelper', () => ({
    sendSuccess: jest.fn((res, data) => res.status(200).json({ success: true, data })),
    sendPaginated: jest.fn((res, data, page, limit, total) => res.status(200).json({ success: true, pagination: { page, limit, total }, data }))
}));

// Mock DiscoveryService
jest.mock('../../../src/services/discovery.service', () => ({
    DiscoveryService: {
        getPostgresSchemas: jest.fn(),
        getMongoDatabases: jest.fn()
    }
}));

// Mock config
jest.mock('../../../src/config/environment', () => ({
    config: {
        targetDatabases: {
            postgresUrl: 'postgres://localhost:5432/db',
            mongodbUrl: 'mongodb://localhost:27017'
        }
    }
}));

import { DiscoveryService } from '../../../src/services/discovery.service';
import { config } from '../../../src/config/environment';

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
            expect(data[0]).toEqual('db1');
        });

        it('should throw NotFoundError if instance missing', async () => {
            req.params = { instanceId: 'inst-1' };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(null);

            await DatabaseController.getDatabases(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(NotFoundError));
        });

        it('should use dynamic discovery for PostgreSQL', async () => {
            req.params = { instanceId: 'inst-pg' };
            const pgInstance = { ...mockInstance, type: 'postgresql' };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(pgInstance);
            (DiscoveryService.getPostgresSchemas as jest.Mock).mockResolvedValue(['public', 'users']);

            await DatabaseController.getDatabases(req as Request, res as Response, next);

            expect(DiscoveryService.getPostgresSchemas).toHaveBeenCalled();
            const data = (res.json as jest.Mock).mock.calls[0][0].data;
            expect(data).toEqual(['public', 'users']);
        });

        it('should use dynamic discovery for MongoDB', async () => {
            req.params = { instanceId: 'inst-mongo' };
            const mongoInstance = { ...mockInstance, type: 'mongodb' };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mongoInstance);
            (DiscoveryService.getMongoDatabases as jest.Mock).mockResolvedValue(['local', 'admin']);

            await DatabaseController.getDatabases(req as Request, res as Response, next);

            expect(DiscoveryService.getMongoDatabases).toHaveBeenCalled();
            const data = (res.json as jest.Mock).mock.calls[0][0].data;
            expect(data).toEqual(['local', 'admin']);
        });

        it('should fallback to static list if config missing (PG)', async () => {
            req.params = { instanceId: 'inst-pg-fallback' };
            const pgInstance = { ...mockInstance, type: 'postgresql', databases: ['static_db'] };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(pgInstance);

            // Temporarily unset config
            const originalUrl = config.targetDatabases.postgresUrl;
            (config.targetDatabases as any).postgresUrl = undefined;

            await DatabaseController.getDatabases(req as Request, res as Response, next);

            const data = (res.json as jest.Mock).mock.calls[0][0].data;
            expect(data).toEqual(['static_db']);

            // Restore config
            (config.targetDatabases as any).postgresUrl = originalUrl;
        });

        it('should fallback to static list if config missing (Mongo)', async () => {
            req.params = { instanceId: 'inst-mongo-fallback' };
            const mongoInstance = { ...mockInstance, type: 'mongodb', databases: ['static_mongo'] };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mongoInstance);

            // Temporarily unset config
            const originalUrl = config.targetDatabases.mongodbUrl;
            (config.targetDatabases as any).mongodbUrl = undefined;

            await DatabaseController.getDatabases(req as Request, res as Response, next);

            const data = (res.json as jest.Mock).mock.calls[0][0].data;
            expect(data).toEqual(['static_mongo']);

            // Restore config
            (config.targetDatabases as any).mongodbUrl = originalUrl;
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

    describe('getDatabases - discovery failure fallback', () => {
        it('should fallback to static list when discovery fails with error', async () => {
            req.params = { instanceId: 'inst-pg-err' };
            const pgInstance = { ...mockInstance, type: 'postgresql', databases: ['fallback_db'] };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(pgInstance);
            (DiscoveryService.getPostgresSchemas as jest.Mock).mockRejectedValue(new Error('Discovery failed'));

            await DatabaseController.getDatabases(req as Request, res as Response, next);

            expect(logger.warn).toHaveBeenCalled();
            const data = (res.json as jest.Mock).mock.calls[0][0].data;
            expect(data).toEqual(['fallback_db']);
        });

        it('should fallback when discovery returns empty array (PG)', async () => {
            req.params = { instanceId: 'inst-pg-empty' };
            const pgInstance = { ...mockInstance, type: 'postgresql', databases: ['static_db'] };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(pgInstance);
            (DiscoveryService.getPostgresSchemas as jest.Mock).mockResolvedValue([]);

            await DatabaseController.getDatabases(req as Request, res as Response, next);

            const data = (res.json as jest.Mock).mock.calls[0][0].data;
            expect(data).toEqual(['static_db']);
        });

        it('should fallback when discovery returns empty array (Mongo)', async () => {
            req.params = { instanceId: 'inst-mongo-empty' };
            const mongoInstance = { ...mockInstance, type: 'mongodb', databases: ['static_mongo'] };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mongoInstance);
            (DiscoveryService.getMongoDatabases as jest.Mock).mockResolvedValue([]);

            await DatabaseController.getDatabases(req as Request, res as Response, next);

            const data = (res.json as jest.Mock).mock.calls[0][0].data;
            expect(data).toEqual(['static_mongo']);
        });
    });

    describe('debugDiscovery', () => {
        it('should return success for both postgres and mongo', async () => {
            (DiscoveryService.getPostgresSchemas as jest.Mock).mockResolvedValue(['public']);
            (DiscoveryService.getMongoDatabases as jest.Mock).mockResolvedValue(['admin']);

            await DatabaseController.debugDiscovery(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                checks: expect.objectContaining({
                    postgres: { status: 'success', schemas: ['public'] },
                    mongo: { status: 'success', databases: ['admin'] }
                })
            });
        });

        it('should handle postgres discovery error', async () => {
            (DiscoveryService.getPostgresSchemas as jest.Mock).mockRejectedValue(new Error('PG error'));
            (DiscoveryService.getMongoDatabases as jest.Mock).mockResolvedValue(['admin']);

            await DatabaseController.debugDiscovery(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                checks: expect.objectContaining({
                    postgres: { status: 'error', error: 'PG error' },
                    mongo: { status: 'success', databases: ['admin'] }
                })
            });
        });

        it('should handle mongo discovery error', async () => {
            (DiscoveryService.getPostgresSchemas as jest.Mock).mockResolvedValue(['public']);
            (DiscoveryService.getMongoDatabases as jest.Mock).mockRejectedValue(new Error('Mongo error'));

            await DatabaseController.debugDiscovery(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                checks: expect.objectContaining({
                    postgres: { status: 'success', schemas: ['public'] },
                    mongo: { status: 'error', error: 'Mongo error' }
                })
            });
        });

        it('should skip postgres when URL not set', async () => {
            const originalUrl = config.targetDatabases.postgresUrl;
            (config.targetDatabases as any).postgresUrl = undefined;
            (DiscoveryService.getMongoDatabases as jest.Mock).mockResolvedValue(['admin']);

            await DatabaseController.debugDiscovery(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                checks: expect.objectContaining({
                    postgres: { status: 'skipped', reason: 'No URL' },
                    mongo: { status: 'success', databases: ['admin'] }
                })
            });

            (config.targetDatabases as any).postgresUrl = originalUrl;
        });

        it('should skip mongo when URL not set', async () => {
            const originalUrl = config.targetDatabases.mongodbUrl;
            (config.targetDatabases as any).mongodbUrl = undefined;
            (DiscoveryService.getPostgresSchemas as jest.Mock).mockResolvedValue(['public']);

            await DatabaseController.debugDiscovery(req as Request, res as Response, next);

            expect(res.json).toHaveBeenCalledWith({
                success: true,
                checks: expect.objectContaining({
                    postgres: { status: 'success', schemas: ['public'] },
                    mongo: { status: 'skipped', reason: 'No URL' }
                })
            });

            (config.targetDatabases as any).mongodbUrl = originalUrl;
        });

        it('should call next with error on unexpected failure', async () => {
            (DiscoveryService.getPostgresSchemas as jest.Mock).mockResolvedValue(['public']);
            (DiscoveryService.getMongoDatabases as jest.Mock).mockResolvedValue(['admin']);
            (res.json as jest.Mock).mockImplementationOnce(() => { throw new Error('Unexpected'); });

            await DatabaseController.debugDiscovery(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(expect.any(Error));
        });
    });
});

