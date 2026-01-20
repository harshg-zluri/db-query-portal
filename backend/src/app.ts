import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { config, validateConfig } from './config/environment';
import routes from './routes';
import { apiLimiter } from './middleware/rateLimiter.middleware';
import { requestLogger } from './middleware/requestLogger.middleware';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.middleware';
import { logger, AuditCategory, AuditAction } from './utils/logger';
import { RequestContext } from '@mikro-orm/core';
import { closeDatabase, getPool, initDatabase, getOrm } from './config/database';
import { ExecutionService } from './services/execution.service';
import { SlackService } from './services/slack.service';
import './config/passport'; // Initialize Passport strategies

// Validate config on startup
validateConfig();

// Create Express app
const app = express();

// Security middleware
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true
}));

// MikroORM Context (must be before routes)
app.use((req, res, next) => {
    RequestContext.create(getOrm().em, next);
});

// Rate limiting
app.use('/api', apiLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Request logging (before routes)
app.use(requestLogger);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api', routes);


// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// Graceful shutdown
async function shutdown(): Promise<void> {
    logger.info('Shutting down...');



    // Cleanup database connections
    await Promise.all([
        closeDatabase(),
        ExecutionService.cleanup()
    ]);

    logger.info('Cleanup complete');
    process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
if (require.main === module) {
    const apiOnly = process.argv.includes('--api-only');

    (async () => {
        try {
            // Initialize Database (ORM)
            await initDatabase();

            // Initialize lock service with database pool
            // Initialize Slack service
            SlackService.initialize();

            // Start HTTP server
            app.listen(config.port, () => {
                logger.audit({
                    category: AuditCategory.SYSTEM,
                    action: AuditAction.SERVER_STARTED,
                    message: `Server started successfully on port ${config.port}`,
                    outcome: 'SUCCESS',
                    details: {
                        port: config.port,
                        environment: config.nodeEnv,
                        workerConcurrency: config.queue.workerConcurrency
                    }
                });
                logger.info(`Server running on port ${config.port}`, {
                    env: config.nodeEnv
                });
            });
        } catch (error) {
            logger.error('Failed to start server', {
                error: error instanceof Error ? error.message : 'Unknown error'
            });
            process.exit(1);
        }
    })();
}

export default app;
