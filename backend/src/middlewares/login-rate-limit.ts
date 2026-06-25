import { NextFunction, Request, Response } from 'express';

import { ApiError } from '../utils/api-error';

interface AttemptRecord {
  count: number;
  resetAt: number;
}

const attempts = new Map<string, AttemptRecord>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const getClientKey = (req: Request) => {
  const forwarded = req.headers['x-forwarded-for'];

  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  return req.ip || req.socket.remoteAddress || 'unknown';
};

export const loginRateLimitMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const key = getClientKey(req);
  const now = Date.now();
  const record = attempts.get(key);

  if (record && now < record.resetAt && record.count >= MAX_ATTEMPTS) {
    return next(
      new ApiError(
        429,
        'Terlalu banyak percobaan login. Silakan coba lagi dalam 15 menit.'
      )
    );
  }

  return next();
};

export const recordFailedLoginAttempt = (req: Request) => {
  const key = getClientKey(req);
  const now = Date.now();
  const record = attempts.get(key);

  if (!record || now >= record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return;
  }

  record.count += 1;
  attempts.set(key, record);
};

export const clearLoginAttempts = (req: Request) => {
  attempts.delete(getClientKey(req));
};
