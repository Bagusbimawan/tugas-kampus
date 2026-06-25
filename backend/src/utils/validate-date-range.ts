import { ApiError } from './api-error';

export const assertValidDateRange = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) {
    return;
  }

  if (startDate > endDate) {
    throw new ApiError(400, 'Tanggal mulai tidak boleh setelah tanggal akhir');
  }
};
