import { Router } from 'express';

import { productController } from '../controllers/product.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';
import { productImageUploadMiddleware } from '../middlewares/upload';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(productController.getAll));
router.get('/search', asyncHandler(productController.quickSearch));
router.get('/:id', asyncHandler(productController.getById));
router.post('/', roleMiddleware(['admin']), asyncHandler(productController.create));
router.post(
  '/:id/image',
  roleMiddleware(['admin']),
  productImageUploadMiddleware,
  asyncHandler(productController.uploadImage)
);
router.put('/:id', roleMiddleware(['admin']), asyncHandler(productController.update));
router.delete('/:id', roleMiddleware(['admin']), asyncHandler(productController.delete));

export default router;
