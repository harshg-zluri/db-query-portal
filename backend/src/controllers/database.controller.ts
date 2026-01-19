import { Request, Response, NextFunction } from 'express';
import { DatabaseInstanceModel } from '../models/DatabaseInstance';
import { DatabaseType } from '../types';
import { sendSuccess } from '../utils/responseHelper';
import { NotFoundError } from '../utils/errors';
import { DiscoveryService } from '../services/discovery.service';
import { config } from '../config/environment';
import { logger } from '../utils/logger';

/**
 * Database Controller
 * Handles database types, instances, and databases listing
 */
export class DatabaseController {
    /**
     * GET /api/databases/types
     * List available database types
     */
    static async getTypes(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const types = [
                { id: DatabaseType.POSTGRESQL, name: 'PostgreSQL' },
                { id: DatabaseType.MONGODB, name: 'MongoDB' }
            ];

            sendSuccess(res, types);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/databases/instances
     * List database instances, optionally filtered by type
     */
    static async getInstances(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const type = req.query.type as DatabaseType | undefined;

            let instances;
            if (type && Object.values(DatabaseType).includes(type)) {
                instances = await DatabaseInstanceModel.findByType(type);
            } else {
                instances = await DatabaseInstanceModel.findAll();
            }

            // Return simplified instance data for dropdown
            const result = instances.map(instance => ({
                id: instance.id,
                name: instance.name,
                type: instance.type
            }));

            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/databases/:instanceId/databases
     * List databases for a specific instance (dynamically discovered)
     */
    static async getDatabases(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { instanceId } = req.params;

            const instance = await DatabaseInstanceModel.findById(instanceId);

            if (!instance) {
                throw new NotFoundError('Database instance');
            }

            // Dynamic discovery with fallback
            let databases: string[] = instance.databases;

            try {
                if (instance.type === DatabaseType.POSTGRESQL) {
                    const targetUrl = config.targetDatabases.postgresUrl;
                    if (targetUrl) {
                        // For PostgreSQL, we discover schemas
                        const discovered = await DiscoveryService.getPostgresSchemas(targetUrl);
                        if (discovered && discovered.length > 0) {
                            databases = discovered;
                        }
                    }
                } else if (instance.type === DatabaseType.MONGODB) {
                    const targetUrl = config.targetDatabases.mongodbUrl;
                    if (targetUrl) {
                        const discovered = await DiscoveryService.getMongoDatabases(targetUrl);
                        if (discovered && discovered.length > 0) {
                            databases = discovered;
                        }
                    }
                }
            } catch (discoveryError) {
                // Log error but fallback to static list
                logger.warn('Database discovery failed, using static list', {
                    instanceId,
                    type: instance.type,
                    error: discoveryError instanceof Error ? discoveryError.message : String(discoveryError)
                });
                // databases remains fully populated from instance.databases
            }

            sendSuccess(res, databases);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/databases/:instanceId
     * Get instance details (Admin only typically)
     */
    static async getInstanceById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { instanceId } = req.params;

            const instance = await DatabaseInstanceModel.findById(instanceId);

            if (!instance) {
                throw new NotFoundError('Database instance');
            }

            sendSuccess(res, instance);
        } catch (error) {
            next(error);
        }
    }
    /**
     * Debug discovery logic
     */
    static async debugDiscovery(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const pgUrl = config.targetDatabases.postgresUrl;
            const mongoUrl = config.targetDatabases.mongodbUrl;

            const checks: any = {
                env: {
                    pgUrlSet: !!pgUrl,
                    mongoUrlSet: !!mongoUrl,
                    pgUrlPreview: pgUrl ? pgUrl.split('@')[1] : null,
                },
                postgres: { status: 'pending' },
                mongo: { status: 'pending' }
            };

            // Check Postgres
            try {
                if (pgUrl) {
                    const schemas = await DiscoveryService.getPostgresSchemas(pgUrl);
                    checks.postgres = { status: 'success', schemas };
                } else {
                    checks.postgres = { status: 'skipped', reason: 'No URL' };
                }
            } catch (e) {
                checks.postgres = { status: 'error', error: e instanceof Error ? e.message : String(e) };
            }

            // Check Mongo
            try {
                if (mongoUrl) {
                    const dbs = await DiscoveryService.getMongoDatabases(mongoUrl);
                    checks.mongo = { status: 'success', databases: dbs };
                } else {
                    checks.mongo = { status: 'skipped', reason: 'No URL' };
                }
            } catch (e) {
                checks.mongo = { status: 'error', error: e instanceof Error ? e.message : String(e) };
            }

            res.json({ success: true, checks });
        } catch (error) {
            console.error('Debug discovery error:', error);
            next(error);
        }
    }
}
