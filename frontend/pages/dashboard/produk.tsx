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
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { AuthGuard } from '../../components/AuthGuard';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatCurrency } from '../../lib/format';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import { Category, Product, ProductListResponse } from '../../types/product';

const productSchema = z.object({
  name: z.string().min(1, 'Nama produk wajib diisi'),
  categoryId: z.coerce.number().min(1, 'Kategori wajib dipilih'),
  sku: z.string().optional(),
  price: z.coerce.number().positive('Harga jual harus lebih besar dari 0'),
  costPrice: z.union([z.coerce.number().min(0), z.nan()]).optional(),
  stock: z.coerce.number().int().min(0, 'Stok tidak boleh negatif'),
  minStock: z.coerce.number().int().min(0, 'Stok minimum tidak boleh negatif'),
  unit: z.string().min(1, 'Satuan wajib diisi'),
  isActive: z.boolean()
});

const categorySchema = z.object({
  name: z.string().min(1, 'Nama kategori wajib diisi'),
  description: z.string().optional()
});

type ProductFormValues = z.infer<typeof productSchema>;
type CategoryFormValues = z.infer<typeof categorySchema>;

type ProductStatusFilter = 'all' | 'active' | 'inactive';

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

const formatRupiahInput = (value: number | string | undefined) => {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '';
  }

  return new Intl.NumberFormat('id-ID').format(numericValue);
};

