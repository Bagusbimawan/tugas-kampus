import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, LogOut, ReceiptText, ShoppingCart, Store } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';

import { cn } from '../../lib/cn';
import { getRoleLabel } from '../../lib/role';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useAuthStore } from '../../store/useAuthStore';

interface KasirLayoutProps {
  children: ReactNode;
  mobileDock?: ReactNode;
}

const kasirLinks = [
  { href: '/kasir', label: 'POS', icon: ShoppingCart },
  { href: '/kasir/riwayat', label: 'Riwayat', icon: ReceiptText }
];

export const KasirLayout = ({ children, mobileDock }: KasirLayoutProps) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { settings } = useSettingsStore();
  const [isOpen, setIsOpen] = useState(false);

  const pageTitle = useMemo(() => {
    return router.pathname === '/kasir/riwayat' ? 'Riwayat Transaksi' : 'Kasir POS';
  }, [router.pathname]);

  const handleLogout = () => {
    logout();
    void router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,_#f6efe7_0%,_#fbf7f2_38%,_#f4ece2_100%)] text-slate-900">
      <div className="mx-auto flex min-h-screen max-w-[1720px]">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-[min(18rem,calc(100vw-1rem))] overflow-y-auto border-r border-[#eadfd3] bg-[#fffaf4]/95 p-4 backdrop-blur transition-transform sm:p-6 lg:translate-x-0',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl border border-[#dccbbb] bg-[#f7ead7] p-3 text-[#9a5c18]">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#9a5c18]">Kasir App</p>
              <h1 className="text-lg font-semibold text-slate-900">{settings.storeName}</h1>
            </div>
          </div>

          <nav className="mt-10 space-y-3">
            {kasirLinks.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm transition',
                    isActive
                      ? 'border-[#1f6f43] bg-[#1f6f43] text-white'
                      : 'border-transparent bg-white/70 text-slate-700 hover:border-[#dccbbb] hover:bg-white'
                  )}
                  onClick={() => setIsOpen(false)}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        {isOpen ? (
          <button
            type="button"
            aria-label="Tutup menu"
            className="fixed inset-0 z-30 bg-slate-950/35 backdrop-blur-sm lg:hidden"
            onClick={() => setIsOpen(false)}
          />
        ) : null}

        <div className="flex min-h-screen min-w-0 flex-1 flex-col lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-[#eadfd3] bg-[#fffaf4]/90 backdrop-blur">
            <div className="flex items-center gap-3 px-3 py-3 sm:px-6 sm:py-4">
              <button
                type="button"
                className="shrink-0 rounded-xl border border-[#dccbbb] bg-white p-2 text-slate-700 lg:hidden"
                onClick={() => setIsOpen((value) => !value)}
              >
                <Menu className="h-5 w-5" />
              </button>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] uppercase tracking-[0.3em] text-[#9a5c18] sm:text-xs">
                  {pageTitle}
                </p>
                <p className="hidden text-sm text-slate-500 sm:block">
                  Transaksi real-time untuk kasir toko
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <div className="hidden rounded-2xl border border-[#eadfd3] bg-white/80 px-4 py-2 text-right sm:block">
                  <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    {getRoleLabel(user?.role)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-rose-500 px-3 py-2 text-sm font-medium text-white transition hover:bg-rose-400 sm:px-4"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            </div>
          </header>

          <main
            className={cn(
              'flex-1 px-2 pt-2 sm:px-6 sm:pt-4 lg:pb-6',
              mobileDock
                ? 'pb-[calc(env(safe-area-inset-bottom)+8.5rem)] lg:pb-6'
                : 'pb-[calc(env(safe-area-inset-bottom)+4.75rem)] sm:pb-6'
            )}
          >
            {children}
          </main>

          <div className="fixed inset-x-0 bottom-0 z-40 lg:hidden">
            {mobileDock ? (
              <div className="border-t border-[#eadfd3] bg-[#fffaf4]/98 px-2 pb-1 pt-2 backdrop-blur">
                {mobileDock}
              </div>
            ) : null}
            <nav className="grid grid-cols-2 border-t border-[#eadfd3] bg-[#fffaf4]/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-1.5 backdrop-blur">
            {kasirLinks.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'mx-1 flex flex-col items-center justify-center rounded-2xl border px-2 py-2 text-[11px]',
                    isActive
                      ? 'border-[#1f6f43] bg-[#1f6f43] text-white'
                      : 'border-transparent text-slate-600'
                  )}
                >
                  <Icon className="mb-1 h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};
