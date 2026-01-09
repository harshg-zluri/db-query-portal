import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/rbac.middleware';
import { UserRole } from '../types';
import {
    getUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getPods
} from '../controllers/admin.controller';

const router = Router();

// All admin routes require authentication and admin role
router.use(authenticate);
router.use(requireRole([UserRole.ADMIN]));

// User management
router.get('/users', getUsers);
router.get('/users/:id', getUser);
router.post('/users', createUser);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);

// Get pods for user assignment
router.get('/pods', getPods);

export default router;
