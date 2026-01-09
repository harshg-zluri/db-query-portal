import { Router } from 'express';
import authRoutes from './auth.routes';
import databaseRoutes from './database.routes';
import podRoutes from './pod.routes';
import requestRoutes from './request.routes';
import approvalRoutes from './approval.routes';
import adminRoutes from './admin.routes';

const router = Router();

// Mount routes
router.use('/auth', authRoutes);
router.use('/databases', databaseRoutes);
router.use('/pods', podRoutes);
router.use('/admin', adminRoutes);
// Order matters: specific paths before generic parameters
router.use('/requests', approvalRoutes); // handles /requests/pending, /requests/:id/approve/reject
router.use('/requests', requestRoutes);  // handles /requests, /requests/my, /requests/:id

export default router;

