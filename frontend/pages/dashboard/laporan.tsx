import { useMutation, useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { Download, FileBarChart2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthGuard } from '../../components/AuthGuard';
import { SummaryCard } from '../../components/dashboard/SummaryCard';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { formatCurrency } from '../../lib/format';
import { api } from '../../services/api';
import { Product } from '../../types/product';
import {
  RevenueByCategoryItem,
  SalesSummaryResponse,
  TopProductItem
} from '../../types/report';
import {
  TransactionListItem,
  TransactionListResponse
} from '../../types/transaction';

type ReportTab = 'products' | 'cashier';

interface CashierReportItem {
  userId: number;
  userName: string;
  totalTransactions: number;
  totalRevenue: number;
}

const getLocalDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getMonthRange = () => {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);

  return {
    startDate: getLocalDateInput(start),
    endDate: getLocalDateInput(now)
  };
};

const toCsv = (rows: string[][]) => {
  return rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    .join('\n');
};

export default function DashboardLaporanPage() {
  const [draftRange, setDraftRange] = useState(getMonthRange);
  const [range, setRange] = useState(getMonthRange);
  const [activeTab, setActiveTab] = useState<ReportTab>('products');

  const salesSummaryQuery = useQuery({
    queryKey: ['report-page-summary', range.startDate, range.endDate],
    queryFn: async () => {
      const { data } = await api.get<SalesSummaryResponse>('/reports/sales-summary', {
        params: range
      });
      return data;
    }
  });

  const categoryRevenueQuery = useQuery({
    queryKey: ['report-page-category-revenue', range.startDate, range.endDate],
    queryFn: async () => {
      const { data } = await api.get<RevenueByCategoryItem[]>('/reports/revenue-by-category', {
        params: range
      });
      return data;
    }
  });

  const topProductsQuery = useQuery({
    queryKey: ['report-page-top-products', range.startDate, range.endDate],
    queryFn: async () => {
      const { data } = await api.get<TopProductItem[]>('/reports/top-products', {
        params: { ...range, limit: 10 }
      });
      return data;
    }
  });

  const cashierReportQuery = useQuery({
    queryKey: ['report-page-cashier', range.startDate, range.endDate],
    queryFn: async () => {
      const { data } = await api.get<CashierReportItem[]>('/reports/by-cashier', {
        params: range
      });
      return data;
    }
  });

  const exportCsvMutation = useMutation({
    mutationFn: async () => {
      const { data } = await api.get<TransactionListResponse>('/transactions', {
        params: {
          startDate: range.startDate,
          endDate: range.endDate,
          limit: 100
        }
      });

      return data.data;
    },
    onSuccess: (transactions) => {
      const rows = [
        ['No. Invoice', 'Tanggal', 'Kasir', 'Total', 'Metode Bayar', 'Status'],
        ...transactions.map((transaction: TransactionListItem) => [
          transaction.invoiceNumber,
          new Date(transaction.createdAt).toLocaleString('id-ID'),
          transaction.user?.name || '-',
          String(transaction.total),
          transaction.payment?.method || '-',
          transaction.status
        ])
      ];

      const csv = toCsv(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `laporan-${range.startDate}-to-${range.endDate}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success('CSV berhasil diunduh');
    },
    onError: () => {
      toast.error('Gagal mengekspor CSV');
    }
  });

  const lineData = useMemo(() => {
    return (salesSummaryQuery.data?.dailyData || []).map((item) => ({
      ...item,
      label: new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: '2-digit'
      }).format(new Date(item.date))
    }));
  }, [salesSummaryQuery.data?.dailyData]);

  const categoryBarData = useMemo(() => {
    return (categoryRevenueQuery.data || []).map((item) => ({
      ...item,
      revenueInMillion: Number((item.totalRevenue / 1_000_000).toFixed(2))
    }));
  }, [categoryRevenueQuery.data]);

  const transactionPerDayData = useMemo(() => {
    return (salesSummaryQuery.data?.dailyData || []).map((item) => ({
      label: new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: '2-digit'
      }).format(new Date(item.date)),
      transactions: item.transactions
    }));
  }, [salesSummaryQuery.data?.dailyData]);

  return (
    <AuthGuard allowedRoles={['admin', 'manager']}>
      <DashboardLayout>
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Laporan</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  Analisis penjualan
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Tinjau performa penjualan berdasarkan periode, kategori, produk, dan kasir.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
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
                <button
                  type="button"
                  onClick={() => setRange({ ...draftRange })}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                >
                  Apply
                </button>
                <button
                  type="button"
                  onClick={() => exportCsvMutation.mutate()}
                  disabled={exportCsvMutation.isPending}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={FileBarChart2}
              label="Total Revenue"
              value={formatCurrency(salesSummaryQuery.data?.totalRevenue || 0)}
              accentClass="bg-emerald-100 text-emerald-700"
            />
            <SummaryCard
              icon={FileBarChart2}
              label="Total Transaksi"
              value={String(salesSummaryQuery.data?.totalTransactions || 0)}
              accentClass="bg-sky-100 text-sky-700"
            />
            <SummaryCard
              icon={FileBarChart2}
              label="Rata-rata Order"
              value={formatCurrency(salesSummaryQuery.data?.avgOrderValue || 0)}
              accentClass="bg-amber-100 text-amber-700"
            />
            <SummaryCard
              icon={FileBarChart2}
              label="Total Item Terjual"
              value={String(salesSummaryQuery.data?.totalItems || 0)}
              accentClass="bg-rose-100 text-rose-700"
            />
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
                  Pendapatan Harian
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  Tren pendapatan
                </h2>
              </div>
              <div className="h-[320px]">
                {salesSummaryQuery.isLoading ? (
                  <div className="h-full animate-pulse rounded-[24px] bg-slate-100" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" stroke="#64748b" />
                      <YAxis stroke="#64748b" tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        name="Revenue"
                        stroke="#0f766e"
                        strokeWidth={3}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
                  Revenue per Kategori
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  Distribusi kategori
                </h2>
              </div>
              <div className="h-[320px]">
                {categoryRevenueQuery.isLoading ? (
                  <div className="h-full animate-pulse rounded-[24px] bg-slate-100" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={categoryBarData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="categoryName" stroke="#64748b" />
                      <YAxis stroke="#64748b" tickFormatter={(value) => `${value} jt`} />
                      <Tooltip formatter={(value: number) => `${value} jt`} />
                      <Legend />
                      <Bar
                        dataKey="revenueInMillion"
                        name="Revenue (juta)"
                        fill="#2563eb"
                        radius={[10, 10, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5">
              <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
                Transaksi per Hari
              </p>
              <h2 className="mt-2 text-xl font-semibold text-slate-900">
                Volume transaksi harian
              </h2>
            </div>
            <div className="h-[320px]">
              {salesSummaryQuery.isLoading ? (
                <div className="h-full animate-pulse rounded-[24px] bg-slate-100" />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={transactionPerDayData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="label" stroke="#64748b" />
                    <YAxis stroke="#64748b" allowDecimals={false} />
                    <Tooltip />
                    <Bar
                      dataKey="transactions"
                      name="Jumlah transaksi"
                      fill="#f59e0b"
                      radius={[10, 10, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Tabel</p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  Ringkasan terperinci
                </h2>
              </div>

              <div className="inline-flex rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setActiveTab('products')}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                    activeTab === 'products'
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Produk Terlaris
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('cashier')}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold ${
                    activeTab === 'cashier'
                      ? 'bg-slate-950 text-white'
                      : 'text-slate-600'
                  }`}
                >
                  Per Kasir
                </button>
              </div>
            </div>

            {activeTab === 'products' ? (
              <div className="overflow-hidden rounded-[24px] border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-4">#</th>
                      <th className="px-4 py-4">Nama Produk</th>
                      <th className="px-4 py-4">Qty Terjual</th>
                      <th className="px-4 py-4 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {(topProductsQuery.data || []).map((item, index) => (
                      <tr key={item.productId}>
                        <td className="px-4 py-4 text-slate-500">{index + 1}</td>
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {item.productName}
                        </td>
                        <td className="px-4 py-4 text-slate-600">{item.totalQty}</td>
                        <td className="px-4 py-4 text-right text-slate-900">
                          {formatCurrency(item.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="overflow-hidden rounded-[24px] border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Nama Kasir</th>
                      <th className="px-4 py-4">Jumlah Transaksi</th>
                      <th className="px-4 py-4 text-right">Total Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {(cashierReportQuery.data || []).map((item) => (
                      <tr key={item.userId}>
                        <td className="px-4 py-4 font-medium text-slate-900">
                          {item.userName}
                        </td>
                        <td className="px-4 py-4 text-slate-600">
                          {item.totalTransactions}
                        </td>
                        <td className="px-4 py-4 text-right text-slate-900">
                          {formatCurrency(item.totalRevenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
