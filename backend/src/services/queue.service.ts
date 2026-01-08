import PgBoss from 'pg-boss';
import { config } from '../config/environment';
import { logger } from '../utils/logger';
import { QueryRequest } from '../types';
import { getPool } from '../config/database';

/**
 * Queue Job Payload
 */
export interface QueueJobPayload {
    jobId: string;
    queueKey: string;
    requestId: string;
    approvedBy: string;
}

/**
 * Queue Service
 * Manages job queuing using pg-boss (PostgreSQL-based job queue)
 */
export class QueueService {
    private static boss: PgBoss | null = null;
    private static isInitialized = false;

    /**
     * Initialize pg-boss with PostgreSQL connection
     * Uses the existing database pool to avoid SSL certificate issues
     */
    static async initialize(): Promise<void> {
        if (this.isInitialized) {
            logger.warn('[QUEUE] Queue service already initialized');
            return;
        }

        // Use custom db adapter that wraps our existing pool
        const pool = getPool();

        this.boss = new PgBoss({
            db: {
                executeSql: async (text: string, values: unknown[]) => {
                    const result = await pool.query(text, values);
                    return { rows: result.rows, rowCount: result.rowCount || 0 };
                }
            },
            application_name: 'db-query-portal-worker',
            schema: 'pgboss',
            archiveCompletedAfterSeconds: 60 * 60 * 24, // 24 hours
            deleteAfterDays: 7,
            maintenanceIntervalSeconds: 120,
            monitorStateIntervalSeconds: 30
        });

        this.boss.on('error', (error) => {
            logger.error('[QUEUE] pg-boss error', { error: error.message });
        });

        await this.boss.start();
        this.isInitialized = true;

        logger.info('[QUEUE] Queue service initialized', {
            queueName: config.queue.name,
            workerConcurrency: config.queue.workerConcurrency
        });
    }

    /**
     * Get pg-boss instance (for worker registration)
     */
    static getBoss(): PgBoss {
        if (!this.boss || !this.isInitialized) {
            throw new Error('Queue service not initialized');
        }
        return this.boss;
    }

    /**
     * Generate queue key from request
     * Format: {db_type}:{instance_id}:{database_name}
     * 
     * Note: We don't include table/collection name because:
     * - Scripts may touch multiple tables
     * - Not all query patterns can be reliably parsed
     * - Database-level locking is safer for scripts
     */
    static generateQueueKey(request: QueryRequest): string {
        return `${request.databaseType}:${request.instanceId}:${request.databaseName}`;
    }

    /**
     * Enqueue a job for query execution
     */
    static async enqueue(payload: Omit<QueueJobPayload, 'jobId'>): Promise<string | null> {
        if (!this.boss || !this.isInitialized) {
            throw new Error('Queue service not initialized');
        }

        const jobId = await this.boss.send(config.queue.name, {
            ...payload,
            jobId: `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
        } as QueueJobPayload, {
            retryLimit: config.queue.maxRetries,
            retryDelay: config.queue.retryBackoffMs[0],
            retryBackoff: true,
            expireInSeconds: config.queue.jobTimeoutMs / 1000,
            singletonKey: payload.queueKey // Ensures ordered execution per queue key
        });

        if (jobId) {
            logger.info('[QUEUE] Job enqueued', {
                jobId,
                queueKey: payload.queueKey,
                requestId: payload.requestId
            });
        }

        return jobId;
    }

    /**
     * Shutdown the queue service
     */
    static async shutdown(): Promise<void> {
        if (this.boss) {
            await this.boss.stop({ graceful: true });
            this.boss = null;
            this.isInitialized = false;
            logger.info('[QUEUE] Queue service shut down');
        }
    }
}
