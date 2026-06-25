import 'express';

export interface JwtUserPayload {
  id: number;
  email: string;
  role: 'admin' | 'kasir';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtUserPayload;
    }
  }
}

export {};

