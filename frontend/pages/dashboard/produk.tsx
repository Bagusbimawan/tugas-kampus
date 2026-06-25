import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import {
  ChevronDown,
  Pencil,
  Plus,
  Search,
  Trash2,
  X
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Controller, useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { AuthGuard } from '../../components/AuthGuard';
import { CurrencyInput } from '../../components/common/CurrencyInput';
import { QuantityStepper } from '../../components/common/QuantityStepper';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatCurrency, MAX_CURRENCY_AMOUNT } from '../../lib/format';
import { cn } from '../../lib/cn';
import { getDateRangeError, validateProductImageFile } from '../../lib/validation';
import { api } from '../../services/api';
import { Category, Product, ProductListResponse } from '../../types/product';

const productSchema = z
  .object({
    name: z.string().trim().min(1, 'Nama produk wajib diisi').max(255, 'Nama produk terlalu panjang'),
    categoryId: z.coerce.number().min(1, 'Kategori wajib dipilih'),
    sku: z.string().optional(),
    price: z.coerce
      .number()
      .positive('Harga jual harus lebih besar dari 0')
      .max(MAX_CURRENCY_AMOUNT, `Harga jual maksimal ${formatCurrency(MAX_CURRENCY_AMOUNT)}`),
    costPrice: z
      .union([
        z.coerce
          .number()
          .min(0)
          .max(MAX_CURRENCY_AMOUNT, `Harga modal maksimal ${formatCurrency(MAX_CURRENCY_AMOUNT)}`),
        z.nan()
      ])
      .optional(),
    stock: z.coerce.number().int().min(0, 'Stok tidak boleh negatif'),
    minStock: z.coerce.number().int().min(0, 'Stok minimum tidak boleh negatif'),
    unit: z.string().min(1, 'Satuan wajib diisi'),
    isActive: z.boolean()
  })
  .superRefine((values, context) => {
    if (!isSellingPriceBelowCost(values.price, values.costPrice)) {
      return;
    }

    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: PRICE_VS_COST_MESSAGE,
      path: ['price']
    });
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: PRICE_VS_COST_MESSAGE,
      path: ['costPrice']
    });
  });

const categorySchema = z.object({
  name: z.string().trim().min(1, 'Nama kategori wajib diisi').max(255, 'Nama kategori terlalu panjang'),
  description: z.string().trim().max(500, 'Deskripsi terlalu panjang').optional()
});

type ProductFormValues = z.infer<typeof productSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;

type ProductStatusFilter = 'all' | 'active' | 'inactive';

const PRICE_VS_COST_MESSAGE = 'Harga jual tidak boleh lebih rendah dari harga modal';

function getEffectiveCostPrice(value: unknown): number | null {
  const cost = Number(value);

  if (!Number.isFinite(cost) || Number.isNaN(cost) || cost <= 0) {
    return null;
  }

  return cost;
}

function isSellingPriceBelowCost(price: unknown, costPrice: unknown): boolean {
  const cost = getEffectiveCostPrice(costPrice);
  const sellingPrice = Number(price);

  if (cost === null || !Number.isFinite(sellingPrice) || sellingPrice <= 0) {
    return false;
  }

  return sellingPrice < cost;
}

const emptyProductValues: ProductFormValues = {
  name: '',
  categoryId: 0,
  sku: '',
  price: 0,
  costPrice: Number.NaN,
  stock: 0,
  minStock: 5,
  unit: 'pcs',
  isActive: true
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
};

const getNameErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  const message = error.response?.data?.message;

  if (typeof message === 'string' && message.toLowerCase().includes('nama produk')) {
    return message;
  }

  return null;
};

