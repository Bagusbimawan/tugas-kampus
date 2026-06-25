import { Router } from 'express';

import { authController } from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth';
import { loginRateLimitMiddleware } from '../middlewares/login-rate-limit';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.post('/login', loginRateLimitMiddleware, asyncHandler(authController.login));
router.get('/me', authMiddleware, asyncHandler(authController.me));

export default router;
