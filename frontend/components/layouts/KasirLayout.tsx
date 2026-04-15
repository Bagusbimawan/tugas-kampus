import Link from 'next/link';
import { useRouter } from 'next/router';
import { Menu, LogOut, ReceiptText, ShoppingCart, Store } from 'lucide-react';
import { ReactNode, useMemo, useState } from 'react';

import { cn } from '../../lib/cn';
import { getRoleLabel } from '../../lib/role';
import { useAuthStore } from '../../store/useAuthStore';

interface KasirLayoutProps {
  children: ReactNode;
}

const kasirLinks = [
  { href: '/kasir', label: 'POS', icon: ShoppingCart },
  { href: '/kasir/riwayat', label: 'Riwayat', icon: ReceiptText }
];

export const KasirLayout = ({ children }: KasirLayoutProps) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);

  const pageTitle = useMemo(() => {
    return router.pathname === '/kasir/riwayat' ? 'Riwayat Transaksi' : 'Kasir POS';
  }, [router.pathname]);

  const handleLogout = () => {
    logout();
    void router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.15),_transparent_35%),linear-gradient(180deg,_#0f172a_0%,_#111827_55%,_#020617_100%)] text-white">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-72 border-r border-white/10 bg-slate-950/90 p-6 backdrop-blur transition-transform lg:translate-x-0',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-amber-400/15 p-3 text-amber-300">
              <Store className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Kasir App</p>
              <h1 className="text-lg font-semibold">Toko Gunadarma</h1>
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
                    'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                    isActive
                      ? 'bg-amber-300 text-slate-950'
                      : 'bg-white/5 text-slate-200 hover:bg-white/10'
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

        <div className="flex min-h-screen flex-1 flex-col lg:pl-72">
          <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/70 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-white/10 bg-white/5 p-2 lg:hidden"
                  onClick={() => setIsOpen((value) => !value)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-300">
                    {pageTitle}
                  </p>
                  <p className="text-sm text-slate-300">Transaksi real-time untuk kasir toko</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-right sm:block">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">
                    {getRoleLabel(user?.role)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-400"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 pb-28 pt-6 sm:px-6">{children}</main>

          <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 border-t border-white/10 bg-slate-950/95 px-3 py-3 backdrop-blur lg:hidden">
            {kasirLinks.map((item) => {
              const Icon = item.icon;
              const isActive = router.pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'mx-1 flex flex-col items-center justify-center rounded-2xl px-3 py-2 text-xs',
                    isActive ? 'bg-amber-300 text-slate-950' : 'text-slate-300'
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
  );
};
