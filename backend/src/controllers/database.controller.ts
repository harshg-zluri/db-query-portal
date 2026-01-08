import { Request, Response, NextFunction } from 'express';
import { DatabaseInstanceModel } from '../models/DatabaseInstance';
import { DatabaseType } from '../types';
import { sendSuccess } from '../utils/responseHelper';
import { NotFoundError } from '../utils/errors';

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
     * List databases for a specific instance
     */
    static async getDatabases(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { instanceId } = req.params;

            const instance = await DatabaseInstanceModel.findById(instanceId);

            if (!instance) {
                throw new NotFoundError('Database instance');
            }

            // Return list of databases as simple string array for dropdown
            sendSuccess(res, instance.databases);
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
}
