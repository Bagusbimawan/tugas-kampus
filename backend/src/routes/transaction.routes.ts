import { Router } from 'express';

import { transactionController } from '../controllers/transaction.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();

router.use(authMiddleware);

router.get('/', asyncHandler(transactionController.getAll));
router.get('/:id', asyncHandler(transactionController.getById));
router.post('/', asyncHandler(transactionController.create));
router.put(
  '/:id/cancel',
  roleMiddleware(['admin', 'manager']),
  asyncHandler(transactionController.cancel)
);
router.get('/:id/receipt', asyncHandler(transactionController.getReceipt));

export default router;

