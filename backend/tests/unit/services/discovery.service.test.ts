import { jest, describe, beforeEach, it, expect, afterEach } from '@jest/globals';
import { DiscoveryService } from '../../../src/services/discovery.service';
import postgres from 'postgres';
import mongoose from 'mongoose';

// Mock dependencies
jest.mock('postgres');
jest.mock('mongoose');
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        debug: jest.fn(),
        info: jest.fn(),
        error: jest.fn()
    }
}));

describe('DiscoveryService', () => {
    // Postgres mocks
    let mockSql: any;

    // Mongo mocks
    let mockMongoConnection: any;
    let mockAdminDb: any;

    beforeEach(() => {
        jest.clearAllMocks();
        DiscoveryService.clearCache();

        // Setup Postgres mock
        mockSql = jest.fn();
        mockSql.end = jest.fn().mockResolvedValue(undefined as never);
        (postgres as unknown as jest.Mock).mockReturnValue(mockSql);

        // Setup Mongoose mock
        mockAdminDb = {
            listDatabases: jest.fn()
        };
        mockMongoConnection = {
            db: {
                admin: jest.fn().mockReturnValue(mockAdminDb)
            },
            close: jest.fn().mockResolvedValue(undefined as never)
        };
        (mongoose.createConnection as jest.Mock).mockReturnValue({
            asPromise: jest.fn().mockResolvedValue(mockMongoConnection as never)
        } as any);
    });

    describe('getPostgresDatabases', () => {
        it('should discover databases and cache result', async () => {
            // Mock query result
            const mockResult = [
                { datname: 'db1' },
                { datname: 'db2' }
            ];
            mockSql.mockResolvedValue(mockResult as never);

            // First call - should query DB
            const dbs1 = await DiscoveryService.getPostgresDatabases('postgres://...');
            expect(dbs1).toEqual(['db1', 'db2']);
            expect(mockSql).toHaveBeenCalledTimes(1);
            expect(mockSql.end).toHaveBeenCalledTimes(1);

            // Second call - should use cache
            const dbs2 = await DiscoveryService.getPostgresDatabases('postgres://...');
            expect(dbs2).toEqual(['db1', 'db2']);
            expect(mockSql).toHaveBeenCalledTimes(1); // No new calls
        });

        it('should handle query failure', async () => {
            mockSql.mockRejectedValue(new Error('Connection failed') as never);

            await expect(DiscoveryService.getPostgresDatabases('postgres://...'))
                .rejects.toThrow('Connection failed');
        });

        it('should handle non-Error exceptions', async () => {
            mockSql.mockRejectedValue('String Error' as never);
            await expect(DiscoveryService.getPostgresDatabases('postgres://...'))
                .rejects.toBe('String Error');
        });
    });

    describe('getMongoDatabases', () => {
        it('should discover databases, filter system dbs, and cache', async () => {
            mockAdminDb.listDatabases.mockResolvedValue({
                databases: [
                    { name: 'local' },
                    { name: 'admin' },
                    { name: 'config' },
                    { name: 'my_db' }
                ]
            } as never);

            const dbs = await DiscoveryService.getMongoDatabases('mongodb://...');

            expect(dbs).toEqual(['my_db']); // System dbs filtered
            expect(mongoose.createConnection).toHaveBeenCalled();
            expect(mockMongoConnection.close).toHaveBeenCalled();

            // Cache check
            await DiscoveryService.getMongoDatabases('mongodb://...');
            expect(mongoose.createConnection).toHaveBeenCalledTimes(1);
        });

        it('should throw if no db object on connection', async () => {
            mockMongoConnection.db = null;
            await expect(DiscoveryService.getMongoDatabases('mongodb://...'))
                .rejects.toThrow('Failed to get MongoDB database connection');
        });

        it('should handle errors', async () => {
            (mongoose.createConnection as jest.Mock).mockReturnValue({
                asPromise: jest.fn().mockRejectedValue(new Error('Mongo Error') as never)
            } as any);

            await expect(DiscoveryService.getMongoDatabases('mongodb://...'))
                .rejects.toThrow('Mongo Error');
        });

        it('should handle non-Error exceptions', async () => {
            (mongoose.createConnection as jest.Mock).mockReturnValue({
                asPromise: jest.fn().mockRejectedValue('String Error' as never)
            } as any);

            await expect(DiscoveryService.getMongoDatabases('mongodb://...'))
                .rejects.toBe('String Error');
        });
    });

    describe('getPostgresSchemas', () => {
        it('should discover schemas and cache', async () => {
            const mockResult = [
                { schema_name: 'public' },
                { schema_name: 'app_schema' }
            ];
            mockSql.mockResolvedValue(mockResult as never);

            const schemas = await DiscoveryService.getPostgresSchemas('postgres://...');
            expect(schemas).toEqual(['public', 'app_schema']); // Sorted? Mock result order matters if not sorted manually in mock

            // Cache check
            await DiscoveryService.getPostgresSchemas('postgres://...');
            expect(mockSql).toHaveBeenCalledTimes(1);
        });

        it('should handle errors', async () => {
            mockSql.mockRejectedValue(new Error('PG Error') as never);
            await expect(DiscoveryService.getPostgresSchemas('postgres://...'))
                .rejects.toThrow('PG Error');
        });

        it('should handle non-Error exceptions', async () => {
            mockSql.mockRejectedValue('String Error' as never);
            await expect(DiscoveryService.getPostgresSchemas('postgres://...'))
                .rejects.toBe('String Error');
        });
    });

    describe('Cache expiration', () => {
        it('should expire cache after TTL', async () => {
            const mockResult = [{ datname: 'db1' }];
            mockSql.mockResolvedValue(mockResult as never);

            await DiscoveryService.getPostgresDatabases('postgres://...');
            expect(mockSql).toHaveBeenCalledTimes(1);

            // Advance time (mock Date.now?)
            // Since cache logic uses Date.now(), we can spy on it
            jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 6 * 60 * 1000); // +6 mins

            await DiscoveryService.getPostgresDatabases('postgres://...');
            expect(mockSql).toHaveBeenCalledTimes(2); // Should trigger new fetch
        });
    });
});
