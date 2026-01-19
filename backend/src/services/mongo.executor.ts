import mongoose from 'mongoose';
import { ExecutionResult } from '../types';
import { logger } from '../utils/logger';
import { sanitizeMongoInput } from '../utils/sanitizer';

const QUERY_TIMEOUT_MS = 60000; // 60 seconds

/**
 * MongoDB Query Executor using Mongoose
 * Safely executes MongoDB queries against target databases
 */
export class MongoExecutor {
    private connection: mongoose.Connection | null = null;
    private uri: string;
    private databaseName: string;

    constructor(uri: string, databaseName: string) {
        this.uri = uri;
        this.databaseName = databaseName;
    }

    /**
     * Connect to MongoDB using Mongoose
     */
    async connect(): Promise<void> {
        if (!this.connection) {
            this.connection = await mongoose.createConnection(this.uri, {
                maxPoolSize: 10,
                serverSelectionTimeoutMS: 10000,
                dbName: this.databaseName
            }).asPromise();
        }
    }

    /**
     * Close connection
     */
    async close(): Promise<void> {
        if (this.connection) {
            await this.connection.close();
            this.connection = null;
        }
    }

    /**
     * Get native MongoDB database reference via Mongoose connection
     */
    private getDb() {
        if (!this.connection) {
            throw new Error('Not connected to MongoDB');
        }
        return this.connection.db;
    }

    /**
     * Execute a MongoDB query
     * Supports find, aggregate, updateOne, updateMany, deleteOne, deleteMany, insertOne, insertMany
     */
    async execute(queryString: string): Promise<ExecutionResult> {
        const startTime = Date.now();

        try {
            // Sanitize input to prevent NoSQL injection
            sanitizeMongoInput(queryString);

            if (!this.connection) {
                await this.connect();
            }

            const db = this.getDb();
            if (!db) {
                throw new Error('Database not available');
            }

            // Parse and execute the query
            const result = await this.executeQuery(db, queryString);
            const duration = Date.now() - startTime;

            logger.info('MongoDB query executed', {
                duration,
                success: true
            });

            return {
                success: true,
                output: JSON.stringify(result, null, 2),
                rowCount: Array.isArray(result) ? result.length : 1,
                executedAt: new Date()
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Check for timeout errors
            const isTimeout = errorMessage.includes('operation exceeded time limit') ||
                errorMessage.includes('MaxTimeMSExpired');

            if (isTimeout) {
                logger.warn('MongoDB query TIMED OUT', { duration, timeoutMs: QUERY_TIMEOUT_MS });
                return {
                    success: false,
                    error: `Query exceeded ${QUERY_TIMEOUT_MS / 1000} second timeout. Please optimize your query or add filters to reduce execution time.`,
                    executedAt: new Date()
                };
            }

            logger.error('MongoDB query failed', {
                error: errorMessage,
                duration
            });

            return {
                success: false,
                error: errorMessage,
                executedAt: new Date()
            };
        }
    }

    /**
     * Parse and execute MongoDB query using native driver via Mongoose
     */
    private async executeQuery(db: mongoose.mongo.Db, queryString: string): Promise<unknown> {
        // Parse query format: db.collection.method({...}) or db['collection'].method({...})
        const queryRegex = /^db(?:\[["'](?<bracketName>[^\]"']+)["']\]|\.(?<dotName>[^.(]+))\.(?<method>\w+)\((?<args>.*)\)$/s;
        const match = queryString.trim().match(queryRegex);

        if (!match || !match.groups) {
            throw new Error('Invalid MongoDB query format. Expected: db.collection.method({...}) or db["collection"].method({...})');
        }

        const collectionName = match.groups.bracketName || match.groups.dotName;
        const { method, args: argsString } = match.groups;
        const collection = db.collection(collectionName);

        // Parse arguments (handle empty args)
        let args: unknown[] = [];
        if (argsString && argsString.trim()) {
            try {
                // Try to parse as JSON array first
                args = JSON.parse(`[${argsString}]`);
            } catch {
                // If that fails, try to evaluate as single JSON object
                try {
                    args = [JSON.parse(argsString)];
                } catch {
                    throw new Error('Invalid query arguments. Must be valid JSON.');
                }
            }
        }

        // Execute based on method with timeout
        switch (method) {
            case 'find': {
                const filter = args[0] as object || {};
                return collection.find(filter, { maxTimeMS: QUERY_TIMEOUT_MS }).toArray();
            }

            case 'findOne':
                return collection.findOne(args[0] as object || {}, { maxTimeMS: QUERY_TIMEOUT_MS });

            case 'aggregate': {
                const pipeline = args[0] as object[] || [];
                return collection.aggregate(pipeline, { maxTimeMS: QUERY_TIMEOUT_MS }).toArray();
            }

            case 'insertOne':
                if (!args[0]) throw new Error('insertOne requires a document');
                return collection.insertOne(args[0] as object);

            case 'insertMany': {
                if (!args[0]) throw new Error('insertMany requires documents array');
                return collection.insertMany(args[0] as object[]);
            }

            case 'updateOne':
                if (!args[0] || !args[1]) throw new Error('updateOne requires filter and update');
                return collection.updateOne(args[0] as object, args[1] as object);

            case 'updateMany':
                if (!args[0] || !args[1]) throw new Error('updateMany requires filter and update');
                return collection.updateMany(args[0] as object, args[1] as object);

            case 'deleteOne':
                if (!args[0]) throw new Error('deleteOne requires a filter');
                return collection.deleteOne(args[0] as object);

            case 'deleteMany':
                if (!args[0]) throw new Error('deleteMany requires a filter');
                return collection.deleteMany(args[0] as object);

            case 'countDocuments':
                return collection.countDocuments(args[0] as object || {}, { maxTimeMS: QUERY_TIMEOUT_MS });

            default:
                throw new Error(`Unsupported MongoDB method: ${method}`);
        }
    }

    /**
     * Test connection
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.connect();
            const db = this.getDb();
            if (db) {
                await db.command({ ping: 1 });
                return true;
            }
            return false;
        } catch {
            return false;
        }
    }
}

/**
 * Create MongoDB executor from URI
 */
export function createMongoExecutor(uri: string, databaseName: string): MongoExecutor {
    return new MongoExecutor(uri, databaseName);
}
