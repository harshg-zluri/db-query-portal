import { Request, Response, NextFunction } from 'express';
import { findAllPods, findPodById } from '../models/Pod';
import { sendSuccess } from '../utils/responseHelper';

/**
 * POD Controller
 * Handles POD listing and management
 */
/**
 * Handles POD listing
 */
export async function getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const pods = await findAllPods();

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
 * Get POD by ID
 */
export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const pod = await findPodById(req.params.id);

        if (!pod) {
            sendSuccess(res, null, 'POD not found');
            return;
        }

        sendSuccess(res, pod);
    } catch (error) {
        next(error);
    }
}

export const PodController = {
    getAll,
    getById
};
