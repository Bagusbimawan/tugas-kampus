import { Router } from 'express';

import { settingsController } from '../controllers/settings.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.get('/', authMiddleware, asyncHandler(settingsController.getSettings));
router.put(
  '/',
  authMiddleware,
  roleMiddleware(['admin']),
  asyncHandler(settingsController.updateSettings)
);

export default router;
