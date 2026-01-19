import { MongoExecutor, createMongoExecutor } from '../../../src/services/mongo.executor';

// Mock mongoose
jest.mock('mongoose', () => {
    const mockCollection = {
        find: jest.fn().mockReturnValue({ toArray: jest.fn() }),
        findOne: jest.fn(),
        aggregate: jest.fn().mockReturnValue({ toArray: jest.fn() }),
        insertOne: jest.fn(),
        insertMany: jest.fn(),
        updateOne: jest.fn(),
        updateMany: jest.fn(),
        deleteOne: jest.fn(),
        deleteMany: jest.fn(),
        countDocuments: jest.fn()
    };
    const mockDb = {
        collection: jest.fn().mockReturnValue(mockCollection),
        command: jest.fn()
    };
    const mockConnection = {
        close: jest.fn().mockResolvedValue(undefined),
        db: mockDb,
        asPromise: jest.fn().mockResolvedValue(null)
    };

    return {
        createConnection: jest.fn().mockReturnValue({
            asPromise: jest.fn().mockResolvedValue(mockConnection)
        })
    };
});

// Mock sanitizer
jest.mock('../../../src/utils/sanitizer', () => ({
    sanitizeMongoInput: jest.fn((input) => {
        if (input.includes('$where')) {
            throw new Error('Dangerous operator "$where" is not allowed');
        }
        return input;
    })
}));

import mongoose from 'mongoose';
import { sanitizeMongoInput } from '../../../src/utils/sanitizer';

