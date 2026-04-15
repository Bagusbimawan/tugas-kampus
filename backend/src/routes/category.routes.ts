import { Router } from 'express';

import { categoryController } from '../controllers/category.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(categoryController.getAll));
router.post(
  '/',
  roleMiddleware(['admin']),
  asyncHandler(categoryController.create)
);
router.put(
  '/:id',
  roleMiddleware(['admin']),
  asyncHandler(categoryController.update)
);
router.delete(
  '/:id',
  roleMiddleware(['admin']),
  asyncHandler(categoryController.delete)
);

export default router;
