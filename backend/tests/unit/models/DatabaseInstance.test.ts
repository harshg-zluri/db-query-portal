import { jest, describe, beforeEach, it, expect } from '@jest/globals';
import { DatabaseInstanceModel } from '../../../src/models/DatabaseInstance';
import { DatabaseType } from '../../../src/types';

import { getEm } from '../../../src/config/database';
import { DatabaseInstance } from '../../../src/entities/DatabaseInstance';

// Mock database
jest.mock('../../../src/config/database');


describe('DatabaseInstanceModel', () => {
    let mockEm: any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockEm = {
            find: jest.fn(),
            findOne: jest.fn(),
            persistAndFlush: jest.fn(),
        };
        (getEm as jest.Mock).mockReturnValue(mockEm);
    });

    describe('findAll', () => {
        it('should return all database instances', async () => {
            const mockInstances = [
                { name: 'DB 1', type: 'postgresql' },
                { name: 'DB 2', type: 'mongodb' }
            ];
            mockEm.find.mockResolvedValue(mockInstances);

            const result = await DatabaseInstanceModel.findAll();

            expect(result).toHaveLength(2);
            expect(mockEm.find).toHaveBeenCalledWith(DatabaseInstance, {}, { orderBy: { name: 'ASC' } });
        });
    });

    describe('findByType', () => {
        it('should return instances of specific type', async () => {
            const mockInstances = [{ name: 'PG', type: 'postgresql' }];
            mockEm.find.mockResolvedValue(mockInstances);

            const result = await DatabaseInstanceModel.findByType(DatabaseType.POSTGRESQL);

            expect(result).toHaveLength(1);
            expect(mockEm.find).toHaveBeenCalledWith(DatabaseInstance, { type: DatabaseType.POSTGRESQL }, expect.any(Object));
        });
    });

    describe('findById', () => {
        it('should return instance when found', async () => {
            const mockInstance = { id: 'db-1', name: 'DB' };
            mockEm.findOne.mockResolvedValue(mockInstance);

            const result = await DatabaseInstanceModel.findById('db-1');

            expect(result).toEqual(mockInstance);
            expect(mockEm.findOne).toHaveBeenCalledWith(DatabaseInstance, { id: 'db-1' });
        });

        it('should return null when not found', async () => {
            mockEm.findOne.mockResolvedValue(null);
            const result = await DatabaseInstanceModel.findById('nonexistent');
            expect(result).toBeNull();
        });
    });

    describe('getDatabases', () => {
        it('should return databases for instance', async () => {
            const mockInstance = { id: 'db-1', databases: ['db1', 'db2'] };
            mockEm.findOne.mockResolvedValue(mockInstance);

            const result = await DatabaseInstanceModel.getDatabases('db-1');

            expect(result).toEqual(['db1', 'db2']);
        });

        it('should return empty array when instance not found', async () => {
            mockEm.findOne.mockResolvedValue(null);
            const result = await DatabaseInstanceModel.getDatabases('nonexistent');
            expect(result).toEqual([]);
        });
    });

    describe('create', () => {
        it('should create new database instance', async () => {
            const result = await DatabaseInstanceModel.create({
                name: 'New Instance',
                type: DatabaseType.MONGODB,
                host: '1.2.3.4',
                port: 27017,
                databases: ['db1']
            });

            expect(mockEm.persistAndFlush).toHaveBeenCalled();
            expect(result.name).toBe('New Instance');
            expect(result.type).toBe('mongodb');
        });
    });
});
