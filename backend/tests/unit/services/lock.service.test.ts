import { LockService } from '../../../src/services/lock.service';
import { Pool, PoolClient } from 'pg';
import { logger } from '../../../src/utils/logger';

// Mock logger
jest.mock('../../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn()
    }
}));

// Mock pg
const mockRelease = jest.fn();
const mockQuery = jest.fn();
const mockConnect = jest.fn();

jest.mock('pg', () => {
    return {
        Pool: jest.fn(() => ({
            connect: mockConnect
        }))
    };
});

describe('LockService', () => {
    let mockPool: any;
    let mockClient: any;

    beforeEach(() => {
        jest.clearAllMocks();

        // Reset private static state
        (LockService as any).pool = null;
        (LockService as any).activeLocks = new Map();

        // Setup mock client
        mockClient = {
            query: mockQuery,
            release: mockRelease
        };
        mockConnect.mockResolvedValue(mockClient);

        // Setup mock pool
        mockPool = new Pool();
    });

    describe('initialize', () => {
        it('should initialize with pool', () => {
            LockService.initialize(mockPool);
            expect((LockService as any).pool).toBe(mockPool);
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('initialized'));
        });
    });

    describe('hashQueueKey', () => {
        it('should return consistent hash for same key', () => {
            const key = 'queue-1';
            const hash1 = LockService.hashQueueKey(key);
            const hash2 = LockService.hashQueueKey(key);
            expect(hash1).toBe(hash2);
        });

        it('should return different hash for different keys', () => {
            const hash1 = LockService.hashQueueKey('key1');
            const hash2 = LockService.hashQueueKey('key2');
            expect(hash1).not.toBe(hash2);
        });
    });

    describe('acquireLock', () => {
        beforeEach(() => {
            LockService.initialize(mockPool);
        });

        it('should throw if service not initialized', async () => {
            (LockService as any).pool = null;
            await expect(LockService.acquireLock('key')).rejects.toThrow('not initialized');
        });

        it('should return true if lock already held', async () => {
            // Manually set a lock
            (LockService as any).activeLocks.set('key', { lockId: BigInt(1), client: mockClient });

            const result = await LockService.acquireLock('key');

            expect(result).toBe(true);
            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('Already holding lock'), expect.any(Object));
            expect(mockPool.connect).not.toHaveBeenCalled();
        });

        it('should acquire lock successfully', async () => {
            mockQuery.mockResolvedValue({ rows: [{ pg_try_advisory_lock: true }] });

            const result = await LockService.acquireLock('key');

            expect(result).toBe(true);
            expect(mockPool.connect).toHaveBeenCalled();
            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('pg_try_advisory_lock'), expect.any(Array));
            expect(LockService.isLockHeld('key')).toBe(true);
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Lock acquired'), expect.any(Object));
        });

        it('should return false if lock unavailable', async () => {
            mockQuery.mockResolvedValue({ rows: [{ pg_try_advisory_lock: false }] });

            const result = await LockService.acquireLock('key');

            expect(result).toBe(false);
            expect(mockRelease).toHaveBeenCalled();
            expect(LockService.isLockHeld('key')).toBe(false);
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Lock unavailable'), expect.any(Object));
        });

        it('should return false if query returns no rows', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            const result = await LockService.acquireLock('key');

            expect(result).toBe(false);
            expect(mockRelease).toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            mockQuery.mockRejectedValue(new Error('DB Error'));

            const result = await LockService.acquireLock('key');

            expect(result).toBe(false);
            expect(mockRelease).toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to acquire lock'), expect.any(Object));
        });

        it('should handle unknown errors gracefully', async () => {
            mockQuery.mockRejectedValue('String Error');

            const result = await LockService.acquireLock('key');

            expect(result).toBe(false);
            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to acquire lock'),
                expect.objectContaining({ error: 'Unknown error' })
            );
        });
    });

    describe('releaseLock', () => {
        beforeEach(() => {
            LockService.initialize(mockPool);
            // Setup an active lock
            (LockService as any).activeLocks.set('key', { lockId: BigInt(123), client: mockClient });
        });

        it('should release lock successfully', async () => {
            mockQuery.mockResolvedValue({ rows: [] });

            await LockService.releaseLock('key');

            expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('pg_advisory_unlock'), expect.any(Array));
            expect(mockRelease).toHaveBeenCalled();
            expect(LockService.isLockHeld('key')).toBe(false);
            expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Lock released'), expect.any(Object));
        });

        it('should warn if no active lock', async () => {
            await LockService.releaseLock('other-key');

            expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('No active lock'), expect.any(Object));
            expect(mockRelease).not.toHaveBeenCalled();
        });

        it('should handle errors during release', async () => {
            mockQuery.mockRejectedValue(new Error('Unlock failed'));

            await LockService.releaseLock('key');

            expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('Failed to release lock'), expect.any(Object));
            expect(mockRelease).toHaveBeenCalled(); // Finally block
            expect(LockService.isLockHeld('key')).toBe(false); // Finally block deletes key
        });

        it('should handle unknown errors during release', async () => {
            mockQuery.mockRejectedValue('String Error');

            await LockService.releaseLock('key');

            expect(logger.error).toHaveBeenCalledWith(
                expect.stringContaining('Failed to release lock'),
                expect.objectContaining({ error: 'Unknown error' })
            );
        });
    });

    describe('monitoring', () => {
        it('should return active lock count', () => {
            expect(LockService.getActiveLockCount()).toBe(0);
            (LockService as any).activeLocks.set('key1', {});
            expect(LockService.getActiveLockCount()).toBe(1);
        });
    });

    describe('releaseAllLocks', () => {
        beforeEach(() => {
            LockService.initialize(mockPool);
            (LockService as any).activeLocks.set('key1', { lockId: BigInt(1), client: mockClient });
            (LockService as any).activeLocks.set('key2', { lockId: BigInt(2), client: mockClient });
        });

        it('should release all locks', async () => {
            await LockService.releaseAllLocks();

            expect(mockQuery).toHaveBeenCalledTimes(2);
            expect(mockRelease).toHaveBeenCalledTimes(2);
            expect(LockService.getActiveLockCount()).toBe(0);
        });
    });
});
