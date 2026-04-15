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
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 p-0 backdrop-blur sm:items-center sm:justify-center sm:p-6 print:static print:bg-transparent">
      <div className="w-full rounded-t-[28px] border border-white/10 bg-white text-slate-900 sm:max-w-2xl sm:rounded-[28px] print:max-w-none print:border-0">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 print:hidden sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Struk</p>
            <h3 className="mt-1 text-xl font-semibold">Transaksi berhasil</h3>
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
            <div className="text-center">
              <h4 className="text-xl font-semibold">{receipt.store.name}</h4>
              <p className="mt-1 text-sm text-slate-500">Sistem Informasi Kasir</p>
            </div>

            <div className="mt-6 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
              <p>No. Invoice: {receipt.invoiceNumber}</p>
              <p className="sm:text-right">{formatDateTime(receipt.createdAt)}</p>
              <p>Kasir: {receipt.cashier.name}</p>
              <p className="sm:text-right">
                Pelanggan: {receipt.customerName || '-'}
              </p>
            </div>

            <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-100 text-left text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Item</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Harga</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {receipt.items.map((item) => (
                    <tr key={`${item.productId}-${item.productName}`}>
                      <td className="px-4 py-3">{item.productName}</td>
                      <td className="px-4 py-3 text-center">{item.quantity}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(item.price)}</td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(item.subtotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-6 space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span>{formatCurrency(receipt.summary.subtotal)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Diskon</span>
                <span>{formatCurrency(receipt.summary.discount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Pajak</span>
                <span>{formatCurrency(receipt.summary.tax)}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 pt-3 text-base font-semibold">
                <span>Total</span>
                <span>{formatCurrency(receipt.summary.total)}</span>
              </div>
            </div>

            <div className="mt-6 rounded-2xl bg-slate-950 px-4 py-4 text-sm text-white">
              <div className="flex items-center justify-between">
                <span>Metode bayar</span>
                <span className="uppercase">{receipt.payment.method}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Jumlah dibayar</span>
                <span>{formatCurrency(receipt.payment.amountPaid)}</span>
              </div>
              <div className="mt-2 flex items-center justify-between">
                <span>Kembalian</span>
                <span>{formatCurrency(receipt.payment.changeAmount)}</span>
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
    </div>
  );
};