const getSkuErrorMessage = (error: unknown) => {
  if (!axios.isAxiosError(error)) {
    return null;
  }

  const status = error.response?.status;
  const responseData = error.response?.data;
  const candidateMessages = [
    typeof responseData?.message === 'string' ? responseData.message : '',
    typeof responseData?.error === 'string' ? responseData.error : '',
    typeof responseData?.detail === 'string' ? responseData.detail : '',
    typeof responseData?.errors?.sku === 'string' ? responseData.errors.sku : '',
    Array.isArray(responseData?.errors?.sku) ? responseData.errors.sku.join(' ') : '',
    typeof error.message === 'string' ? error.message : ''
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (
    (status === 400 || status === 409) &&
    (candidateMessages.includes('sku') ||
      candidateMessages.includes('kode') ||
      candidateMessages.includes('code'))
  ) {
    return 'Kode SKU sudah pernah digunakan.';
  }

  if (
    candidateMessages.includes('sku') &&
    (candidateMessages.includes('already') ||
      candidateMessages.includes('duplicate') ||
      candidateMessages.includes('used') ||
      candidateMessages.includes('exist') ||
      candidateMessages.includes('unik') ||
      candidateMessages.includes('digunakan'))
  ) {
    return 'Kode SKU sudah pernah digunakan.';
  }

  return null;
};

const toAbsoluteImageUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    return value;
  }

  return `${apiBaseUrl.replace(/\/+$/, '')}/${value.replace(/^\/+/, '')}`;
};

interface ProductFormModalProps {
  categories: Category[];
  initialProduct: Product | null;
  isOpen: boolean;
  isSubmitting: boolean;
  submitError?: string | null;
  onClose: () => void;
  onSubmit: (values: ProductFormValues, imageFile: File | null) => Promise<void>;
}

