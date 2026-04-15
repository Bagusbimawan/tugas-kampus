import { NextFunction, Request, Response } from 'express';

import { env } from '../config/env';
import { ApiError } from '../utils/api-error';

export const notFoundMiddleware = (
  _req: Request,
  _res: Response,
  next: NextFunction
) => {
  next(new ApiError(404, 'Endpoint tidak ditemukan'));
};

export const errorHandler = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) => {
  const statusCode = error instanceof ApiError ? error.statusCode : 500;
  const response: Record<string, unknown> = {
    message: error.message || 'Terjadi kesalahan pada server'
  };

  if (env.nodeEnv === 'development') {
    response.stack = error.stack;
  }

  res.status(statusCode).json(response);
};

