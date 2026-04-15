import Joi from 'joi';

import { ApiError } from '../utils/api-error';

export interface LoginInput {
  email: string;
  password: string;
}

const loginSchema = Joi.object<LoginInput>({
  email: Joi.string().email().required().messages({
    'string.email': 'Email tidak valid',
    'any.required': 'Email wajib diisi'
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password minimal 6 karakter',
    'any.required': 'Password wajib diisi'
  })
});

export const validateLoginPayload = (payload: LoginInput): LoginInput => {
  const { error, value } = loginSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Data login tidak valid');
  }

  return value;
};

