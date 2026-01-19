import { Request, Response, NextFunction } from 'express';
import * as PodController from '../../../src/controllers/pod.controller';
import { PodModel } from '../../../src/models/Pod';
import { logger } from '../../../src/utils/logger';

// Mock dependencies
jest.mock('../../../src/models/Pod');
jest.mock('../../../src/utils/logger', () => ({
    logger: { audit: jest.fn() },
    AuditCategory: { RESOURCE: 'resource' },
    AuditAction: { LIST: 'list' }
}));

// Mock response helpers
jest.mock('../../../src/utils/responseHelper', () => ({
    sendSuccess: jest.fn((res, data) => res.status(200).json({ success: true, data })),
    sendPaginated: jest.fn((res, data, page, limit, total) => res.status(200).json({ success: true, pagination: { page, limit, total }, data }))
}));

describe('PodController', () => {
    let req: Partial<Request>;
    let res: Partial<Response>;
    let next: NextFunction;

    const mockPod = {
        id: 'pod-1',
        name: 'Test POD'
    };

    beforeEach(() => {
        req = {
            query: {},
            params: {},
            user: { userId: 'user-1' }
        } as unknown as Partial<Request>;

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
        };

        next = jest.fn();
        jest.clearAllMocks();
    });

    describe('getAll', () => {
        it('should list all pods', async () => {
            (PodModel.findAll as jest.Mock).mockResolvedValue([mockPod]);

            await PodController.getAll(req as Request, res as Response, next);

            expect(PodModel.findAll).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            const data = (res.json as jest.Mock).mock.calls[0][0].data;
            expect(data[0]).toEqual({
                id: mockPod.id,
                name: mockPod.name
            });
        });

        it('should handle errors', async () => {
            const error = new Error('Database error');
            (PodModel.findAll as jest.Mock).mockRejectedValue(error);

            await PodController.getAll(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });

    describe('getById', () => {
        it('should return pod if found', async () => {
            req.params = { id: 'pod-1' };
            (PodModel.findById as jest.Mock).mockResolvedValue(mockPod);

            await PodController.getById(req as Request, res as Response, next);

            expect(PodModel.findById).toHaveBeenCalledWith('pod-1');
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('should return null if not found', async () => {
            req.params = { id: 'pod-1' };
            (PodModel.findById as jest.Mock).mockResolvedValue(null);

            await PodController.getById(req as Request, res as Response, next);

            expect(res.status).toHaveBeenCalledWith(200);
            const data = (res.json as jest.Mock).mock.calls[0][0].data;
            expect(data).toBeNull();
        });

        it('should handle errors', async () => {
            const error = new Error('Database error');
            (PodModel.findById as jest.Mock).mockRejectedValue(error);

            await PodController.getById(req as Request, res as Response, next);

            expect(next).toHaveBeenCalledWith(error);
        });
    });
});
