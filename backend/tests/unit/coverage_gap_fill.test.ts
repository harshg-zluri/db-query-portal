import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate } from '../../src/middleware/auth.middleware';
import { AuthenticationError } from '../../src/utils/errors';
import { config } from '../../src/config/environment';
import { UserModel } from '../../src/models/User';
import { query } from '../../src/config/database';
import { UserRole } from '../../src/types';
import { AuthService } from '../../src/services/auth.service';
import { MongoExecutor } from '../../src/services/mongo.executor';
import { ScriptExecutor } from '../../src/services/script.executor';
import { PostgresExecutor } from '../../src/services/postgres.executor';
import * as child_process from 'child_process';

// Mock config globally for the whole file
jest.mock('../../src/config/environment', () => ({
    config: {
        scriptExecution: {
            timeoutMs: 100, // Short timeout for tests
            maxMemoryMb: 50 // Cover memory limit branch
        },
        jwt: {
            secret: 'test-secret',
            expiresIn: '1h'
        },
        mongo: { url: 'mongodb://localhost:27017' },
        postgres: { url: 'postgres://localhost:5432' },
        env: 'test'
    }
}));

// Mock child_process globally
jest.mock('child_process', () => ({
    spawn: jest.fn()
}));

// Mock dependencies
jest.mock('../../src/config/database');
jest.mock('jsonwebtoken');
jest.mock('../../src/models/Pod');