describe('MongoExecutor', () => {
    let executor: MongoExecutor;
    let mockConnection: any;
    let mockDb: any;
    let mockCollection: any;

    beforeEach(() => {
        jest.clearAllMocks();

        mockCollection = {
            find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([{ id: 1 }]) }),
            findOne: jest.fn().mockResolvedValue({ id: 1 }),
            aggregate: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }),
            insertOne: jest.fn().mockResolvedValue({ insertedId: '123' }),
            insertMany: jest.fn().mockResolvedValue({ insertedCount: 2 }),
            updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
            updateMany: jest.fn().mockResolvedValue({ modifiedCount: 5 }),
            deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
            deleteMany: jest.fn().mockResolvedValue({ deletedCount: 10 }),
            countDocuments: jest.fn().mockResolvedValue(42)
        };
        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
            command: jest.fn().mockResolvedValue({ ok: 1 })
        };
        mockConnection = {
            close: jest.fn().mockResolvedValue(undefined),
            db: mockDb
        };

        (mongoose.createConnection as jest.Mock).mockReturnValue({
            asPromise: jest.fn().mockResolvedValue(mockConnection)
        });

        executor = new MongoExecutor('mongodb://localhost:27017', 'testdb');
    });

    describe('connect', () => {
        it('should connect to MongoDB via Mongoose', async () => {
            await executor.connect();
            expect(mongoose.createConnection).toHaveBeenCalled();
        });

        it('should reuse connection', async () => {
            await executor.connect();
            await executor.connect();
            expect(mongoose.createConnection).toHaveBeenCalledTimes(1);
        });
    });

    describe('close', () => {
        it('should close connection', async () => {
            await executor.connect();
            await executor.close();
            expect(mockConnection.close).toHaveBeenCalled();
        });

        it('should handle close without connect', async () => {
            await executor.close();
            // Should not throw
        });
    });

    describe('execute', () => {
        it('should execute find query (bracket notation)', async () => {
            const result = await executor.execute('db["users"].find({})');

            expect(result.success).toBe(true);
            expect(mockCollection.find).toHaveBeenCalledWith({}, { maxTimeMS: 60000 });
        });

        it('should execute find query (dot notation)', async () => {
            const result = await executor.execute('db.users.find({})');

            expect(result.success).toBe(true);
            expect(mockCollection.find).toHaveBeenCalledWith({}, { maxTimeMS: 60000 });
        });

        it('should execute find query (single quote bracket)', async () => {
            const result = await executor.execute("db['users'].find({})");

            expect(result.success).toBe(true);
            expect(mockCollection.find).toHaveBeenCalledWith({}, { maxTimeMS: 60000 });
        });

        it('should execute findOne query', async () => {
            const result = await executor.execute('db["users"].findOne({"_id": "123"})');

            expect(result.success).toBe(true);
            expect(mockCollection.findOne).toHaveBeenCalled();
        });

        it('should execute aggregate query', async () => {
            const result = await executor.execute('db["users"].aggregate([{"$match": {}}])');

            expect(result.success).toBe(true);
            expect(mockCollection.aggregate).toHaveBeenCalled();
        });

        it('should execute insertOne', async () => {
            const result = await executor.execute('db["users"].insertOne({"name": "test"})');

            expect(result.success).toBe(true);
            expect(mockCollection.insertOne).toHaveBeenCalled();
        });

        it('should execute insertMany', async () => {
            const result = await executor.execute('db["users"].insertMany([{"name": "a"}, {"name": "b"}])');

            expect(result.success).toBe(true);
            expect(mockCollection.insertMany).toHaveBeenCalled();
        });

        it('should execute updateOne', async () => {
            const result = await executor.execute('db["users"].updateOne({"_id": "1"}, {"$set": {"name": "test"}})');

            expect(result.success).toBe(true);
            expect(mockCollection.updateOne).toHaveBeenCalled();
        });

        it('should execute updateMany', async () => {
            const result = await executor.execute('db["users"].updateMany({}, {"$set": {"active": true}})');

            expect(result.success).toBe(true);
            expect(mockCollection.updateMany).toHaveBeenCalled();
        });

        it('should execute deleteOne', async () => {
            const result = await executor.execute('db["users"].deleteOne({"_id": "123"})');

            expect(result.success).toBe(true);
            expect(mockCollection.deleteOne).toHaveBeenCalled();
        });

        it('should execute deleteMany', async () => {
            const result = await executor.execute('db["users"].deleteMany({"status": "inactive"})');

            expect(result.success).toBe(true);
            expect(mockCollection.deleteMany).toHaveBeenCalled();
        });

        it('should execute countDocuments', async () => {
            const result = await executor.execute('db["users"].countDocuments({})');

            expect(result.success).toBe(true);
            expect(mockCollection.countDocuments).toHaveBeenCalled();
        });

        it('should reject dangerous operators', async () => {
            (sanitizeMongoInput as jest.Mock).mockImplementationOnce(() => {
                throw new Error('Dangerous operator "$where" is not allowed');
            });

            const result = await executor.execute('db["users"].find({"$where": "malicious"})');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Dangerous operator');
        });

        it('should reject invalid query format', async () => {
            const result = await executor.execute('invalid query');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid MongoDB query format');
        });

        it('should reject unsupported method', async () => {
            const result = await executor.execute('db["users"].dropDatabase()');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Unsupported MongoDB method');
        });

        it('should require document for insertOne', async () => {
            const result = await executor.execute('db["users"].insertOne()');

            expect(result.success).toBe(false);
            expect(result.error).toContain('insertOne requires a document');
        });

        it('should require filter for deleteOne', async () => {
            const result = await executor.execute('db["users"].deleteOne()');

            expect(result.success).toBe(false);
            expect(result.error).toContain('deleteOne requires a filter');
        });

        it('should handle single JSON object argument (fallback parsing)', async () => {
            const result = await executor.execute('db["users"].findOne({"name": "test"})');

            expect(result.success).toBe(true);
            expect(mockCollection.findOne).toHaveBeenCalled();
        });

        it('should reject invalid JSON arguments', async () => {
            const result = await executor.execute('db["users"].find({invalid json})');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid query arguments');
        });

        it('should execute find query with empty args', async () => {
            const result = await executor.execute('db.users.find()');
            expect(result.success).toBe(true);
            expect(mockCollection.find).toHaveBeenCalledWith({}, { maxTimeMS: 60000 });
        });

        it('should execute aggregate with empty args', async () => {
            const result = await executor.execute('db.users.aggregate()');
            expect(result.success).toBe(true);
            expect(mockCollection.aggregate).toHaveBeenCalledWith([], { maxTimeMS: 60000 });
        });

        it('should execute countDocuments with empty args', async () => {
            const result = await executor.execute('db.users.countDocuments()');
            expect(result.success).toBe(true);
            expect(mockCollection.countDocuments).toHaveBeenCalledWith({}, { maxTimeMS: 60000 });
        });

        it('should require documents for insertMany', async () => {
            const result = await executor.execute('db.users.insertMany()');
            expect(result.success).toBe(false);
            expect(result.error).toContain('insertMany requires documents array');
        });

        it('should require filter and update for updateOne', async () => {
            const result = await executor.execute('db.users.updateOne({})');
            expect(result.success).toBe(false);
            expect(result.error).toContain('updateOne requires filter and update');
        });

        it('should require filter and update for updateMany', async () => {
            const result = await executor.execute('db.users.updateMany({})');
            expect(result.success).toBe(false);
            expect(result.error).toContain('updateMany requires filter and update');
        });

        it('should require filter for deleteMany', async () => {
            const result = await executor.execute('db.users.deleteMany()');
            expect(result.success).toBe(false);
            expect(result.error).toContain('deleteMany requires a filter');
        });

        it('should fail if getDb called without connection', async () => {
            jest.spyOn(executor, 'connect').mockResolvedValueOnce(undefined);
            (executor as any).connection = null;

            const result = await executor.execute('db.users.find({})');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Not connected to MongoDB');
        });

        it('should fail if db is not available after connection', async () => {
            // Mock connection exists but db property is undefined
            const mockConnectionWithoutDb = {
                close: jest.fn().mockResolvedValue(undefined),
                db: undefined
            };
            (mongoose.createConnection as jest.Mock).mockReturnValue({
                asPromise: jest.fn().mockResolvedValue(mockConnectionWithoutDb)
            });

            const executor2 = new MongoExecutor('mongodb://localhost:27017', 'testdb');
            const result = await executor2.execute('db.users.find({})');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Database not available');
        });

        it('should execute findOne with empty args', async () => {
            const result = await executor.execute('db.users.findOne()');
            expect(result.success).toBe(true);
            expect(mockCollection.findOne).toHaveBeenCalledWith({}, { maxTimeMS: 60000 });
        });

        it('should handle non-Error exceptions', async () => {
            (sanitizeMongoInput as jest.Mock).mockImplementationOnce(() => {
                throw 'Critical Failure';
            });

            const result = await executor.execute('db.users.find({})');

            expect(result.success).toBe(false);
            expect(result.error).toBe('Unknown error');
        });

        it('should handle query timeout error', async () => {
            mockCollection.find.mockReturnValue({
                toArray: jest.fn().mockRejectedValue(new Error('operation exceeded time limit'))
            });

            const result = await executor.execute('db.users.find({})');

            expect(result.success).toBe(false);
            expect(result.error).toContain('60 second timeout');
            expect(result.error).toContain('optimize your query');
        });
    });

    describe('testConnection', () => {
        it('should return true for valid connection', async () => {
            const result = await executor.testConnection();
            expect(result).toBe(true);
        });

        it('should return false if testConnection connects but db is missing', async () => {
            // Mock connect success
            (mongoose.createConnection as jest.Mock).mockReturnValue({
                asPromise: jest.fn().mockResolvedValue({
                    // Connection object WITHOUT db property
                    close: jest.fn().mockResolvedValue(undefined)
                })
            });
            // Need to create new executor to usage modified mock
            const executor3 = new MongoExecutor('mongodb://localhost:27017', 'testdb');

            // Bypass the 'getDb' check in connect() if any? 
            // Actually getDb() usually called inside execute/testConnection.
            // testConnection calls connect(), then getDb().
            // If getDb() throws, testConnection catches and returns false.
            // But we want to hit line 192 "return false" INSIDE the try block.
            // This happens if getDb() returns null/undefined but DOES NOT throw.
            // Check getDb implementation:
            // private getDb() { if (!this.connection) throw... return this.connection.db; }
            // So if this.connection.db is undefined, it returns undefined.
            const result = await executor3.testConnection();
            expect(result).toBe(false);
        });

        it('should return false for failed connection', async () => {
            (mongoose.createConnection as jest.Mock).mockReturnValue({
                asPromise: jest.fn().mockRejectedValue(new Error('Connection failed'))
            });

            const executor2 = new MongoExecutor('mongodb://invalid:27017', 'testdb');
            const result = await executor2.testConnection();
            expect(result).toBe(false);
        });
    });

    describe('createMongoExecutor', () => {
        it('should create executor', () => {
            const executor = createMongoExecutor('mongodb://localhost:27017', 'testdb');
            expect(executor).toBeInstanceOf(MongoExecutor);
        });
    });
});
