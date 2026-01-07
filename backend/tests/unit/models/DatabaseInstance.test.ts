import { DatabaseInstanceModel } from '../../../src/models/DatabaseInstance';
import { DatabaseType } from '../../../src/types';

// Mock database query
jest.mock('../../../src/config/database', () => ({
    query: jest.fn()
}));

// Mock uuid
jest.mock('uuid', () => ({
    v4: jest.fn(() => 'test-uuid-123')
}));

import { query } from '../../../src/config/database';

describe('DatabaseInstanceModel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('findAll', () => {
        it('should return all database instances', async () => {
            const mockRows = [
                {
                    id: 'db-1',
                    name: 'Production Postgres',
                    type: 'postgresql',
                    host: 'localhost',
                    port: 5432,
                    databases: ['app_db', 'analytics_db'],
                    created_at: '2024-01-01T00:00:00Z'
                },
                {
                    id: 'db-2',
                    name: 'Dev MongoDB',
                    type: 'mongodb',
                    host: 'localhost',
                    port: 27017,
                    databases: ['dev_db'],
                    created_at: '2024-01-01T00:00:00Z'
                }
            ];
            (query as jest.Mock).mockResolvedValue({ rows: mockRows });

            const result = await DatabaseInstanceModel.findAll();

            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('Production Postgres');
            expect(result[1].type).toBe('mongodb');
        });

        it('should handle null databases array', async () => {
            const mockRows = [
                {
                    id: 'db-1',
                    name: 'Empty Instance',
                    type: 'postgresql',
                    host: 'localhost',
                    port: 5432,
                    databases: null,
                    created_at: '2024-01-01T00:00:00Z'
                }
            ];
            (query as jest.Mock).mockResolvedValue({ rows: mockRows });

            const result = await DatabaseInstanceModel.findAll();

            expect(result[0].databases).toEqual([]);
        });
    });

    describe('findByType', () => {
        it('should return instances of specific type', async () => {
            const mockRows = [
                {
                    id: 'db-1',
                    name: 'PostgreSQL 1',
                    type: 'postgresql',
                    host: 'localhost',
                    port: 5432,
                    databases: ['db1'],
                    created_at: '2024-01-01T00:00:00Z'
                }
            ];
            (query as jest.Mock).mockResolvedValue({ rows: mockRows });

            const result = await DatabaseInstanceModel.findByType(DatabaseType.POSTGRESQL);

            expect(result).toHaveLength(1);
            expect(result[0].type).toBe('postgresql');
            expect(query).toHaveBeenCalledWith(expect.any(String), ['postgresql']);
        });
    });

    describe('findById', () => {
        it('should return instance when found', async () => {
            const mockRow = {
                id: 'db-1',
                name: 'Test Instance',
                type: 'postgresql',
                host: 'localhost',
                port: 5432,
                databases: ['test_db'],
                created_at: '2024-01-01T00:00:00Z'
            };
            (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

            const result = await DatabaseInstanceModel.findById('db-1');

            expect(result).not.toBeNull();
            expect(result?.id).toBe('db-1');
            expect(result?.databases).toEqual(['test_db']);
        });

        it('should return null when not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await DatabaseInstanceModel.findById('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('getDatabases', () => {
        it('should return databases for instance', async () => {
            const mockRow = {
                id: 'db-1',
                name: 'Test Instance',
                type: 'postgresql',
                host: 'localhost',
                port: 5432,
                databases: ['db1', 'db2', 'db3'],
                created_at: '2024-01-01T00:00:00Z'
            };
            (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

            const result = await DatabaseInstanceModel.getDatabases('db-1');

            expect(result).toEqual(['db1', 'db2', 'db3']);
        });

        it('should return empty array when instance not found', async () => {
            (query as jest.Mock).mockResolvedValue({ rows: [] });

            const result = await DatabaseInstanceModel.getDatabases('nonexistent');

            expect(result).toEqual([]);
        });
    });

    describe('create', () => {
        it('should create new database instance', async () => {
            const mockRow = {
                id: 'test-uuid-123',
                name: 'New Instance',
                type: 'mongodb',
                host: '192.168.1.1',
                port: 27017,
                databases: ['new_db'],
                created_at: new Date().toISOString()
            };
            (query as jest.Mock).mockResolvedValue({ rows: [mockRow] });

            const result = await DatabaseInstanceModel.create({
                name: 'New Instance',
                type: DatabaseType.MONGODB,
                host: '192.168.1.1',
                port: 27017,
                databases: ['new_db']
            });

            expect(result.id).toBe('test-uuid-123');
            expect(result.name).toBe('New Instance');
            expect(result.type).toBe('mongodb');
            expect(query).toHaveBeenCalled();
        });
    });
});
