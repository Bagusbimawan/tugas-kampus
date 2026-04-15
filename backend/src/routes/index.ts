import { Router } from 'express';

import authRoutes from './auth.routes';
import categoryRoutes from './category.routes';
import productRoutes from './product.routes';
import reportRoutes from './report.routes';
import stockRoutes from './stock.routes';
import transactionRoutes from './transaction.routes';
import userRoutes from './user.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/stock', stockRoutes);
router.use('/transactions', transactionRoutes);
router.use('/reports', reportRoutes);
router.use('/users', userRoutes);

export default router;
