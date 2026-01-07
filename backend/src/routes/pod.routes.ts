import { Router } from 'express';
import { PodController } from '../controllers/pod.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

router.get(
    '/',
    authenticate,
    PodController.getAll
);

router.get(
    '/:id',
    authenticate,
    PodController.getById
);

export default router;