describe('Coverage Gap Fill Tests', () => {

    afterEach(() => {
        jest.clearAllMocks();
    });

    // 1. Auth Middleware - TokenExpiredError
    describe('Auth Middleware - Expired Token', () => {
        let mockRequest: Partial<Request>;
        let mockResponse: Partial<Response>;
        let nextFunction: NextFunction;

        beforeEach(() => {
            mockRequest = {
                headers: { authorization: 'Bearer expired_token' }
            };
            mockResponse = {};
            nextFunction = jest.fn();
        });

        it('should handle TokenExpiredError', () => {
            (jwt.verify as jest.Mock).mockImplementation(() => {
                throw new jwt.TokenExpiredError('jwt expired', new Date());
            });

            authenticate(mockRequest as Request, mockResponse as Response, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(expect.any(AuthenticationError));
            const error = (nextFunction as jest.Mock).mock.calls[0][0];
            expect(error.message).toBe('Authentication token has expired');
        });
    });



    // 3. Mongo Executor - Validation and Branches
    describe('MongoExecutor Tests', () => {
        let executor: MongoExecutor;
        let mockDb: any;
        let mockCollection: any;

        beforeEach(() => {
            executor = new MongoExecutor('url', 'db');
            mockCollection = {
                insertOne: jest.fn(),
                insertMany: jest.fn(),
                updateOne: jest.fn(),
                updateMany: jest.fn(),
                deleteOne: jest.fn(),
                deleteMany: jest.fn(),
                find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
                findOne: jest.fn().mockResolvedValue(null),
                aggregate: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
                countDocuments: jest.fn().mockResolvedValue(0)
            };
            mockDb = {
                collection: jest.fn().mockReturnValue(mockCollection)
            };
            // Mock getDb to return our mock
            // Note: private method access
            (executor as any).client = { db: jest.fn().mockReturnValue(mockDb) };
        });

        it('should handle missing client after connection (line 48)', async () => {
            (executor as any).client = null;
            jest.spyOn(executor as any, 'connect').mockResolvedValue(undefined);

            // This will call connect (mocked to do nothing), then getDb checks client -> throws
            const result = await executor.execute('db["coll"].find()');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Not connected to MongoDB');
        });

        it('should validate inputs for write operations', async () => {
            // insertOne
            await expect(executor.execute('db["coll"].insertOne()')).resolves.toMatchObject({
                success: false,
                error: 'insertOne requires a document'
            });
            // insertMany
            await expect(executor.execute('db["coll"].insertMany()')).resolves.toMatchObject({
                success: false,
                error: 'insertMany requires documents array'
            });
            // updateOne
            await expect(executor.execute('db["coll"].updateOne({})')).resolves.toMatchObject({
                success: false,
                error: 'updateOne requires filter and update'
            });
            // updateMany
            await expect(executor.execute('db["coll"].updateMany({})')).resolves.toMatchObject({
                success: false,
                error: 'updateMany requires filter and update'
            });
            // deleteOne
            await expect(executor.execute('db["coll"].deleteOne()')).resolves.toMatchObject({
                success: false,
                error: 'deleteOne requires a filter'
            });
            // deleteMany
            await expect(executor.execute('db["coll"].deleteMany()')).resolves.toMatchObject({
                success: false,
                error: 'deleteMany requires a filter'
            });
        });

        it('should use default arguments for read operations', async () => {
            // find
            await executor.execute('db["coll"].find()');
            expect(mockCollection.find).toHaveBeenCalledWith({});
            // findOne
            await executor.execute('db["coll"].findOne()');
            expect(mockCollection.findOne).toHaveBeenCalledWith({});
            // aggregate
            await executor.execute('db["coll"].aggregate()');
            expect(mockCollection.aggregate).toHaveBeenCalledWith([]);
            // countDocuments
            await executor.execute('db["coll"].countDocuments()');
            expect(mockCollection.countDocuments).toHaveBeenCalledWith({});
        });

        it('should handle non-Error exceptions', async () => {
            // Force connect call
            (executor as any).client = null;
            jest.spyOn(executor as any, 'connect').mockImplementation(() => {
                throw "String error";
            });

            const result = await executor.execute('db["coll"].find()');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown error');
        });
    });

    // Postgres Executor
    describe('PostgresExecutor Tests', () => {
        let pgExecutor: PostgresExecutor;

        beforeEach(() => {
            pgExecutor = new PostgresExecutor({
                host: 'localhost',
                port: 5432,
                database: 'test',
                user: 'test',
                password: 'password'
            });
            // Mock pool query
            (pgExecutor as any).pool = {
                query: jest.fn(),
                connect: jest.fn().mockResolvedValue({ release: jest.fn() }),
                on: jest.fn()
            };
        });

        it('should handle non-Error exceptions (line 94)', async () => {
            const mockQuery = jest.fn().mockImplementation(() => {
                throw "String error";
            });

            (pgExecutor as any).pool.connect.mockResolvedValue({
                query: mockQuery,
                release: jest.fn()
            });

            const result = await pgExecutor.execute('SELECT 1');
            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown error');
        });
    });

    // 4. Script Executor - Timeout and Stderr
    describe('Script Executor Tests', () => {
        let spawnMock: jest.Mock;

        // Note: Using real timers and global config mock (timeoutMs: 100)

        beforeEach(() => {
            spawnMock = (child_process.spawn as jest.Mock);
        });

        it('should kill process on timeout', async () => {
            const mockChild = {
                stdout: { on: jest.fn() },
                stderr: { on: jest.fn() },
                on: jest.fn(),
                kill: jest.fn(),
                killed: false,
                stdin: { write: jest.fn(), end: jest.fn() }
            };
            spawnMock.mockReturnValue(mockChild);

            const execPromise = ScriptExecutor.execute('console.log("hi")', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });

            // Wait for globally mocked timeout (100ms)
            const result = await execPromise;

            expect(result.success).toBe(false);
            expect(result.error).toContain('timed out');
            expect(mockChild.kill).toHaveBeenCalledWith('SIGTERM');
        });

        it('should handle process error output and exit code', async () => {
            const mockChild = {
                stdout: { on: jest.fn() },
                stderr: {
                    on: jest.fn((event, cb) => {
                        // unexpected error output
                    })
                },
                on: jest.fn((event, cb) => {
                    if (event === 'close') {
                        cb(1);
                    }
                }),
                kill: jest.fn(),
                killed: false,
                stdin: { write: jest.fn(), end: jest.fn() }
            };
            spawnMock.mockReturnValue(mockChild);

            const result = await ScriptExecutor.execute('code', {
                databaseName: 'test_db',
                databaseType: 'postgres'
            });
            expect(result.success).toBe(false);
            expect(result.error).toBe('Process exited with code 1');
        });
    });

    // 5. Auth Service - Login Manager Logic
    describe('Auth Service - Login Manager Logic', () => {
        it('should use existing managedPodIds for Manager login', async () => {
            const mockUser = {
                id: '1',
                email: 'manager@test.com',
                password: 'hashedpassword',
                role: UserRole.MANAGER,
                managedPodIds: ['pod1']
            };

            jest.spyOn(UserModel, 'findByEmail').mockResolvedValue(mockUser as any);
            jest.spyOn(AuthService as any, 'comparePassword').mockResolvedValue(true);
            (jwt.sign as jest.Mock).mockReturnValue('token');

            await AuthService.login('manager@test.com', 'pass');

            const signCall = (jwt.sign as jest.Mock).mock.calls[0];
            expect(signCall[0].managedPodIds).toEqual(['pod1']);
        });

        it('should use provided managedPodIds when user has none (lines 91, 129)', async () => {
            const mockUser = {
                id: '1',
                email: 'manager@test.com',
                password: 'hashedpassword',
                role: UserRole.MANAGER,
                managedPodIds: [] // Empty
            };

            jest.spyOn(UserModel, 'findByEmail').mockResolvedValue(mockUser as any);
            jest.spyOn(AuthService as any, 'comparePassword').mockResolvedValue(true);

            // Mock PodModel fallback
            // Need to import PodModel first or use require?
            // PodModel is mocked in file top: jest.mock('../../src/models/Pod');
            const { PodModel } = require('../../src/models/Pod');
            (PodModel.getManagedPodIds as jest.Mock).mockResolvedValue(['pod_fallback']);

            (jwt.sign as jest.Mock).mockReturnValue('token');

            await AuthService.login('manager@test.com', 'pass');

            // Check that token has fallback
            const signCall = (jwt.sign as jest.Mock).mock.calls[0];
            expect(signCall[0].managedPodIds).toEqual(['pod_fallback']);
        });
    });

    // Script Executor Memory Limit 
    // Already covered by global mock?
    // Let's add explicit test to be sure
    it('should perform managedPodIds fallback precedence (lines 91, 129)', async () => {
        // Case 1: User has managed pods -> use them
        const mockUserWithPods = {
            id: '2',
            email: 'manager2@test.com',
            password: 'hashedpassword',
            role: UserRole.MANAGER,
            managedPodIds: ['user_pod']
        };

        jest.spyOn(UserModel, 'findByEmail').mockResolvedValue(mockUserWithPods as any);
        jest.spyOn(AuthService as any, 'comparePassword').mockResolvedValue(true);
        (jwt.sign as jest.Mock).mockReturnValue('token');

        await AuthService.login('manager2@test.com', 'pass');
        const signCall = (jwt.sign as jest.Mock).mock.calls[0]; // Recent call
        expect(signCall[0].managedPodIds).toEqual(['user_pod']);
    });

    it('should use user managedPodIds in refreshAccessToken (line 91)', async () => {
        const mockUserWithPods = {
            id: '3',
            email: 'manager3@test.com',
            password: 'hashedpassword',
            role: UserRole.MANAGER,
            managedPodIds: ['refresh_pod']
        };

        jest.spyOn(UserModel, 'findById').mockResolvedValue(mockUserWithPods as any);
        (jwt.verify as jest.Mock).mockReturnValue({ userId: '3', type: 'refresh' });
        (jwt.sign as jest.Mock).mockReturnValue('new_access_token');

        // Call refresh
        const mockReq = { body: { refreshToken: 'valid' } };
        // AuthService.refreshAccessToken is instance method? No it's static?
        // Let's check. If static: AuthService.refreshAccessToken
        await AuthService.refreshAccessToken('valid');

        const signCall = (jwt.sign as jest.Mock).mock.calls[0];
        expect(signCall[0].managedPodIds).toEqual(['refresh_pod']);
    });
});

describe('Script Executor - Error Handling', () => {
    // Existing test handles timeout/memory?

    it('should handle non-Error exceptions (line 54)', async () => {
        (child_process.spawn as jest.Mock).mockImplementation(() => {
            throw "String error";
        });

        const result = await ScriptExecutor.execute('code', {
            databaseName: 'test_db',
            databaseType: 'postgres'
        });
        expect(result.success).toBe(false);
        expect(result.error).toBe('Unknown error');
    });
});

