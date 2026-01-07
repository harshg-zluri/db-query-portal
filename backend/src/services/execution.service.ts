import { DatabaseType, SubmissionType, ExecutionResult, QueryRequest } from '../types';
import { PostgresExecutor, createPostgresExecutor } from './postgres.executor';
import { MongoExecutor, createMongoExecutor } from './mongo.executor';
import { ScriptExecutor } from './script.executor';
import { DatabaseInstanceModel } from '../models/DatabaseInstance';
import { QueryRequestModel } from '../models/QueryRequest';
import { logger } from '../utils/logger';
import { ValidationError, NotFoundError } from '../utils/errors';

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

            // Update request with result
            await QueryRequestModel.setExecutionResult(
                request.id,
                result.success,
                result.output,
                result.error
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
        const connKey = `${instance.id}:${databaseName}`;

        // Get or create executor
        let executor = postgresConnections.get(connKey);

        if (!executor) {
            // In production, credentials would come from secure storage
            // For now, use environment-configured credentials
            executor = new PostgresExecutor({
                host: instance.host,
                port: instance.port,
                database: databaseName,
                user: process.env.PG_USER || 'postgres',
                password: process.env.PG_PASSWORD || 'password'
            });
            postgresConnections.set(connKey, executor);
        }

        return executor.execute(query);
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
        const connKey = `${instance.id}:${databaseName}`;

        // Get or create executor
        let executor = mongoConnections.get(connKey);

        if (!executor) {
            // Build MongoDB URI
            const uri = `mongodb://${instance.host}:${instance.port}`;
            executor = createMongoExecutor(uri, databaseName);
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

        // Get instance details
        const instance = await DatabaseInstanceModel.findById(request.instanceId);
        if (!instance) {
            throw new NotFoundError('Database instance');
        }

        // Prepare database config for script
        const dbConfig: { postgresConfigPath?: string; mongoUri?: string } = {};

        if (request.databaseType === DatabaseType.POSTGRESQL) {
            // PostgreSQL config would be written to temp file
            // For now, pass connection details via env
            dbConfig.postgresConfigPath = JSON.stringify({
                host: instance.host,
                port: instance.port,
                database: request.databaseName,
                user: process.env.PG_USER || 'postgres',
                password: process.env.PG_PASSWORD || 'password'
            });
        } else {
            dbConfig.mongoUri = `mongodb://${instance.host}:${instance.port}/${request.databaseName}`;
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
