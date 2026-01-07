import { Router } from 'express';
import { ApprovalController } from '../controllers/approval.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireMinRole } from '../middleware/rbac.middleware';
import { validate } from '../middleware/validation.middleware';
import { rejectRequestSchema } from '../validators/request.schema';
import { UserRole } from '../types';

const router = Router();

router.get(
    '/pending',
    authenticate,
    requireMinRole(UserRole.MANAGER),
    ApprovalController.getPending
);

router.post(
    '/:id/approve',
    authenticate,
    requireMinRole(UserRole.MANAGER),
    ApprovalController.approve
);

router.post(
    '/:id/reject',
    authenticate,
    requireMinRole(UserRole.MANAGER),
    validate(rejectRequestSchema),
    ApprovalController.reject
);

export default router;
