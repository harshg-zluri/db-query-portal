import { MongoExecutor, createMongoExecutor } from '../../../src/services/mongo.executor';

// Mock mongodb
jest.mock('mongodb', () => {
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
    const mockClient = {
        connect: jest.fn().mockResolvedValue(undefined),
        close: jest.fn().mockResolvedValue(undefined),
        db: jest.fn().mockReturnValue(mockDb)
    };
    return {
        MongoClient: jest.fn(() => mockClient)
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

import { MongoClient } from 'mongodb';
import { sanitizeMongoInput } from '../../../src/utils/sanitizer';

describe('MongoExecutor', () => {
    let executor: MongoExecutor;
    let mockClient: any;
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
        mockClient = {
            connect: jest.fn().mockResolvedValue(undefined),
            close: jest.fn().mockResolvedValue(undefined),
            db: jest.fn().mockReturnValue(mockDb)
        };
        (MongoClient as unknown as jest.Mock).mockImplementation(() => mockClient);

        executor = new MongoExecutor('mongodb://localhost:27017', 'testdb');
    });

    describe('connect', () => {
        it('should connect to MongoDB', async () => {
            await executor.connect();
            expect(mockClient.connect).toHaveBeenCalled();
        });

        it('should reuse connection', async () => {
            await executor.connect();
            await executor.connect();
            expect(mockClient.connect).toHaveBeenCalledTimes(1);
        });
    });

    describe('close', () => {
        it('should close connection', async () => {
            await executor.connect();
            await executor.close();
            expect(mockClient.close).toHaveBeenCalled();
        });

        it('should handle close without connect', async () => {
            await executor.close();
            // Should not throw
        });
    });

    describe('execute', () => {
        it('should execute find query', async () => {
            const result = await executor.execute('db["users"].find({})');

            expect(result.success).toBe(true);
            expect(mockCollection.find).toHaveBeenCalledWith({});
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
            // This triggers the fallback JSON parsing path (line 126-127)
            const result = await executor.execute('db["users"].findOne({"name": "test"})');

            expect(result.success).toBe(true);
            expect(mockCollection.findOne).toHaveBeenCalled();
        });

        it('should reject invalid JSON arguments', async () => {
            // This triggers the error path when JSON parsing fails (line 128-129)
            const result = await executor.execute('db["users"].find({invalid json})');

            expect(result.success).toBe(false);
            expect(result.error).toContain('Invalid query arguments');
        });
    });

    describe('testConnection', () => {
        it('should return true for valid connection', async () => {
            const result = await executor.testConnection();
            expect(result).toBe(true);
        });

        it('should return false for failed connection', async () => {
            mockClient.connect.mockRejectedValue(new Error('Connection failed'));

            const result = await executor.testConnection();
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
