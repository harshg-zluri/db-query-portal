import { Router } from 'express';
import { DatabaseController } from '../controllers/database.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '../types';

const router = Router();

router.get(
    '/debug-discovery',
    authenticate,
    requireRole(UserRole.ADMIN),
    DatabaseController.debugDiscovery
);

router.get(
    '/types',
    authenticate,
    DatabaseController.getTypes
);

router.get(
    '/instances',
    authenticate,
    DatabaseController.getInstances
);

router.get(
    '/:instanceId/databases',
    authenticate,
    DatabaseController.getDatabases
);

router.get(
    '/:instanceId',
    authenticate,
    requireRole(UserRole.ADMIN),
    DatabaseController.getInstanceById
);



export default router;
