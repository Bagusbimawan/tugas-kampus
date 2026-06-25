export const MAX_PRODUCT_IMAGE_SIZE_MB = 5;

const ALLOWED_PRODUCT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

/** Matches backend settings validation (021..., 08..., +62..., 62...) */
export const STORE_PHONE_PATTERN = /^(0|\+62|62)[0-9]{8,13}$/;

export function getStorePhoneError(phone: string) {
  const trimmed = phone.trim();

  if (!trimmed) {
    return 'Nomor telepon wajib diisi';
  }

  if (!STORE_PHONE_PATTERN.test(trimmed)) {
    return 'Format nomor telepon tidak valid (contoh: 0211234567 atau 081234567890)';
  }

  return null;
}

export function getDateRangeError(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return 'Tanggal mulai dan akhir wajib diisi';
  }

  if (startDate > endDate) {
    return 'Tanggal mulai tidak boleh setelah tanggal akhir';
  }

  return null;
}

export function validateProductImageFile(file: File) {
  if (!ALLOWED_PRODUCT_IMAGE_TYPES.has(file.type)) {
    return 'Format gambar harus JPG, PNG, atau WebP';
  }

  const maxBytes = MAX_PRODUCT_IMAGE_SIZE_MB * 1024 * 1024;

  if (file.size > maxBytes) {
    return `Ukuran gambar maksimal ${MAX_PRODUCT_IMAGE_SIZE_MB}MB`;
  }

  return null;
}
