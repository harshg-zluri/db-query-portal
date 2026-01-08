import { Router } from 'express';
import { RequestController } from '../controllers/request.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireMinRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { upload } from '../middleware/upload.middleware';
import { createRequestSchema, listRequestsSchema, myRequestsSchema } from '../validators/request.schema';
import { paginationSchema } from '../validators/common.schema';
import { UserRole } from '../types';

const router = Router();

router.post(
    '/',
    authenticate,
    upload.single('script'),
    validate(createRequestSchema),
    RequestController.create
);

router.get(
    '/my',
    authenticate,
    validate(myRequestsSchema, 'query'),
    RequestController.getMyRequests
);

router.get(
    '/',
    authenticate,
    requireMinRole(UserRole.MANAGER),
    validate(listRequestsSchema, 'query'),
    RequestController.list
);

router.get(
    '/:id',
    authenticate,
    RequestController.getById
);

// Withdraw a pending request (owner only)
router.post(
    '/:id/withdraw',
    authenticate,
    RequestController.withdraw
);

export default router;
