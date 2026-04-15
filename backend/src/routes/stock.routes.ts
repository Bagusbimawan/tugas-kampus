import { Router } from 'express';

import { stockController } from '../controllers/stock.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const managerRoles = ['admin', 'manager'];

router.use(authMiddleware, roleMiddleware(managerRoles));

router.get('/logs', asyncHandler(stockController.getLogs));
router.get('/logs/:productId', asyncHandler(stockController.getLogsByProductId));
router.post('/adjustment', asyncHandler(stockController.adjust));
router.get('/alert', asyncHandler(stockController.getAlerts));

export default router;