const ProductFormModal = ({
  categories,
  initialProduct,
  isOpen,
  isSubmitting,
  submitError,
  onClose,
  onSubmit
}: ProductFormModalProps) => {
  const {
    register,
    reset,
    handleSubmit,
    setValue,
    setError,
    clearErrors,
    trigger,
    watch,
    control,
    formState: { errors }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProductValues,
    mode: 'onChange',
    reValidateMode: 'onChange'
  });
  const watchedName = watch('name');
  const watchedPrice = watch('price');
  const watchedCostPrice = watch('costPrice');
  const watchedStock = watch('stock');
  const watchedMinStock = watch('minStock');
  const watchedIsActive = watch('isActive');
  const isEditing = Boolean(initialProduct);
  const effectiveCostPrice = getEffectiveCostPrice(watchedCostPrice);
  const isPriceBelowCost = isSellingPriceBelowCost(watchedPrice, watchedCostPrice);
  const priceFieldError = isPriceBelowCost
    ? PRICE_VS_COST_MESSAGE
    : errors.price?.message;
  const costPriceFieldError = isPriceBelowCost
    ? PRICE_VS_COST_MESSAGE
    : errors.costPrice?.message;
  const debouncedName = useDebouncedValue(watchedName, 300);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');
  const [imageError, setImageError] = useState<string | null>(null);

  const nameCheckQuery = useQuery({
    queryKey: ['product-name-check', debouncedName.trim().toLowerCase(), initialProduct?.id],
    queryFn: async () => {
      const { data } = await api.get<ProductListResponse>('/products', {
        params: { q: debouncedName.trim(), limit: 50 }
      });
      return data.data;
    },
    enabled: isOpen && debouncedName.trim().length > 0
  });

  const syncPriceValidation = () => {
    void trigger(['price', 'costPrice']);
  };

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const normalizedName = debouncedName.trim().toLowerCase();

    if (!normalizedName) {
      if (errors.name?.type === 'manual') {
        clearErrors('name');
      }
      return;
    }

    if (nameCheckQuery.isFetching) {
      return;
    }

    const duplicate = nameCheckQuery.data?.find(
      (product) =>
        product.name.trim().toLowerCase() === normalizedName &&
        product.id !== initialProduct?.id
    );

    if (duplicate) {
      setError('name', {
        type: 'manual',
        message: duplicate.isActive
          ? 'Nama produk sudah digunakan oleh produk aktif'
          : 'Nama produk sudah digunakan oleh produk nonaktif'
      });
      return;
    }

    if (errors.name?.type === 'manual') {
      clearErrors('name');
      void trigger('name');
    }
  }, [
    clearErrors,
    debouncedName,
    errors.name?.type,
    initialProduct?.id,
    isOpen,
    nameCheckQuery.data,
    nameCheckQuery.isFetching,
    setError,
    trigger
  ]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    void trigger(['price', 'costPrice']);
  }, [isOpen, trigger, watchedCostPrice, watchedPrice]);

  useEffect(() => {
    if (!isOpen) {
      reset(emptyProductValues);
      setImageFile(null);
      setImagePreviewUrl('');
      setImageError(null);
      return;
    }

    if (!initialProduct) {
      reset(emptyProductValues);
      setImageFile(null);
      setImagePreviewUrl('');
      setImageError(null);
      return;
    }

    reset({
      name: initialProduct.name,
      categoryId: initialProduct.categoryId,
      sku: initialProduct.sku || '',
      price: Number(initialProduct.price),
      costPrice:
        initialProduct.costPrice === null || initialProduct.costPrice === undefined
          ? Number.NaN
          : Number(initialProduct.costPrice),
      stock: initialProduct.stock,
      minStock: initialProduct.minStock,
      unit: initialProduct.unit,
      isActive: initialProduct.isActive
    });
    setImageFile(null);
    setImagePreviewUrl(toAbsoluteImageUrl(initialProduct.imageUrl) || '');
  }, [initialProduct, isOpen, reset]);

  useEffect(() => {
    if (!imageFile) {
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreviewUrl(objectUrl);

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  }, [imageFile]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-6">
      <button
        type="button"
        aria-label="Tutup modal produk"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur"
        onClick={onClose}
      />
      <div className="relative flex h-[92dvh] max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-slate-200 bg-white sm:h-auto sm:max-h-[min(90dvh,56rem)] sm:max-w-3xl sm:rounded-[28px]">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
              {initialProduct ? 'Edit Produk' : 'Tambah Produk'}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {initialProduct ? 'Perbarui data produk' : 'Input produk baru'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          key={initialProduct?.id ?? 'new-product'}
          onSubmit={handleSubmit(async (values) => onSubmit(values, imageFile))}
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
        >
          <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto overscroll-contain touch-pan-y p-4 sm:grid-cols-2 sm:p-6 [-webkit-overflow-scrolling:touch]">
          <label className="block text-sm text-slate-600">
            Nama Produk*
            <input
              {...register('name')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
            {errors.name ? <p className="mt-2 text-rose-600">{errors.name.message}</p> : null}
            {nameCheckQuery.isFetching && debouncedName.trim() ? (
              <p className="mt-2 text-xs text-slate-500">Memeriksa ketersediaan nama...</p>
            ) : null}
          </label>

          <label className="block text-sm text-slate-600">
            Kategori*
            <select
              {...register('categoryId')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            >
              <option value={0}>Pilih kategori</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.categoryId ? (
              <p className="mt-2 text-rose-600">{errors.categoryId.message}</p>
            ) : null}
          </label>

          <label className="block text-sm text-slate-600">
            SKU
            <input
              {...register('sku')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
            {submitError && !errors.name && !errors.sku ? (
              <p className="mt-2 text-rose-600">{submitError}</p>
            ) : null}
          </label>

          <div className="block text-sm text-slate-600">
            <span>Harga Jual*</span>
            <div className="mt-2">
              <CurrencyInput
                value={Number.isFinite(watchedPrice) ? watchedPrice : 0}
                onChange={(next) => {
                  setValue('price', next, { shouldDirty: true, shouldValidate: true });
                  syncPriceValidation();
                }}
                maxAmount={MAX_CURRENCY_AMOUNT}
                inputClassName={cn(
                  'bg-slate-50',
                  isPriceBelowCost && 'border-rose-400 bg-rose-50 focus:border-rose-500'
                )}
              />
            </div>
            {priceFieldError ? (
              <p className="mt-2 text-sm text-rose-600" role="alert">
                {priceFieldError}
              </p>
            ) : null}
            {!isPriceBelowCost ? (
              <p className="mt-1 text-xs text-slate-500">
                Maks. {formatCurrency(MAX_CURRENCY_AMOUNT)}
              </p>
            ) : null}
          </div>

          <div className="block text-sm text-slate-600">
            <span>Harga Modal</span>
            <div className="mt-2">
              <CurrencyInput
                value={
                  Number.isFinite(watchedCostPrice) && (watchedCostPrice as number) > 0
                    ? (watchedCostPrice as number)
                    : 0
                }
                onChange={(next) => {
                  setValue('costPrice', next === 0 ? Number.NaN : next, {
                    shouldDirty: true,
                    shouldValidate: true
                  });
                  syncPriceValidation();
                }}
                maxAmount={MAX_CURRENCY_AMOUNT}
                inputClassName={cn(
                  'bg-slate-50',
                  isPriceBelowCost && 'border-rose-400 bg-rose-50 focus:border-rose-500'
                )}
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">Opsional. Kosongkan jika belum diisi.</p>
            {costPriceFieldError ? (
              <p className="mt-2 text-sm text-rose-600" role="alert">
                {costPriceFieldError}
              </p>
            ) : null}
          </div>

          {isPriceBelowCost && effectiveCostPrice !== null ? (
            <div
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 sm:col-span-2"
              role="alert"
            >
              <p className="text-sm font-medium text-rose-700">{PRICE_VS_COST_MESSAGE}</p>
              <p className="mt-1 text-sm text-rose-600">
                Harga modal {formatCurrency(effectiveCostPrice)} — naikkan harga jual atau turunkan
                harga modal sebelum menyimpan.
              </p>
            </div>
          ) : null}

          <div className="block text-sm text-slate-600">
            <span>Stok{isEditing ? '' : '*'}</span>
            {isEditing ? (
              <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-100 px-4 py-3">
                <p className="font-medium text-slate-900">
                  {Number.isFinite(watchedStock) ? watchedStock : 0}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Stok tidak bisa diubah dari sini. Gunakan{' '}
                  <Link href="/dashboard/stok" className="font-medium text-amber-700 underline">
                    Penyesuaian Stok
                  </Link>{' '}
                  untuk menambah atau mengurangi stok.
                </p>
              </div>
            ) : (
              <div className="mt-2">
                <QuantityStepper
                  value={Number.isFinite(watchedStock) ? watchedStock : 0}
                  onChange={(next) =>
                    setValue('stock', next, { shouldDirty: true, shouldValidate: true })
                  }
                  min={0}
                  ariaLabel="Stok produk"
                />
              </div>
            )}
            {errors.stock ? <p className="mt-2 text-rose-600">{errors.stock.message}</p> : null}
          </div>

          <div className="block text-sm text-slate-600">
            <span>Stok Minimum</span>
            <div className="mt-2">
              <QuantityStepper
                value={Number.isFinite(watchedMinStock) ? watchedMinStock : 0}
                onChange={(next) =>
                  setValue('minStock', next, { shouldDirty: true, shouldValidate: true })
                }
                min={0}
                ariaLabel="Stok minimum"
              />
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Notifikasi stok menipis muncul saat stok di bawah nilai ini.
            </p>
          </div>

          <label className="block text-sm text-slate-600">
            Satuan
            <input
              {...register('unit')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
          </label>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2">
            <p className="text-sm font-medium text-slate-900">Gambar Produk</p>
            <p className="mt-1 text-sm text-slate-500">
              Upload file gambar. Sistem akan menyimpan URL gambar di database dan memakainya
              otomatis untuk menampilkan preview produk.
            </p>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => {
                const file = event.target.files?.[0] || null;

                if (!file) {
                  setImageFile(null);
                  setImageError(null);
                  return;
                }

                const validationMessage = validateProductImageFile(file);

                if (validationMessage) {
                  setImageFile(null);
                  setImageError(validationMessage);
                  event.target.value = '';
                  return;
                }

                setImageError(null);
                setImageFile(file);
              }}
              className="mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-950 file:px-4 file:py-3 file:font-semibold file:text-white"
            />
            {imageError ? <p className="mt-2 text-sm text-rose-600">{imageError}</p> : null}
            {imagePreviewUrl ? (
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview produk"
                    className="h-24 w-24 rounded-2xl object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-900">Preview gambar</p>
                    <p className="mt-1 text-xs text-slate-500">
                    {imageFile
                      ? imageFile.name
                      : imagePreviewUrl
                        ? 'Gambar produk dari AWS/S3'
                        : 'Gambar produk saat ini'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-slate-900">Status aktif</p>
              <p className="mt-1 text-sm text-slate-500">
                {watchedIsActive
                  ? 'Produk tampil di POS dan dapat dijual.'
                  : 'Produk nonaktif tidak akan tampil di POS.'}
              </p>
            </div>
            <Controller
              name="isActive"
              control={control}
              render={({ field: { value, onChange, onBlur, name, ref } }) => (
                <label className="inline-flex items-center gap-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    name={name}
                    ref={ref}
                    onBlur={onBlur}
                    checked={Boolean(value)}
                    onChange={(event) => onChange(event.target.checked)}
                    className="h-5 w-5 rounded border-slate-300"
                  />
                  {value ? 'Aktif' : 'Nonaktif'}
                </label>
              )}
            />
          </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:flex-row sm:px-6">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isPriceBelowCost}
              className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Menyimpan...' : initialProduct ? 'Simpan Perubahan' : 'Tambah Produk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isSubmitting: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

const ConfirmDialog = ({
  isOpen,
  title,
  description,
  confirmLabel,
  isSubmitting,
  onClose,
  onConfirm
}: ConfirmDialogProps) => {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur">
      <div className="w-full rounded-t-[28px] border border-slate-200 bg-white p-5 sm:max-w-md sm:rounded-[28px] sm:p-6">
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-3 text-sm text-slate-600">{description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
          >
            Batal
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => void onConfirm()}
            className="flex-1 rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isSubmitting ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default function DashboardProdukPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProductStatusFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<number | 'all'>('all');
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productToDisable, setProductToDisable] = useState<Product | null>(null);
  const [productFormError, setProductFormError] = useState<string | null>(null);
  const [isCategoryOpen, setIsCategoryOpen] = useState(true);
  const [editingCategoryId, setEditingCategoryId] = useState<number | null>(null);
  const [categoryDraft, setCategoryDraft] = useState<CategoryFormValues>({
    name: '',
    description: ''
  });
  const [newCategory, setNewCategory] = useState<CategoryFormValues>({
    name: '',
    description: ''
  });
  const debouncedSearch = useDebouncedValue(search, 300);

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/categories');
      return data;
    }
  });

  const productsQuery = useQuery({
    queryKey: ['products', page, debouncedSearch, categoryFilter, statusFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        limit: 10
      };

      if (debouncedSearch) {
        params.q = debouncedSearch;
      }

      if (categoryFilter !== 'all') {
        params.categoryId = categoryFilter;
      }

      if (statusFilter !== 'all') {
        params.isActive = statusFilter === 'active';
      }

      const { data } = await api.get<ProductListResponse>('/products', { params });
      return data;
    }
  });

  useEffect(() => {
    setPage(1);
  }, [categoryFilter, debouncedSearch, statusFilter]);

  const invalidateCatalog = async () => {
    await queryClient.invalidateQueries({ queryKey: ['products'] });
    await queryClient.invalidateQueries({ queryKey: ['categories'] });
  };

  const saveProductMutation = useMutation({
    mutationFn: async ({
      values,
      imageFile
    }: {
      values: ProductFormValues;
      imageFile: File | null;
    }) => {
      const payload = {
        ...values,
        name: values.name.trim(),
        isActive: Boolean(values.isActive),
        sku: values.sku?.trim() || undefined,
        costPrice: Number.isNaN(values.costPrice) ? undefined : values.costPrice
      };

      let savedProduct: Product;

      if (selectedProduct) {
        const { data } = await api.put<Product>(`/products/${selectedProduct.id}`, payload);
        savedProduct = data;
      } else {
        const { data } = await api.post<Product>('/products', payload);
        savedProduct = data;
      }

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);

        const { data } = await api.post<Product>(`/products/${savedProduct.id}/image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        return data;
      }

      return savedProduct;
    },
    onSuccess: async () => {
      setProductFormError(null);
      toast.success(selectedProduct ? 'Produk diperbarui' : 'Produk ditambahkan');
      setIsProductModalOpen(false);
      setSelectedProduct(null);
      await invalidateCatalog();
    },
    onError: (error) => {
      const nameErrorMessage = getNameErrorMessage(error);

      if (nameErrorMessage) {
        setProductFormError(nameErrorMessage);
        toast.error(nameErrorMessage);
        return;
      }

      const skuErrorMessage = getSkuErrorMessage(error);

      if (skuErrorMessage) {
        setProductFormError(skuErrorMessage);
        toast.error(skuErrorMessage);
        return;
      }

      setProductFormError(null);
      toast.error(getErrorMessage(error, 'Gagal menyimpan produk'));
    }
  });

  const disableProductMutation = useMutation({
    mutationFn: async () => {
      if (!productToDisable) {
        return;
      }

      await api.delete(`/products/${productToDisable.id}`);
    },
    onSuccess: async () => {
      toast.success('Produk dinonaktifkan');
      setProductToDisable(null);
      await invalidateCatalog();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Gagal menonaktifkan produk'));
    }
  });

  const createCategoryMutation = useMutation({
    mutationFn: async (values: CategoryFormValues) => {
      const parsed = categorySchema.parse(values);
      const { data } = await api.post<Category>('/categories', parsed);
      return data;
    },
    onSuccess: async () => {
      toast.success('Kategori ditambahkan');
      setNewCategory({ name: '', description: '' });
      await invalidateCatalog();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Gagal menambah kategori'));
    }
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (payload: { id: number; values: CategoryFormValues }) => {
      const parsed = categorySchema.parse(payload.values);
      const { data } = await api.put<Category>(`/categories/${payload.id}`, parsed);
      return data;
    },
    onSuccess: async () => {
      toast.success('Kategori diperbarui');
      setEditingCategoryId(null);
      await invalidateCatalog();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Gagal memperbarui kategori'));
    }
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async (categoryId: number) => {
      await api.delete(`/categories/${categoryId}`);
    },
    onSuccess: async () => {
      toast.success('Kategori dihapus');
      await invalidateCatalog();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Gagal menghapus kategori'));
    }
  });

  const startEditCategory = (category: Category) => {
    setEditingCategoryId(category.id);
    setCategoryDraft({
      name: category.name,
      description: category.description || ''
    });
  };

  const productRows = productsQuery.data?.data || [];

  return (
    <AuthGuard allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Produk</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  Manajemen produk dan kategori
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Kelola katalog produk untuk POS dan dashboard operasional.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setProductFormError(null);
                  setSelectedProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Tambah Produk
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1.4fr_0.9fr_0.8fr]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Cari nama atau SKU"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(event) =>
                  setCategoryFilter(
                    event.target.value === 'all' ? 'all' : Number(event.target.value)
                  )
                }
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              >
                <option value="all">Semua kategori</option>
                {categoriesQuery.data?.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ProductStatusFilter)}
                className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              >
                <option value="all">Semua status</option>
                <option value="active">Aktif</option>
                <option value="inactive">Nonaktif</option>
              </select>
            </div>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
              {/* Mobile & tablet card view */}
              <div className="lg:hidden divide-y divide-slate-200">
                {productsQuery.isLoading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="px-4 py-4">
                        <div className="h-12 animate-pulse rounded-2xl bg-slate-100" />
                      </div>
                    ))
                  : productRows.map((product) => (
                      <div key={product.id} className="flex items-start gap-3 px-4 py-4">
                        {toAbsoluteImageUrl(product.imageUrl) ? (
                          <img
                            src={toAbsoluteImageUrl(product.imageUrl) || undefined}
                            alt={product.name}
                            className="h-12 w-12 shrink-0 rounded-2xl object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 shrink-0 rounded-2xl bg-slate-100" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 font-medium text-slate-900">{product.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {product.category?.name || '-'} · {formatCurrency(product.price)}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <span
                              className={`text-xs font-medium ${
                                product.stock <= product.minStock ? 'text-rose-600' : 'text-slate-600'
                              }`}
                            >
                              Stok {product.stock}
                            </span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                product.isActive
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-slate-200 text-slate-600'
                              }`}
                            >
                              {product.isActive ? 'Aktif' : 'Nonaktif'}
                            </span>
                          </div>
                        </div>
                        <div className="flex shrink-0 flex-col gap-2 min-[360px]:flex-row">
                            <button
                              type="button"
                              aria-label={`Edit ${product.name}`}
                              title="Edit produk"
                              onClick={() => {
                                setProductFormError(null);
                                setSelectedProduct(product);
                                setIsProductModalOpen(true);
                              }}
                              className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              aria-label={`Nonaktifkan ${product.name}`}
                              title="Nonaktifkan produk"
                              onClick={() => setProductToDisable(product)}
                              className="rounded-xl border border-slate-200 p-2 text-rose-600 transition hover:bg-rose-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                      </div>
                    ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-4">SKU</th>
                      <th className="px-4 py-4">Nama</th>
                      <th className="px-4 py-4">Gambar</th>
                      <th className="px-4 py-4">Kategori</th>
                      <th className="px-4 py-4">Harga Jual</th>
                      <th className="px-4 py-4">Stok</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {productsQuery.isLoading
                      ? Array.from({ length: 6 }).map((_, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4" colSpan={8}>
                              <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                            </td>
                          </tr>
                        ))
                      : productRows.map((product) => (
                          <tr key={product.id}>
                            <td className="px-4 py-4 text-slate-500">{product.sku || '-'}</td>
                            <td className="px-4 py-4 font-medium text-slate-900">
                              {product.name}
                            </td>
                            <td className="px-4 py-4">
                              {toAbsoluteImageUrl(product.imageUrl) ? (
                                <img
                                  src={toAbsoluteImageUrl(product.imageUrl) || undefined}
                                  alt={product.name}
                                  className="h-12 w-12 rounded-2xl object-contain bg-slate-50 p-0.5"
                                />
                              ) : (
                                <div className="h-12 w-12 rounded-2xl bg-slate-100" />
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {product.category?.name || '-'}
                            </td>
                            <td className="px-4 py-4 text-slate-900">
                              {formatCurrency(product.price)}
                            </td>
                            <td
                              className={`px-4 py-4 font-medium ${
                                product.stock <= product.minStock
                                  ? 'text-rose-600'
                                  : 'text-slate-700'
                              }`}
                            >
                              {product.stock}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  product.isActive
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {product.isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
                                    aria-label={`Edit ${product.name}`}
                                    title="Edit produk"
                                    onClick={() => {
                                      setProductFormError(null);
                                      setSelectedProduct(product);
                                      setIsProductModalOpen(true);
                                    }}
                                    className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label={`Nonaktifkan ${product.name}`}
                                    title="Nonaktifkan produk"
                                    onClick={() => setProductToDisable(product)}
                                    className="rounded-xl border border-slate-200 p-2 text-rose-600 transition hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Menampilkan halaman {productsQuery.data?.page || 1} dari{' '}
                {productsQuery.data?.totalPages || 1}
              </p>
              <div className="grid grid-cols-2 gap-3 sm:flex">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={page >= (productsQuery.data?.totalPages || 1)}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <button
                type="button"
                onClick={() => setIsCategoryOpen((value) => !value)}
                className="flex w-full items-center justify-between"
              >
                <div className="text-left">
                  <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Kategori</p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">
                    Manajemen Kategori
                  </h2>
                </div>
                <ChevronDown
                  className={`h-5 w-5 text-slate-500 transition ${
                    isCategoryOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {isCategoryOpen ? (
                <div className="mt-6 space-y-4">
                  <div className="space-y-3">
                    {categoriesQuery.data?.map((category) => (
                      <div
                        key={category.id}
                        className="rounded-[24px] border border-slate-200 bg-slate-50 p-4"
                      >
                        {editingCategoryId === category.id ? (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_auto]">
                            <input
                              value={categoryDraft.name}
                              onChange={(event) =>
                                setCategoryDraft((current) => ({
                                  ...current,
                                  name: event.target.value
                                }))
                              }
                              placeholder="Nama kategori"
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                            />
                            <input
                              value={categoryDraft.description}
                              onChange={(event) =>
                                setCategoryDraft((current) => ({
                                  ...current,
                                  description: event.target.value
                                }))
                              }
                              placeholder="Deskripsi"
                              className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                            />
                            <div className="flex flex-col gap-2 min-[360px]:flex-row">
                              <button
                                type="button"
                                onClick={() =>
                                  updateCategoryMutation.mutate({
                                    id: category.id,
                                    values: categoryDraft
                                  })
                                }
                                className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                              >
                                Simpan
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingCategoryId(null)}
                                className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                              >
                                Batal
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="font-medium text-slate-900">{category.name}</p>
                              <p className="mt-1 text-sm text-slate-500">
                                {category.description || 'Tanpa deskripsi'}
                              </p>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => startEditCategory(category)}
                                className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-white"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  const confirmed = window.confirm(
                                    'Apakah Anda yakin ingin menghapus kategori ini?'
                                  );

                                  if (confirmed) {
                                    deleteCategoryMutation.mutate(category.id);
                                  }
                                }}
                                className="rounded-xl border border-slate-200 p-2 text-rose-600 transition hover:bg-rose-50"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Tambah Kategori</p>
                    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_auto]">
                      <input
                        value={newCategory.name}
                        onChange={(event) =>
                          setNewCategory((current) => ({
                            ...current,
                            name: event.target.value
                          }))
                        }
                        placeholder="Nama kategori"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                      />
                      <input
                        value={newCategory.description}
                        onChange={(event) =>
                          setNewCategory((current) => ({
                            ...current,
                            description: event.target.value
                          }))
                        }
                        placeholder="Deskripsi"
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-3 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => createCategoryMutation.mutate(newCategory)}
                        className="rounded-2xl bg-amber-400 px-4 py-3 text-sm font-semibold text-slate-950"
                      >
                        Simpan
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
        </div>

        <>
          <ProductFormModal
              categories={categoriesQuery.data || []}
              initialProduct={selectedProduct}
              isOpen={isProductModalOpen}
              isSubmitting={saveProductMutation.isPending}
              submitError={productFormError}
              onClose={() => {
                setProductFormError(null);
                setIsProductModalOpen(false);
                setSelectedProduct(null);
              }}
              onSubmit={async (values, imageFile) => {
                await saveProductMutation.mutateAsync({ values, imageFile });
              }}
            />

            <ConfirmDialog
              isOpen={Boolean(productToDisable)}
              title="Nonaktifkan produk"
              description="Apakah Anda yakin ingin menonaktifkan produk ini?"
              confirmLabel="Nonaktifkan"
              isSubmitting={disableProductMutation.isPending}
              onClose={() => setProductToDisable(null)}
              onConfirm={async () => {
                await disableProductMutation.mutateAsync();
              }}
            />
        </>
      </DashboardLayout>
    </AuthGuard>
  );
}
