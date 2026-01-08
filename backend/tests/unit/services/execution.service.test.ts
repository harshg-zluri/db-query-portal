import { ExecutionService } from '../../../src/services/execution.service';
import { DatabaseType, SubmissionType, QueryRequest, RequestStatus } from '../../../src/types';

// Mock dependencies
jest.mock('../../../src/services/postgres.executor', () => ({
    PostgresExecutor: jest.fn().mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({ success: true, output: '[]', rowCount: 0, executedAt: new Date() }),
        close: jest.fn().mockResolvedValue(undefined)
    })),
    createPostgresExecutor: jest.fn(() => ({
        execute: jest.fn().mockResolvedValue({ success: true, output: '[]', rowCount: 0, executedAt: new Date() }),
        close: jest.fn().mockResolvedValue(undefined)
    }))
}));

jest.mock('../../../src/services/mongo.executor', () => ({
    MongoExecutor: jest.fn().mockImplementation(() => ({
        execute: jest.fn().mockResolvedValue({ success: true, output: '[]', rowCount: 0, executedAt: new Date() }),
        close: jest.fn().mockResolvedValue(undefined)
    })),
    createMongoExecutor: jest.fn(() => ({
        execute: jest.fn().mockResolvedValue({ success: true, output: '[]', rowCount: 0, executedAt: new Date() }),
        close: jest.fn().mockResolvedValue(undefined)
    }))
}));

jest.mock('../../../src/services/script.executor', () => ({
    ScriptExecutor: {
        validate: jest.fn().mockReturnValue({ valid: true, errors: [] }),
        execute: jest.fn().mockResolvedValue({ success: true, output: 'Script output', executedAt: new Date() })
    }
}));

jest.mock('../../../src/models/DatabaseInstance', () => ({
    DatabaseInstanceModel: {
        findById: jest.fn()
    }
}));

jest.mock('../../../src/models/QueryRequest', () => ({
    QueryRequestModel: {
        setExecutionResult: jest.fn().mockResolvedValue(null)
    }
}));

