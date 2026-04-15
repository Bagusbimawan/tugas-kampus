import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Minus, Plus, Search, ShoppingBasket, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthGuard } from '../../components/AuthGuard';
import { KasirLayout } from '../../components/layouts/KasirLayout';
import { CheckoutModal } from '../../components/pos/CheckoutModal';
import { ReceiptModal } from '../../components/pos/ReceiptModal';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatCurrency } from '../../lib/format';
import { api } from '../../services/api';
import { CartItem, useCartStore } from '../../store/useCartStore';
import { Category, Product, ProductListResponse } from '../../types/product';
import {
  CreateTransactionPayload,
  CreateTransactionResponse,
  ReceiptResponse
} from '../../types/transaction';

const STORE_SETTINGS = {
  name: 'Toko Gunadarma',
  taxRate: 0.11
};

const getStockBadgeClass = (product: Product) => {
  if (product.stock === 0) {
    return 'bg-rose-500/15 text-rose-300';
  }

  if (product.stock <= product.minStock) {
    return 'bg-amber-400/15 text-amber-300';
  }

  return 'bg-emerald-400/15 text-emerald-300';
};

const getCartItemSubtotal = (item: CartItem) => item.price * item.quantity - item.discount;

export default function KasirPage() {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [cartDiscount, setCartDiscount] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [receiptData, setReceiptData] = useState<ReceiptResponse | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { items, addItem, updateQty, removeItem, clearCart, getSubtotal } = useCartStore();

  const categoriesQuery = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get<Category[]>('/categories');
      return data;
    }
  });

  const allProductsQuery = useQuery({
    queryKey: ['products', selectedCategoryId],
    queryFn: async () => {
      const params =
        selectedCategoryId === 'all'
          ? { isActive: true, limit: 100 }
          : { categoryId: selectedCategoryId, isActive: true, limit: 100 };
      const { data } = await api.get<ProductListResponse>('/products', { params });
      return data.data;
    },
    enabled: debouncedSearch.length === 0
  });

  const searchProductsQuery = useQuery({
    queryKey: ['product-search', debouncedSearch],
    queryFn: async () => {
      const { data } = await api.get<Product[]>('/products/search', {
        params: { q: debouncedSearch }
      });
      return data;
    },
    enabled: debouncedSearch.length > 0
  });

  const displayedProducts = useMemo(() => {
    const source = debouncedSearch.length > 0 ? searchProductsQuery.data : allProductsQuery.data;

    if (!source) {
      return [];
    }

    if (selectedCategoryId === 'all' || debouncedSearch.length === 0) {
      return source;
    }

    return source.filter((product) => product.categoryId === selectedCategoryId);
  }, [allProductsQuery.data, debouncedSearch.length, searchProductsQuery.data, selectedCategoryId]);

  const subtotal = getSubtotal();
  const taxableAmount = Math.max(0, subtotal - cartDiscount);
  const tax = Math.round(taxableAmount * STORE_SETTINGS.taxRate);
  const total = Math.max(0, subtotal - cartDiscount + tax);

  const createTransactionMutation = useMutation({
    mutationFn: async (payload: CreateTransactionPayload) => {
      const { data } = await api.post<CreateTransactionResponse>('/transactions', payload);
      return data;
    },
    onSuccess: async (response) => {
      const { data } = await api.get<ReceiptResponse>(
        `/transactions/${response.transactionId}/receipt`
      );
      setReceiptData(data);
      setIsCheckoutOpen(false);
      setIsReceiptOpen(true);
      clearCart();
      setCartDiscount(0);
      toast.success('Transaksi berhasil disimpan');
      await queryClient.invalidateQueries({ queryKey: ['products'] });
      await queryClient.invalidateQueries({ queryKey: ['product-search'] });
      await queryClient.invalidateQueries({ queryKey: ['transactions'] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || 'Gagal memproses transaksi');
    }
  });

  const isLoadingProducts =
    categoriesQuery.isLoading || allProductsQuery.isLoading || searchProductsQuery.isLoading;

  const handleCheckout = async (values: {
    customerName: string;
    paymentMethod: CreateTransactionPayload['payment']['method'];
    amountPaid: number;
    referenceNo: string;
  }) => {
    const payload: CreateTransactionPayload = {
      customerName: values.customerName || undefined,
      discount: cartDiscount,
      tax,
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        discount: item.discount
      })),
      payment: {
        method: values.paymentMethod,
        amountPaid: values.amountPaid,
        referenceNo: values.referenceNo || undefined
      }
    };

    await createTransactionMutation.mutateAsync(payload);
  };

  return (
    <AuthGuard allowedRoles={['admin', 'kasir']}>
      <KasirLayout>
        <div className="mb-6 rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-300">{STORE_SETTINGS.name}</p>
              <h1 className="mt-2 text-2xl font-semibold sm:text-3xl">Point of Sale</h1>
              <p className="mt-2 max-w-2xl text-sm text-slate-300">
                Cari produk, tambahkan ke keranjang, lalu proses pembayaran langsung dari satu layar.
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Item</p>
                <p className="mt-2 text-xl font-semibold text-amber-300">{items.length}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Subtotal</p>
                <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(subtotal)}</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-slate-950/30 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Total</p>
                <p className="mt-2 text-xl font-semibold text-emerald-300">{formatCurrency(total)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(360px,2fr)]">
          <section className="space-y-5">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 sm:p-6">
              <div className="flex flex-col gap-4">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari nama produk atau SKU"
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/40 py-3 pl-11 pr-4 text-sm outline-none placeholder:text-slate-500"
                  />
                </div>

                <div className="flex gap-3 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryId('all')}
                    className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm transition ${
                      selectedCategoryId === 'all'
                        ? 'bg-amber-300 text-slate-950'
                        : 'bg-white/5 text-slate-200'
                    }`}
                  >
                    Semua
                  </button>
                  {categoriesQuery.data?.map((category) => (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => setSelectedCategoryId(category.id)}
                      className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm transition ${
                        selectedCategoryId === category.id
                          ? 'bg-amber-300 text-slate-950'
                          : 'bg-white/5 text-slate-200'
                      }`}
                    >
                      {category.name}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {isLoadingProducts
                ? Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-52 animate-pulse rounded-[28px] border border-white/10 bg-white/5"
                    />
                  ))
                : displayedProducts.map((product) => {
                    const isOutOfStock = product.stock === 0;

                    return (
                      <button
                        key={product.id}
                        type="button"
                        disabled={isOutOfStock}
                        onClick={() => {
                          addItem(product);
                          if (!isOutOfStock) {
                            toast.success(`${product.name} ditambahkan`);
                          }
                        }}
                        className={`overflow-hidden rounded-[28px] border p-0 text-left transition ${
                          isOutOfStock
                            ? 'cursor-not-allowed border-white/5 bg-white/5 opacity-50'
                            : 'border-white/10 bg-white/5 hover:-translate-y-1 hover:border-amber-300/40'
                        }`}
                      >
                        {product.imageUrl ? (
                          <div className="h-32 overflow-hidden bg-slate-900/40">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="flex h-32 items-center justify-center bg-[linear-gradient(135deg,_rgba(250,204,21,0.2),_rgba(15,23,42,0.8))]">
                            <ShoppingBasket className="h-10 w-10 text-white/70" />
                          </div>
                        )}
                        <div className="space-y-3 p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="line-clamp-2 font-medium">{product.name}</p>
                              <p className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-400">
                                {product.category?.name || 'Tanpa kategori'}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-medium ${getStockBadgeClass(product)}`}
                            >
                              Stok {product.stock}
                            </span>
                          </div>
                          <div className="flex items-end justify-between">
                            <p className="text-lg font-semibold text-amber-300">
                              {formatCurrency(product.price)}
                            </p>
                            <p className="text-xs text-slate-400">Min {product.minStock}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
            </div>

            {!isLoadingProducts && displayedProducts.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-white/15 bg-white/5 p-10 text-center">
                <p className="text-lg font-medium">Produk tidak ditemukan</p>
                <p className="mt-2 text-sm text-slate-400">
                  Ubah kata kunci pencarian atau pilih kategori lain.
                </p>
              </div>
            ) : null}
          </section>

          <aside className="rounded-[28px] border border-white/10 bg-slate-950/45 p-5 sm:p-6 lg:sticky lg:top-24 lg:h-fit">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Keranjang</p>
                <h2 className="mt-2 text-xl font-semibold">Pesanan saat ini</h2>
              </div>
              <button
                type="button"
                onClick={clearCart}
                className="text-sm text-slate-400 transition hover:text-white"
              >
                Kosongkan
              </button>
            </div>

            <div className="mt-6 space-y-4">
              {items.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-white/15 bg-white/5 px-5 py-10 text-center">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
                    <ShoppingBasket className="h-7 w-7 text-slate-400" />
                  </div>
                  <p className="mt-4 font-medium">Keranjang masih kosong</p>
                  <p className="mt-2 text-sm text-slate-400">
                    Pilih produk dari katalog untuk memulai transaksi.
                  </p>
                </div>
              ) : (
                <div className="max-h-[44vh] space-y-3 overflow-y-auto pr-1">
                  {items.map((item) => (
                    <div
                      key={item.productId}
                      className="rounded-[24px] border border-white/10 bg-white/5 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {formatCurrency(item.price)} / {item.unit}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.productId)}
                          className="rounded-xl border border-white/10 p-2 text-slate-400 transition hover:text-rose-300"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between gap-3">
                        <div className="inline-flex items-center rounded-2xl border border-white/10 bg-slate-950/40">
                          <button
                            type="button"
                            onClick={() => updateQty(item.productId, item.quantity - 1)}
                            className="p-3 text-slate-300"
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="min-w-12 px-3 text-center text-sm font-medium">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.productId, item.quantity + 1)}
                            className="p-3 text-slate-300"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </div>
                        <p className="text-sm font-semibold text-amber-300">
                          {formatCurrency(getCartItemSubtotal(item))}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-6 rounded-[24px] border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm text-slate-300">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="mt-4">
                <label className="mb-2 block text-sm text-slate-300">Diskon transaksi</label>
                <input
                  type="number"
                  min={0}
                  value={cartDiscount}
                  onChange={(event) => setCartDiscount(Math.max(0, Number(event.target.value || 0)))}
                  className="w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm outline-none"
                />
              </div>
              <div className="mt-4 flex items-center justify-between text-sm text-slate-300">
                <span>Pajak ({Math.round(STORE_SETTINGS.taxRate * 100)}%)</span>
                <span>{formatCurrency(tax)}</span>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-base font-semibold">Total</span>
                <span className="text-2xl font-bold text-emerald-300">
                  {formatCurrency(total)}
                </span>
              </div>
            </div>

            <button
              type="button"
              disabled={items.length === 0}
              onClick={() => setIsCheckoutOpen(true)}
              className="mt-6 w-full rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Checkout
            </button>
          </aside>
        </div>

        <CheckoutModal
          isOpen={isCheckoutOpen}
          items={items}
          subtotal={subtotal}
          discount={cartDiscount}
          tax={tax}
          total={total}
          isSubmitting={createTransactionMutation.isPending}
          onClose={() => setIsCheckoutOpen(false)}
          onSubmit={handleCheckout}
        />

        <ReceiptModal
          isOpen={isReceiptOpen}
          receipt={receiptData}
          onClose={() => setIsReceiptOpen(false)}
        />
      </KasirLayout>
    </AuthGuard>
  );
}
