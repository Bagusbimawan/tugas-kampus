import Joi from 'joi';

import { ApiError } from '../utils/api-error';

export interface UserInput {
  name: string;
  email: string;
  password?: string;
  role: 'admin' | 'manager' | 'kasir';
  isActive?: boolean;
}

export interface PasswordInput {
  password: string;
}

const userSchema = Joi.object<UserInput>({
  name: Joi.string().trim().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).optional(),
  role: Joi.string().valid('admin', 'manager', 'kasir').required(),
  isActive: Joi.boolean().default(true)
});

const createUserSchema = userSchema.keys({
  password: Joi.string().min(6).required()
});

const passwordSchema = Joi.object<PasswordInput>({
  password: Joi.string().min(6).required()
});

export const validateCreateUserPayload = (payload: UserInput): UserInput => {
  const { error, value } = createUserSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Data user tidak valid');
  }

  return value;
};

export const validateUpdateUserPayload = (payload: UserInput): UserInput => {
  const { error, value } = userSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Data user tidak valid');
  }

  return value;
};

export const validatePasswordPayload = (payload: PasswordInput): PasswordInput => {
  const { error, value } = passwordSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Password tidak valid');
  }

  return value;
};

