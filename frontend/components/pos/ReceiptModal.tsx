import { Printer, X } from 'lucide-react';

import { ReceiptResponse } from '../../types/transaction';
import { formatCurrency, formatDateTime } from '../../lib/format';

interface ReceiptModalProps {
  isOpen: boolean;
  receipt: ReceiptResponse | null;
  onClose: () => void;
}

export const ReceiptModal = ({ isOpen, receipt, onClose }: ReceiptModalProps) => {
  if (!isOpen || !receipt) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end sm:items-center sm:justify-center sm:p-6 print:static print:bg-transparent">
      <button
        type="button"
        aria-label="Tutup struk"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur print:hidden"
        onClick={onClose}
      />

      <div className="relative flex h-[min(92dvh,100%)] max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-white text-slate-900 sm:h-auto sm:max-h-[min(90dvh,44rem)] sm:max-w-2xl sm:rounded-[28px] print:max-w-none print:border-0">
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 px-4 py-4 print:hidden sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Struk</p>
            <h3 className="mt-1 text-lg font-semibold sm:text-xl">Transaksi berhasil</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y px-4 py-4 sm:px-6 sm:py-5 print:overflow-visible print:p-0 [-webkit-overflow-scrolling:touch]">
          <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-4 sm:rounded-[28px] sm:p-5 print:border-0 print:bg-white print:p-0">
            <div className="text-center">
              <h4 className="text-lg font-semibold sm:text-xl">{receipt.store.name}</h4>
              {receipt.store.address ? (
                <p className="mt-1 text-sm text-slate-500">{receipt.store.address}</p>
              ) : null}
              {receipt.store.phone ? (
                <p className="mt-1 text-sm text-slate-500">Telp: {receipt.store.phone}</p>
              ) : null}
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">Sistem Informasi Kasir</p>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:mt-6 sm:grid-cols-2">
              <p className="break-all">No. Invoice: {receipt.invoiceNumber}</p>
              <p className="sm:text-right">{formatDateTime(receipt.createdAt)}</p>
              <p>Kasir: {receipt.cashier.name}</p>
              <p className="sm:text-right">Pelanggan: {receipt.customerName || '-'}</p>
            </div>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white sm:mt-6">
              <div className="border-b border-slate-200 bg-slate-100 px-3 py-2.5 sm:px-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Item Belanja
                </p>
              </div>

              <div className="max-h-[min(240px,32dvh)] overflow-y-auto overscroll-contain sm:max-h-[min(280px,36dvh)]">
                <div className="divide-y divide-slate-200 md:hidden">
                  {receipt.items.map((item) => (
                    <div
                      key={`${item.productId}-${item.productName}`}
                      className="space-y-2 px-3 py-3 text-sm sm:px-4"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 font-medium leading-snug text-slate-900">
                          {item.productName}
                        </p>
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
                      <th className="w-[44%] px-3 py-2.5 font-semibold sm:px-4 sm:py-3">Item</th>
                      <th className="w-[10%] px-2 py-2.5 text-center font-semibold sm:px-3 sm:py-3">
                        Qty
                      </th>
                      <th className="w-[23%] px-2 py-2.5 text-right font-semibold sm:px-3 sm:py-3">
                        Harga
                      </th>
                      <th className="w-[23%] px-3 py-2.5 text-right font-semibold sm:px-4 sm:py-3">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {receipt.items.map((item) => (
                      <tr key={`${item.productId}-${item.productName}`}>
                        <td className="px-3 py-3 font-medium text-slate-900 sm:px-4">
                          {item.productName}
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

            <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-4 text-sm sm:mt-6">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatCurrency(receipt.summary.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Diskon</span>
                <span>{formatCurrency(receipt.summary.discount)}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Pajak</span>
                <span>{formatCurrency(receipt.summary.tax)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-3 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(receipt.summary.total)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-2xl bg-slate-950 px-4 py-4 text-sm text-white sm:mt-6">
              <div className="flex items-center justify-between gap-3">
                <span>Metode bayar</span>
                <span className="uppercase">{receipt.payment.method}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span>Jumlah dibayar</span>
                <span>{formatCurrency(receipt.payment.amountPaid)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3">
                <span>Kembalian</span>
                <span>{formatCurrency(receipt.payment.changeAmount)}</span>
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
            Print
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
