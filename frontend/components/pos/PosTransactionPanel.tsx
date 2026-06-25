import { Banknote, CreditCard, QrCode, Receipt, ShoppingBasket, Trash2, Wallet, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';

import { CurrencyInput } from '../common/CurrencyInput';
import { QuantityStepper } from '../common/QuantityStepper';
import { formatCurrency } from '../../lib/format';
import { CartItem } from '../../store/useCartStore';
import { PaymentMethod } from '../../types/transaction';

interface PosTransactionPanelProps {
  items: CartItem[];
  subtotal: number;
  taxRate: number;
  tax: number;
  total: number;
  isSubmitting: boolean;
  onUpdateQty: (productId: number, quantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onItemDiscountChange: (productId: number, discount: number) => void;
  onClear: () => void;
  onSubmit: (values: {
    customerName: string;
    paymentMethod: PaymentMethod;
    amountPaid: number;
    referenceNo: string;
  }) => Promise<void>;
  className?: string;
  variant?: 'sidebar' | 'sheet';
  showCloseButton?: boolean;
  onClose?: () => void;
}

const paymentMethods: {
  value: PaymentMethod;
  label: string;
  icon: typeof Banknote;
}[] = [
  { value: 'cash', label: 'Tunai', icon: Banknote },
  { value: 'qris', label: 'QRIS', icon: QrCode },
  { value: 'transfer', label: 'Transfer', icon: Wallet },
  { value: 'card', label: 'Kartu', icon: CreditCard }
];

const cashPresets = [20000, 50000, 100000];

const getItemSubtotal = (item: CartItem) => item.price * item.quantity - item.discount;

export function PosTransactionPanel({
  items,
  subtotal,
  taxRate,
  tax,
  total,
  isSubmitting,
  onUpdateQty,
  onRemoveItem,
  onItemDiscountChange,
  onClear,
  onSubmit,
  className = '',
  variant = 'sidebar',
  showCloseButton = false,
  onClose
}: PosTransactionPanelProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountPaid, setAmountPaid] = useState(0);
  const [customerName, setCustomerName] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [showOptionalFields, setShowOptionalFields] = useState(false);

  const totalUnits = useMemo(
    () => items.reduce((count, item) => count + item.quantity, 0),
    [items]
  );

  useEffect(() => {
    if (items.length === 0) {
      setAmountPaid(0);
      setCustomerName('');
      setReferenceNo('');
      setShowOptionalFields(false);
    }
  }, [items.length]);

  const changeAmount = paymentMethod === 'cash' ? Math.max(0, amountPaid - total) : 0;
  const isCashInsufficient = paymentMethod === 'cash' && amountPaid > 0 && amountPaid < total;
  const isCashEmpty = paymentMethod === 'cash' && amountPaid === 0;
  const canPay = items.length > 0 && !isSubmitting && !isCashInsufficient && !isCashEmpty;
  const isSheet = variant === 'sheet';

  const handleClear = () => {
    setAmountPaid(0);
    setCustomerName('');
    setReferenceNo('');
    setShowOptionalFields(false);
    onClear();
  };

  const handlePay = async () => {
    await onSubmit({
      customerName,
      paymentMethod,
      amountPaid: paymentMethod === 'cash' ? amountPaid : total,
      referenceNo
    });
  };

  const header = (
    <div className="flex shrink-0 items-start justify-between gap-3">
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-[0.28em] text-[#9a5c18]">Transaksi</p>
        <h2 className="mt-1 text-lg font-semibold text-slate-900 sm:text-xl">Transaksi aktif</h2>
        {isSheet && items.length > 0 ? (
          <p className="mt-1 text-xs text-slate-500">
            {items.length} item · {totalUnits} qty ·{' '}
            <span className="font-semibold text-[#165b33]">{formatCurrency(total)}</span>
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {items.length > 0 ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-medium text-slate-500 transition hover:text-rose-600 sm:text-sm"
          >
            Reset
          </button>
        ) : null}
        {showCloseButton && onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup panel transaksi"
            className="rounded-xl border border-[#dccbbb] p-2 text-slate-500"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}
      </div>
    </div>
  );

  const summaryCards = items.length > 0 && !isSheet ? (
    <div className="mt-4 grid shrink-0 grid-cols-3 gap-2">
      <div className="rounded-2xl border border-[#eadfd3] bg-[#fff8ef] p-2.5 text-center">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">Item</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{items.length}</p>
      </div>
      <div className="rounded-2xl border border-[#eadfd3] bg-[#fff8ef] p-2.5 text-center">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">Qty</p>
        <p className="mt-1 text-lg font-semibold text-slate-900">{totalUnits}</p>
      </div>
      <div className="rounded-2xl border border-[#cfe4d4] bg-[#f3fcf5] p-2.5 text-center">
        <p className="text-[10px] uppercase tracking-wide text-slate-500">Total</p>
        <p className="mt-1 text-sm font-bold leading-tight text-[#165b33] sm:text-base">
          {formatCurrency(total)}
        </p>
      </div>
    </div>
  ) : null;

  const itemListContent =
    items.length === 0 ? (
      <div className="rounded-[24px] border border-dashed border-[#dccbbb] bg-[#fffaf4] px-4 py-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#f3e6d8]">
          <ShoppingBasket className="h-6 w-6 text-slate-500" />
        </div>
        <p className="mt-3 font-medium text-slate-900">Belum ada item</p>
        <p className="mt-1 text-sm text-slate-500">Ketuk produk di katalog untuk menambah.</p>
      </div>
    ) : (
      items.map((item) => (
        <div
          key={item.productId}
          className="rounded-2xl border border-[#eadfd3] bg-white p-3 sm:p-4"
        >
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-snug text-slate-900">{item.name}</p>
              <p className="mt-0.5 text-xs text-slate-500">
                {formatCurrency(item.price)} / {item.unit}
              </p>
            </div>
            <p className="shrink-0 text-sm font-bold text-[#165b33]">
              {formatCurrency(getItemSubtotal(item))}
            </p>
            <button
              type="button"
              onClick={() => onRemoveItem(item.productId)}
              className="shrink-0 rounded-lg border border-[#eadfd3] p-1.5 text-slate-400 hover:text-rose-500"
              aria-label={`Hapus ${item.name}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Jumlah
              </label>
              <QuantityStepper
                value={item.quantity}
                onChange={(next) => onUpdateQty(item.productId, next)}
                min={0}
                max={item.stock}
                size="sm"
                className="w-full max-w-none border-[#eadfd3] bg-[#f8f1e8]"
                ariaLabel={`Jumlah ${item.name}`}
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-medium uppercase tracking-wide text-slate-500">
                Diskon item
              </label>
              <CurrencyInput
                value={item.discount}
                onChange={(next) => onItemDiscountChange(item.productId, next)}
                placeholder="Rp 0"
                inputClassName="w-full border-[#eadfd3] bg-[#f8f1e8] py-2.5 text-sm"
              />
            </div>
          </div>
        </div>
      ))
    );

  const itemList = (
    <div className={isSheet ? 'space-y-3' : 'mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-0.5'}>
      {itemListContent}
    </div>
  );

  const paymentSection =
    items.length > 0 ? (
      <div className="space-y-4">
        <div className="rounded-2xl border border-[#eadfd3] bg-[#fffaf4] p-3 sm:p-4">
          <div className="space-y-2 text-sm text-slate-600">
            <div className="flex justify-between gap-3">
              <span>Subtotal</span>
              <span className="font-medium text-slate-900">{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Pajak ({Math.round(taxRate * 100)}%)</span>
              <span className="font-medium text-slate-900">{formatCurrency(tax)}</span>
            </div>
            <div className="flex justify-between gap-3 border-t border-[#eadfd3] pt-3">
              <span className="text-base font-semibold text-slate-900">Total bayar</span>
              <span className="text-lg font-bold text-[#165b33]">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Metode bayar
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {paymentMethods.map(({ value, label, icon: Icon }) => (
              <button
                key={value}
                type="button"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => setPaymentMethod(value)}
                className={`inline-flex items-center justify-center gap-1.5 rounded-2xl border px-2 py-2.5 text-xs font-semibold transition sm:text-sm ${
                  paymentMethod === value
                    ? 'border-[#1f6f43] bg-[#1f6f43] text-white'
                    : 'border-[#dccbbb] bg-white text-slate-700'
                }`}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {paymentMethod === 'cash' ? (
          <div className="space-y-3">
            <div>
              <label className="mb-1.5 block text-sm text-slate-600">Uang diterima</label>
              <CurrencyInput
                value={amountPaid}
                onChange={setAmountPaid}
                placeholder="Masukkan nominal"
                inputClassName="border-[#dccbbb] py-2.5 text-base font-semibold"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onPointerDown={(event) => event.preventDefault()}
                onClick={() => setAmountPaid(Math.ceil(total))}
                className="rounded-full border border-[#cfe4d4] bg-[#f3fcf5] px-3 py-1.5 text-xs font-semibold text-[#165b33]"
              >
                Uang pas
              </button>
              {cashPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onPointerDown={(event) => event.preventDefault()}
                  onClick={() => setAmountPaid(preset)}
                  className="rounded-full border border-[#dccbbb] bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                >
                  {formatCurrency(preset)}
                </button>
              ))}
            </div>
            <div className="rounded-2xl border border-[#cfe4d4] bg-[#f3fcf5] px-4 py-3">
              <p className="text-[10px] uppercase tracking-wide text-emerald-700/80">Kembalian</p>
              <p className="mt-0.5 text-xl font-bold text-[#165b33]">{formatCurrency(changeAmount)}</p>
            </div>
            {isCashInsufficient ? (
              <p className="text-sm text-rose-600">
                Kurang {formatCurrency(total - amountPaid)} dari total.
              </p>
            ) : null}
          </div>
        ) : (
          <div>
            <label className="mb-1.5 block text-sm text-slate-600">No. referensi (opsional)</label>
            <input
              value={referenceNo}
              onChange={(event) => setReferenceNo(event.target.value)}
              placeholder="Kode QRIS / transfer"
              className="w-full rounded-2xl border border-[#dccbbb] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#d4a373]"
            />
          </div>
        )}

        <button
          type="button"
          onClick={() => setShowOptionalFields((current) => !current)}
          className="text-xs font-medium text-[#9a5c18] underline-offset-2 hover:underline"
        >
          {showOptionalFields ? 'Sembunyikan nama pelanggan' : 'Tambah nama pelanggan (opsional)'}
        </button>

        {showOptionalFields ? (
          <div>
            <label className="mb-1.5 block text-sm text-slate-600">Nama pelanggan</label>
            <input
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder="Opsional"
              className="w-full rounded-2xl border border-[#dccbbb] bg-white px-4 py-2.5 text-sm outline-none focus:border-[#d4a373]"
            />
          </div>
        ) : null}

        <button
          type="button"
          disabled={!canPay}
          onPointerDown={(event) => event.preventDefault()}
          onClick={handlePay}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#1f6f43] px-4 py-3.5 text-sm font-bold text-white transition hover:bg-[#185a36] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Receipt className="h-4 w-4" />
          {isSubmitting ? 'Memproses...' : 'Bayar & Cetak Struk'}
        </button>
      </div>
    ) : null;

  if (isSheet) {
    return (
      <div className={`flex min-h-0 flex-1 flex-col overflow-hidden ${className}`}>
        <div className="shrink-0">{header}</div>
        <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y pb-[calc(env(safe-area-inset-bottom)+0.5rem)] [-webkit-overflow-scrolling:touch]">
          <div className="space-y-3">{itemListContent}</div>
          {paymentSection ? (
            <div className="mt-4 border-t border-[#eadfd3] pt-4">{paymentSection}</div>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex min-h-0 flex-col ${className}`}>
      {header}
      {summaryCards}
      {itemList}
      {paymentSection ? (
        <div className="mt-4 shrink-0 space-y-4 border-t border-[#eadfd3] pt-4">{paymentSection}</div>
      ) : null}
    </div>
  );
}
