import { config } from '../config/environment';
import { logger, AuditCategory, AuditAction } from '../utils/logger';
import { QueueService, QueueJobPayload } from './queue.service';
import { LockService } from './lock.service';
import { ExecutionService } from './execution.service';
import { QueryRequestModel } from '../models/QueryRequest';
import { SlackNotificationType, sendSlackNotification } from './slack.service';
import { RequestStatus, ExecutionResult, QueryRequest } from '../types';

/**
 * Worker Service
 * Processes queued jobs with ordered execution guarantees
 * 
 * Flow:
 * 1. Consume job from pg-boss queue
 * 2. Acquire PostgreSQL advisory lock for queueKey
 * 3. Execute query/script via ExecutionService
 * 4. Send Slack notification (inside lock for ordering)
 * 5. Release lock and acknowledge job
 */
export class WorkerService {
    private static isRunning = false;
    private static activeJobs = 0;

    /**
     * Start the worker to process jobs
     */
    static async start(): Promise<void> {
        if (this.isRunning) {
            logger.warn('[WORKER] Worker already running');
            return;
        }

        const boss = QueueService.getBoss();

        // Register job handler with concurrency
        // pg-boss work() handler receives an array of jobs
        await boss.work<QueueJobPayload>(
            config.queue.name,
            {
                batchSize: config.queue.workerConcurrency,
                pollingIntervalSeconds: 1
            },
            async (jobs) => {
                for (const job of jobs) {
                    await this.processJob(job.data);
                }
            }
        );

        this.isRunning = true;
        logger.info('[WORKER] Worker started', {
            queueName: config.queue.name,
            concurrency: config.queue.workerConcurrency
        });
    }

    /**
     * Process a single job
     */
    private static async processJob(payload: QueueJobPayload): Promise<void> {
        const { jobId, queueKey, requestId, approvedBy } = payload;
        this.activeJobs++;

        logger.info('[WORKER] Processing job', { jobId, queueKey, requestId });

        // Try to acquire lock
        const lockAcquired = await LockService.acquireLock(queueKey);

        if (!lockAcquired) {
            this.activeJobs--;
            logger.info('[WORKER] Lock unavailable, job will retry', { jobId, queueKey });
            throw new Error(`Lock unavailable for queue key: ${queueKey}`);
        }

        try {
            // Fetch the request
            const request = await QueryRequestModel.findById(requestId);

            if (!request) {
                logger.error('[WORKER] Request not found', { jobId, requestId });
                return;
            }

            // Check if job was already processed (idempotency)
            if (request.status === RequestStatus.EXECUTED || request.status === RequestStatus.FAILED) {
                logger.info('[WORKER] Request already processed, skipping', {
                    jobId,
                    requestId,
                    status: request.status
                });
                return;
            }

            logger.info('[WORKER] Executing', {
                jobId,
                requestId,
                databaseType: request.databaseType,
                submissionType: request.submissionType
            });

            // Execute the query or script
            const result = await ExecutionService.executeRequest(request);

            // Log execution result
            logger.info(`[WORKER] ${result.success ? 'Execution successful' : 'Execution failed'}`, {
                category: AuditCategory.EXECUTION,
                action: result.success ? AuditAction.QUERY_EXECUTED : AuditAction.EXECUTION_FAILED,
                jobId,
                requestId,
                queueKey,
                approvedBy,
                rowCount: result.rowCount,
                error: result.error
            });

            // Send Slack notifications INSIDE the lock to guarantee ordering
            await this.sendSlackNotifications(request, result, approvedBy);

            logger.info('[WORKER] Job completed', {
                jobId,
                requestId,
                success: result.success,
                rowCount: result.rowCount
            });

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';

            logger.error('[WORKER] Job execution failed', {
                jobId,
                requestId,
                queueKey,
                error: errorMessage
            });

            // Update request status to failed
            await QueryRequestModel.setExecutionResult(requestId, false, undefined, errorMessage);

            // Send failure notification
            const request = await QueryRequestModel.findById(requestId);
            if (request) {
                await this.sendSlackNotifications(request, {
                    success: false,
                    error: errorMessage,
                    executedAt: new Date()
                }, approvedBy);
            }

            throw error; // Re-throw to trigger retry
        } finally {
            await LockService.releaseLock(queueKey);
            this.activeJobs--;
        }
    }

    /**
     * Send Slack notifications after execution
     * IMPORTANT: Called inside the lock to guarantee notification ordering
     */
    private static async sendSlackNotifications(
        request: QueryRequest,
        result: ExecutionResult,
        approvedBy: string
    ): Promise<void> {
        try {
            // Notify requester via DM
            await sendSlackNotification({
                type: SlackNotificationType.REQUEST_APPROVED,
                request,
                approverEmail: approvedBy,
                executionResult: result
            });

            // Notify approval channel with result
            await sendSlackNotification({
                type: result.success
                    ? SlackNotificationType.EXECUTION_SUCCESS
                    : SlackNotificationType.EXECUTION_FAILED,
                request,
                approverEmail: approvedBy,
                executionResult: result
            });

            logger.info('[WORKER] Slack notifications sent', {
                requestId: request.id,
                success: result.success
            });
        } catch (error) {
            // Log but don't fail the job for Slack errors
            logger.error('[WORKER] Failed to send Slack notifications', {
                requestId: request.id,
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    /**
     * Stop the worker gracefully
     */
    static async stop(): Promise<void> {
        if (!this.isRunning) {
            return;
        }

        logger.info('[WORKER] Stopping worker, waiting for active jobs...', {
            activeJobs: this.activeJobs
        });

        const timeout = 30000;
        const startTime = Date.now();

        while (this.activeJobs > 0 && Date.now() - startTime < timeout) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        this.isRunning = false;
        logger.info('[WORKER] Worker stopped');
    }

    /**
     * Get worker status
     */
    static getStatus(): { isRunning: boolean; activeJobs: number } {
        return {
            isRunning: this.isRunning,
            activeJobs: this.activeJobs
        };
    }
}
