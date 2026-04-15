import { useQuery } from '@tanstack/react-query';
import { CalendarRange, ReceiptText, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { AuthGuard } from '../../components/AuthGuard';
import { SummaryCard } from '../../components/dashboard/SummaryCard';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { TransactionDetailModal } from '../../components/riwayat/TransactionDetailModal';
import { formatCurrency } from '../../lib/format';
import { api } from '../../services/api';
import {
  TransactionDetailResponse,
  TransactionListItem,
  TransactionListResponse
} from '../../types/transaction';

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

export default function DashboardRiwayatPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [draftRange, setDraftRange] = useState(getDefaultRange);
  const [range, setRange] = useState(getDefaultRange);
  const [selectedTransactionId, setSelectedTransactionId] = useState<number | null>(null);

  const transactionsQuery = useQuery({
    queryKey: ['dashboard-transactions', page, range.startDate, range.endDate],
    queryFn: async () => {
      const { data } = await api.get<TransactionListResponse>('/transactions', {
        params: {
          page,
          limit: 10,
          startDate: range.startDate,
          endDate: range.endDate
        }
      });
      return data;
    }
  });

  const transactionDetailQuery = useQuery({
    queryKey: ['dashboard-transaction-detail', selectedTransactionId],
    queryFn: async () => {
      const { data } = await api.get<TransactionDetailResponse>(
        `/transactions/${selectedTransactionId}`
      );
      return data;
    },
    enabled: Boolean(selectedTransactionId)
  });

  useEffect(() => {
    setPage(1);
  }, [range.endDate, range.startDate]);

  const filteredTransactions = useMemo(() => {
    const rows = transactionsQuery.data?.data || [];
    const keyword = search.trim().toLowerCase();

    if (!keyword) {
      return rows;
    }

    return rows.filter((item) => {
      const haystack = `${item.invoiceNumber} ${item.user?.name || ''} ${item.customerName || ''}`
        .trim()
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [search, transactionsQuery.data?.data]);

  const summary = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, item) => {
        acc.totalTransactions += 1;
        if (item.status === 'completed') {
          acc.completedTransactions += 1;
          acc.totalRevenue += Number(item.total);
        }
        return acc;
      },
      {
        totalTransactions: 0,
        completedTransactions: 0,
        totalRevenue: 0
      }
    );
  }, [filteredTransactions]);

  return (
    <AuthGuard allowedRoles={['admin', 'manager']}>
      <DashboardLayout>
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              icon={ReceiptText}
              label="Total Transaksi"
              value={String(summary.totalTransactions)}
              accentClass="bg-sky-100 text-sky-700"
            />
            <SummaryCard
              icon={ReceiptText}
              label="Transaksi Selesai"
              value={String(summary.completedTransactions)}
              accentClass="bg-emerald-100 text-emerald-700"
            />
            <SummaryCard
              icon={CalendarRange}
              label="Total Omzet"
              value={formatCurrency(summary.totalRevenue)}
              accentClass="bg-amber-100 text-amber-700"
            />
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
                  Transaksi
                </p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  Riwayat transaksi
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Tinjau detail transaksi, filter tanggal, dan cetak struk dari histori.
                </p>
              </div>

              <div className="grid gap-3 lg:grid-cols-3">
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
                  className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
                >
                  Apply
                </button>
              </div>
            </div>

            <div className="relative mt-6 max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari invoice, kasir, atau pelanggan"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 outline-none"
              />
            </div>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-4">No. Invoice</th>
                      <th className="px-4 py-4">Tanggal</th>
                      <th className="px-4 py-4">Kasir</th>
                      <th className="px-4 py-4">Pelanggan</th>
                      <th className="px-4 py-4">Metode</th>
                      <th className="px-4 py-4">Total</th>
                      <th className="px-4 py-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {transactionsQuery.isLoading
                      ? Array.from({ length: 6 }).map((_, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4" colSpan={7}>
                              <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                            </td>
                          </tr>
                        ))
                      : filteredTransactions.map((item: TransactionListItem) => (
                          <tr
                            key={item.id}
                            onClick={() => setSelectedTransactionId(item.id)}
                            className="cursor-pointer transition hover:bg-slate-50"
                          >
                            <td className="px-4 py-4 font-medium text-slate-900">
                              {item.invoiceNumber}
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {new Date(item.createdAt).toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-4 text-slate-600">{item.user?.name || '-'}</td>
                            <td className="px-4 py-4 text-slate-600">
                              {item.customerName || '-'}
                            </td>
                            <td className="px-4 py-4 text-slate-600 uppercase">
                              {item.payment?.method || '-'}
                            </td>
                            <td className="px-4 py-4 text-slate-900">
                              {formatCurrency(item.total)}
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

            {!transactionsQuery.isLoading && filteredTransactions.length === 0 ? (
              <div className="mt-6 rounded-[28px] border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                <p className="text-lg font-medium text-slate-900">Tidak ada transaksi</p>
                <p className="mt-2 text-sm text-slate-500">
                  Ubah filter tanggal atau kata kunci pencarian untuk melihat data lain.
                </p>
              </div>
            ) : null}

            <div className="mt-5 flex items-center justify-between">
              <p className="text-sm text-slate-500">
                Menampilkan halaman {transactionsQuery.data?.page || 1} dari{' '}
                {transactionsQuery.data?.totalPages || 1}
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
                  disabled={page >= (transactionsQuery.data?.totalPages || 1)}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 disabled:opacity-50"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          </section>
        </div>

        <TransactionDetailModal
          isOpen={Boolean(selectedTransactionId)}
          transaction={transactionDetailQuery.data || null}
          onClose={() => setSelectedTransactionId(null)}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}
