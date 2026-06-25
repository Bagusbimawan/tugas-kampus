import Joi from 'joi';

import { ApiError } from '../utils/api-error';

export interface StoreSettingsInput {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  taxRate: number;
}

const phonePattern = /^(0|\+62|62)[0-9]{8,13}$/;

const settingsSchema = Joi.object<StoreSettingsInput>({
  storeName: Joi.string().trim().min(1).max(255).required().messages({
    'any.required': 'Nama toko wajib diisi',
    'string.empty': 'Nama toko wajib diisi'
  }),
  storeAddress: Joi.string().trim().min(1).max(1000).required().messages({
    'any.required': 'Alamat toko wajib diisi',
    'string.empty': 'Alamat toko wajib diisi'
  }),
  storePhone: Joi.string().trim().pattern(phonePattern).required().messages({
    'any.required': 'Nomor telepon wajib diisi',
    'string.pattern.base': 'Format nomor telepon tidak valid (contoh: 0211234567 atau 081234567890)'
  }),
  taxRate: Joi.number().min(0).max(100).required().messages({
    'number.min': 'Pajak minimal 0',
    'number.max': 'Pajak maksimal 100'
  })
});

export const validateStoreSettingsPayload = (
  payload: StoreSettingsInput
): StoreSettingsInput => {
  const { error, value } = settingsSchema.validate(payload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Data pengaturan tidak valid');
  }

  return value;
};
