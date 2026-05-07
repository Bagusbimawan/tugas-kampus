import { useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useMemo, useState } from 'react';

import { AuthGuard } from '../../components/AuthGuard';
import { TransactionDetailModal } from '../../components/riwayat/TransactionDetailModal';
import { KasirLayout } from '../../components/layouts/KasirLayout';
import { formatCurrency } from '../../lib/format';
import { api } from '../../services/api';
import { useAuthStore } from '../../store/useAuthStore';
import {
  TransactionDetailResponse,
  TransactionListItem,
  TransactionListResponse
} from '../../types/transaction';

const formatDateForApi = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatTime = (value: string) => {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value));
};

export default function KasirRiwayatPage() {
  const { user } = useAuthStore();
  const [search, setSearch] = useState('');
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);
  const today = useMemo(() => formatDateForApi(new Date()), []);

  const transactionsQuery = useQuery({
    queryKey: ['transactions', 'today', user?.id, today],
    queryFn: async () => {
      const { data } = await api.get<TransactionListResponse>('/transactions', {
        params: {
          userId: user?.id,
          startDate: today,
          endDate: today,
          limit: 100
        }
      });
      return data;
    },
    enabled: Boolean(user?.id),
    refetchInterval: 30000
  });

  const transactionDetailQuery = useQuery({
    queryKey: ['transaction-detail', selectedTransactionId],
    queryFn: async () => {
      const { data } = await api.get<TransactionDetailResponse>(
        `/transactions/${selectedTransactionId}`
      );
      return data;
    },
    enabled: Boolean(selectedTransactionId)
  });

  const filteredTransactions = useMemo(() => {
    const rows = transactionsQuery.data?.data || [];
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return rows;
    }

    return rows.filter((item) => item.invoiceNumber.toLowerCase().includes(keyword));
  }, [search, transactionsQuery.data?.data]);

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, item) => {
        acc.totalTransactions += 1;
        if (item.status === 'completed') {
          acc.totalRevenue += Number(item.total);
        }
        return acc;
      },
      {
        totalTransactions: 0,
        totalRevenue: 0
      }
    );
  }, [filteredTransactions]);

  const rows = filteredTransactions;

  return (
    <AuthGuard allowedRoles={['admin', 'kasir']}>
      <KasirLayout>
        <div className="space-y-6">
          <section className="relative overflow-hidden rounded-[30px] border border-[#e7d7c8] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(255,248,240,0.95)_40%,_rgba(245,232,216,0.88)_72%,_rgba(229,219,208,0.85)_100%)] p-5 shadow-[0_28px_60px_-45px_rgba(15,23,42,0.35)] sm:p-6">
            <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(31,111,67,0.16),_transparent_58%)]" />
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-[#9a5c18]">Riwayat</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
                  Riwayat Transaksi Hari Ini
                </h1>
                <p className="mt-2 text-sm text-slate-600">
                  Pantau transaksi yang dibuat hari ini oleh kasir yang sedang login.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#e3d4c6] bg-white/75 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Total transaksi
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[#9a5c18]">
                    {summary.totalTransactions}
                  </p>
                </div>
                <div className="rounded-2xl border border-[#cfe4d4] bg-[#f3fcf5] px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    Pendapatan hari ini
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-[#165b33]">
                    {formatCurrency(summary.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[30px] border border-[#e7d7c8] bg-[linear-gradient(180deg,rgba(255,250,244,0.98),rgba(250,241,231,0.94))] p-5 shadow-[0_24px_55px_-40px_rgba(15,23,42,0.3)] sm:p-6">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nomor invoice"
                className="w-full rounded-2xl border border-[#dccbbb] bg-white py-3 pl-11 pr-4 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#d4a373]"
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-[#eadfd3] bg-white/70">
              {/* Mobile card view */}
              <div className="divide-y divide-[#eadfd3] md:hidden">
                {transactionsQuery.isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="px-4 py-4">
                        <div className="h-10 animate-pulse rounded-2xl bg-[#f3e6d8]" />
                      </div>
                    ))
                  : rows.map((item: TransactionListItem) => (
                      <div
                        key={item.id}
                        onClick={() => setSelectedTransactionId(item.id)}
                        className="cursor-pointer px-4 py-4 transition hover:bg-[#fff8ef]"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900">{item.invoiceNumber}</p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {formatTime(item.createdAt)} · {(item.payment?.method || '-').toUpperCase()}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {(item.items || []).reduce((sum, detail) => sum + detail.quantity, 0)} item
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="font-medium text-slate-900">{formatCurrency(item.total)}</p>
                            <span
                              className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs font-semibold ${
                                item.status === 'completed'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
              </div>
              {/* Desktop table view */}
              <div className="hidden md:block overflow-x-auto">
                <table className="min-w-[44rem] divide-y divide-[#eadfd3] text-sm">
                  <thead className="bg-[#f8f1e8] text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-4">No. Invoice</th>
                      <th className="px-4 py-4">Waktu</th>
                      <th className="px-4 py-4">Jml Item</th>
                      <th className="px-4 py-4">Total</th>
                      <th className="px-4 py-4">Metode Bayar</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#eadfd3] bg-white/70">
                    {transactionsQuery.isLoading
                      ? Array.from({ length: 5 }).map((_, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4" colSpan={6}>
                              <div className="h-10 animate-pulse rounded-2xl bg-[#f3e6d8]" />
                            </td>
                          </tr>
                        ))
                      : rows.map((item: TransactionListItem) => (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedTransactionId(item.id)}
                            className="cursor-pointer transition hover:bg-[#fff8ef]"
                          >
                            <td className="px-4 py-4 font-medium text-slate-900">
                              {item.invoiceNumber}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {formatTime(item.createdAt)}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {(item.items || []).reduce(
                                (sum, detail) => sum + detail.quantity,
                                0
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {formatCurrency(item.total)}
                            </td>
                            <td className="px-4 py-4 text-slate-600 uppercase">
                              {item.payment?.method || '-'}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  item.status === 'completed'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-rose-100 text-rose-700'
                                }`}
                              >
                                {item.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>

            {!transactionsQuery.isLoading && rows.length === 0 ? (
              <div className="mt-6 rounded-[28px] border border-dashed border-[#dccbbb] bg-[#fffaf4] p-10 text-center">
                <p className="text-lg font-medium text-slate-900">Belum ada transaksi hari ini</p>
                <p className="mt-2 text-sm text-slate-500">
                  Data akan muncul setelah ada transaksi yang selesai diproses.
                </p>
              </div>
            ) : null}
          </section>
        </div>

        <TransactionDetailModal
          isOpen={Boolean(selectedTransactionId)}
          transaction={transactionDetailQuery.data || null}
          onClose={() => setSelectedTransactionId(null)}
        />
      </KasirLayout>
    </AuthGuard>
  );
}
