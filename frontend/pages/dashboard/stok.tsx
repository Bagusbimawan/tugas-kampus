import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AlertTriangle, Boxes, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { AuthGuard } from '../../components/AuthGuard';
import { PositiveQuantityInput } from '../../components/common/PositiveQuantityInput';
import { SummaryCard } from '../../components/dashboard/SummaryCard';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatCurrency } from '../../lib/format';
import { getDateRangeError } from '../../lib/validation';
import { api } from '../../services/api';
import { Product, ProductListResponse } from '../../types/product';

interface StockLogItem {
  id: number;
  productId: number;
  userId: number;
  type: 'in' | 'out' | 'adjustment';
  qtyBefore: number;
  qtyChange: number;
  qtyAfter: number;
  reason: string;
  createdAt: string;
  product?: {
    id: number;
    name: string;
    sku?: string | null;
  };
  user?: {
    id: number;
    name: string;
  };
}

interface StockLogResponse {
  data: StockLogItem[];
  total: number;
  page: number;
  totalPages: number;
}

const adjustmentFormSchema = z.object({
  productId: z.coerce.number().min(1, 'Produk wajib dipilih'),
  type: z.enum(['in', 'adjustment']),
  direction: z.enum(['add', 'reduce']),
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1'),
  reason: z.string().min(1, 'Alasan wajib diisi')
});

type AdjustmentFormValues = z.infer<typeof adjustmentFormSchema>;

const toAdjustmentPayload = (values: AdjustmentFormValues) => {
  const qtyChange =
    values.type === 'in' || values.direction === 'add' ? values.quantity : -values.quantity;

  return {
    productId: values.productId,
    type: values.type,
    qtyChange,
    reason: values.reason
  };
};

const getLocalDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultLogRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  return {
    startDate: getLocalDateInput(start),
    endDate: getLocalDateInput(end)
  };
};

const getLogTypeLabel = (type: StockLogItem['type']) => {
  if (type === 'in') {
    return 'Masuk';
  }
  if (type === 'out') {
    return 'Keluar';
  }
  return 'Penyesuaian';
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
};

interface AdjustmentModalProps {
  isOpen: boolean;
  products: Product[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: AdjustmentFormValues) => Promise<void>;
}

