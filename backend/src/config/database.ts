import { Pool, PoolConfig } from 'pg';
import { config } from './environment';

// Parse DATABASE_URL into pool config
function parseConnectionString(url: string): PoolConfig {
    const regex = /postgresql:\/\/([^:]+):([^@]+)@([^:]+):(\d+)\/(.+)/;
    const match = url.match(regex);

    if (!match) {
        throw new Error('Invalid DATABASE_URL format');
    }

    return {
        user: match[1],
        password: match[2],
        host: match[3],
        port: parseInt(match[4], 10),
        database: match[5],
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000
    };
}

// Connection pool for portal database
let pool: Pool | null = null;

export function getPool(): Pool {
    if (!pool) {
        pool = new Pool(parseConnectionString(config.database.url));

        pool.on('error', (err) => {
            console.error('Unexpected database pool error:', err);
        });
    }
    return pool;
}

// Close pool gracefully
export async function closePool(): Promise<void> {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

// Execute query with parameterized inputs (SQL injection safe)
export async function query<T = unknown>(
    text: string,
    params?: unknown[]
): Promise<{ rows: T[]; rowCount: number }> {
    const client = await getPool().connect();
    try {
        const result = await client.query(text, params);
        return {
            rows: result.rows as T[],
            rowCount: result.rowCount || 0
        };
    } finally {
        client.release();
    }
}

// Transaction helper
export async function withTransaction<T>(
    callback: (query: typeof transactionQuery) => Promise<T>
): Promise<T> {
    const client = await getPool().connect();

    async function transactionQuery<R = unknown>(
        text: string,
        params?: unknown[]
    ): Promise<{ rows: R[]; rowCount: number }> {
        const result = await client.query(text, params);
        return {
            rows: result.rows as R[],
            rowCount: result.rowCount || 0
        };
    }

    try {
        await client.query('BEGIN');
        const result = await callback(transactionQuery);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}
