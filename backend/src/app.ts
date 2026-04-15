import cors from 'cors';
import express from 'express';

import routes from './routes';
import {
  errorHandler,
  notFoundMiddleware
} from './middlewares/error.middleware';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.status(200).json({
    message: 'Kasir API berjalan',
    healthCheck: '/health',
    apiBase: '/api'
  });
});

app.get('/health', (_req, res) => {
  res.status(200).json({ message: 'OK' });
});

app.get('/api', (_req, res) => {
  res.status(200).json({
    message: 'API base path aktif',
    availableRoutes: [
      '/api/auth',
      '/api/categories',
      '/api/products',
      '/api/stock',
      '/api/transactions',
      '/api/reports',
      '/api/users'
    ]
  });
});

app.use('/api', routes);
app.use(notFoundMiddleware);
app.use(errorHandler);

export default app;
