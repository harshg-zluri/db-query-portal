import { WorkerService } from '../../../src/services/worker.service';
import { QueueService } from '../../../src/services/queue.service';
import { LockService } from '../../../src/services/lock.service';
import { ExecutionService } from '../../../src/services/execution.service';
import { QueryRequestModel } from '../../../src/models/QueryRequest';
import { logger } from '../../../src/utils/logger';
import { config } from '../../../src/config/environment';
import { sendSlackNotification, SlackNotificationType } from '../../../src/services/slack.service';
import { RequestStatus } from '../../../src/types';

// Mock dependencies
jest.mock('../../../src/services/queue.service');
jest.mock('../../../src/services/lock.service');
jest.mock('../../../src/services/execution.service');
jest.mock('../../../src/models/QueryRequest');
jest.mock('../../../src/services/slack.service');
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn()
    },
    AuditCategory: { EXECUTION: 'EXECUTION' },
    AuditAction: { QUERY_EXECUTED: 'QUERY_EXECUTED', EXECUTION_FAILED: 'EXECUTION_FAILED' }
}));
jest.mock('../../../src/config/environment', () => ({
    config: {
        queue: {
            name: 'test-queue',
            workerConcurrency: 2
        },
        resultStorage: {
            maxRows: 10000
        }
    }
}));

