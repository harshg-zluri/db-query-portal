import { Request, Response, NextFunction } from 'express';
import { PodModel } from '../models/Pod';
import { sendSuccess } from '../utils/responseHelper';

/**
 * POD Controller
 * Handles POD listing and management
 */
export class PodController {
    /**
     * GET /api/pods
     * List all PODs
     */
    static async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const pods = await PodModel.findAll();

            // Return POD data for dropdown
            const result = pods.map(pod => ({
                id: pod.id,
                name: pod.name,
                managerEmail: pod.managerEmail
            }));

            sendSuccess(res, result);
        } catch (error) {
            next(error);
        }
    }

    /**
     * GET /api/pods/:id
     * Get POD by ID
     */
    static async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const pod = await PodModel.findById(req.params.id);

            if (!pod) {
                sendSuccess(res, null, 'POD not found');
                return;
            }

            sendSuccess(res, pod);
        } catch (error) {
            next(error);
        }
    }
}
