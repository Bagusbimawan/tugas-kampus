import Joi from 'joi';

import { ApiError } from '../utils/api-error';

type PaymentMethod = 'cash' | 'qris' | 'transfer' | 'card';

export interface TransactionItemInput {
  productId: number;
  quantity: number;
  discount?: number;
}

export interface PaymentInput {
  method: PaymentMethod;
  amountPaid: number;
  referenceNo?: string;
}

export interface CreateTransactionInput {
  customerName?: string;
  discount?: number;
  tax?: number;
  notes?: string;
  items: TransactionItemInput[];
  payment: PaymentInput;
}

export interface TransactionQueryInput {
  startDate?: string;
  endDate?: string;
  userId?: number;
  status?: 'completed' | 'cancelled';
  page: number;
  limit: number;
}

const itemSchema = Joi.object<TransactionItemInput>({
  productId: Joi.number().integer().positive().required(),
  quantity: Joi.number().integer().positive().required(),
  discount: Joi.number().min(0).default(0)
});

const paymentSchema = Joi.object<PaymentInput>({
  method: Joi.string().valid('cash', 'qris', 'transfer', 'card').required(),
  amountPaid: Joi.number().min(0).required(),
  referenceNo: Joi.string().allow('', null).optional()
});

const createTransactionSchema = Joi.object<CreateTransactionInput>({
  customerName: Joi.string().trim().allow('', null).optional(),
  discount: Joi.number().min(0).default(0),
  tax: Joi.number().min(0).default(0),
  notes: Joi.string().allow('', null).optional(),
  items: Joi.array().items(itemSchema).min(1).required(),
  payment: paymentSchema.required()
});

const listTransactionSchema = Joi.object<TransactionQueryInput>({
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  userId: Joi.number().integer().positive().optional(),
  status: Joi.string().valid('completed', 'cancelled').optional(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

export const validateCreateTransactionPayload = (
  payload: CreateTransactionInput
): CreateTransactionInput => {
  const { error, value } = createTransactionSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Data transaksi tidak valid');
  }

  return value;
};

export const validateTransactionQuery = (
  payload: Record<string, unknown>
): TransactionQueryInput => {
  const normalizedPayload = {
    ...payload,
    userId: payload.userId ? Number(payload.userId) : undefined,
    page: payload.page ? Number(payload.page) : undefined,
    limit: payload.limit ? Number(payload.limit) : undefined
  };

  const { error, value } = listTransactionSchema.validate(normalizedPayload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Query transaksi tidak valid');
  }

  return value;
};

