import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authLimiter } from '../middleware/rateLimiter.middleware';
import { validate } from '../middleware/validation.middleware';
import { loginSchema, refreshTokenSchema } from '../validators/auth.schema';

const router = Router();

router.post(
    '/login',
    authLimiter,
    validate(loginSchema),
    AuthController.login
);

router.post(
    '/logout',
    authenticate,
    AuthController.logout
);

router.post(
    '/refresh',
    authLimiter,
    validate(refreshTokenSchema),
    AuthController.refresh
);

router.get(
    '/me',
    authenticate,
    AuthController.getProfile
);

// Google OAuth Routes
router.get('/google', AuthController.googleAuth);
router.get('/google/callback', AuthController.googleCallback);

export default router;
