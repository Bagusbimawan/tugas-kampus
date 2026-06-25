import Joi from 'joi';

import { ApiError } from '../utils/api-error';

export interface ProductInput {
  categoryId: number;
  name: string;
  sku?: string | null;
  price: number;
  costPrice?: number | null;
  stock: number;
  minStock?: number;
  unit?: string;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface ProductQueryInput {
  q?: string;
  categoryId?: number;
  isActive?: boolean;
  page: number;
  limit: number;
}

const productSchema = Joi.object<ProductInput>({
  categoryId: Joi.number().integer().positive().required().messages({
    'any.required': 'Kategori wajib dipilih'
  }),
  name: Joi.string().trim().required().messages({
    'any.required': 'Nama produk wajib diisi',
    'string.empty': 'Nama produk wajib diisi'
  }),
  sku: Joi.string().trim().allow('', null).optional(),
  price: Joi.number().positive().max(99_999_999).required().messages({
    'any.required': 'Harga jual wajib diisi',
    'number.positive': 'Harga jual harus lebih besar dari 0',
    'number.max': 'Harga jual maksimal Rp 99.999.999'
  }),
  costPrice: Joi.number().min(0).max(99_999_999).allow(null).optional(),
  stock: Joi.number().integer().min(0).required().messages({
    'any.required': 'Stok wajib diisi',
    'number.min': 'Stok tidak boleh negatif'
  }),
  minStock: Joi.number().integer().min(0).default(5),
  unit: Joi.string().trim().default('pcs'),
  imageUrl: Joi.string().uri().allow('', null).optional(),
  isActive: Joi.boolean().optional()
}).custom((value, helpers) => {
  const costPrice = value.costPrice;

  if (
    costPrice != null &&
    Number(costPrice) > 0 &&
    Number(value.price) < Number(costPrice)
  ) {
    return helpers.error('any.custom', {
      message: 'Harga jual tidak boleh lebih rendah dari harga modal'
    });
  }

  return value;
});

const productQuerySchema = Joi.object<ProductQueryInput>({
  q: Joi.string().allow('', null).optional(),
  categoryId: Joi.number().integer().positive().optional(),
  isActive: Joi.boolean().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

export const validateProductPayload = (payload: ProductInput): ProductInput => {
  const { error, value } = productSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Data produk tidak valid');
  }

  return {
    ...value,
    isActive: value.isActive ?? true
  };
};

export const validateProductQuery = (
  payload: Record<string, unknown>
): ProductQueryInput => {
  const normalizedPayload = {
    ...payload,
    categoryId: payload.categoryId ? Number(payload.categoryId) : undefined,
    page: payload.page ? Number(payload.page) : undefined,
    limit: payload.limit ? Number(payload.limit) : undefined,
    isActive:
      payload.isActive === 'true'
        ? true
        : payload.isActive === 'false'
          ? false
          : undefined
  };

  const { error, value } = productQuerySchema.validate(normalizedPayload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Query produk tidak valid');
  }

  return value;
};

export const validateQuickSearchQuery = (q: unknown): string => {
  const { error, value } = Joi.string().trim().required().validate(q);

  if (error) {
    throw new ApiError(400, 'Query pencarian wajib diisi');
  }

  return value;
};

