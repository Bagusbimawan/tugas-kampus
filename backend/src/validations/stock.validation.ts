import Joi from 'joi';

import { ApiError } from '../utils/api-error';

export interface StockAdjustmentInput {
  productId: number;
  type: 'in' | 'adjustment';
  qtyChange: number;
  reason: string;
}

export interface StockLogQueryInput {
  productId?: number;
  userId?: number;
  type?: 'in' | 'out' | 'adjustment';
  startDate?: string;
  endDate?: string;
  page: number;
  limit: number;
}

const adjustmentSchema = Joi.object<StockAdjustmentInput>({
  productId: Joi.number().integer().positive().required(),
  type: Joi.string().valid('in', 'adjustment').required(),
  qtyChange: Joi.number().integer().required(),
  reason: Joi.string().trim().required().messages({
    'any.required': 'Alasan wajib diisi',
    'string.empty': 'Alasan wajib diisi'
  })
});

const logQuerySchema = Joi.object<StockLogQueryInput>({
  productId: Joi.number().integer().positive().optional(),
  userId: Joi.number().integer().positive().optional(),
  type: Joi.string().valid('in', 'out', 'adjustment').optional(),
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

export const validateStockAdjustmentPayload = (
  payload: StockAdjustmentInput
): StockAdjustmentInput => {
  const { error, value } = adjustmentSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Data penyesuaian stok tidak valid');
  }

  if (value.qtyChange === 0) {
    throw new ApiError(400, 'qtyChange tidak boleh 0');
  }

  if (value.type === 'in' && value.qtyChange < 0) {
    throw new ApiError(400, 'qtyChange untuk stok masuk harus bilangan positif');
  }

  return value;
};

export const validateStockLogQuery = (
  payload: Record<string, unknown>
): StockLogQueryInput => {
  const normalizedPayload = {
    ...payload,
    productId: payload.productId ? Number(payload.productId) : undefined,
    userId: payload.userId ? Number(payload.userId) : undefined,
    page: payload.page ? Number(payload.page) : undefined,
    limit: payload.limit ? Number(payload.limit) : undefined
  };

  const { error, value } = logQuerySchema.validate(normalizedPayload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Query stok tidak valid');
  }

  return value;
};

