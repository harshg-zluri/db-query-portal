import { PostgresExecutor, createPostgresExecutor } from '../../../src/services/postgres.executor';

// Mock postgres.js
jest.mock('postgres', () => {
    const mockSql = Object.assign(
        jest.fn().mockImplementation(() => Promise.resolve([{ id: 1 }])),
        {
            unsafe: jest.fn().mockResolvedValue([]),
            end: jest.fn().mockResolvedValue(undefined),
        }
    );
    return jest.fn(() => mockSql);
});

// Drizzle mocks removed

import postgres from 'postgres';

describe('PostgresExecutor', () => {
    let executor: PostgresExecutor;
    let mockClient: jest.Mock & { unsafe: jest.Mock; end: jest.Mock };

    beforeEach(() => {
        jest.clearAllMocks();

        mockClient = Object.assign(
            jest.fn().mockImplementation(() => Promise.resolve([{ id: 1 }])),
            {
                unsafe: jest.fn().mockResolvedValue([]),
                end: jest.fn().mockResolvedValue(undefined),
            }
        );
        (postgres as unknown as jest.Mock).mockReturnValue(mockClient);

        executor = new PostgresExecutor({
            host: 'localhost',
            port: 5432,
            database: 'test',
            user: 'postgres',
            password: 'password'
        });
    });

    describe('connect', () => {
        it('should create client on first connect', async () => {
            await executor.connect();
            expect(postgres).toHaveBeenCalled();
        });

        it('should reuse client on subsequent connects', async () => {
            await executor.connect();
            await executor.connect();
            expect(postgres).toHaveBeenCalledTimes(1);
        });
    });

    describe('close', () => {
        it('should close client', async () => {
            await executor.connect();
            await executor.close();
            expect(mockClient.end).toHaveBeenCalled();
        });

        it('should handle close without connect', async () => {
            await executor.close();
            // Should not throw
        });
    });

    describe('execute', () => {
        it('should execute SELECT query and return rows', async () => {
            // First call is COUNT check, second is actual query
            mockClient.unsafe
                .mockResolvedValueOnce([{ cnt: '1' }])  // COUNT returns 1 row
                .mockResolvedValueOnce([{ id: 1, name: 'test' }]);

            const result = await executor.execute('SELECT * FROM users');

            expect(result.success).toBe(true);
            expect(result.output).toContain('"id": 1');
            expect(result.rowCount).toBe(1);
        });

        it('should execute UPDATE and return affected rows', async () => {
            const mockResult = Object.assign([], { count: 5 });
            mockClient.unsafe.mockResolvedValue(mockResult);

            const result = await executor.execute('UPDATE users SET name = "test"');

            expect(result.success).toBe(true);
            expect(result.output).toBe('5 row(s) affected');
        });

        it('should handle empty result', async () => {
            mockClient.unsafe.mockResolvedValue([]);

            const result = await executor.execute('SET timezone = "UTC"');

            expect(result.success).toBe(true);
            expect(result.output).toBe('Query executed successfully');
        });

        it('should allow DDL statements (warnings handled at submission)', async () => {
            mockClient.unsafe.mockResolvedValue([]);

            const result = await executor.execute('DROP TABLE test_table');

            expect(result.success).toBe(true);
            expect(mockClient.unsafe).toHaveBeenCalledWith('DROP TABLE test_table');
        });

        it('should execute valid DELETE queries (DML)', async () => {
            const mockResult = Object.assign([], { count: 1 });
            mockClient.unsafe.mockResolvedValue(mockResult);

            const result = await executor.execute('DELETE FROM users WHERE id = 1');

            expect(result.success).toBe(true);
            expect(result.output).toBe('1 row(s) affected');
        });

        it('should handle query error', async () => {
            mockClient.unsafe.mockRejectedValue(new Error('Syntax error'));

            const result = await executor.execute('INVALID SQL');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Syntax error');
        });

        it('should set search path when schema provided', async () => {
            // Mock: 1. search_path, 2. COUNT query, 3. actual query
            mockClient.unsafe
                .mockResolvedValueOnce(undefined)  // SET search_path
                .mockResolvedValueOnce([{ cnt: '0' }])  // COUNT returns 0
                .mockResolvedValueOnce([]);  // actual SELECT

            await executor.execute('SELECT * FROM users', 'my_schema');

            // First call sets search_path
            expect(mockClient.unsafe).toHaveBeenNthCalledWith(1, 'SET search_path TO my_schema, public');
            // Second call is the COUNT
            expect(mockClient.unsafe).toHaveBeenNthCalledWith(2, expect.stringContaining('SELECT COUNT'));
            // Third call is the actual query
            expect(mockClient.unsafe).toHaveBeenNthCalledWith(3, 'SELECT * FROM users');
        });
        it('should handle null/undefined result from driver', async () => {
            // Mock COUNT returning 0, then null for actual result
            mockClient.unsafe
                .mockResolvedValueOnce([{ cnt: '0' }])  // COUNT
                .mockResolvedValueOnce(null as any);    // actual query

            const result = await executor.execute('SELECT 1');
            expect(result.success).toBe(true);
            expect(result.rowCount).toBe(0);
            expect(result.output).toBe('Query executed successfully');
        });

        it('should handle non-Error exception', async () => {
            const errorString = 'Database exploded';
            mockClient.unsafe.mockRejectedValue(errorString);

            const result = await executor.execute('SELECT 1');
            expect(result.success).toBe(false);
            expect(result.error).toBe(errorString);
        });

        it('should handle result with missing count/length', async () => {
            // Mock result compatible with array but without length/count? 
            // Actually, [] has length 0. 
            // We want lines 94: `rowCount: result.count ?? result.length ?? 0`
            // If we return an object { } (not array), it has no length.
            mockClient.unsafe.mockResolvedValue({} as any);

            const result = await executor.execute('CMD');
            expect(result.rowCount).toBe(0);
        });

        it('should block query that exceeds row limit', async () => {
            // Mock COUNT returning more than MAX_ROWS (10000)
            mockClient.unsafe.mockResolvedValueOnce([{ cnt: '50000' }]);

            const result = await executor.execute('SELECT * FROM large_table');

            expect(result.success).toBe(false);
            expect(result.error).toContain('exceeds the maximum limit');
            expect(result.error).toContain('50,000');
            // Should only call unsafe once (for COUNT), not for actual query
            expect(mockClient.unsafe).toHaveBeenCalledTimes(1);
        });
    });

    describe('testConnection', () => {
        it('should return true for valid connection', async () => {
            mockClient.mockResolvedValue([{ '?column?': 1 }]);

            const result = await executor.testConnection();

            expect(result).toBe(true);
        });

        it('should return false for failed connection', async () => {
            (postgres as unknown as jest.Mock).mockImplementation(() => {
                throw new Error('Connection refused');
            });

            const executor2 = new PostgresExecutor({
                host: 'invalid',
                port: 5432,
                database: 'test',
                user: 'postgres',
                password: 'password'
            });

            const result = await executor2.testConnection();

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

    describe('constructor', () => {
        it('should configure connection string with ssl by default', () => {
            const executor = new PostgresExecutor({
                user: 'u',
                database: 'd',
                password: 'p',
                host: 'h',
                port: 5432
            });
            const connString = (executor as any).connectionString;
            expect(connString).toContain('sslmode=require');
        });

        it('should disable ssl when explicitly set to false', () => {
            const executor = new PostgresExecutor({
                user: 'u',
                database: 'd',
                password: 'p',
                host: 'h',
                port: 5432,
                ssl: false
            });
            const connString = (executor as any).connectionString;
            expect(connString).not.toContain('sslmode');
        });
    });
});
