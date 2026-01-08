import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
    // Server
    port: parseInt(process.env.PORT || '3000', 10),
    nodeEnv: process.env.NODE_ENV || 'development',

    // JWT
    jwt: {
        secret: process.env.JWT_SECRET || 'default-secret-change-me',
        expiresIn: process.env.JWT_EXPIRES_IN || '1h',
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },

    // Database (Portal)
    database: {
        url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/db_query_portal'
    },

    // Rate Limiting
    rateLimit: {
        windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10),
        maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000', 10),
        authMaxRequests: parseInt(process.env.AUTH_RATE_LIMIT_MAX || '100', 10)
    },

    // Script Execution
    scriptExecution: {
        timeoutMs: parseInt(process.env.SCRIPT_TIMEOUT_MS || '30000', 10),
        maxMemoryMb: parseInt(process.env.SCRIPT_MAX_MEMORY_MB || '128', 10)
    },

    // Bcrypt
    bcrypt: {
        saltRounds: 12
    },

    // Target Databases (for query execution)
    targetDatabases: {
        postgresUrl: process.env.TARGET_POSTGRES_URL || '',
        mongodbUrl: process.env.TARGET_MONGODB_URL || ''
    },

    // Queue & Worker Configuration
    queue: {
        name: process.env.QUEUE_NAME || 'query_execution',
        workerConcurrency: parseInt(process.env.WORKER_CONCURRENCY || '4', 10),
        lockTtlMs: parseInt(process.env.LOCK_TTL_MS || '300000', 10), // 5 minutes
        maxRetries: parseInt(process.env.MAX_JOB_RETRIES || '3', 10),
        retryBackoffMs: (process.env.RETRY_BACKOFF_MS || '1000,3000,10000').split(',').map(Number),
        jobTimeoutMs: parseInt(process.env.JOB_TIMEOUT_MS || '60000', 10) // 1 minute
    },

    // Request Limits (abuse prevention)
    requestLimits: {
        maxPendingPerUser: parseInt(process.env.MAX_PENDING_PER_USER || '10', 10)
    }
};

// Validate required config in production
export function validateConfig(): void {
    if (config.nodeEnv === 'production') {
        if (config.jwt.secret === 'default-secret-change-me') {
            throw new Error('JWT_SECRET must be set in production');
        }
    }
}
