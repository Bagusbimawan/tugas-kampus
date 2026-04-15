import 'express';

export interface JwtUserPayload {
  id: number;
  email: string;
  role: 'admin' | 'manager' | 'kasir';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export {};

