import { DatabaseType, SubmissionType, ExecutionResult, QueryRequest } from '../types';
import { PostgresExecutor, createPostgresExecutor } from './postgres.executor';
import { MongoExecutor, createMongoExecutor } from './mongo.executor';
import { ScriptExecutor } from './script.executor';
import { DatabaseInstanceModel } from '../models/DatabaseInstance';
import { QueryRequestModel } from '../models/QueryRequest';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errors';
import { config } from '../config/environment';
import { compressResult, shouldCompress, getByteSize, formatBytes } from '../utils/compression';

// Store active database connections
const postgresConnections: Map<string, PostgresExecutor> = new Map();
const mongoConnections: Map<string, MongoExecutor> = new Map();

/**
 * Main Execution Service
 * Orchestrates query and script execution
 */
export class ExecutionService {
    /**
     * Execute a query request
     */
    static async executeRequest(request: QueryRequest): Promise<ExecutionResult> {
        logger.info('Starting execution', {
            requestId: request.id,
            type: request.submissionType,
            database: request.instanceName
        });

        try {
            let result: ExecutionResult;

            if (request.submissionType === SubmissionType.SCRIPT) {
                result = await this.executeScript(request);
            } else {
                result = await this.executeQuery(request);
            }

            // Handle large results - compress if needed
            if (result.success && result.output) {
                const originalSize = getByteSize(result.output);
                result.originalSize = originalSize;

                if (shouldCompress(result.output, config.resultStorage.compressionThreshold)) {
                    logger.info('Compressing large result', {
                        requestId: request.id,
                        originalSize,
                        formattedSize: formatBytes(originalSize)
                    });

                    const compressed = await compressResult(result.output);
                    result.output = compressed;
                    result.isCompressed = true;

                    logger.info('Result compressed', {
                        requestId: request.id,
                        compressedSize: getByteSize(compressed),
                        ratio: (getByteSize(compressed) / originalSize * 100).toFixed(1) + '%'
                    });
                }
            }

            // Update request with result
            await QueryRequestModel.setExecutionResult(
                request.id,
                result.success,
                result.output,
                result.error,
                result.isCompressed
            );

            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            // Update request with error
            await QueryRequestModel.setExecutionResult(
                request.id,
                false,
                undefined,
                errorMessage
            );

            return {
                success: false,
                error: errorMessage,
                executedAt: new Date()
            };
        }
    }

    /**
     * Execute a query (SQL or MongoDB)
     */
    private static async executeQuery(request: QueryRequest): Promise<ExecutionResult> {
        if (!request.query) {
            throw new ValidationError('No query provided');
        }

        // Get instance details
        const instance = await DatabaseInstanceModel.findById(request.instanceId);
        if (!instance) {
            throw new NotFoundError('Database instance');
        }

        if (request.databaseType === DatabaseType.POSTGRESQL) {
            return this.executePostgresQuery(instance, request.databaseName, request.query);
        } else {
            return this.executeMongoQuery(instance, request.databaseName, request.query);
        }
    }

    /**
     * Execute PostgreSQL query
     */
    private static async executePostgresQuery(
        instance: { id: string; host: string; port: number },
        databaseName: string,
        query: string
    ): Promise<ExecutionResult> {
        // Connection key for caching
        const connKey = `postgres:${databaseName}`;

        // Get or create executor using target connection string
        let executor = postgresConnections.get(connKey);

        if (!executor) {
            const targetUrl = process.env.TARGET_POSTGRES_URL;
            if (!targetUrl) {
                throw new ValidationError('TARGET_POSTGRES_URL is not configured');
            }

            executor = createPostgresExecutor(targetUrl);
            postgresConnections.set(connKey, executor);
        }

        // Execute query with schema name - the executor will SET search_path first
        return executor.execute(query, databaseName);
    }

    /**
     * Execute MongoDB query
     */
    private static async executeMongoQuery(
        instance: { id: string; host: string; port: number },
        databaseName: string,
        query: string
    ): Promise<ExecutionResult> {
        // Connection key for caching
        const connKey = `mongo:${databaseName}`;

        // Get or create executor using target connection string
        let executor = mongoConnections.get(connKey);

        if (!executor) {
            const targetUrl = process.env.TARGET_MONGODB_URL;
            if (!targetUrl) {
                throw new ValidationError('TARGET_MONGODB_URL is not configured');
            }

            executor = createMongoExecutor(targetUrl, databaseName);
            mongoConnections.set(connKey, executor);
        }

        return executor.execute(query);
    }

    /**
     * Execute JavaScript script
     */
    private static async executeScript(request: QueryRequest): Promise<ExecutionResult> {
        if (!request.scriptContent) {
            throw new ValidationError('No script content provided');
        }

        // Validate script
        const validation = ScriptExecutor.validate(request.scriptContent);
        if (!validation.valid) {
            return {
                success: false,
                error: `Script validation failed: ${validation.errors.join(', ')}`,
                executedAt: new Date()
            };
        }

        // Prepare database config for script based on database type
        const dbConfig: {
            postgresUrl?: string;
            mongoUrl?: string;
            databaseName: string;
            databaseType: string;
        } = {
            databaseName: request.databaseName,
            databaseType: request.databaseType
        };

        if (request.databaseType === DatabaseType.POSTGRESQL) {
            const targetUrl = process.env.TARGET_POSTGRES_URL;
            if (!targetUrl) {
                throw new ValidationError('TARGET_POSTGRES_URL is not configured');
            }
            dbConfig.postgresUrl = targetUrl;
        } else {
            const targetUrl = process.env.TARGET_MONGODB_URL;
            if (!targetUrl) {
                throw new ValidationError('TARGET_MONGODB_URL is not configured');
            }
            dbConfig.mongoUrl = targetUrl;
        }

        return ScriptExecutor.execute(request.scriptContent, dbConfig);
    }

    /**
     * Cleanup connections
     */
    static async cleanup(): Promise<void> {
        for (const executor of postgresConnections.values()) {
            await executor.close();
        }
        postgresConnections.clear();

        for (const executor of mongoConnections.values()) {
            await executor.close();
        }
        mongoConnections.clear();
    }
}
