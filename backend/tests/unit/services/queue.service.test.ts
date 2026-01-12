import { QueueService } from '../../../src/services/queue.service';
import PgBoss from 'pg-boss';
import { getPool } from '../../../src/config/database';
import { logger } from '../../../src/utils/logger';
import { config } from '../../../src/config/environment';

// Mock dependencies
jest.mock('pg-boss');
jest.mock('../../../src/config/database');
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

// Mock config
jest.mock('../../../src/config/environment', () => ({
    config: {
        queue: {
            name: 'test-queue',
            workerConcurrency: 2,
            maxRetries: 3,
            retryBackoffMs: [1000],
            jobTimeoutMs: 5000
        }
    }
}));

describe('QueueService', () => {
    let mockBoss: any;
    let mockPool: any;

    beforeEach(() => {
        jest.clearAllMocks();
        (QueueService as any).boss = null;
        (QueueService as any).isInitialized = false;

        mockPool = {
            query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
        };
        (getPool as jest.Mock).mockReturnValue(mockPool);

        mockBoss = {
            on: jest.fn(),
            start: jest.fn(),
            send: jest.fn().mockResolvedValue('job-123'),
            stop: jest.fn()
        };
        (PgBoss as unknown as jest.Mock).mockImplementation(() => mockBoss);
    });

    describe('initialize', () => {
        it('should initialize pg-boss with pool', async () => {
            await QueueService.initialize();

            expect(PgBoss).toHaveBeenCalledWith(expect.objectContaining({
                application_name: 'db-query-portal-worker',
                db: expect.any(Object)
            }));
            expect(mockBoss.start).toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('initialized'), expect.any(Object));
        });

        it('should not initialize twice', async () => {
            await QueueService.initialize();
            await QueueService.initialize();

            expect(mockBoss.start).toHaveBeenCalledTimes(1);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('already initialized'));
        });

        it('should handle pg-boss errors', async () => {
            await QueueService.initialize();

            // Trigger error handler
            const errorCallback = mockBoss.on.mock.calls.find((call: any[]) => call[0] === 'error')[1];
            errorCallback(new Error('Boss Error'));

            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('pg-boss error'), expect.any(Object));
        });

        it('should wrap pool execution', async () => {
            await QueueService.initialize();
            const dbConfig = (PgBoss as unknown as jest.Mock).mock.calls[0][0].db;

            await dbConfig.executeSql('SELECT 1', []);
            expect(mockPool.query).toHaveBeenCalledWith('SELECT 1', []);
        });
    });

    describe('getBoss', () => {
        it('should throw if not initialized', () => {
            expect(() => QueueService.getBoss()).toThrow('not initialized');
        });

        it('should return boss instance if initialized', async () => {
            await QueueService.initialize();
            expect(QueueService.getBoss()).toBe(mockBoss);
        });
    });

    describe('generateQueueKey', () => {
        it('should generate correct key format', () => {
            const request = {
                databaseType: 'POSTGRES',
                instanceId: 'inst-1',
                databaseName: 'db-1',
                // other props ignored
            };
            const key = QueueService.generateQueueKey(request as any);
            expect(key).toBe('POSTGRES:inst-1:db-1');
        });
    });

    describe('enqueue', () => {
        const payload = {
            queueKey: 'key',
            requestId: 'req-1',
            approvedBy: 'approver@z.com'
        };

        it('should throw if not initialized', async () => {
            await expect(QueueService.enqueue(payload)).rejects.toThrow('not initialized');
        });

        it('should enqueue job via boss', async () => {
            await QueueService.initialize();

            const jobId = await QueueService.enqueue(payload);

            expect(mockBoss.send).toHaveBeenCalledWith('test-queue', expect.objectContaining({
                ...payload,
                jobId: expect.stringContaining('job_')
            }), expect.objectContaining({
                singletonKey: 'key'
            }));
            expect(jobId).toBe('job-123');
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Job enqueued'), expect.any(Object));
        });

        it('should return null if send fails (returns null)', async () => {
            await QueueService.initialize();
            mockBoss.send.mockResolvedValue(null);

            const jobId = await QueueService.enqueue(payload);
            expect(jobId).toBeNull();
        });
    });

    describe('shutdown', () => {
        it('should stop boss if initialized', async () => {
            await QueueService.initialize();
            await QueueService.shutdown();

            expect(mockBoss.stop).toHaveBeenCalledWith({ graceful: true });
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('shut down'));
        });

        it('should do nothing if not initialized', async () => {
            await QueueService.shutdown();
            expect(mockBoss.stop).not.toHaveBeenCalled();
        });
    });
});
