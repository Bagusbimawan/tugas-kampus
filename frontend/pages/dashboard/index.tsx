import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  BarChart3,
  CalendarRange,
  PackageSearch,
  Wallet
} from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';

import { AuthGuard } from '../../components/AuthGuard';
import { SummaryCard } from '../../components/dashboard/SummaryCard';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { formatCurrency } from '../../lib/format';
import { api } from '../../services/api';
import { ProductListResponse, Product } from '../../types/product';
import {
  RevenueByCategoryItem,
  SalesSummaryResponse,
  TopProductItem
} from '../../types/report';

const chartColors = ['#0f766e', '#f59e0b', '#2563eb', '#dc2626', '#7c3aed'];

const getLocalDateInput = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getDefaultRange = () => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 6);

  return {
    startDate: getLocalDateInput(start),
    endDate: getLocalDateInput(end)
  };
};

const todayRange = (() => {
  const today = getLocalDateInput(new Date());
  return {
    startDate: today,
    endDate: today
  };
})();

export default function DashboardPage() {
  const [draftRange, setDraftRange] = useState(getDefaultRange);
  const [range, setRange] = useState(getDefaultRange);

  const summaryTodayQuery = useQuery({
    queryKey: ['dashboard-summary-today', todayRange.startDate, todayRange.endDate],
    queryFn: async () => {
      const { data } = await api.get<SalesSummaryResponse>('/reports/sales-summary', {
        params: todayRange
      });
      return data;
    },
    refetchInterval: 60000
  });

  const salesSummaryQuery = useQuery({
    queryKey: ['dashboard-summary-range', range.startDate, range.endDate],
    queryFn: async () => {
      const { data } = await api.get<SalesSummaryResponse>('/reports/sales-summary', {
        params: range
      });
      return data;
    },
    refetchInterval: 60000
  });

  const categoryRevenueQuery = useQuery({
    queryKey: ['dashboard-category-revenue', range.startDate, range.endDate],
    queryFn: async () => {
      const { data } = await api.get<RevenueByCategoryItem[]>('/reports/revenue-by-category', {
        params: range
      });
      return data;
    },
    refetchInterval: 60000
  });

  const topProductsQuery = useQuery({
    queryKey: ['dashboard-top-products', range.startDate, range.endDate],
    queryFn: async () => {
      const { data } = await api.get<TopProductItem[]>('/reports/top-products', {
        params: { ...range, limit: 5 }
      });
      return data;
    },
    refetchInterval: 60000
  });

  const stockAlertQuery = useQuery({
    queryKey: ['dashboard-stock-alert'],
    queryFn: async () => {
      const { data } = await api.get<Product[]>('/stock/alert');
      return data;
    },
    refetchInterval: 60000
  });

  const productsQuery = useQuery({
    queryKey: ['dashboard-products-count'],
    queryFn: async () => {
      const { data } = await api.get<ProductListResponse>('/products', {
        params: { isActive: true, page: 1, limit: 1 }
      });
      return data;
    },
    refetchInterval: 60000
  });

  const lineData = useMemo(() => {
    return (salesSummaryQuery.data?.dailyData || []).map((item) => ({
      ...item,
      label: new Intl.DateTimeFormat('id-ID', {
        day: '2-digit',
        month: '2-digit'
      }).format(new Date(item.date)),
      revenueInMillion: Number((item.revenue / 1_000_000).toFixed(2))
    }));
  }, [salesSummaryQuery.data?.dailyData]);

  const pieData = useMemo(() => {
    const totalRevenue = (categoryRevenueQuery.data || []).reduce(
      (sum, item) => sum + item.totalRevenue,
      0
    );

    return (categoryRevenueQuery.data || []).map((item, index) => ({
      ...item,
      color: chartColors[index % chartColors.length],
      percentage: totalRevenue > 0 ? (item.totalRevenue / totalRevenue) * 100 : 0
    }));
  }, [categoryRevenueQuery.data]);

  return (
    <AuthGuard allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={Wallet}
              label="Pendapatan Hari Ini"
              value={formatCurrency(summaryTodayQuery.data?.totalRevenue || 0)}
              accentClass="bg-emerald-100 text-emerald-700"
            />
            <SummaryCard
              icon={BarChart3}
              label="Transaksi Hari Ini"
              value={String(summaryTodayQuery.data?.totalTransactions || 0)}
              accentClass="bg-sky-100 text-sky-700"
            />
            <SummaryCard
              icon={PackageSearch}
              label="Produk Aktif"
              value={String(productsQuery.data?.total || 0)}
              accentClass="bg-amber-100 text-amber-700"
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Stok Hampir Habis"
              value={String(stockAlertQuery.data?.length || 0)}
              accentClass="bg-rose-100 text-rose-700"
            />
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
                  Filter Periode
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  Ringkasan operasional toko
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Dashboard memuat ulang otomatis setiap 1 menit.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
                    <CalendarRange className="h-4 w-4" />
                    Dari
                  </span>
                  <input
                    type="date"
                    value={draftRange.startDate}
                    onChange={(event) =>
                      setDraftRange((current) => ({ ...current, startDate: event.target.value }))
                    }
                    className="w-full bg-transparent outline-none"
                  />
                </label>
                <label className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                  <span className="mb-2 flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-slate-400">
                    <CalendarRange className="h-4 w-4" />
                    Sampai
                  </span>
                  <input
                    type="date"
                    value={draftRange.endDate}
                    onChange={(event) =>
                      setDraftRange((current) => ({ ...current, endDate: event.target.value }))
                    }
                    className="w-full bg-transparent outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={() => setRange({ ...draftRange })}
                  className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
                >
                  Apply
                </button>
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
                  Pendapatan Harian
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  Tren 7 hari terakhir
                </h2>
              </div>

              <div className="h-[320px]">
                {salesSummaryQuery.isLoading ? (
                  <div className="h-full animate-pulse rounded-[24px] bg-slate-100" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={lineData}>
                      <XAxis dataKey="label" stroke="#64748b" />
                      <YAxis stroke="#64748b" tickFormatter={(value) => `${value} jt`} />
                      <Tooltip
                        formatter={(value: number) => `${value} jt`}
                        labelFormatter={(label) => `Tanggal ${label}`}
                      />
                      <Line
                        type="monotone"
                        dataKey="revenueInMillion"
                        stroke="#0f766e"
                        strokeWidth={3}
                        dot={{ r: 4 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5">
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
                  Kategori
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">
                  Pendapatan per kategori
                </h2>
              </div>

              <div className="h-[320px]">
                {categoryRevenueQuery.isLoading ? (
                  <div className="h-full animate-pulse rounded-[24px] bg-slate-100" />
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        dataKey="totalRevenue"
                        nameKey="categoryName"
                        innerRadius={72}
                        outerRadius={110}
                        paddingAngle={4}
                      >
                        {pieData.map((entry) => (
                          <Cell key={entry.categoryId} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => formatCurrency(value)} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="mt-4 space-y-2">
                {pieData.map((item) => (
                  <div
                    key={item.categoryId}
                    className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-700">{item.categoryName}</span>
                    </div>
                    <span className="font-medium text-slate-900">
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-2">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
                    Produk Terlaris
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">Top 5 produk</h2>
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-4">#</th>
                      <th className="px-4 py-4">Nama Produk</th>
                      <th className="px-4 py-4">Qty Terjual</th>
                      <th className="px-4 py-4 text-right">Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {topProductsQuery.isLoading
                      ? Array.from({ length: 5 }).map((_, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4" colSpan={4}>
                              <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                            </td>
                          </tr>
                        ))
                      : (topProductsQuery.data || []).map((item, index) => (
                          <tr key={item.productId}>
                            <td className="px-4 py-4 font-medium text-slate-500">{index + 1}</td>
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
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
                    Stok Alert
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-slate-900">
                    Produk hampir habis
                  </h2>
                </div>
                <Link
                  href="/dashboard/stok"
                  className="text-sm font-medium text-sky-700 transition hover:text-sky-600"
                >
                  Buka stok
                </Link>
              </div>

              <div className="overflow-hidden rounded-[24px] border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Nama Produk</th>
                      <th className="px-4 py-4">Kategori</th>
                      <th className="px-4 py-4">Stok</th>
                      <th className="px-4 py-4">Min</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {stockAlertQuery.isLoading
                      ? Array.from({ length: 5 }).map((_, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4" colSpan={5}>
                              <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                            </td>
                          </tr>
                        ))
                      : (stockAlertQuery.data || []).map((item) => (
                          <tr key={item.id}>
                            <td className="px-4 py-4 font-medium text-slate-900">{item.name}</td>
                            <td className="px-4 py-4 text-slate-600">
                              {item.category?.name || '-'}
                            </td>
                            <td className="px-4 py-4 text-slate-600">{item.stock}</td>
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
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