jest.mock('../../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

// Set env variables for tests
process.env.TARGET_POSTGRES_URL = 'postgresql://localhost:5432/test';
process.env.TARGET_MONGODB_URL = 'mongodb://localhost:27017/test';

import { ScriptExecutor } from '../../../src/services/script.executor';
import { DatabaseInstanceModel } from '../../../src/models/DatabaseInstance';
import { QueryRequestModel } from '../../../src/models/QueryRequest';
import { PostgresExecutor } from '../../../src/services/postgres.executor';
import { createMongoExecutor } from '../../../src/services/mongo.executor';

describe('ExecutionService', () => {
    let originalEnv: NodeJS.ProcessEnv;

    beforeEach(async () => {
        jest.clearAllMocks();
        originalEnv = { ...process.env };
        await ExecutionService.cleanup();
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    const mockDatabaseInstance = {
        id: 'db-1',
        name: 'Test DB',
        type: DatabaseType.POSTGRESQL,
        host: 'localhost',
        port: 5432,
        databases: ['test_db']
    };

    const createMockRequest = (overrides: Partial<QueryRequest> = {}): QueryRequest => ({
        id: 'req-1',
        userId: 'user-1',
        userEmail: 'user@example.com',
        databaseType: DatabaseType.POSTGRESQL,
        instanceId: 'db-1',
        instanceName: 'Test DB',
        databaseName: 'test_db',
        submissionType: SubmissionType.QUERY,
        query: 'SELECT * FROM users',
        comments: 'Test query',
        podId: 'pod-1',
        podName: 'Engineering',
        status: RequestStatus.APPROVED,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...overrides
    });

    describe('executeRequest', () => {
        it('should execute query request successfully', async () => {
            const request = createMockRequest();
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockDatabaseInstance);

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(true);
            expect(QueryRequestModel.setExecutionResult).toHaveBeenCalled();
        });

        it('should execute script request successfully', async () => {
            const request = createMockRequest({
                submissionType: SubmissionType.SCRIPT,
                query: undefined,
                scriptContent: 'console.log("test")',
                scriptFileName: 'test.js'
            });
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockDatabaseInstance);

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(true);
            expect(ScriptExecutor.execute).toHaveBeenCalled();
        });

        it('should handle execution error', async () => {
            const request = createMockRequest();
            (DatabaseInstanceModel.findById as jest.Mock).mockRejectedValue(new Error('Database error'));

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Database error');
            expect(QueryRequestModel.setExecutionResult).toHaveBeenCalledWith(
                'req-1',
                false,
                undefined,
                'Database error'
            );
        });

        it('should handle unknown error type', async () => {
            const request = createMockRequest();
            (DatabaseInstanceModel.findById as jest.Mock).mockRejectedValue('String error');

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown error');
        });
    });

    describe('executeQuery (via executeRequest)', () => {
        it('should reject when no query provided', async () => {
            const request = createMockRequest({ query: undefined });

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(false);
            expect(result.error).toContain('No query provided');
        });

        it('should reject when database instance not found', async () => {
            const request = createMockRequest();
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(null);

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(false);
            expect(result.error).toContain('not found');
        });

        it('should execute PostgreSQL query', async () => {
            const request = createMockRequest({ databaseType: DatabaseType.POSTGRESQL });
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockDatabaseInstance);

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(true);
        });

        it('should execute MongoDB query', async () => {
            const request = createMockRequest({
                databaseType: DatabaseType.MONGODB,
                query: 'db["users"].find({})'
            });
            const mongoInstance = { ...mockDatabaseInstance, type: DatabaseType.MONGODB, port: 27017 };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mongoInstance);

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(true);
            expect(createMongoExecutor).toHaveBeenCalled();
        });

        it('should reuse existing connection', async () => {
            const request = createMockRequest();
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockDatabaseInstance);

            // Execute twice to test connection reuse
            await ExecutionService.executeRequest(request);
            await ExecutionService.executeRequest(request);

            // PostgresExecutor should reuse connection from previous call
            expect(DatabaseInstanceModel.findById).toHaveBeenCalledTimes(2);
        });

        it('should throw when TARGET_POSTGRES_URL is not configured', async () => {
            const request = createMockRequest({
                submissionType: SubmissionType.QUERY,
                databaseType: DatabaseType.POSTGRESQL,
                instanceId: 'db-no-pg-url-query'
            });
            const mockInstance = { ...mockDatabaseInstance, id: 'db-no-pg-url-query' };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);

            process.env.TARGET_POSTGRES_URL = "";

            const result = await ExecutionService.executeRequest(request);
            expect(result.success).toBe(false);
            expect(result.error).toContain('TARGET_POSTGRES_URL is not configured');
        });

        it('should throw when TARGET_MONGODB_URL is not configured', async () => {
            const request = createMockRequest({
                submissionType: SubmissionType.QUERY,
                databaseType: DatabaseType.MONGODB,
                instanceId: 'db-no-mongo-url-query'
            });
            const mockInstance = { ...mockDatabaseInstance, id: 'db-no-mongo-url-query' };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);

            process.env.TARGET_MONGODB_URL = "";

            const result = await ExecutionService.executeRequest(request);
            expect(result.success).toBe(false);
            expect(result.error).toContain('TARGET_MONGODB_URL is not configured');
        });
    });

    describe('executeScript (via executeRequest)', () => {
        it('should reject when no script content provided', async () => {
            const request = createMockRequest({
                submissionType: SubmissionType.SCRIPT,
                query: undefined,
                scriptContent: undefined
            });

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(false);
            expect(result.error).toContain('No script content provided');
        });

        it('should reject invalid script', async () => {
            const request = createMockRequest({
                submissionType: SubmissionType.SCRIPT,
                query: undefined,
                scriptContent: 'eval("bad")'
            });
            (ScriptExecutor.validate as jest.Mock).mockReturnValue({
                valid: false,
                errors: ['eval() is not allowed']
            });

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(false);
            expect(result.error).toContain('Script validation failed');
        });

        it('should throw when TARGET_POSTGRES_URL is not configured for script', async () => {
            const request = createMockRequest({
                submissionType: SubmissionType.SCRIPT,
                scriptContent: 'console.log(1)',
                databaseType: DatabaseType.POSTGRESQL,
                instanceId: 'db-no-pg-url-script'
            });
            const mockInstance = { ...mockDatabaseInstance, id: 'db-no-pg-url-script' };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (ScriptExecutor.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });

            process.env.TARGET_POSTGRES_URL = "";

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(false);
            expect(result.error).toContain('TARGET_POSTGRES_URL is not configured');
        });

        it('should throw when TARGET_MONGODB_URL is not configured for script', async () => {
            const request = createMockRequest({
                submissionType: SubmissionType.SCRIPT,
                scriptContent: 'console.log(1)',
                databaseType: DatabaseType.MONGODB,
                instanceId: 'db-no-mongo-url-script'
            });
            const mockInstance = { ...mockDatabaseInstance, id: 'db-no-mongo-url-script' };
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockInstance);
            (ScriptExecutor.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });

            process.env.TARGET_MONGODB_URL = "";

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(false);
            expect(result.error).toContain('TARGET_MONGODB_URL is not configured');
        });



        it('should execute script with PostgreSQL config', async () => {
            const request = createMockRequest({
                submissionType: SubmissionType.SCRIPT,
                databaseType: DatabaseType.POSTGRESQL,
                query: undefined,
                scriptContent: 'console.log(1)'
            });
            (ScriptExecutor.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mockDatabaseInstance);

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(true);
            expect(ScriptExecutor.execute).toHaveBeenCalledWith(
                'console.log(1)',
                expect.objectContaining({
                    postgresUrl: expect.any(String),
                    databaseName: 'test_db',
                    databaseType: 'postgresql'
                })
            );
        });

        it('should execute script with MongoDB config', async () => {
            const request = createMockRequest({
                submissionType: SubmissionType.SCRIPT,
                databaseType: DatabaseType.MONGODB,
                query: undefined,
                scriptContent: 'console.log(1)'
            });
            const mongoInstance = { ...mockDatabaseInstance, type: DatabaseType.MONGODB, port: 27017 };
            (ScriptExecutor.validate as jest.Mock).mockReturnValue({ valid: true, errors: [] });
            (DatabaseInstanceModel.findById as jest.Mock).mockResolvedValue(mongoInstance);

            const result = await ExecutionService.executeRequest(request);

            expect(result.success).toBe(true);
            expect(ScriptExecutor.execute).toHaveBeenCalledWith(
                'console.log(1)',
                expect.objectContaining({
                    mongoUrl: expect.stringContaining('mongodb://'),
                    databaseName: 'test_db',
                    databaseType: 'mongodb'
                })
            );
        });
    });

    describe('cleanup', () => {
        it('should close all connections', async () => {
            await ExecutionService.cleanup();

            // Cleanup should not throw
            expect(true).toBe(true);
        });
    });
});
