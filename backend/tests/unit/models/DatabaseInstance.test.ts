import { DatabaseInstanceModel } from '../../../src/models/DatabaseInstance';
import { DatabaseType } from '../../../src/types';
import { prisma } from '../../../src/config/database';

// Mock Prisma
jest.mock('../../../src/config/database', () => ({
    prisma: {
        databaseInstance: {
            findMany: jest.fn(),
            findUnique: jest.fn(),
            create: jest.fn()
        }
    }
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-123')
}));

describe('DatabaseInstanceModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all database instances', async () => {
            const mockInstances = [
                {
                    id: 'db-1',
                    name: 'Production Postgres',
                    type: DatabaseType.POSTGRESQL,
                    host: 'localhost',
                    port: 5432,
                    databases: ['app_db', 'analytics_db'],
                    createdAt: new Date()
                },
                {
                    id: 'db-2',
                    name: 'Dev MongoDB',
                    type: DatabaseType.MONGODB,
                    host: 'localhost',
                    port: 27017,
                    databases: ['dev_db'],
                    createdAt: new Date()
                }
            ];
            (prisma.databaseInstance.findMany as jest.Mock).mockResolvedValue(mockInstances);

            const result = await DatabaseInstanceModel.findAll();

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Production Postgres');
            expect(result[1].type).toBe('mongodb');
        });
    });

    describe('findByType', () => {
        it('should return instances of specific type', async () => {
            const mockInstances = [
                {
                    id: 'db-1',
                    name: 'PostgreSQL 1',
                    type: DatabaseType.POSTGRESQL,
                    host: 'localhost',
                    port: 5432,
                    databases: ['db1'],
                    createdAt: new Date()
                }
            ];
            (prisma.databaseInstance.findMany as jest.Mock).mockResolvedValue(mockInstances);

            const result = await DatabaseInstanceModel.findByType(DatabaseType.POSTGRESQL);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('postgresql');
            expect(prisma.databaseInstance.findMany).toHaveBeenCalledWith({
                where: { type: DatabaseType.POSTGRESQL },
                orderBy: { name: 'asc' }
            });
        });
    });

    describe('findById', () => {
        it('should return instance when found', async () => {
            const mockInstance = {
                id: 'db-1',
                name: 'Test Instance',
                type: DatabaseType.POSTGRESQL,
                host: 'localhost',
                port: 5432,
                databases: ['test_db'],
                createdAt: new Date()
            };
            (prisma.databaseInstance.findUnique as jest.Mock).mockResolvedValue(mockInstance);

            const result = await DatabaseInstanceModel.findById('db-1');

            expect(result).not.toBeNull();
            expect(result?.id).toBe('db-1');
            expect(result?.databases).toEqual(['test_db']);
        });

        it('should return null when not found', async () => {
            (prisma.databaseInstance.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await DatabaseInstanceModel.findById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('getDatabases', () => {
        it('should return databases for instance', async () => {
            const mockInstance = {
                id: 'db-1',
                name: 'Test Instance',
                type: DatabaseType.POSTGRESQL,
                host: 'localhost',
                port: 5432,
                databases: ['db1', 'db2'],
                createdAt: new Date()
            };
            (prisma.databaseInstance.findUnique as jest.Mock).mockResolvedValue(mockInstance);

            const result = await DatabaseInstanceModel.getDatabases('db-1');

            expect(result).toEqual(['db1', 'db2']);
        });

        it('should return empty array if databases is null/undefined in DB', async () => {
            const mockInstance = {
                id: 'db-1',
                name: 'Test Instance',
                type: DatabaseType.POSTGRESQL,
                host: 'localhost',
                port: 5432,
                databases: null, // Simulate null
                createdAt: new Date()
            };
            (prisma.databaseInstance.findUnique as jest.Mock).mockResolvedValue(mockInstance);

            const result = await DatabaseInstanceModel.getDatabases('db-1');
            expect(result).toEqual([]);
        });

        it('should return empty array when instance not found', async () => {
            (prisma.databaseInstance.findUnique as jest.Mock).mockResolvedValue(null);

            const result = await DatabaseInstanceModel.getDatabases('nonexistent');

            expect(result).toEqual([]);
        });
    });

    describe('create', () => {
        it('should create new database instance', async () => {
            const mockInstance = {
                id: 'test-uuid-123',
                name: 'New Instance',
                type: DatabaseType.MONGODB,
                host: '192.168.1.1',
                port: 27017,
                databases: ['new_db'],
                createdAt: new Date()
            };
            (prisma.databaseInstance.create as jest.Mock).mockResolvedValue(mockInstance);

            const result = await DatabaseInstanceModel.create({
                name: 'New Instance',
                type: DatabaseType.MONGODB,
                host: '192.168.1.1',
                port: 27017,
                databases: ['new_db']
            });

            expect(result.id).toBe('test-uuid-123');
            expect(result.name).toBe('New Instance');
            expect(prisma.databaseInstance.create).toHaveBeenCalled();
        });
    });
});
