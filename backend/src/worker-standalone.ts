/**
 * Standalone Worker Service
 * Runs independently to process queue jobs with isolated-vm script execution
 * Deploy this on any platform (Railway, Fly.io, Render, etc.)
 */

import { config, validateConfig } from './config/environment';
import { getPool, closeDatabase } from './config/database';
import { QueueService } from './services/queue.service';
import { WorkerService } from './services/worker.service';
import { LockService } from './services/lock.service';
import { logger, AuditCategory, AuditAction } from './utils/logger';

// Validate config on startup
validateConfig();

async function main(): Promise<void> {
    try {
        // Initialize database pool for pg-boss
        const pool = getPool();
        LockService.initialize(pool);

        // Initialize queue service
        await QueueService.initialize();

        // Start worker
        await WorkerService.start();

        logger.audit({
            category: AuditCategory.SYSTEM,
            action: AuditAction.SERVER_STARTED,
            message: 'Worker started successfully',
            outcome: 'SUCCESS',
            details: {
                mode: 'worker-only',
                workerConcurrency: config.queue.workerConcurrency
            }
        });

        logger.info('Worker started - processing queue jobs', {
            queueName: config.queue.name,
            concurrency: config.queue.workerConcurrency
        });
    } catch (error) {
        logger.error('Failed to start worker', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
        process.exit(1);
    }
}

// Graceful shutdown
async function shutdown(): Promise<void> {
    logger.info('Worker shutting down...');

    // Stop worker (waits for active jobs)
    await WorkerService.stop();

    // Release all locks
    await LockService.releaseAllLocks();

    // Shutdown queue
    await QueueService.shutdown();

    // Close database connection
    await closeDatabase();

    logger.info('Worker shutdown complete');
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start worker
main();
