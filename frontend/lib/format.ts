export const MAX_CURRENCY_AMOUNT = 99_999_999;

export const formatCurrency = (value: number | string) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(value || 0));
};

export const formatRupiahInput = (value: number | string | undefined) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '';
  }

  return new Intl.NumberFormat('id-ID').format(numericValue);
};

export const parseRupiahInput = (value: string, maxAmount = MAX_CURRENCY_AMOUNT) => {
  const digitsOnly = value.replace(/\D/g, '').slice(0, String(maxAmount).length);

  if (!digitsOnly) {
    return 0;
  }

  return Math.min(Number(digitsOnly), maxAmount);
};

export const formatDateTime = (value: string | Date) => {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(value));
};

