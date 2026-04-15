import Joi from 'joi';

import { ApiError } from '../utils/api-error';

export interface ReportQueryInput {
  startDate?: string;
  endDate?: string;
  limit?: number;
}

const reportQuerySchema = Joi.object<ReportQueryInput>({
  startDate: Joi.string().isoDate().optional(),
  endDate: Joi.string().isoDate().optional(),
  limit: Joi.number().integer().min(1).max(100).default(10)
});

export const validateReportQuery = (
  payload: Record<string, unknown>
): ReportQueryInput => {
  const normalizedPayload = {
    ...payload,
    limit: payload.limit ? Number(payload.limit) : undefined
  };

  const { error, value } = reportQuerySchema.validate(normalizedPayload, {
    abortEarly: false,
    stripUnknown: true
  });

  if (error) {
    throw new ApiError(400, error.details[0]?.message || 'Query laporan tidak valid');
  }

  return value;
};

