import { Printer, X } from 'lucide-react';

import { formatCurrency, formatDateTime } from '../../lib/format';
import { TransactionDetailResponse } from '../../types/transaction';

interface TransactionDetailModalProps {
  isOpen: boolean;
  transaction: TransactionDetailResponse | null;
  onClose: () => void;
}

export const TransactionDetailModal = ({
  isOpen,
  transaction,
  onClose
}: TransactionDetailModalProps) => {
  if (!isOpen || !transaction) {
    return null;
  }

  const totalItems = transaction.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 p-0 backdrop-blur sm:items-center sm:justify-center sm:p-6 print:static print:bg-transparent">
      <div className="w-full rounded-t-[28px] border border-white/10 bg-white text-slate-900 sm:max-w-4xl sm:rounded-[28px] print:max-w-none print:border-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 print:hidden sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Detail Transaksi</p>
            <h3 className="mt-1 text-xl font-semibold">{transaction.invoiceNumber}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-5 sm:p-6 print:p-0">
          <div className="rounded-[28px] border border-dashed border-slate-300 bg-slate-50 p-5 print:border-0 print:bg-white print:p-0">
            <div className="flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Invoice</p>
                <h4 className="mt-2 text-2xl font-semibold">{transaction.invoiceNumber}</h4>
                <p className="mt-2 text-sm text-slate-500">
                  {formatDateTime(transaction.createdAt)}
                </p>
              </div>
              <div className="grid gap-2 text-sm text-slate-600 sm:text-right">
                <p>Kasir: {transaction.user.name}</p>
                <p>Pelanggan: {transaction.customerName || '-'}</p>
                <p>Total item: {totalItems}</p>
                <p>
                  Status:{' '}
                  <span
                    className={`rounded-full px-2 py-1 text-xs font-semibold ${
                      transaction.status === 'completed'
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-rose-100 text-rose-700'
                    }`}
                  >
                    {transaction.status}
                  </span>
                </p>
              </div>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Produk</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {transaction.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{item.productName}</p>
                          <p className="mt-1 text-xs text-slate-500">{item.product?.sku || '-'}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.subtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Pembayaran</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Metode</span>
                    <span className="uppercase">{transaction.payment?.method || '-'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Jumlah dibayar</span>
                    <span>{formatCurrency(transaction.payment?.amountPaid || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Kembalian</span>
                    <span>{formatCurrency(transaction.payment?.changeAmount || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Referensi</span>
                    <span>{transaction.payment?.referenceNo || '-'}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Subtotal</span>
                  <span>{formatCurrency(transaction.subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-slate-300">Diskon</span>
                  <span>{formatCurrency(transaction.discount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-slate-300">Pajak</span>
                  <span>{formatCurrency(transaction.tax)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4 text-base font-semibold">
                  <span>Total</span>
                  <span className="text-amber-300">{formatCurrency(transaction.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 print:hidden sm:flex-row">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white"
            >
              <Printer className="h-4 w-4" />
              Print Struk
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

