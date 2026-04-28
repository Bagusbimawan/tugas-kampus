import { X } from 'lucide-react';
import { ChangeEvent, useEffect, useMemo, useState } from 'react';

import { CartItem } from '../../store/useCartStore';
import { PaymentMethod } from '../../types/transaction';
import { formatCurrency } from '../../lib/format';

interface CheckoutModalProps {
  isOpen: boolean;
  items: CartItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    customerName: string;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    referenceNo: string;
  }) => Promise<void>;
}

const paymentMethods: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Tunai' },
  { value: 'qris', label: 'QRIS' },
  { value: 'transfer', label: 'Transfer' },
  { value: 'card', label: 'Kartu' }
];

export const CheckoutModal = ({
  isOpen,
  items,
  subtotal,
  discount,
  tax,
  total,
  isSubmitting,
  onClose,
  onSubmit
}: CheckoutModalProps) => {
  const [customerName, setCustomerName] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [referenceNo, setReferenceNo] = useState('');

  useEffect(() => {
    if (!isOpen) {
      setCustomerName('');
      setPaymentMethod('cash');
      setAmountPaid('');
      setReferenceNo('');
    }
  }, [isOpen]);

  const amountValue = Number(amountPaid || 0);
  const changeAmount = paymentMethod === 'cash' ? Math.max(0, amountValue - total) : 0;
  const isCashInsufficient = paymentMethod === 'cash' && amountValue < total;
  const disableSubmit = items.length === 0 || isSubmitting || isCashInsufficient;

  const modalTotalItems = useMemo(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  const handleAmountChange = (event: ChangeEvent<HTMLInputElement>) => {
    setAmountPaid(event.target.value);
  };

  const handleSubmit = async () => {
    await onSubmit({
      customerName,
      paymentMethod,
      amountPaid: paymentMethod === 'cash' ? amountValue : total,
      referenceNo
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end overflow-y-auto bg-slate-950/70 p-0 backdrop-blur sm:items-center sm:justify-center sm:p-6">
      <div className="flex max-h-[100dvh] w-full flex-col overflow-hidden rounded-t-[28px] border border-white/10 bg-slate-950 text-white sm:max-h-[90vh] sm:max-w-4xl sm:rounded-[28px]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Checkout</p>
            <h3 className="mt-1 text-xl font-semibold">Konfirmasi pembayaran</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 p-2 text-slate-300"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid flex-1 gap-0 overflow-hidden lg:grid-cols-[1.1fr_0.9fr]">
          <div className="border-b border-white/10 p-4 sm:p-6 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2 text-sm text-slate-300">
              <span>Ringkasan item</span>
              <span>{modalTotalItems} item</span>
            </div>

            <div className="max-h-[32vh] space-y-3 overflow-y-auto pr-1 sm:max-h-[42vh]">
              {items.map((item) => (
                <div
                  key={item.productId}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{item.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {item.quantity} x {formatCurrency(item.price)}
                      </p>
                    </div>
                    <p className="text-sm font-medium text-amber-300 sm:text-right">
                      {formatCurrency(item.price * item.quantity - item.discount)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="overflow-y-auto p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] sm:p-6">
            <div className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-slate-300">Nama pelanggan</label>
                <input
                  value={customerName}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Opsional"
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
                />
              </div>

              <div>
                <p className="mb-2 text-sm text-slate-300">Metode pembayaran</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {paymentMethods.map((method) => (
                    <button
                      key={method.value}
                      type="button"
                      onClick={() => setPaymentMethod(method.value)}
                      className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                        paymentMethod === method.value
                          ? 'border-amber-300 bg-amber-300 text-slate-950'
                          : 'border-white/10 bg-white/5 text-slate-200'
                      }`}
                    >
                      {method.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === 'cash' ? (
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Uang diterima</label>
                  <input
                    type="number"
                    min={0}
                    value={amountPaid}
                    onChange={handleAmountChange}
                    placeholder="Masukkan nominal"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
                  />
                  <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-4 py-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
                      Kembalian
                    </p>
                    <p className="mt-1 text-lg font-semibold text-emerald-300">
                      {formatCurrency(changeAmount)}
                    </p>
                  </div>
                  {isCashInsufficient ? (
                    <p className="mt-2 text-sm text-rose-300">Nominal pembayaran kurang.</p>
                  ) : null}
                </div>
              ) : (
                <div>
                  <label className="mb-2 block text-sm text-slate-300">Nomor referensi</label>
                  <input
                    value={referenceNo}
                    onChange={(event) => setReferenceNo(event.target.value)}
                    placeholder="Opsional"
                    className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
                  />
                </div>
              )}

              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm text-slate-300">
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                  <span>Diskon</span>
                  <span>{formatCurrency(discount)}</span>
                </div>
                <div className="mt-2 flex items-center justify-between text-sm text-slate-300">
                  <span>Pajak</span>
                  <span>{formatCurrency(tax)}</span>
                </div>
                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                  <span className="text-base font-semibold">Total</span>
                  <span className="text-xl font-bold text-amber-300">{formatCurrency(total)}</span>
                </div>
              </div>

              <div className="sticky bottom-0 -mx-4 border-t border-white/10 bg-slate-950/95 px-4 pt-4 backdrop-blur sm:static sm:mx-0 sm:border-t-0 sm:bg-transparent sm:px-0 sm:pt-0">
                <button
                  type="button"
                  disabled={disableSubmit}
                  onClick={handleSubmit}
                  className="w-full rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Memproses transaksi...' : 'Konfirmasi Pembayaran'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
