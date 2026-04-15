import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { AlertTriangle, Boxes, Plus, Search, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { AuthGuard } from '../../components/AuthGuard';
import { SummaryCard } from '../../components/dashboard/SummaryCard';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatCurrency } from '../../lib/format';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
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

const adjustmentSchema = z.object({
  productId: z.coerce.number().min(1, 'Produk wajib dipilih'),
  type: z.enum(['in', 'adjustment']),
  qtyChange: z.coerce.number().int(),
  reason: z.string().min(1, 'Alasan wajib diisi')
});

type AdjustmentFormValues = z.infer<typeof adjustmentSchema>;

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
  const {
    register,
    reset,
    handleSubmit,
    watch,
    formState: { errors }
  } = useForm<AdjustmentFormValues>({
    resolver: zodResolver(adjustmentSchema),
    defaultValues: {
      productId: 0,
      type: 'in',
      qtyChange: 1,
      reason: ''
    }
  });

  const adjustmentType = watch('type');

  useEffect(() => {
    if (!isOpen) {
      reset({
        productId: 0,
        type: 'in',
        qtyChange: 1,
        reason: ''
      });
    }
  }, [isOpen, reset]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 p-0 backdrop-blur sm:items-center sm:justify-center sm:p-6">
      <div className="w-full rounded-t-[28px] border border-slate-200 bg-white sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Adjustment</p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              Penyesuaian stok produk
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
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
        >
          <label className="block text-sm text-slate-600 sm:col-span-2">
            Produk*
            <select
              {...register('productId')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            >
              <option value={0}>Pilih produk</option>
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.stock})
                </option>
              ))}
            </select>
            {errors.productId ? (
              <p className="mt-2 text-rose-600">{errors.productId.message}</p>
            ) : null}
          </label>

          <label className="block text-sm text-slate-600">
            Tipe*
            <select
              {...register('type')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            >
              <option value="in">Stok Masuk</option>
              <option value="adjustment">Adjustment</option>
            </select>
          </label>

          <label className="block text-sm text-slate-600">
            Qty Change*
            <input
              type="number"
              {...register('qtyChange')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
            <p className="mt-2 text-xs text-slate-500">
              {adjustmentType === 'in'
                ? 'Gunakan angka positif untuk stok masuk.'
                : 'Gunakan angka positif atau negatif untuk adjustment.'}
            </p>
            {errors.qtyChange ? (
              <p className="mt-2 text-rose-600">{errors.qtyChange.message}</p>
            ) : null}
          </label>

          <label className="block text-sm text-slate-600 sm:col-span-2">
            Alasan*
            <textarea
              rows={4}
              {...register('reason')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
            {errors.reason ? (
              <p className="mt-2 text-rose-600">{errors.reason.message}</p>
            ) : null}
          </label>

          <div className="flex gap-3 sm:col-span-2">
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
              {isSubmitting ? 'Menyimpan...' : 'Simpan Adjustment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function DashboardStokPage() {
  const { user } = useAuthStore();
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
    queryKey: ['stock-products'],
    queryFn: async () => {
      const { data } = await api.get<ProductListResponse>('/products', {
        params: {
          isActive: true,
          limit: 100
        }
      });
      return data.data;
    }
  });

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
      const { data } = await api.post('/stock/adjustment', values);
      return data;
    },
    onSuccess: async () => {
      toast.success('Adjustment stok berhasil');
      setIsAdjustmentOpen(false);
      await queryClient.invalidateQueries({ queryKey: ['stock-alert'] });
      await queryClient.invalidateQueries({ queryKey: ['stock-logs'] });
      await queryClient.invalidateQueries({ queryKey: ['stock-products'] });
      await queryClient.invalidateQueries({ queryKey: ['products'] });
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
  const isManagerView = user?.role === 'manager';

  return (
    <AuthGuard allowedRoles={['admin', 'manager']}>
      <DashboardLayout>
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Stok</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  {isManagerView ? 'Monitoring stok' : 'Monitoring dan adjustment stok'}
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  {isManagerView
                    ? 'Pantau stok kritis dan histori perubahan stok produk dalam mode baca.'
                    : 'Pantau stok kritis dan histori perubahan stok produk.'}
                </p>
              </div>

              {!isManagerView ? (
                <button
                  type="button"
                  onClick={() => setIsAdjustmentOpen(true)}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                >
                  <Plus className="h-4 w-4" />
                  Adjustment Stok
                </button>
              ) : null}
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
              <div className="overflow-x-auto">
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
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Log</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  Histori perubahan stok
                </h2>
              </div>

              <div className="grid gap-3 lg:grid-cols-4">
                <input
                  type="date"
                  value={draftRange.startDate}
                  onChange={(event) =>
                    setDraftRange((current) => ({ ...current, startDate: event.target.value }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                />
                <input
                  type="date"
                  value={draftRange.endDate}
                  onChange={(event) =>
                    setDraftRange((current) => ({ ...current, endDate: event.target.value }))
                  }
                  className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
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
                  <option value="adjustment">Adjustment</option>
                </select>
                <button
                  type="button"
                  onClick={() => setRange({ ...draftRange })}
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="mb-5 max-w-sm">
              <select
                value={selectedProductId}
                onChange={(event) =>
                  setSelectedProductId(
                    event.target.value === 'all' ? 'all' : Number(event.target.value)
                  )
                }
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
              >
                <option value="all">Semua produk</option>
                {productsQuery.data?.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-slate-200">
              <div className="overflow-x-auto">
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
                                {item.type}
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

            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Menampilkan halaman {stockLogsQuery.data?.page || 1} dari{' '}
                {stockLogsQuery.data?.totalPages || 1}
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

        {!isManagerView ? (
          <AdjustmentModal
            isOpen={isAdjustmentOpen}
            products={productsQuery.data || []}
            isSubmitting={adjustmentMutation.isPending}
            onClose={() => setIsAdjustmentOpen(false)}
            onSubmit={async (values) => {
              await adjustmentMutation.mutateAsync(values);
            }}
          />
        ) : null}
      </DashboardLayout>
    </AuthGuard>
  );
}
