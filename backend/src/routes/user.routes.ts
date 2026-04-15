import { Router } from 'express';

import { userController } from '../controllers/user.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authMiddleware, roleMiddleware(['admin']));

router.get('/', asyncHandler(userController.getAll));
router.post('/', asyncHandler(userController.create));
router.put('/:id', asyncHandler(userController.update));
router.put('/:id/password', asyncHandler(userController.updatePassword));
router.delete('/:id', asyncHandler(userController.delete));

export default router;

