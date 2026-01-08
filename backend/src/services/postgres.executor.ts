import { Pool, PoolConfig } from 'pg';
import { ExecutionResult, DatabaseType } from '../types';
import { logger } from '../utils/logger';

/**
 * PostgreSQL Query Executor
 * Safely executes SQL queries against target PostgreSQL databases
 */
export class PostgresExecutor {
    private pool: Pool | null = null;
    private config: PoolConfig;

    constructor(config: {
        host: string;
        port: number;
        database: string;
        user: string;
        password: string;
        ssl?: boolean;
    }) {
        this.config = {
            ...config,
            max: 5,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 10000,
            // Enable SSL for cloud databases (required for Aiven)
            ssl: config.ssl !== false ? { rejectUnauthorized: false } : undefined
        };
    }

    /**
     * Connect to database
     */
    async connect(): Promise<void> {
        if (!this.pool) {
            this.pool = new Pool(this.config);
        }
    }

    /**
     * Close connection
     */
    async close(): Promise<void> {
        if (this.pool) {
            await this.pool.end();
            this.pool = null;
        }
    }

    /**
     * Execute a SQL query
     * Note: This executes raw SQL - ensure validation was done before calling
     * @param sql - The SQL query to execute
     * @param schemaName - Optional schema name to set search_path before executing
     */
    async execute(sql: string, schemaName?: string): Promise<ExecutionResult> {
        const startTime = Date.now();

        try {
            if (!this.pool) {
                await this.connect();
            }

            const client = await this.pool!.connect();

            try {
                // Set search_path if schemaName is provided
                if (schemaName) {
                    await client.query(`SET search_path TO ${schemaName}, public`);
                }

                const result = await client.query(sql);
                const duration = Date.now() - startTime;

                logger.info('PostgreSQL query executed', {
                    rowCount: result.rowCount,
                    duration
                });

                // Format output
                let output: string;

                // Handle case where rows might be undefined (e.g., for SET commands)
                const rows = result.rows || [];

                if (rows.length > 0) {
                    // For SELECT queries, format as JSON array
                    output = JSON.stringify(rows, null, 2);
                } else if (result.rowCount !== null && result.rowCount !== undefined) {
                    // For INSERT/UPDATE/DELETE, show affected rows
                    output = `${result.rowCount} row(s) affected`;
                } else {
                    output = 'Query executed successfully';
                }

                return {
                    success: true,
                    output,
                    rowCount: result.rowCount || 0,
                    executedAt: new Date()
                };
            } finally {
                client.release();
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

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
            const client = await this.pool!.connect();
            await client.query('SELECT 1');
            client.release();
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
