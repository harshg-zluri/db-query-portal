import { PostgresExecutor, createPostgresExecutor } from '../../../src/services/postgres.executor';

// Mock pg
jest.mock('pg', () => {
    const mockClient = {
        query: jest.fn(),
        release: jest.fn()
    };
    const mockPool = {
        connect: jest.fn().mockResolvedValue(mockClient),
        end: jest.fn().mockResolvedValue(undefined),
        on: jest.fn()
    };
    return {
        Pool: jest.fn(() => mockPool)
    };
});

import { Pool } from 'pg';

describe('PostgresExecutor', () => {
    let executor: PostgresExecutor;
    let mockPool: any;
    let mockClient: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockClient = {
            query: jest.fn(),
            release: jest.fn()
        };
        mockPool = {
            connect: jest.fn().mockResolvedValue(mockClient),
            end: jest.fn().mockResolvedValue(undefined),
            on: jest.fn()
        };
        (Pool as unknown as jest.Mock).mockImplementation(() => mockPool);

        executor = new PostgresExecutor({
            host: 'localhost',
            port: 5432,
            database: 'test',
            user: 'postgres',
            password: 'password'
        });
    });

    describe('connect', () => {
        it('should create pool on first connect', async () => {
            await executor.connect();
            expect(Pool).toHaveBeenCalled();
        });

        it('should reuse pool on subsequent connects', async () => {
            await executor.connect();
            await executor.connect();
            expect(Pool).toHaveBeenCalledTimes(1);
        });
    });

    describe('close', () => {
        it('should close pool', async () => {
            await executor.connect();
            await executor.close();
            expect(mockPool.end).toHaveBeenCalled();
        });

        it('should handle close without connect', async () => {
            await executor.close();
            // Should not throw
        });
    });

    describe('execute', () => {
        it('should execute SELECT query and return rows', async () => {
            mockClient.query.mockResolvedValue({
                rows: [{ id: 1, name: 'test' }],
                rowCount: 1
            });

            const result = await executor.execute('SELECT * FROM users');

            expect(result.success).toBe(true);
            expect(result.output).toContain('"id": 1');
            expect(result.rowCount).toBe(1);
        });

        it('should execute UPDATE and return affected rows', async () => {
            mockClient.query.mockResolvedValue({
                rows: [],
                rowCount: 5
            });

            const result = await executor.execute('UPDATE users SET name = "test"');

            expect(result.success).toBe(true);
            expect(result.output).toBe('5 row(s) affected');
        });

        it('should handle empty result', async () => {
            mockClient.query.mockResolvedValue({
                rows: [],
                rowCount: null
            });

            const result = await executor.execute('CREATE TABLE test');

            expect(result.success).toBe(true);
            expect(result.output).toBe('Query executed successfully');
        });

        it('should handle query error', async () => {
            mockClient.query.mockRejectedValue(new Error('Syntax error'));

            const result = await executor.execute('INVALID SQL');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Syntax error');
        });

        it('should release client after execution', async () => {
            mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

            await executor.execute('SELECT 1');

            expect(mockClient.release).toHaveBeenCalled();
        });
    });

    describe('testConnection', () => {
        it('should return true for valid connection', async () => {
            mockClient.query.mockResolvedValue({ rows: [] });

            const result = await executor.testConnection();

            expect(result).toBe(true);
        });

        it('should return false for failed connection', async () => {
            mockPool.connect.mockRejectedValue(new Error('Connection refused'));

            const result = await executor.testConnection();

            expect(result).toBe(false);
        });
    });

    describe('createPostgresExecutor', () => {
        it('should create executor from connection string', () => {
            const executor = createPostgresExecutor(
                'postgresql://user:pass@host:5432/db'
            );
            expect(executor).toBeInstanceOf(PostgresExecutor);
        });

        it('should throw for invalid connection string', () => {
            expect(() => createPostgresExecutor('invalid'))
                .toThrow('Invalid PostgreSQL connection string');
        });
    });
});
