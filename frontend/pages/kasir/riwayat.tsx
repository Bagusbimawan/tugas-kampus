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
          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Riwayat</p>
                <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">
                  Riwayat Transaksi Hari Ini
                </h1>
                <p className="mt-2 text-sm text-slate-300">
                  Pantau transaksi yang dibuat hari ini oleh kasir yang sedang login.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Total transaksi
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-amber-300">
                    {summary.totalTransactions}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    Pendapatan hari ini
                  </p>
                  <p className="mt-2 text-2xl font-semibold text-emerald-300">
                    {formatCurrency(summary.totalRevenue)}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
            <div className="relative max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari nomor invoice"
                className="w-full rounded-2xl border border-white/10 bg-slate-950/40 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-slate-500"
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-white/10 text-sm">
                  <thead className="bg-slate-950/40 text-left text-slate-400">
                    <tr>
                      <th className="px-4 py-4">No. Invoice</th>
                      <th className="px-4 py-4">Waktu</th>
                      <th className="px-4 py-4">Jml Item</th>
                      <th className="px-4 py-4">Total</th>
                      <th className="px-4 py-4">Metode Bayar</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/10 bg-slate-950/20">
                    {transactionsQuery.isLoading
                      ? Array.from({ length: 5 }).map((_, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4" colSpan={6}>
                              <div className="h-10 animate-pulse rounded-2xl bg-white/5" />
                            </td>
                          </tr>
                        ))
                      : rows.map((item: TransactionListItem) => (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedTransactionId(item.id)}
                            className="cursor-pointer transition hover:bg-white/5"
                          >
                            <td className="px-4 py-4 font-medium text-white">
                              {item.invoiceNumber}
                            </td>
                            <td className="px-4 py-4 text-slate-300">
                              {formatTime(item.createdAt)}
                            </td>
                            <td className="px-4 py-4 text-slate-300">
                              {(item.items || []).reduce(
                                (sum, detail) => sum + detail.quantity,
                                0
                              )}
                            </td>
                            <td className="px-4 py-4 text-slate-300">
                              {formatCurrency(item.total)}
                            </td>
                            <td className="px-4 py-4 text-slate-300 uppercase">
                              {item.payment?.method || '-'}
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  item.status === 'completed'
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : 'bg-rose-500/15 text-rose-300'
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
              <div className="mt-6 rounded-[28px] border border-dashed border-white/15 bg-white/5 p-10 text-center">
                <p className="text-lg font-medium">Belum ada transaksi hari ini</p>
                <p className="mt-2 text-sm text-slate-400">
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
