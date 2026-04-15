import bcrypt from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';

import { env } from '../config/env';
import { AUTH_INVALID_CREDENTIALS } from '../constants/messages';
import { authRepository } from '../repositories/auth.repository';
import { JwtUserPayload } from '../types/express';
import { ApiError } from '../utils/api-error';
import { LoginInput } from '../validations/auth.validation';

const buildTokenPayload = (user: {
  id: number;
  email: string;
  role: 'admin' | 'manager' | 'kasir';
}): JwtUserPayload => {
  return {
    id: user.id,
    email: user.email,
    role: user.role
  };
};

const signToken = (payload: JwtUserPayload) => {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions['expiresIn']
  };

  return jwt.sign(payload, env.jwtSecret, options);
};

export const authService = {
  async login(payload: LoginInput) {
    const user = await authRepository.findByEmail(payload.email);

    if (!user || !user.isActive) {
      throw new ApiError(401, AUTH_INVALID_CREDENTIALS);
    }

    const isPasswordValid = await bcrypt.compare(payload.password, user.password);

    if (!isPasswordValid) {
      throw new ApiError(401, AUTH_INVALID_CREDENTIALS);
    }

    const token = signToken(buildTokenPayload(user));

    return {
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    };
  },

  async getCurrentUser(userId: number) {
    const user = await authRepository.findById(userId);

    if (!user) {
      throw new ApiError(404, 'User tidak ditemukan');
    }

    return user;
  }
};
