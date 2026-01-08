import { MongoClient, Db } from 'mongodb';
import { ExecutionResult } from '../types';
import { logger } from '../utils/logger';
import { sanitizeMongoInput } from '../utils/sanitizer';

/**
 * MongoDB Query Executor
 * Safely executes MongoDB queries against target databases
 */
export class MongoExecutor {
    private client: MongoClient | null = null;
    private uri: string;
    private databaseName: string;

    constructor(uri: string, databaseName: string) {
        this.uri = uri;
        this.databaseName = databaseName;
    }

    /**
     * Connect to MongoDB
     */
    async connect(): Promise<void> {
        if (!this.client) {
            this.client = new MongoClient(this.uri, {
                maxPoolSize: 5,
                serverSelectionTimeoutMS: 10000
            });
            await this.client.connect();
        }
    }

    /**
     * Close connection
     */
    async close(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
        }
    }

    /**
     * Get database reference
     */
    private getDb(): Db {
        if (!this.client) {
            throw new Error('Not connected to MongoDB');
        }
        return this.client.db(this.databaseName);
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

            if (!this.client) {
                await this.connect();
            }

            const db = this.getDb();

            // Parse and execute the query
            // Expected format: db.collectionName.operation({...})
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
     * Parse and execute MongoDB query
     */
    private async executeQuery(db: Db, queryString: string): Promise<unknown> {
        // Parse query format: db.collection.method({...})
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

        // Execute based on method
        switch (method) {
            case 'find':
                return collection.find(args[0] as object || {}).toArray();

            case 'findOne':
                return collection.findOne(args[0] as object || {});

            case 'aggregate':
                return collection.aggregate(args[0] as object[] || []).toArray();

            case 'insertOne':
                if (!args[0]) throw new Error('insertOne requires a document');
                return collection.insertOne(args[0] as object);

            case 'insertMany':
                if (!args[0]) throw new Error('insertMany requires documents array');
                return collection.insertMany(args[0] as object[]);

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
                return collection.countDocuments(args[0] as object || {});

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
            await this.getDb().command({ ping: 1 });
            return true;
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
