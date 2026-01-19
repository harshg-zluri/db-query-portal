import { MikroORM, EntityManager, RequestContext } from '@mikro-orm/core';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Pool } from 'pg';
import { config } from './environment';
import mikroOrmConfig from './mikro-orm.config';

// ===== MikroORM Instance =====
let orm: MikroORM<PostgreSqlDriver> | null = null;

// ===== pg Pool for pg-boss queue =====
let pgBossPool: Pool | null = null;

/**
 * Initialize MikroORM connection
 */
export async function initDatabase(): Promise<MikroORM<PostgreSqlDriver>> {
    if (!orm) {
        orm = await MikroORM.init<PostgreSqlDriver>(mikroOrmConfig);
        // Explicitly connect
        await orm.connect();
        console.log('📦 MikroORM connected to database');
    }
    return orm;
}

/**
 * Get MikroORM instance (throws if not initialized)
 */
export function getOrm(): MikroORM<PostgreSqlDriver> {
    if (!orm) {
        throw new Error('MikroORM not initialized. Call initDatabase() first.');
    }
    return orm;
}

/**
 * Get EntityManager (always use for DB operations)
 * Uses RequestContext if available (HTTP requests), otherwise creates a fork
 */
export function getEm(): EntityManager<PostgreSqlDriver> {
    const orm = getOrm();
    // Return forked EM if context is available (from middleware)
    const contextEm = RequestContext.getEntityManager() as EntityManager<PostgreSqlDriver> | undefined;
    if (contextEm) {
        return contextEm;
    }
    // For operations outside HTTP context (worker, background jobs), fork the EntityManager
    return orm.em.fork();
}

/**
 * Get pg Pool for pg-boss (separate from ORM)
 */
export function getPool(): Pool {
    if (!pgBossPool) {
        // Parse connection string for pool config
        const regex = /postgres(?:ql)?:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/([^?]+)(?:\?(.*))?/;
        const match = config.database.url.match(regex);

        if (!match) {
            throw new Error('Invalid DATABASE_URL format');
        }

        const poolConfig: any = {
            user: match[1],
            password: match[2],
            host: match[3],
            port: parseInt(match[4], 10),
            database: match[5],
            max: 10, // Smaller pool for boss
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 5000
        };

        // Handle SSL mode from query params
        const queryParams = match[6];
        if (queryParams && queryParams.includes('sslmode=require')) {
            poolConfig.ssl = { rejectUnauthorized: false };
        }

        pgBossPool = new Pool(poolConfig);
    }
    return pgBossPool;
}

/**
 * Close all connections
 */
export async function closeDatabase(): Promise<void> {
    if (orm) {
        await orm.close();
        orm = null;
    }
    if (pgBossPool) {
        await pgBossPool.end();
        pgBossPool = null;
    }
}

