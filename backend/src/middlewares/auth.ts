import { NextFunction, Request, Response } from 'express';
import jwt, { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

import { env } from '../config/env';
import {
  AUTH_EXPIRED_TOKEN,
  AUTH_FORBIDDEN,
  AUTH_INVALID_TOKEN,
  AUTH_UNAUTHORIZED
} from '../constants/messages';
import { ApiError } from '../utils/api-error';
import { JwtUserPayload } from '../types/express';

const getBearerToken = (authorization?: string) => {
  if (!authorization?.startsWith('Bearer ')) {
    return null;
  }

  return authorization.split(' ')[1] || null;
};

export const authMiddleware = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  const token = getBearerToken(req.headers.authorization);

  if (!token) {
    return next(new ApiError(401, AUTH_UNAUTHORIZED));
  }

  try {
    const decoded = jwt.verify(token, env.jwtSecret) as JwtUserPayload;
    req.user = decoded;
    return next();
  } catch (error) {
    if (error instanceof TokenExpiredError) {
      return next(new ApiError(401, AUTH_EXPIRED_TOKEN));
    }

    if (error instanceof JsonWebTokenError) {
      return next(new ApiError(401, AUTH_INVALID_TOKEN));
    }

    return next(error);
  }
};

export const roleMiddleware = (allowedRoles: string[]) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(new ApiError(403, AUTH_FORBIDDEN));
    }

    return next();
  };
};