const AdjustmentModal = ({
  isOpen,
  products,
  isSubmitting,
  onClose,
  onSubmit
}: AdjustmentModalProps) => {
  const activeProducts = useMemo(
    () => products.filter((product) => product.isActive),
    [products]
  );

  const {
    register,
    reset,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentFormSchema),
    defaultValues: {
      productId: 0,
      type: 'in',
      direction: 'add',
      quantity: 1,
      reason: ''
    }
  });

  const adjustmentType = watch('type');
  const direction = watch('direction');
  const quantity = watch('quantity');
  const rawProductId = watch('productId');
  const selectedProductId = Number(rawProductId) || 0;

  const selectedProduct =
    selectedProductId > 0
      ? activeProducts.find((product) => product.id === selectedProductId)
      : undefined;
  const hasSelectedProduct = Boolean(selectedProduct);
  const maxReduceQty = selectedProduct ? Number(selectedProduct.stock) : 0;
  const isReduceMode = adjustmentType === 'adjustment' && direction === 'reduce';
  const quantityMax = isReduceMode && selectedProduct ? maxReduceQty : undefined;

  const projectedStock = selectedProduct
    ? selectedProduct.stock +
      (adjustmentType === 'in' || direction === 'add' ? quantity : -quantity)
    : null;

  useEffect(() => {
    if (adjustmentType === 'in') {
      setValue('direction', 'add', { shouldValidate: true });
    }
  }, [adjustmentType, setValue]);

  useEffect(() => {
    if (quantity < 1) {
      setValue('quantity', 1, { shouldValidate: true });
    } else if (quantityMax !== undefined && quantity > quantityMax) {
      setValue('quantity', Math.max(1, quantityMax), { shouldValidate: true });
    }
  }, [quantity, quantityMax, setValue]);

  useEffect(() => {
    if (!isOpen) {
      reset({
        productId: 0,
        type: 'in',
        direction: 'add',
        quantity: 1,
        reason: ''
      });
    }
  }, [isOpen, reset]);

  if (!isOpen) {
    return null;
  }

  const handleFormSubmit = handleSubmit(async (values) => {
    if (
      values.type === 'adjustment' &&
      values.direction === 'reduce' &&
      selectedProduct &&
      values.quantity > selectedProduct.stock
    ) {
      toast.error(`Pengurangan maksimal ${selectedProduct.stock} unit`);
      return;
    }

    await onSubmit(values);
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/70 p-0 backdrop-blur sm:items-center sm:p-4 md:p-6">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="adjustment-modal-title"
        className="flex max-h-[min(100dvh,100%)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[28px] border border-slate-200 bg-white shadow-2xl sm:max-h-[90dvh] sm:rounded-[28px]"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-6">
          <div className="min-w-0 pr-2">
            <p className="text-[10px] uppercase tracking-[0.28em] text-amber-600 sm:text-xs sm:tracking-[0.35em]">
              Penyesuaian
            </p>
            <h3
              id="adjustment-modal-title"
              className="mt-1 text-lg font-semibold leading-snug text-slate-900 sm:text-xl"
            >
              Penyesuaian stok produk
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="shrink-0 rounded-2xl border border-slate-200 p-2 text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={(event) => event.preventDefault()}
          className="flex min-h-0 flex-1 flex-col"
        >
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
            <label className="block text-sm text-slate-600">
              Produk*
              <select
                {...register('productId', { valueAsNumber: true })}
                className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none sm:px-4 sm:text-base"
              >
                <option value={0}>Pilih produk aktif</option>
                {activeProducts.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name} — stok: {product.stock}
                  </option>
                ))}
              </select>
              <p className="mt-2 text-xs text-slate-500">Hanya menampilkan produk aktif.</p>
              {errors.productId ? (
                <p className="mt-2 text-rose-600">{errors.productId.message}</p>
              ) : null}
            </label>

            <div className="block text-sm text-slate-600">
              <span>Tipe perubahan*</span>
              <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                <button
                  type="button"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => setValue('type', 'in', { shouldDirty: true, shouldValidate: true })}
                  className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition sm:px-4 ${
                    adjustmentType === 'in'
                      ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  Stok Masuk
                  <span className="mt-1 block text-xs font-normal leading-snug opacity-80">
                    Restock / supplier
                  </span>
                </button>
                <button
                  type="button"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() =>
                    setValue('type', 'adjustment', { shouldDirty: true, shouldValidate: true })
                  }
                  className={`rounded-2xl border px-3 py-3 text-left text-sm font-semibold transition sm:px-4 ${
                    adjustmentType === 'adjustment'
                      ? 'border-amber-600 bg-amber-50 text-amber-900'
                      : 'border-slate-200 bg-slate-50 text-slate-700'
                  }`}
                >
                  Penyesuaian
                  <span className="mt-1 block text-xs font-normal leading-snug opacity-80">
                    Koreksi stok
                  </span>
                </button>
              </div>
            </div>

            {adjustmentType === 'adjustment' ? (
              <div className="block text-sm text-slate-600">
                <span>Arah penyesuaian*</span>
                <div className="mt-2 grid grid-cols-1 gap-2 min-[420px]:grid-cols-2">
                  <button
                    type="button"
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() =>
                      setValue('direction', 'add', { shouldDirty: true, shouldValidate: true })
                    }
                    className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition sm:px-4 ${
                      direction === 'add'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    Tambah stok
                  </button>
                  <button
                    type="button"
                    onPointerDown={(event) => event.preventDefault()}
                    onClick={() =>
                      setValue('direction', 'reduce', { shouldDirty: true, shouldValidate: true })
                    }
                    disabled={!hasSelectedProduct || maxReduceQty === 0}
                    className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40 sm:px-4 ${
                      direction === 'reduce'
                        ? 'border-rose-600 bg-rose-50 text-rose-800'
                        : 'border-slate-200 bg-slate-50 text-slate-700'
                    }`}
                  >
                    Kurangi stok
                  </button>
                </div>
                {!hasSelectedProduct ? (
                  <p className="mt-2 text-xs text-slate-500">Pilih produk terlebih dahulu.</p>
                ) : maxReduceQty === 0 ? (
                  <p className="mt-2 text-xs text-rose-600">
                    Stok produk ini sudah 0, tidak bisa dikurangi.
                  </p>
                ) : direction === 'reduce' ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Maksimal pengurangan: {maxReduceQty} unit.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="block text-sm text-slate-600">
              <span>
                {adjustmentType === 'in'
                  ? 'Jumlah stok masuk*'
                  : direction === 'add'
                    ? 'Jumlah penambahan*'
                    : 'Jumlah pengurangan*'}
              </span>
              <div className="mt-2">
                <PositiveQuantityInput
                  value={Number.isFinite(quantity) ? quantity : 1}
                  onChange={(next) =>
                    setValue('quantity', next, { shouldDirty: true, shouldValidate: true })
                  }
                  min={1}
                  max={quantityMax}
                  unit="unit"
                  ariaLabel="Jumlah stok"
                />
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                Pilih jumlah cepat, ketik langsung, atau tekan tombol plus untuk menambah 1.
              </p>
              {selectedProduct && projectedStock !== null ? (
                <p
                  className={`mt-2 rounded-2xl px-3 py-2.5 text-xs font-medium leading-relaxed ${
                    projectedStock < 0
                      ? 'bg-rose-50 text-rose-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  <span className="block sm:inline">
                    Stok saat ini: <strong>{selectedProduct.stock}</strong>
                  </span>
                  <span className="hidden sm:inline"> → </span>
                  <span className="block sm:inline">
                    Setelah perubahan: <strong>{Math.max(0, projectedStock)}</strong>
                  </span>
                  {projectedStock < 0 ? (
                    <span className="mt-1 block text-rose-600">Melebihi stok tersedia</span>
                  ) : null}
                </p>
              ) : null}
              {errors.quantity ? (
                <p className="mt-2 text-rose-600">{errors.quantity.message}</p>
              ) : null}
            </div>

            <label className="block text-sm text-slate-600">
              Alasan*
              <textarea
                rows={4}
                {...register('reason')}
                className="mt-2 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none sm:px-4 sm:text-base"
              />
              {errors.reason ? (
                <p className="mt-2 text-rose-600">{errors.reason.message}</p>
              ) : null}
            </label>
          </div>

          <div className="flex shrink-0 flex-col gap-2 border-t border-slate-200 bg-white px-4 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:flex-row sm:gap-3 sm:px-6 sm:py-4">
            <button
              type="button"
              onClick={onClose}
              className="order-2 flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 sm:order-1"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={isSubmitting}
              onPointerDown={(event) => event.preventDefault()}
              onClick={handleFormSubmit}
              className="order-1 flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60 sm:order-2"
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Penyesuaian'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function DashboardStokPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'in' | 'out' | 'adjustment'>('all');
  const [draftRange, setDraftRange] = useState(getDefaultLogRange);
  const [range, setRange] = useState(getDefaultLogRange);
  const [selectedProductId, setSelectedProductId] = useState<number | 'all'>('all');
  const [isAdjustmentOpen, setIsAdjustmentOpen] = useState(false);
  const debouncedSearch = useDebouncedValue(search, 300);

  const productsQuery = useQuery({
    queryKey: ['stock-products', 'active'],
    queryFn: async () => {
      const { data } = await api.get<ProductListResponse>('/products', {
        params: {
          isActive: 'true',
          limit: 100
        }
      });
      return data.data.filter((product) => product.isActive);
    }
  });

  const activeProducts = productsQuery.data || [];

  const stockAlertQuery = useQuery({
    queryKey: ['stock-alert'],
    queryFn: async () => {
      const { data } = await api.get<Product[]>('/stock/alert');
      return data;
    }
  });

  const stockLogsQuery = useQuery({
    queryKey: ['stock-logs', page, selectedType, selectedProductId, range.startDate, range.endDate],
    queryFn: async () => {
      const params: Record<string, unknown> = {
        page,
        limit: 10,
        startDate: range.startDate,
        endDate: range.endDate
      };

      if (selectedType !== 'all') {
        params.type = selectedType;
      }

      if (selectedProductId !== 'all') {
        params.productId = selectedProductId;
      }

      const { data } = await api.get<StockLogResponse>('/stock/logs', { params });
      return data;
    }
  });

  const adjustmentMutation = useMutation({
    mutationFn: async (values: AdjustmentFormValues) => {
      const { data } = await api.post('/stock/adjustment', toAdjustmentPayload(values));
      return data;
    },
    onSuccess: async () => {
      toast.success('Penyesuaian stok berhasil');
      await queryClient.invalidateQueries({ queryKey: ['stock-alert'] });
      await queryClient.invalidateQueries({ queryKey: ['stock-logs'] });
      await queryClient.invalidateQueries({ queryKey: ['stock-products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      window.setTimeout(() => setIsAdjustmentOpen(false), 120);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Gagal menyesuaikan stok'));
    }
  });

  useEffect(() => {
    setPage(1);
  }, [range.endDate, range.startDate, selectedProductId, selectedType]);

  const filteredAlerts = useMemo(() => {
    const rows = stockAlertQuery.data || [];
    const keyword = debouncedSearch.trim().toLowerCase();

    if (!keyword) {
      return rows;
    }

    return rows.filter((item) => {
      const haystack = `${item.name} ${item.sku || ''} ${item.category?.name || ''}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [debouncedSearch, stockAlertQuery.data]);

  const logRows = stockLogsQuery.data?.data || [];

  return (
    <AuthGuard allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={AlertTriangle}
              label="Produk Kritis"
              value={String(filteredAlerts.filter((item) => item.stock > 0).length)}
              accentClass="bg-amber-100 text-amber-700"
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Produk Habis"
              value={String(filteredAlerts.filter((item) => item.stock === 0).length)}
              accentClass="bg-rose-100 text-rose-700"
            />
            <SummaryCard
              icon={Boxes}
              label="Total Alert"
              value={String(filteredAlerts.length)}
              accentClass="bg-sky-100 text-sky-700"
            />
            <SummaryCard
              icon={Boxes}
              label="Log Stok"
              value={String(stockLogsQuery.data?.total || 0)}
              accentClass="bg-emerald-100 text-emerald-700"
            />
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Stok</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  Monitoring dan adjustment stok
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Pantau stok kritis dan histori perubahan stok produk.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAdjustmentOpen(true)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Penyesuaian Stok
              </button>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Alert</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  Produk stok hampir habis
                </h2>
              </div>
            </div>

            <div className="relative mb-5 max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari produk, SKU, atau kategori"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none"
              />
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200">
              {/* Mobile & tablet card view */}
              <div className="lg:hidden divide-y divide-slate-200">
                {stockAlertQuery.isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="px-4 py-4">
                        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                      </div>
                    ))
                  : filteredAlerts.map((item) => (
                      <div key={item.id} className="flex items-center justify-between px-4 py-4 text-sm">
                        <div className="min-w-0">
                          <p className="line-clamp-2 font-medium text-slate-900">{item.name}</p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            {item.category?.name || '-'} · {formatCurrency(item.price)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">Min {item.minStock}</p>
                        </div>
                        <div className="ml-3 text-right shrink-0">
                          <p className="font-medium text-slate-900">Stok {item.stock}</p>
                          <span
                            className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                              item.stock === 0
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {item.stock === 0 ? 'Habis' : 'Kritis'}
                          </span>
                        </div>
                      </div>
                    ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Produk</th>
                      <th className="px-4 py-4">SKU</th>
                      <th className="px-4 py-4">Kategori</th>
                      <th className="px-4 py-4">Harga</th>
                      <th className="px-4 py-4">Stok</th>
                      <th className="px-4 py-4">Min</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {stockAlertQuery.isLoading
                      ? Array.from({ length: 5 }).map((_, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4" colSpan={7}>
                              <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                            </td>
                          </tr>
                        ))
                      : filteredAlerts.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-4 font-medium text-slate-900">{item.name}</td>
                            <td className="px-4 py-4 text-slate-500">{item.sku || '-'}</td>
                            <td className="px-4 py-4 text-slate-600">
                              {item.category?.name || '-'}
                            </td>
                            <td className="px-4 py-4 text-slate-900">
                              {formatCurrency(item.price)}
                            </td>
                            <td className="px-4 py-4 font-medium text-slate-700">{item.stock}</td>
                            <td className="px-4 py-4 text-slate-600">{item.minStock}</td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  item.stock === 0
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {item.stock === 0 ? 'Habis' : 'Kritis'}
                              </span>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Log</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  Histori perubahan stok
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                <input
                  type="date"
                  value={draftRange.startDate}
                  onChange={(event) =>
                    setDraftRange((current) => ({ ...current, startDate: event.target.value }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  aria-label="Tanggal mulai"
                />
                <input
                  type="date"
                  value={draftRange.endDate}
                  onChange={(event) =>
                    setDraftRange((current) => ({ ...current, endDate: event.target.value }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                  aria-label="Tanggal akhir"
                />
                <select
                  value={selectedType}
                  onChange={(event) =>
                    setSelectedType(
                      event.target.value as 'all' | 'in' | 'out' | 'adjustment'
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                >
                  <option value="all">Semua tipe</option>
                  <option value="in">Masuk</option>
                  <option value="out">Keluar</option>
                  <option value="adjustment">Penyesuaian</option>
                </select>
                <select
                  value={selectedProductId}
                  onChange={(event) =>
                    setSelectedProductId(
                      event.target.value === 'all' ? 'all' : Number(event.target.value)
                    )
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                >
                  <option value="all">Semua produk aktif</option>
                  {activeProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => {
                    const error = getDateRangeError(draftRange.startDate, draftRange.endDate);
                    if (error) {
                      toast.error(error);
                      return;
                    }
                    setRange({ ...draftRange });
                  }}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white sm:col-span-2 xl:col-span-1"
                >
                  Terapkan
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200">
              {/* Mobile & tablet card view */}
              <div className="lg:hidden divide-y divide-slate-200">
                {stockLogsQuery.isLoading
                  ? Array.from({ length: 6 }).map((_, index) => (
                      <div key={index} className="px-4 py-4">
                        <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                      </div>
                    ))
                  : logRows.map((item) => (
                      <div key={item.id} className="px-4 py-4 text-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">
                              {item.product?.name || '-'}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {new Date(item.createdAt).toLocaleString('id-ID')}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500 truncate">{item.reason}</p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-medium text-slate-900">
                              {item.qtyBefore} → {item.qtyAfter}
                              <span className="ml-1 text-xs font-semibold">
                                ({item.qtyChange > 0 ? `+${item.qtyChange}` : item.qtyChange})
                              </span>
                            </p>
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                item.type === 'in'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : item.type === 'out'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {getLogTypeLabel(item.type)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Tanggal</th>
                      <th className="px-4 py-4">Produk</th>
                      <th className="px-4 py-4">User</th>
                      <th className="px-4 py-4">Tipe</th>
                      <th className="px-4 py-4">Sebelum</th>
                      <th className="px-4 py-4">Perubahan</th>
                      <th className="px-4 py-4">Sesudah</th>
                      <th className="px-4 py-4">Alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {stockLogsQuery.isLoading
                      ? Array.from({ length: 6 }).map((_, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4" colSpan={8}>
                              <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                            </td>
                          </tr>
                        ))
                      : logRows.map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-4 text-slate-600">
                              {new Date(item.createdAt).toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-4 font-medium text-slate-900">
                              {item.product?.name || '-'}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {item.user?.name || '-'}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  item.type === 'in'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : item.type === 'out'
                                      ? 'bg-rose-100 text-rose-700'
                                      : 'bg-amber-100 text-amber-700'
                                }`}
                              >
                                {getLogTypeLabel(item.type)}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-slate-600">{item.qtyBefore}</td>
                            <td className="px-4 py-4 font-medium text-slate-900">
                              {item.qtyChange > 0 ? `+${item.qtyChange}` : item.qtyChange}
                            </td>
                            <td className="px-4 py-4 text-slate-600">{item.qtyAfter}</td>
                            <td className="px-4 py-4 text-slate-600">{item.reason}</td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-500">
                Menampilkan halaman {stockLogsQuery.data?.page || 1} dari{' '}
                {stockLogsQuery.data?.totalPages || 1}
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
                  disabled={page >= (stockLogsQuery.data?.totalPages || 1)}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </section>
        </div>

        <AdjustmentModal
          isOpen={isAdjustmentOpen}
          products={activeProducts}
          isSubmitting={adjustmentMutation.isPending}
          onClose={() => setIsAdjustmentOpen(false)}
          onSubmit={async (values) => {
            await adjustmentMutation.mutateAsync(values);
          }}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}
