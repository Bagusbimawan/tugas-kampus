import Joi from 'joi';

import { ApiError } from '../utils/api-error';

export interface CategoryInput {
  name: string;
  description?: string;
}

const categorySchema = Joi.object<CategoryInput>({
  name: Joi.string().trim().required().messages({
    'any.required': 'Nama kategori wajib diisi',
    'string.empty': 'Nama kategori wajib diisi'
  }),
  description: Joi.string().allow('', null).optional()
});

export const validateCategoryPayload = (payload: CategoryInput): CategoryInput => {
  const { error, value } = categorySchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Data kategori tidak valid');
  }

  return value;
};

