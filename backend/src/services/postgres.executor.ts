import postgres from 'postgres';
import { ExecutionResult } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config/environment';

const MAX_ROWS = config.resultStorage.maxRows;

// Log configuration at module load
logger.info('[POSTGRES_EXECUTOR] Module loaded', {
    MAX_ROWS,
    envValue: process.env.MAX_RESULT_ROWS,
    configValue: config.resultStorage.maxRows
});

/**
 * PostgreSQL Query Executor using Drizzle ORM
 * Safely executes SQL queries against target PostgreSQL databases
 */
export class PostgresExecutor {
    private client: postgres.Sql | null = null;
    private connectionString: string;

    constructor(config: {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
        ssl?: boolean;
    }) {
        // Build connection string from config
        const sslParam = config.ssl !== false ? '?sslmode=require' : '';
        this.connectionString = `postgresql://${config.user}:${config.password}@${config.host}:${config.port}/${config.database}${sslParam}`;
    }

    /**
     * Connect to database using postgres.js + Drizzle
     */
    async connect(): Promise<void> {
        if (!this.client) {
            this.client = postgres(this.connectionString, {
                max: 10,
                idle_timeout: 30,
                connect_timeout: 10,
            });
        }
    }

    /**
     * Close connection
     */
    async close(): Promise<void> {
        if (this.client) {
            await this.client.end();
            this.client = null;
        }
    }

    /**
     * Execute a SQL query using Drizzle ORM
     * Note: This executes raw SQL - ensure validation was done before calling
     * @param sqlQuery - The SQL query to execute
     * @param schemaName - Optional schema name to set search_path before executing
     */
    async execute(sqlQuery: string, schemaName?: string): Promise<ExecutionResult> {
        const startTime = Date.now();

        try {
            if (!this.client) {
                await this.connect();
            }

            // Set search_path if schemaName is provided
            if (schemaName) {
                await this.client!.unsafe(`SET search_path TO ${schemaName}, public`);
            }

            // Check if this is a SELECT query - enforce row limit
            const isSelectQuery = sqlQuery.trim().toUpperCase().startsWith('SELECT');

            logger.debug('Query analysis', {
                isSelectQuery,
                maxRows: MAX_ROWS,
                queryPreview: sqlQuery.substring(0, 100)
            });

            if (isSelectQuery) {
                // First, check the count of rows the query would return
                const countQuery = `SELECT COUNT(*) as cnt FROM (${sqlQuery}) AS subquery`;
                const countResult = await this.client!.unsafe(countQuery);
                const rowCount = parseInt(countResult[0]?.cnt || '0', 10);

                logger.info('Row count check', { rowCount, maxRows: MAX_ROWS, willBlock: rowCount > MAX_ROWS });

                if (rowCount > MAX_ROWS) {
                    const duration = Date.now() - startTime;
                    logger.warn('Query BLOCKED - exceeded row limit', { rowCount, maxRows: MAX_ROWS, duration });

                    return {
                        success: false,
                        error: `Query would return ${rowCount.toLocaleString()} rows, which exceeds the maximum limit of ${MAX_ROWS.toLocaleString()} rows. Please add filters or LIMIT clause to reduce the result set.`,
                        executedAt: new Date()
                    };
                }
            }

            // Execute the actual query
            const result = await this.client!.unsafe(sqlQuery);
            const duration = Date.now() - startTime;

            logger.info('PostgreSQL query executed', {
                rowCount: result?.length,
                duration
            });

            // Format output
            let output: string;
            const rows = result || [];

            if (rows.length > 0) {
                // For SELECT queries, format as JSON array
                output = JSON.stringify(rows, null, 2);
            } else if (result?.count !== undefined && result?.count !== null) {
                // For INSERT/UPDATE/DELETE, show affected rows
                output = `${result.count} row(s) affected`;
            } else {
                output = 'Query executed successfully';
            }

            return {
                success: true,
                output,
                rowCount: result?.count ?? result?.length ?? 0,
                executedAt: new Date()
            };
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : String(error);

            logger.error('PostgreSQL query failed', {
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
     * Test connection
     */
    async testConnection(): Promise<boolean> {
        try {
            await this.connect();
            await this.client!`SELECT 1`;
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Create PostgreSQL executor from connection string
 */
export function createPostgresExecutor(connectionString: string): PostgresExecutor {
    // Support both postgres:// and postgresql:// and handle query params
    const regex = /postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)(?:\?(.*))?/;
    const match = connectionString.match(regex);

    if (!match) {
        throw new Error('Invalid PostgreSQL connection string');
    }

    const executor = new PostgresExecutor({
        user: match[1],
        password: match[2],
        host: match[3],
        port: parseInt(match[4], 10),
        database: match[5]
    });

    return executor;
}
