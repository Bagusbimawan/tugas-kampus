import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ImageOff,
  Package2,
  Search,
  Sparkles
} from 'lucide-react';
import { useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { AuthGuard } from '../../components/AuthGuard';
import { KasirLayout } from '../../components/layouts/KasirLayout';
import { PosTransactionPanel } from '../../components/pos/PosTransactionPanel';
import { ReceiptModal } from '../../components/pos/ReceiptModal';
import { useDebouncedValue } from '../../hooks/useDebouncedValue';
import { formatCurrency } from '../../lib/format';
import { api } from '../../services/api';
import { useCartStore } from '../../store/useCartStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { Category, Product, ProductListResponse } from '../../types/product';
import {
  CreateTransactionPayload,
  CreateTransactionResponse,
  ReceiptResponse
} from '../../types/transaction';

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
  const [isReceiptOpen, setIsReceiptOpen] = useState(false);
  const [isMobileTransactionOpen, setIsMobileTransactionOpen] = useState(false);
  const [brokenImageIds, setBrokenImageIds] = useState<number[]>([]);
  const [receiptData, setReceiptData] = useState<ReceiptResponse | null>(null);
  const debouncedSearch = useDebouncedValue(search, 300);
  const { settings } = useSettingsStore();
  const taxRate = settings.taxRate / 100;
  const { items, addItem, updateQty, removeItem, clearCart, getSubtotal, setDiscount } =
    useCartStore();

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
  const tax = Math.round(subtotal * taxRate);
  const total = Math.max(0, subtotal + tax);
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
      setIsMobileTransactionOpen(false);
      setIsReceiptOpen(true);
      clearCart();
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
      discount: 0,
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

  const transactionPanelProps = {
    items,
    subtotal,
    taxRate,
    tax,
    total,
    isSubmitting: createTransactionMutation.isPending,
    onUpdateQty: updateQty,
    onRemoveItem: removeItem,
    onItemDiscountChange: setDiscount,
    onClear: clearCart,
    onSubmit: handleCheckout
  };

  return (
    <AuthGuard allowedRoles={['admin', 'kasir']}>
      <KasirLayout
        mobileDock={
          hasCartItems ? (
            <button
              type="button"
              onClick={() => setIsMobileTransactionOpen(true)}
              className="flex w-full items-center justify-between gap-2 rounded-2xl border border-[#d4a373] bg-[#fff8ef] px-3 py-2.5 shadow-sm"
            >
              <div className="min-w-0 text-left">
                <p className="text-[11px] font-medium text-[#9a5c18]">
                  {items.length} item · {totalUnitsInCart} qty
                </p>
                <p className="truncate text-sm font-bold text-slate-950">{formatCurrency(total)}</p>
              </div>
              <span className="shrink-0 rounded-xl bg-[#1f6f43] px-3 py-2 text-xs font-semibold text-white sm:text-sm">
                Transaksi
              </span>
            </button>
          ) : undefined
        }
      >
        <div className="relative hidden overflow-hidden rounded-[30px] border border-[#e7d7c8] bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.96),_rgba(255,248,240,0.95)_40%,_rgba(245,232,216,0.88)_72%,_rgba(229,219,208,0.85)_100%)] p-6 shadow-[0_30px_70px_-45px_rgba(15,23,42,0.45)] lg:block">
          <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_top_right,_rgba(31,111,67,0.2),_transparent_58%)]" />
          <div className="relative grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
            <div className="max-w-3xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#dccbbb] bg-white/75 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.28em] text-[#9a5c18]">
                <Sparkles className="h-3.5 w-3.5" />
                {settings.storeName}
              </div>
              <h1 className="mt-4 max-w-2xl text-2xl font-semibold leading-tight text-slate-900 sm:text-3xl">
                Layar kasir — pilih produk, hitung total, bayar, selesai.
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 sm:text-base">
                Ketuk produk untuk menambah ke transaksi. Pembayaran langsung di panel kanan
                tanpa langkah checkout terpisah.
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

        <div className="mt-0 grid min-w-0 gap-3 lg:mt-5 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)] lg:gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
          <section className="min-w-0 space-y-3 lg:space-y-5">
            <div className="rounded-2xl border border-[#e7d7c8] bg-[#fffaf4] p-3 shadow-sm sm:rounded-[28px] sm:p-5">
              <div className="flex flex-col gap-3">
                <div className="hidden sm:flex sm:flex-col sm:gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.28em] text-[#9a5c18]">
                      Katalog Produk
                    </p>
                    <h2 className="mt-1 text-lg font-semibold text-slate-900 sm:mt-2 sm:text-2xl">
                      Katalog produk
                    </h2>
                  </div>
                  <div className="hidden flex-wrap gap-2 sm:flex">
                    <div className="rounded-full border border-[#eadfd3] bg-white/85 px-3 py-2 text-sm text-slate-600">
                      {displayedProducts.length} produk
                    </div>
                    <div className="rounded-full border border-[#eadfd3] bg-white/85 px-3 py-2 text-sm text-slate-600">
                      {debouncedSearch ? `Cari: ${debouncedSearch}` : activeCategoryLabel}
                    </div>
                  </div>
                </div>

                <div className="relative">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari nama produk atau SKU"
                    className="w-full rounded-2xl border border-[#dccbbb] bg-white px-10 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-[#d4a373] sm:rounded-[20px] sm:px-11 sm:py-3"
                  />
                </div>
              </div>
            </div>

            <div className="min-w-0 overflow-x-auto overscroll-x-contain scroll-smooth touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="inline-flex max-w-none flex-nowrap gap-1.5 pr-3 sm:gap-2 sm:pr-4">
                <button
                  type="button"
                  onClick={() => setSelectedCategoryId('all')}
                  className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition sm:px-4 sm:py-2 sm:text-sm ${
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
                    className={`shrink-0 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition sm:px-4 sm:py-2 sm:text-sm ${
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

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-4 md:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
              {isLoadingProducts
                ? Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="overflow-hidden rounded-2xl border border-[#eadfd3] bg-[#fffdf9] sm:rounded-[24px]"
                    >
                      <div className="aspect-square animate-pulse bg-[#f8efe5]" />
                      <div className="space-y-2 p-3">
                        <div className="h-4 animate-pulse rounded bg-[#f0e6da]" />
                        <div className="h-3 w-2/3 animate-pulse rounded bg-[#f0e6da]" />
                        <div className="h-5 w-1/2 animate-pulse rounded bg-[#f0e6da]" />
                        <div className="h-9 animate-pulse rounded-xl bg-[#e8ddd0]" />
                      </div>
                    </div>
                  ))
                : displayedProducts.map((product) => {
                    const isOutOfStock = product.stock === 0;
                    const imageUrl = toAbsoluteImageUrl(product.imageUrl);
                    const isImageBroken = brokenImageIds.includes(product.id);
                    const hasImage = Boolean(imageUrl) && !isImageBroken;
                    const stockLabel =
                      product.stock === 0
                        ? 'Habis'
                        : product.stock <= product.minStock
                          ? 'Menipis'
                          : 'Ready';

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
                        className={`group flex flex-col overflow-hidden rounded-2xl border bg-[#fffdf9] text-left transition sm:rounded-[24px] ${
                          isOutOfStock
                            ? 'cursor-not-allowed border-[#eee2d6] opacity-70'
                            : 'border-[#eadfd3] shadow-[0_8px_24px_-16px_rgba(15,23,42,0.25)] hover:-translate-y-0.5 hover:border-[#d4a373] hover:shadow-[0_16px_32px_-20px_rgba(15,23,42,0.35)]'
                        }`}
                      >
                        <div className="relative aspect-square w-full overflow-hidden bg-[#f8efe5]">
                          {hasImage ? (
                            <img
                              src={imageUrl || undefined}
                              alt={product.name}
                              className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-[1.04] sm:p-4"
                              loading="lazy"
                              onError={() =>
                                setBrokenImageIds((prev) =>
                                  prev.includes(product.id) ? prev : [...prev, product.id]
                                )
                              }
                            />
                          ) : (
                            <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
                              {product.imageUrl ? (
                                <>
                                  <ImageOff className="h-8 w-8 text-slate-400" />
                                  <p className="text-xs text-slate-500">Gambar gagal dimuat</p>
                                </>
                              ) : (
                                <>
                                  <Package2 className="h-8 w-8 text-slate-400" />
                                  <p className="text-xs text-slate-500">Belum ada gambar</p>
                                </>
                              )}
                            </div>
                          )}
                          <span
                            className={`absolute left-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:left-3 sm:top-3 sm:px-2.5 sm:py-1 sm:text-xs ${getStockBadgeClass(product)}`}
                          >
                            {stockLabel}
                          </span>
                        </div>

                        <div className="flex flex-1 flex-col gap-2 p-3 sm:gap-2.5 sm:p-4">
                          <p className="line-clamp-2 min-h-[2.5rem] text-sm font-semibold leading-snug text-slate-900">
                            {product.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            <span className="font-medium text-slate-600">
                              {product.category?.name || 'Umum'}
                            </span>
                            <span className="mx-1">·</span>
                            <span>
                              Stok {product.stock} {product.unit}
                            </span>
                          </p>
                          <p className="text-base font-bold text-[#165b33] sm:text-lg">
                            {formatCurrency(product.price)}
                          </p>
                          <span
                            className={`mt-auto inline-flex w-full items-center justify-center rounded-xl py-2.5 text-xs font-semibold uppercase tracking-wide transition sm:text-sm ${
                              isOutOfStock
                                ? 'bg-slate-100 text-slate-400'
                                : 'bg-[#1f6f43] text-white group-hover:bg-[#165b33]'
                            }`}
                          >
                            {isOutOfStock ? 'Stok habis' : 'Tambah'}
                          </span>
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
          </section>

          <aside className="hidden lg:flex lg:min-h-0">
            <div className="sticky top-4 flex max-h-[calc(100dvh-2rem)] w-full flex-col overflow-hidden rounded-[28px] border border-[#e7d7c8] bg-[linear-gradient(180deg,rgba(255,251,247,0.98),rgba(248,239,229,0.92))] p-4 shadow-[0_24px_55px_-40px_rgba(15,23,42,0.35)]">
              <PosTransactionPanel
                {...transactionPanelProps}
                className="min-h-0 flex-1"
              />
            </div>
          </aside>
        </div>

        {isMobileTransactionOpen ? (
          <div className="fixed inset-0 z-50 flex flex-col lg:hidden">
            <button
              type="button"
              aria-label="Tutup transaksi"
              className="absolute inset-0 bg-slate-950/55 backdrop-blur-sm"
              onClick={() => setIsMobileTransactionOpen(false)}
            />
            <div className="relative mt-auto flex h-[min(92dvh,100%)] max-h-[92dvh] flex-col overflow-hidden rounded-t-[28px] border border-[#e7d7c8] bg-[#fffaf4] shadow-2xl">
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pt-4">
                <PosTransactionPanel
                  {...transactionPanelProps}
                  variant="sheet"
                  showCloseButton
                  onClose={() => setIsMobileTransactionOpen(false)}
                />
              </div>
            </div>
          </div>
        ) : null}

        <ReceiptModal
          isOpen={isReceiptOpen}
          receipt={receiptData}
          onClose={() => setIsReceiptOpen(false)}
        />
      </KasirLayout>
    </AuthGuard>
  );
}
