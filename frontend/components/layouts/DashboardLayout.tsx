import Link from 'next/link';
import { useRouter } from 'next/router';
import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LogOut,
  Menu,
  ReceiptText,
  Settings,
  Shield,
  Users
} from 'lucide-react';
import { ReactNode, useState } from 'react';

import { cn } from '../../lib/cn';
import { getRoleLabel } from '../../lib/role';
import { useAuthStore } from '../../store/useAuthStore';

interface DashboardLayoutProps {
  children: ReactNode;
}

const sections = [
  {
    title: 'Utama',
    items: [{ href: '/dashboard', label: 'Overview', icon: LayoutDashboard, roles: ['admin'] }]
  },
  {
    title: 'Operasional',
    items: [
      { href: '/dashboard/produk', label: 'Produk', icon: Boxes, roles: ['admin', 'manager'] },
      { href: '/dashboard/stok', label: 'Stok', icon: Shield, roles: ['admin', 'manager'] },
      {
        href: '/dashboard/riwayat',
        label: 'Riwayat',
        icon: ReceiptText,
        roles: ['admin', 'manager']
      },
      { href: '/dashboard/laporan', label: 'Laporan', icon: BarChart3, roles: ['admin', 'manager'] }
    ]
  },
  {
    title: 'Administrasi',
    items: [
      { href: '/dashboard/user', label: 'User', icon: Users, roles: ['admin'] },
      { href: '/dashboard/pengaturan', label: 'Pengaturan', icon: Settings, roles: ['admin'] }
    ]
  }
];

export const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [isOpen, setIsOpen] = useState(false);
  const visibleSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) => (user ? item.roles.includes(user.role) : false))
    }))
    .filter((section) => section.items.length > 0);

  const handleLogout = () => {
    logout();
    void router.push('/login');
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(160deg,_#fff8eb_0%,_#f8fafc_45%,_#e0f2fe_100%)] text-slate-900">
      <div className="flex min-h-screen">
        <aside
          className={cn(
            'fixed inset-y-0 left-0 z-40 w-80 border-r border-slate-200 bg-white/90 p-6 shadow-2xl shadow-slate-200/50 backdrop-blur transition-transform lg:translate-x-0',
            isOpen ? 'translate-x-0' : '-translate-x-full'
          )}
        >
          <div className="rounded-[28px] bg-slate-950 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-300">Dashboard</p>
            <h1 className="mt-2 text-xl font-semibold">Sistem Informasi Kasir</h1>
            <p className="mt-2 text-sm text-slate-300">
              {user?.role === 'manager'
                ? 'Akses Anda difokuskan untuk memantau produk, stok, transaksi, dan laporan dalam mode baca.'
                : 'Kelola produk, stok, laporan, dan akun pengguna dalam satu panel.'}
            </p>
          </div>

          <div className="mt-8 space-y-7">
            {visibleSections.map((section) => (
              <div key={section.title}>
                <p className="mb-3 text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">
                  {section.title}
                </p>
                <div className="space-y-2">
                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = router.pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={cn(
                          'flex items-center gap-3 rounded-2xl px-4 py-3 text-sm transition',
                          isActive
                            ? 'bg-slate-950 text-white'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        )}
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="flex min-h-screen flex-1 flex-col lg:pl-80">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
            <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white p-2 lg:hidden"
                  onClick={() => setIsOpen((value) => !value)}
                >
                  <Menu className="h-5 w-5" />
                </button>
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-amber-600">
                    Panel Manajemen
                  </p>
                  <h2 className="text-lg font-semibold text-slate-900">Operasional Toko</h2>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-right">
                  <p className="text-sm font-medium text-slate-900">{user?.name}</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-500">
                    {getRoleLabel(user?.role)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                >
                  <LogOut className="h-4 w-4" />
                  Keluar
                </button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-4 py-6 sm:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
};
