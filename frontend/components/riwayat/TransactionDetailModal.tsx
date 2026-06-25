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
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-6 print:static print:bg-transparent">
      <button
        type="button"
        aria-label="Tutup detail transaksi"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur print:hidden"
        onClick={onClose}
      />

      <div className="relative flex h-[min(92dvh,100%)] max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-white text-slate-900 sm:h-auto sm:max-h-[min(90dvh,48rem)] sm:max-w-4xl sm:rounded-[28px] print:max-w-none print:border-0">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-4 print:hidden sm:px-6">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Detail Transaksi</p>
            <h3 className="mt-1 truncate text-lg font-semibold sm:text-xl">
              {transaction.invoiceNumber}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-2xl border border-slate-200 p-2 text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-4 py-4 sm:px-6 sm:py-5 print:overflow-visible print:p-0 [-webkit-overflow-scrolling:touch]">
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-4 sm:rounded-[28px] sm:p-5 print:border-0 print:bg-white print:p-0">
            <div className="grid gap-4 border-b border-slate-200 pb-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-6 sm:pb-5">
              <div className="min-w-0">
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Invoice</p>
                <h4 className="mt-1 break-all text-xl font-semibold sm:mt-2 sm:text-2xl">
                  {transaction.invoiceNumber}
                </h4>
                <p className="mt-1 text-sm text-slate-500 sm:mt-2">
                  {formatDateTime(transaction.createdAt)}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-slate-600 sm:grid-cols-1 sm:justify-items-end sm:text-right">
                <p className="col-span-2 sm:col-span-1">Kasir: {transaction.user.name}</p>
                <p className="col-span-2 sm:col-span-1">
                  Pelanggan: {transaction.customerName || '-'}
                </p>
                <p>Total item: {totalItems}</p>
                <p>
                  Status:{' '}
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
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

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:mt-6">
              <div className="border-b border-slate-200 bg-slate-100 px-3 py-2.5 sm:px-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Daftar Produk
                </p>
              </div>

              <div className="max-h-[min(240px,32dvh)] overflow-y-auto overscroll-contain sm:max-h-[min(320px,40dvh)]">
                <div className="divide-y divide-slate-200 md:hidden">
                  {transaction.items.map((item) => (
                    <div key={item.id} className="space-y-2 px-3 py-3 text-sm sm:px-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium leading-snug text-slate-900">
                            {item.productName}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-500">
                            SKU: {item.product?.sku || '-'}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          x{item.quantity}
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 px-2 py-2 text-xs">
                        <div>
                          <p className="text-slate-500">Harga</p>
                          <p className="mt-0.5 font-medium text-slate-800">
                            {formatCurrency(item.price)}
                          </p>
                        </div>
                        <div className="text-center">
                          <p className="text-slate-500">Qty</p>
                          <p className="mt-0.5 font-medium text-slate-800">{item.quantity}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-500">Subtotal</p>
                          <p className="mt-0.5 font-semibold text-slate-900">
                            {formatCurrency(item.subtotal)}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <table className="hidden w-full table-fixed text-sm md:table">
                  <thead className="sticky top-0 z-10 bg-slate-100 text-left text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="w-[42%] px-3 py-2.5 font-semibold sm:px-4 sm:py-3">
                        Produk
                      </th>
                      <th className="w-[10%] px-2 py-2.5 text-center font-semibold sm:px-3 sm:py-3">
                        Qty
                      </th>
                      <th className="w-[24%] px-2 py-2.5 text-right font-semibold sm:px-3 sm:py-3">
                        Harga
                      </th>
                      <th className="w-[24%] px-3 py-2.5 text-right font-semibold sm:px-4 sm:py-3">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {transaction.items.map((item) => (
                      <tr key={item.id} className="align-top">
                        <td className="px-3 py-3 sm:px-4">
                          <p className="font-medium leading-snug text-slate-900">
                            {item.productName}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.product?.sku || '-'}
                          </p>
                        </td>
                        <td className="px-2 py-3 text-center text-slate-700 sm:px-3">
                          {item.quantity}
                        </td>
                        <td className="px-2 py-3 text-right text-slate-700 sm:px-3">
                          {formatCurrency(item.price)}
                        </td>
                        <td className="px-3 py-3 text-right font-semibold text-slate-900 sm:px-4">
                          {formatCurrency(item.subtotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">Pembayaran</p>
                <div className="mt-3 space-y-2 text-sm text-slate-600">
                  <div className="flex items-center justify-between gap-3">
                    <span>Metode</span>
                    <span className="font-medium uppercase text-slate-900">
                      {transaction.payment?.method || '-'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Jumlah dibayar</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(transaction.payment?.amountPaid || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Kembalian</span>
                    <span className="font-medium text-slate-900">
                      {formatCurrency(transaction.payment?.changeAmount || 0)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Referensi</span>
                    <span className="max-w-[55%] truncate text-right font-medium text-slate-900">
                      {transaction.payment?.referenceNo || '-'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl bg-slate-950 p-4 text-sm text-white">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-slate-300">Subtotal</span>
                  <span>{formatCurrency(transaction.subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-slate-300">Diskon</span>
                  <span>{formatCurrency(transaction.discount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between gap-3">
                  <span className="text-slate-300">Pajak</span>
                  <span>{formatCurrency(transaction.tax)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4 text-base font-semibold">
                  <span>Total</span>
                  <span className="text-amber-300">{formatCurrency(transaction.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-slate-200 bg-white px-4 py-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] print:hidden sm:flex-row sm:px-6">
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
  );
};
