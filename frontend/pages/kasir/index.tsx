import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ImageOff,
  Minus,
  Package2,
  Plus,
  Search,
  ShoppingBasket,
  Sparkles,
  Trash2,
  X
} from 'lucide-react';
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

const MAX_PRODUCTS = 100;

const getStockBadgeClass = (product: Product) => {
  if (product.stock === 0) {
    return 'bg-rose-100 text-rose-700';
  }

  if (product.stock <= product.minStock) {
    return 'bg-amber-100 text-amber-800';
  }

  return 'bg-emerald-100 text-emerald-700';
};

const getCartItemSubtotal = (item: CartItem) => item.price * item.quantity - item.discount;

const toAbsoluteImageUrl = (value?: string | null) => {
  if (!value) {
    return null;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiBaseUrl) {
    return value;
  }

  return `${apiBaseUrl.replace(/\/+$/, '')}/${value.replace(/^\/+/, '')}`;
};

const normalizeProducts = (payload?: Product[] | ProductListResponse | { data?: Product[] }) => {
  if (!payload) {
    return [];
  }

  if (Array.isArray(payload)) {
    return payload;
  }

  if (Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
};

export default function KasirPage() {
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | 'all'>('all');
  const [search, setSearch] = useState('');
  const [cartDiscount, setCartDiscount] = useState(0);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isDesktopCartOpen, setIsDesktopCartOpen] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [brokenImageIds, setBrokenImageIds] = useState<number[]>([]);
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
          ? { isActive: true, limit: MAX_PRODUCTS }
          : { categoryId: selectedCategoryId, isActive: true, limit: MAX_PRODUCTS };
      const { data } = await api.get<ProductListResponse>('/products', { params });
      return normalizeProducts(data);
    },
    enabled: debouncedSearch.length === 0
  });

  const searchProductsQuery = useQuery({
    queryKey: ['product-search', debouncedSearch],
    queryFn: async () => {
      const { data } = await api.get<Product[] | { data?: Product[] }>('/products/search', {
        params: { q: debouncedSearch }
      });

      return normalizeProducts(data);
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
  const totalUnitsInCart = items.reduce((sum, item) => sum + item.quantity, 0);
  const hasCartItems = items.length > 0;
  const activeCategoryLabel =
    selectedCategoryId === 'all'
      ? 'Semua kategori'
      : categoriesQuery.data?.find((category) => category.id === selectedCategoryId)?.name ||
        'Kategori';

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
  const productsError = allProductsQuery.error || searchProductsQuery.error;

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

  const cartContent = (
    <>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.32em] text-[#9a5c18]">Ringkasan</p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">Pesanan aktif</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={clearCart}
            className="text-sm text-slate-500 transition hover:text-slate-900"
          >
            Kosongkan
          </button>
          <button
            type="button"
            onClick={() => setIsMobileCartOpen(false)}
            className="rounded-xl border border-[#dccbbb] p-2 text-slate-500 lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <div className="rounded-[22px] border border-[#eadfd3] bg-[#fff8ef] p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Baris</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{items.length}</p>
        </div>
        <div className="rounded-[22px] border border-[#eadfd3] bg-[#fff8ef] p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Qty</p>
          <p className="mt-2 text-xl font-semibold text-slate-900">{totalUnitsInCart}</p>
        </div>
        <div className="rounded-[22px] border border-[#d1e4d7] bg-[#f5fff7] p-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Total</p>
          <p className="mt-2 truncate text-xl font-semibold text-[#165b33]">
            {formatCurrency(total)}
          </p>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {items.length === 0 ? (
          <div className="rounded-[28px] border border-dashed border-[#dccbbb] bg-[#fffaf4] px-5 py-10 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#f3e6d8]">
              <ShoppingBasket className="h-7 w-7 text-slate-500" />
            </div>
            <p className="mt-4 font-medium text-slate-900">Keranjang masih kosong</p>
            <p className="mt-2 text-sm text-slate-500">
              Pilih produk dari katalog untuk memulai transaksi.
            </p>
          </div>
        ) : (
          <div className="max-h-[40vh] space-y-3 overflow-y-auto pr-1 lg:max-h-[44vh]">
            {items.map((item) => (
              <div
                key={item.productId}
                className="rounded-[24px] border border-[#eadfd3] bg-[#fffdf9] p-4 shadow-[0_18px_45px_-32px_rgba(15,23,42,0.35)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="break-words font-medium text-slate-900">{item.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {formatCurrency(item.price)} / {item.unit}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.productId)}
                    className="rounded-xl border border-[#eadfd3] p-2 text-slate-400 transition hover:border-rose-200 hover:text-rose-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

                <div className="mt-4 flex flex-col gap-3 min-[360px]:flex-row min-[360px]:items-center min-[360px]:justify-between">
                  <div className="inline-flex items-center self-start rounded-2xl border border-[#eadfd3] bg-[#f8f1e8]">
                    <button
                      type="button"
                      onClick={() => updateQty(item.productId, item.quantity - 1)}
                      className="p-3 text-slate-700"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-12 px-3 text-center text-sm font-medium text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.productId, item.quantity + 1)}
                      className="p-3 text-slate-700"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="self-end text-sm font-semibold text-[#9a5c18] min-[360px]:self-auto">
                    {formatCurrency(getCartItemSubtotal(item))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-6 rounded-[28px] border border-[#eadfd3] bg-[#fffaf4] p-4">
        <div className="flex items-center justify-between gap-3 text-sm text-slate-600">
          <span>Subtotal</span>
          <span className="text-right font-medium text-slate-900">{formatCurrency(subtotal)}</span>
        </div>
        <div className="mt-4">
          <label className="mb-2 block text-sm text-slate-600">Diskon transaksi</label>
          <input
            type="number"
            min={0}
            value={cartDiscount}
            onChange={(event) => setCartDiscount(Math.max(0, Number(event.target.value || 0)))}
            className="w-full rounded-2xl border border-[#dccbbb] bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-[#d4a373]"
          />
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 text-sm text-slate-600">
          <span>Pajak ({Math.round(STORE_SETTINGS.taxRate * 100)}%)</span>
          <span className="text-right font-medium text-slate-900">{formatCurrency(tax)}</span>
        </div>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-[#eadfd3] pt-4">
          <span className="text-base font-semibold text-slate-900">Total</span>
          <span className="text-right text-xl font-bold text-[#165b33] sm:text-2xl">
            {formatCurrency(total)}
          </span>
        </div>
      </div>

      <button
        type="button"
        disabled={items.length === 0}
        onClick={() => {
          setIsMobileCartOpen(false);
          setIsCheckoutOpen(true);
        }}
        className="mt-6 w-full rounded-2xl bg-[#1f6f43] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#185a36] disabled:cursor-not-allowed disabled:opacity-60"
      >
        Checkout
      </button>
    </>
  );

  return (
    <AuthGuard allowedRoles={['admin', 'kasir']}>
      <KasirLayout>
        <div className="relative overflow-hidden rounded-[30px] border border-[#e7d7c8] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(255,248,240,0.95)_40%,_rgba(245,232,216,0.88)_72%,_rgba(229,219,208,0.85)_100%)] p-4 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.45)] sm:p-6">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(31,111,67,0.2),_transparent_58%)]" />
          <div className="relative flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dccbbb] bg-white/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-[#9a5c18]">
                <Sparkles className="h-3.5 w-3.5" />
                {STORE_SETTINGS.name}
              </div>
              <h1 className="mt-4 max-w-2xl text-3xl font-semibold leading-tight text-slate-900 sm:text-4xl">
                Kasir yang lebih rapi, cepat dipindai, dan nyaman dipakai di semua ukuran layar.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Cari produk, pilih kategori, lihat foto item, lalu proses pembayaran dari satu
                layar dengan pola katalog ala e-commerce.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-[24px] border border-[#e3d4c6] bg-white/75 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Item</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{items.length}</p>
              </div>
              <div className="rounded-[24px] border border-[#e3d4c6] bg-white/75 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Qty</p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{totalUnitsInCart}</p>
              </div>
              <div className="rounded-[24px] border border-[#e3d4c6] bg-white/75 px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Kategori</p>
                <p className="mt-2 line-clamp-2 text-sm font-semibold text-slate-900">
                  {activeCategoryLabel}
                </p>
              </div>
              <div className="rounded-[24px] border border-[#cfe4d4] bg-[#f3fcf5] px-4 py-4">
                <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Bayar</p>
                <p className="mt-2 text-lg font-semibold text-[#165b33] sm:text-2xl">
                  {formatCurrency(total)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-5 space-y-5 sm:mt-6 sm:space-y-6">
          <section className="space-y-5">
            <div className="rounded-[28px] border border-[#e7d7c8] bg-[linear-gradient(180deg,rgba(255,250,244,0.98),rgba(250,241,231,0.94))] p-4 shadow-[0_24px_55px_-40px_rgba(15,23,42,0.35)] sm:p-5">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#9a5c18]">
                      Katalog Produk
                    </p>
                    <h2 className="mt-2 text-xl font-semibold text-slate-900 sm:text-2xl">
                      Pilih produk dan tambah ke transaksi
                    </h2>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <div className="rounded-full border border-[#eadfd3] bg-white/85 px-3 py-2 text-sm text-slate-600">
                      {displayedProducts.length} produk
                    </div>
                    <div className="rounded-full border border-[#eadfd3] bg-white/85 px-3 py-2 text-sm text-slate-600">
                      {debouncedSearch ? `Cari: ${debouncedSearch}` : activeCategoryLabel}
                    </div>
                  </div>
                </div>

                <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(320px,auto)] lg:items-center lg:gap-4">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Cari nama produk atau SKU"
                      className="w-full rounded-[20px] border border-[#dccbbb] bg-white px-11 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#d4a373]"
                    />
                  </div>
                  <div className="hidden lg:flex lg:flex-wrap lg:items-center lg:justify-end lg:gap-3 rounded-[20px] border border-[#d9e8dd] bg-[#f3fcf5] px-4 py-3">
                    <div className="rounded-full border border-[#dceadf] bg-white/80 px-3 py-1.5">
                      <p className="text-[11px] uppercase tracking-[0.18em] text-slate-500">Keranjang</p>
                    </div>
                    <div className="rounded-full border border-[#dceadf] bg-white/80 px-3 py-1.5">
                      <p className="text-sm font-semibold text-slate-900">
                        {hasCartItems ? `${items.length} item` : 'Kosong'}
                      </p>
                    </div>
                    <div className="rounded-full border border-[#cfe4d4] bg-white px-3 py-1.5">
                      <p className="text-sm font-semibold text-[#165b33]">{formatCurrency(total)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsDesktopCartOpen((value) => !value)}
                      className="inline-flex items-center gap-1 rounded-full border border-[#cfe4d4] bg-white px-3.5 py-2 text-xs font-semibold text-slate-700"
                    >
                      {isDesktopCartOpen ? 'Tutup' : 'Lihat'}
                      {isDesktopCartOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={!hasCartItems}
                      onClick={() => setIsCheckoutOpen(true)}
                      className="rounded-full bg-[#1f6f43] px-4 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      Checkout
                    </button>
                  </div>
                </div>

                <div className="-mx-4 overflow-x-auto px-4 sm:-mx-5 sm:px-5">
                  <div className="flex min-w-max gap-2 pb-1">
                    <button
                      type="button"
                      onClick={() => setSelectedCategoryId('all')}
                      className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
                        selectedCategoryId === 'all'
                          ? 'border-[#1f6f43] bg-[#1f6f43] text-white'
                          : 'border-[#dccbbb] bg-white/85 text-slate-700'
                      }`}
                    >
                      Semua
                    </button>
                    {categoriesQuery.data?.map((category) => (
                      <button
                        key={category.id}
                        type="button"
                        onClick={() => setSelectedCategoryId(category.id)}
                        className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
                          selectedCategoryId === category.id
                            ? 'border-[#1f6f43] bg-[#1f6f43] text-white'
                            : 'border-[#dccbbb] bg-white/85 text-slate-700'
                        }`}
                      >
                        {category.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="hidden lg:block">
              {isDesktopCartOpen ? (
                <div className="rounded-[28px] border border-[#e7d7c8] bg-[linear-gradient(180deg,rgba(255,251,247,0.98),rgba(248,239,229,0.92))] p-5 shadow-[0_24px_55px_-40px_rgba(15,23,42,0.35)]">
                  {cartContent}
                </div>
              ) : null}
            </div>

            {productsError ? (
              <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 sm:p-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-xl bg-rose-100 p-2 text-rose-500">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium text-rose-700">Produk gagal dimuat</p>
                    <p className="mt-1 text-sm text-rose-600">
                      Coba muat ulang data produk. Jika masih gagal, cek API produk di backend.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        void allProductsQuery.refetch();
                        if (debouncedSearch.length > 0) {
                          void searchProductsQuery.refetch();
                        }
                      }}
                      className="mt-3 rounded-xl bg-rose-500 px-3 py-2 text-sm font-semibold text-white"
                    >
                      Coba lagi
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-4">
              {isLoadingProducts
                ? Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-40 animate-pulse rounded-[24px] border border-[#eadfd3] bg-[#f8efe5] sm:h-44"
                    />
                  ))
                : displayedProducts.map((product) => {
                    const isOutOfStock = product.stock === 0;
                    const imageUrl = toAbsoluteImageUrl(product.imageUrl);
                    const isImageBroken = brokenImageIds.includes(product.id);
                    const hasImage = Boolean(imageUrl) && !isImageBroken;

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
                        className={`group relative overflow-hidden rounded-[24px] border p-0 text-left transition ${
                          isOutOfStock
                            ? 'cursor-not-allowed border-[#eee2d6] bg-[#f4ede6] opacity-60'
                            : 'border-[#eadfd3] bg-[#fffdf9] shadow-[0_18px_38px_-32px_rgba(15,23,42,0.4)] hover:-translate-y-1 hover:border-[#d4a373]'
                        }`}
                      >
                        {hasImage ? (
                          <div className="aspect-[5/4] w-full overflow-hidden bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.88),rgba(242,231,219,0.92)_55%,rgba(223,207,191,0.98))]">
                            <img
                              src={imageUrl || undefined}
                              alt={product.name}
                              className="h-full w-full object-contain p-2.5 transition duration-300 group-hover:scale-[1.04]"
                              loading="lazy"
                              onError={() =>
                                setBrokenImageIds((prev) =>
                                  prev.includes(product.id) ? prev : [...prev, product.id]
                                )
                              }
                            />
                          </div>
                        ) : (
                          <div className="flex aspect-[5/4] w-full flex-col items-center justify-center gap-2 bg-[linear-gradient(140deg,rgba(252,245,237,1),rgba(243,231,219,1))]">
                            {product.imageUrl ? (
                              <>
                                <ImageOff className="h-7 w-7 text-slate-400" />
                                <p className="px-4 text-center text-[11px] text-slate-500">
                                  Gambar gagal dimuat
                                </p>
                              </>
                            ) : (
                              <>
                                <Package2 className="h-7 w-7 text-slate-400" />
                                <p className="px-4 text-center text-[11px] text-slate-500">
                                  Belum ada gambar
                                </p>
                              </>
                            )}
                          </div>
                        )}
                        <div className="space-y-2.5 p-3">
                          <div className="flex items-start justify-between gap-2">
                            <p className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 sm:text-[15px]">
                              {product.name}
                            </p>
                            <span
                              className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-medium ${getStockBadgeClass(product)}`}
                            >
                              {product.stock === 0
                                ? 'Habis'
                                : product.stock <= product.minStock
                                  ? 'Menipis'
                                  : 'Ready'}
                            </span>
                          </div>
                          <p className="truncate text-[11px] uppercase tracking-[0.16em] text-slate-500">
                            {product.category?.name || 'Umum'} · {product.stock} {product.unit}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <p className="text-sm font-semibold text-[#9a5c18] sm:text-base">
                              {formatCurrency(product.price)}
                            </p>
                            <span className="rounded-full border border-[#d4a373] bg-[#f7ead7] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#9a5c18]">
                              {isOutOfStock ? 'Kosong' : 'Tambah'}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
            </div>

            {!isLoadingProducts && displayedProducts.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-[#dccbbb] bg-[#fffaf4] p-8 text-center sm:p-10">
                <p className="text-lg font-medium text-slate-900">Produk tidak ditemukan</p>
                <p className="mt-2 text-sm text-slate-500">
                  Ubah kata kunci pencarian atau pilih kategori lain.
                </p>
              </div>
            ) : null}

            {hasCartItems ? (
              <div
                className="h-28 lg:hidden"
                aria-hidden="true"
              />
            ) : null}
          </section>
        </div>

        {hasCartItems ? (
          <div
            className="fixed inset-x-0 z-20 px-3 lg:hidden"
            style={{ bottom: 'calc(env(safe-area-inset-bottom) + 5rem)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] border border-[#d4a373] bg-[#fff8ef] px-4 py-3 shadow-xl shadow-black/10">
              <div className="min-w-0">
                <p className="text-xs font-medium text-[#9a5c18]">{items.length} item di keranjang</p>
                <p className="truncate text-base font-bold text-slate-950">{formatCurrency(total)}</p>
              </div>
              <div className="flex w-full shrink-0 gap-2 min-[420px]:w-auto">
                <button
                  type="button"
                  onClick={() => setIsMobileCartOpen(true)}
                  className="flex-1 rounded-xl border border-[#dccbbb] bg-white px-3 py-2 text-sm font-semibold text-slate-950 min-[420px]:flex-none"
                >
                  Keranjang
                </button>
                <button
                  type="button"
                  onClick={() => setIsCheckoutOpen(true)}
                  className="flex-1 rounded-xl bg-[#1f6f43] px-4 py-2 text-sm font-semibold text-white min-[420px]:flex-none"
                >
                  Checkout
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {isMobileCartOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Tutup keranjang"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
              onClick={() => setIsMobileCartOpen(false)}
            />
            <div className="absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto rounded-t-[28px] border border-[#e7d7c8] bg-[#fffaf4] px-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-5 text-slate-900 shadow-2xl">
              {cartContent}
            </div>
          </div>
        ) : null}

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