describe('WorkerService', () => {
    let mockBoss: any;

    const mockJob = {
        data: {
            jobId: 'job-1',
            queueKey: 'key-1',
            requestId: 'req-1',
            approvedBy: 'approver@z.com'
        }
    };

    const mockRequest = {
        id: 'req-1',
        status: RequestStatus.APPROVED,
        databaseType: 'POSTGRES',
        submissionType: 'QUERY'
    };

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset private static state
        (WorkerService as any).isRunning = false;
        (WorkerService as any).activeJobs = 0;

        mockBoss = {
            work: jest.fn().mockImplementation(async (_name, _opts, handler) => {
                // Store handler for manual triggering
                (WorkerService as any).jobHandler = handler;
            })
        };
        (QueueService.getBoss as jest.Mock).mockReturnValue(mockBoss);
    });

    describe('start', () => {
        it('should start worker and register handler', async () => {
            await WorkerService.start();

            expect(mockBoss.work).toHaveBeenCalledWith(
                'test-queue',
                expect.objectContaining({ batchSize: 2 }),
                expect.any(Function)
            );
            expect((WorkerService as any).isRunning).toBe(true);
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Worker started'), expect.any(Object));
        });

        it('should warn if already running', async () => {
            await WorkerService.start();
            await WorkerService.start();

            expect(mockBoss.work).toHaveBeenCalledTimes(1);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('already running'));
        });

        it('should process jobs when handler invoked', async () => {
            await WorkerService.start();
            const handler = (WorkerService as any).jobHandler;

            // Mock dependency calls for successful processing
            (LockService.acquireLock as jest.Mock).mockResolvedValue(true);
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockRequest);
            (ExecutionService.executeRequest as jest.Mock).mockResolvedValue({ success: true, rowCount: 1 });

            await handler([mockJob]);

            expect(LockService.acquireLock).toHaveBeenCalledWith('key-1');
            expect(QueryRequestModel.findById).toHaveBeenCalledWith('req-1');
            expect(ExecutionService.executeRequest).toHaveBeenCalled();
            expect(LockService.releaseLock).toHaveBeenCalledWith('key-1');
        });
    });

    describe('processJob', () => {
        // Access private method via casting
        const processJob = (WorkerService as any).processJob.bind(WorkerService);

        it('should throw if lock unavailable', async () => {
            (LockService.acquireLock as jest.Mock).mockResolvedValue(false);

            await expect(processJob(mockJob.data)).rejects.toThrow('Lock unavailable');
            expect(LockService.releaseLock).not.toHaveBeenCalled(); // Lock wasn't acquired
        });

        it('should return if request not found', async () => {
            (LockService.acquireLock as jest.Mock).mockResolvedValue(true);
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(null);

            await processJob(mockJob.data);

            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Request not found'), expect.any(Object));
            expect(LockService.releaseLock).toHaveBeenCalled();
        });

        it('should return if request already processed', async () => {
            (LockService.acquireLock as jest.Mock).mockResolvedValue(true);
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue({ ...mockRequest, status: RequestStatus.EXECUTED });

            await processJob(mockJob.data);

            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Request already processed'), expect.any(Object));
            expect(ExecutionService.executeRequest).not.toHaveBeenCalled();
            expect(LockService.releaseLock).toHaveBeenCalled();
        });

        it('should execute successfully and notify', async () => {
            (LockService.acquireLock as jest.Mock).mockResolvedValue(true);
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockRequest);
            (ExecutionService.executeRequest as jest.Mock).mockResolvedValue({ success: true, rowCount: 10 });

            await processJob(mockJob.data);

            expect(ExecutionService.executeRequest).toHaveBeenCalledWith(mockRequest);
            expect(sendSlackNotification).toHaveBeenCalledTimes(2); // Request Approved + Execution Success
            expect(sendSlackNotification).toHaveBeenCalledWith(expect.objectContaining({ type: SlackNotificationType.EXECUTION_SUCCESS }));
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Job completed'), expect.any(Object));
            expect(LockService.releaseLock).toHaveBeenCalled();
        });

        it('should handle execution failure result (logical failure)', async () => {
            (LockService.acquireLock as jest.Mock).mockResolvedValue(true);
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockRequest);
            (ExecutionService.executeRequest as jest.Mock).mockResolvedValue({ success: false, error: 'SQL Syntax Error' });

            await processJob(mockJob.data);

            expect(ExecutionService.executeRequest).toHaveBeenCalled();
            expect(sendSlackNotification).toHaveBeenCalledTimes(2); // Approved + Failed
            expect(sendSlackNotification).toHaveBeenCalledWith(expect.objectContaining({ type: SlackNotificationType.EXECUTION_FAILED }));
            expect(LockService.releaseLock).toHaveBeenCalled();
        });

        it('should handle exception during execution (unexpected error)', async () => {
            (LockService.acquireLock as jest.Mock).mockResolvedValue(true);
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockRequest);
            (ExecutionService.executeRequest as jest.Mock).mockRejectedValue(new Error('DB Connection Lost'));

            // Should re-throw to allow retry mechanism
            await expect(processJob(mockJob.data)).rejects.toThrow('DB Connection Lost');

            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Job execution failed'), expect.any(Object));
            expect(QueryRequestModel.setExecutionResult).toHaveBeenCalledWith('req-1', false, undefined, 'DB Connection Lost');
            // Should fetch request again for notification
            expect(QueryRequestModel.findById).toHaveBeenCalledTimes(2);
            expect(sendSlackNotification).toHaveBeenCalledTimes(2); // Execution Failure notification (Approved msg might be skipped if we crashed before?)
            // Actually sendSlackNotification is called inside try block for normal flow.
            // On exception, it is called in catch block.
            // But approved message is sent in normal flow.
            // Wait, sendSlackNotifications (plural) sends both APPROVED and EXECUTION_RESULT.
            // In catch block, we manually construct payload.
            expect(LockService.releaseLock).toHaveBeenCalled();
        });

        it('should handle non-Error exception during execution', async () => {
            (LockService.acquireLock as jest.Mock).mockResolvedValue(true);
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockRequest);
            (ExecutionService.executeRequest as jest.Mock).mockRejectedValue('String Error');

            // Should re-throw
            await expect(processJob(mockJob.data)).rejects.toEqual('String Error');

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Job execution failed'),
                expect.objectContaining({ error: 'Unknown error' })
            );
        });

        it('should handle slack notification error gracefully', async () => {
            (LockService.acquireLock as jest.Mock).mockResolvedValue(true);
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockRequest);
            (ExecutionService.executeRequest as jest.Mock).mockResolvedValue({ success: true });
            (sendSlackNotification as jest.Mock).mockRejectedValue(new Error('Slack Down'));

            await processJob(mockJob.data);

            // Should not throw, should log error
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to send Slack notifications'), expect.any(Object));
            expect(LockService.releaseLock).toHaveBeenCalled();
        });

        it('should handle non-Error exception in slack notification', async () => {
            (LockService.acquireLock as jest.Mock).mockResolvedValue(true);
            (QueryRequestModel.findById as jest.Mock).mockResolvedValue(mockRequest);
            (ExecutionService.executeRequest as jest.Mock).mockResolvedValue({ success: true });
            (sendSlackNotification as jest.Mock).mockRejectedValue('String Error');

            await processJob(mockJob.data);

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to send Slack notifications'),
                expect.objectContaining({ error: 'Unknown error' })
            );
            expect(LockService.releaseLock).toHaveBeenCalled();
        });
    });

    describe('stop', () => {
        it('should return immediately if not running', async () => {
            await WorkerService.stop();
            expect(logger.info).not.toHaveBeenCalledWith(expect.stringContaining('Stopping worker'));
        });

        it('should wait for active jobs to finish', async () => {
            (WorkerService as any).isRunning = true;
            (WorkerService as any).activeJobs = 1;

            // Start stop process in background
            const stopPromise = WorkerService.stop();

            // Simulate job finishing
            setTimeout(() => {
                (WorkerService as any).activeJobs = 0;
            }, 100);

            await stopPromise;

            expect((WorkerService as any).isRunning).toBe(false);
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Worker stopped'));
        });

        it('should timeout if jobs take too long', async () => {
            jest.useFakeTimers();
            (WorkerService as any).isRunning = true;
            (WorkerService as any).activeJobs = 1;

            const stopPromise = WorkerService.stop();

            // Fast forward time
            jest.advanceTimersByTime(31000);

            await stopPromise;

            expect((WorkerService as any).isRunning).toBe(false);
            jest.useRealTimers();
        });
    });

    describe('getStatus', () => {
        it('should return status', () => {
            const status = WorkerService.getStatus();
            expect(status).toEqual({ isRunning: false, activeJobs: 0 });
        });
    });
});
