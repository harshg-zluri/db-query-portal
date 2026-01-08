import { Pool, PoolClient } from 'pg';
import { logger } from '../utils/logger';

/**
 * PostgreSQL Advisory Lock Service
 * Provides distributed locking using PostgreSQL advisory locks
 * for ordered query execution within the same queue key.
 */
export class LockService {
    private static pool: Pool | null = null;
    private static activeLocks: Map<string, { lockId: bigint; client: PoolClient }> = new Map();

    /**
     * Initialize the lock service with a database connection pool
     */
    static initialize(pool: Pool): void {
        this.pool = pool;
        logger.info('[LOCK] Lock service initialized');
    }

    /**
     * Convert a queue key string to a bigint for PostgreSQL advisory lock
     * Uses a simple hash function to generate a unique lock ID
     */
    static hashQueueKey(queueKey: string): bigint {
        let hash = BigInt(0);
        for (let i = 0; i < queueKey.length; i++) {
            const char = BigInt(queueKey.charCodeAt(i));
            hash = ((hash << BigInt(5)) - hash) + char;
            hash = hash & BigInt('0x7FFFFFFFFFFFFFFF'); // Keep it positive and within bigint range
        }
        return hash;
    }

    /**
     * Try to acquire an advisory lock for the given queue key
     * Returns true if lock acquired, false if lock is held by another process
     */
    static async acquireLock(queueKey: string): Promise<boolean> {
        if (!this.pool) {
            throw new Error('Lock service not initialized');
        }

        const lockId = this.hashQueueKey(queueKey);

        // Check if we already hold this lock
        if (this.activeLocks.has(queueKey)) {
            logger.warn('[LOCK] Already holding lock', { queueKey, lockId: lockId.toString() });
            return true;
        }

        // Get a dedicated connection for this lock
        const client = await this.pool.connect();

        try {
            // Try to acquire the advisory lock (non-blocking)
            const result = await client.query<{ pg_try_advisory_lock: boolean }>(
                'SELECT pg_try_advisory_lock($1)',
                [lockId.toString()]
            );

            const acquired = result.rows[0]?.pg_try_advisory_lock ?? false;

            if (acquired) {
                // Store the lock info for later release
                this.activeLocks.set(queueKey, { lockId, client });
                logger.info('[LOCK] Lock acquired', { queueKey, lockId: lockId.toString() });
            } else {
                // Release the connection if we didn't get the lock
                client.release();
                logger.info('[LOCK] Lock unavailable', { queueKey, lockId: lockId.toString() });
            }

            return acquired;
        } catch (error) {
            client.release();
            logger.error('[LOCK] Failed to acquire lock', {
                queueKey,
                lockId: lockId.toString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            return false;
        }
    }

    /**
     * Release a previously acquired advisory lock
     */
    static async releaseLock(queueKey: string): Promise<void> {
        const lockInfo = this.activeLocks.get(queueKey);

        if (!lockInfo) {
            logger.warn('[LOCK] No active lock to release', { queueKey });
            return;
        }

        const { lockId, client } = lockInfo;

        try {
            await client.query('SELECT pg_advisory_unlock($1)', [lockId.toString()]);
            logger.info('[LOCK] Lock released', { queueKey, lockId: lockId.toString() });
        } catch (error) {
            logger.error('[LOCK] Failed to release lock', {
                queueKey,
                lockId: lockId.toString(),
                error: error instanceof Error ? error.message : 'Unknown error'
            });
        } finally {
            client.release();
            this.activeLocks.delete(queueKey);
        }
    }

    /**
     * Check if a lock is currently held for the given queue key
     */
    static isLockHeld(queueKey: string): boolean {
        return this.activeLocks.has(queueKey);
    }

    /**
     * Get count of active locks (for monitoring)
     */
    static getActiveLockCount(): number {
        return this.activeLocks.size;
    }

    /**
     * Release all active locks (for graceful shutdown)
     */
    static async releaseAllLocks(): Promise<void> {
        const queueKeys = Array.from(this.activeLocks.keys());
        for (const queueKey of queueKeys) {
            await this.releaseLock(queueKey);
        }
        logger.info('[LOCK] All locks released', { count: queueKeys.length });
    }
}
