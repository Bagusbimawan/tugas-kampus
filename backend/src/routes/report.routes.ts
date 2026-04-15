import { Router } from 'express';

import { reportController } from '../controllers/report.controller';
import { authMiddleware, roleMiddleware } from '../middlewares/auth';
import { asyncHandler } from '../utils/async-handler';

const router = Router();
const managerRoles = ['admin', 'manager'];

router.use(authMiddleware, roleMiddleware(managerRoles));

router.get('/sales-summary', asyncHandler(reportController.getSalesSummary));
router.get('/top-products', asyncHandler(reportController.getTopProducts));
router.get('/revenue-by-category', asyncHandler(reportController.getRevenueByCategory));
router.get('/by-cashier', asyncHandler(reportController.getRevenueByCashier));

export default router;