const parseRupiahInput = (value: string) => {
  const digitsOnly = value.replace(/\D/g, '');

  if (!digitsOnly) {
    return '';
  }

  return Number(digitsOnly);
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
    watch,
    formState: { errors }
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: emptyProductValues
  });
  const watchedPrice = watch('price');
  const watchedCostPrice = watch('costPrice');
  const [priceInput, setPriceInput] = useState('');
  const [costPriceInput, setCostPriceInput] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState('');

  useEffect(() => {
    if (!isOpen) {
      reset(emptyProductValues);
      setImageFile(null);
      setImagePreviewUrl('');
      return;
    }

    if (!initialProduct) {
      reset(emptyProductValues);
      setImageFile(null);
      setImagePreviewUrl('');
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
    setImagePreviewUrl(initialProduct.imageUrl || '');
  }, [initialProduct, isOpen, reset]);

  useEffect(() => {
    setPriceInput(formatRupiahInput(watchedPrice));
  }, [watchedPrice]);

  useEffect(() => {
    setCostPriceInput(formatRupiahInput(watchedCostPrice));
  }, [watchedCostPrice]);

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
    <div className="fixed inset-0 z-50 flex items-end overflow-y-auto bg-slate-950/70 p-0 backdrop-blur sm:items-center sm:justify-center sm:p-6">
      <div className="flex max-h-[100dvh] w-full flex-col rounded-t-[28px] border border-slate-200 bg-white sm:max-h-[min(90dvh,56rem)] sm:max-w-3xl sm:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
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
          onSubmit={handleSubmit(async (values) => onSubmit(values, imageFile))}
          className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2 sm:p-6"
        >
          <label className="block text-sm text-slate-600">
            Nama Produk*
            <input
              {...register('name')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
            {errors.name ? <p className="mt-2 text-rose-600">{errors.name.message}</p> : null}
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
            {submitError ? <p className="mt-2 text-rose-600">{submitError}</p> : null}
          </label>

          <label className="block text-sm text-slate-600">
            Harga Jual*
            <input
              inputMode="numeric"
              value={priceInput}
              onChange={(event) => {
                const parsedValue = parseRupiahInput(event.target.value);
                setPriceInput(formatRupiahInput(parsedValue));
                setValue('price', parsedValue === '' ? 0 : parsedValue, {
                  shouldDirty: true,
                  shouldValidate: true
                });
              }}
              placeholder="Rp 0"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
            {errors.price ? <p className="mt-2 text-rose-600">{errors.price.message}</p> : null}
          </label>

          <label className="block text-sm text-slate-600">
            Harga Modal
            <input
              inputMode="numeric"
              value={costPriceInput}
              onChange={(event) => {
                const parsedValue = parseRupiahInput(event.target.value);
                setCostPriceInput(formatRupiahInput(parsedValue));
                setValue('costPrice', parsedValue === '' ? Number.NaN : parsedValue, {
                  shouldDirty: true,
                  shouldValidate: true
                });
              }}
              placeholder="Rp 0"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
          </label>

          <label className="block text-sm text-slate-600">
            Stok*
            <input
              type="number"
              min={0}
              {...register('stock')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
            {errors.stock ? <p className="mt-2 text-rose-600">{errors.stock.message}</p> : null}
          </label>

          <label className="block text-sm text-slate-600">
            Stok Minimum
            <input
              type="number"
              min={0}
              {...register('minStock')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
          </label>

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
              onChange={(event) => setImageFile(event.target.files?.[0] || null)}
              className="mt-4 block w-full text-sm text-slate-600 file:mr-4 file:rounded-2xl file:border-0 file:bg-slate-950 file:px-4 file:py-3 file:font-semibold file:text-white"
            />
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
                      {imageFile ? imageFile.name : 'Gambar produk saat ini'}
                    </p>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:col-span-2">
            <div>
              <p className="text-sm font-medium text-slate-900">Status aktif</p>
              <p className="mt-1 text-sm text-slate-500">
                Produk nonaktif tidak akan tampil di POS.
              </p>
            </div>
            <input type="checkbox" {...register('isActive')} className="h-5 w-5" />
          </label>

          <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white pt-4 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
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
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-slate-900">{title}</h3>
        <p className="mt-3 text-sm text-slate-600">{description}</p>
        <div className="mt-6 flex gap-3">
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
  const { user } = useAuthStore();
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
  const isManagerView = user?.role === 'manager';

  return (
    <AuthGuard allowedRoles={['admin', 'manager']}>
      <DashboardLayout>
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Produk</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  {isManagerView ? 'Katalog produk' : 'Manajemen produk dan kategori'}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  {isManagerView
                    ? 'Lihat daftar produk, harga, gambar, dan status stok dalam mode baca.'
                    : 'Kelola katalog produk untuk POS dan dashboard operasional.'}
                </p>
              </div>

              {!isManagerView ? (
                <button
                  type="button"
                  onClick={() => {
                    setProductFormError(null);
                    setSelectedProduct(null);
                    setIsProductModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Tambah Produk
                </button>
              ) : null}
            </div>

            <div className="mt-6 grid gap-3 lg:grid-cols-[1.4fr_0.9fr_0.8fr]">
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
              <div className="overflow-x-auto">
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
                      {!isManagerView ? <th className="px-4 py-4 text-right">Aksi</th> : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {productsQuery.isLoading
                      ? Array.from({ length: 6 }).map((_, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4" colSpan={isManagerView ? 7 : 8}>
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
                              {product.imageUrl ? (
                                <div className="flex items-center">
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="h-12 w-12 rounded-2xl object-cover"
                                  />
                                </div>
                              ) : (
                                <span className="text-slate-400">Belum ada</span>
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
                            {!isManagerView ? (
                              <td className="px-4 py-4">
                                <div className="flex justify-end gap-2">
                                  <button
                                    type="button"
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
                                    onClick={() => setProductToDisable(product)}
                                    className="rounded-xl border border-slate-200 p-2 text-rose-600 transition hover:bg-rose-50"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </button>
                                </div>
                              </td>
                            ) : null}
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Menampilkan halaman {productsQuery.data?.page || 1} dari{' '}
                {productsQuery.data?.totalPages || 1}
              </p>
              <div className="flex gap-3">
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

          {!isManagerView ? (
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
                          <div className="grid gap-3 lg:grid-cols-[1fr_1.2fr_auto]">
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
                            <div className="flex gap-2">
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
                            <div className="flex gap-2">
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
                    <div className="mt-4 grid gap-3 lg:grid-cols-[1fr_1.2fr_auto]">
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
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        {!isManagerView ? (
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
        ) : null}
      </DashboardLayout>
    </AuthGuard>
  );
}
