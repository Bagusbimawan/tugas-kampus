import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { LockKeyhole, Mail, ScanLine } from 'lucide-react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { getRoleHomePath } from '../lib/role';
import { api } from '../services/api';
import { useAuthStore } from '../store/useAuthStore';
import { LoginResponse } from '../types/auth';

const loginSchema = z.object({
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, user } = useAuthStore();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  useEffect(() => {
    if (isAuthenticated && user) {
      void router.replace(getRoleHomePath(user.role));
    }
  }, [isAuthenticated, router, user]);

  const onSubmit = async (values: LoginFormValues) => {
    try {
      const { data } = await api.post<LoginResponse>('/auth/login', values);
      login(data.token, data.user);
      toast.success('Login berhasil');
      await router.push(getRoleHomePath(data.user.role));
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Gagal login');
        return;
      }

      toast.error('Terjadi kesalahan saat login');
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(250,204,21,0.18),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(59,130,246,0.2),_transparent_25%)]" />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col justify-center px-5 py-8 sm:px-8 lg:grid lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
        <section className="hidden rounded-[32px] border border-white/10 bg-white/5 p-10 backdrop-blur lg:block">
          <div className="max-w-xl">
            <p className="text-xs uppercase tracking-[0.45em] text-amber-300">
              Kelompok 1 • 1KA20
            </p>
            <h1 className="mt-5 text-5xl font-semibold leading-tight">
              Sistem informasi kasir untuk operasional toko yang cepat dan rapi.
            </h1>
            <p className="mt-6 text-lg text-slate-300">
              Login sebagai kasir, admin, atau manager untuk mengakses transaksi,
              manajemen stok, serta laporan penjualan.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-2xl font-semibold text-amber-300">Real-time</p>
                <p className="mt-2 text-sm text-slate-300">Transaksi dan kontrol stok.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-2xl font-semibold text-cyan-300">Role-based</p>
                <p className="mt-2 text-sm text-slate-300">Hak akses sesuai peran user.</p>
              </div>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-2xl font-semibold text-emerald-300">Terintegrasi</p>
                <p className="mt-2 text-sm text-slate-300">Kasir, stok, dan laporan.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md rounded-[32px] border border-white/10 bg-white/10 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8">
          <div className="mb-8 flex items-center gap-4">
            <div className="rounded-3xl bg-amber-300/15 p-3 text-amber-300">
              <ScanLine className="h-7 w-7" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.4em] text-amber-300">POS Login</p>
              <h2 className="text-2xl font-semibold">Masuk ke sistem</h2>
            </div>
          </div>

          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div>
              <label className="mb-2 block text-sm text-slate-200" htmlFor="email">
                Email
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <Mail className="h-4 w-4 text-slate-400" />
                <input
                  id="email"
                  type="email"
                  placeholder="nama@toko.com"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                  {...register('email')}
                />
              </div>
              {errors.email ? (
                <p className="mt-2 text-sm text-rose-300">{errors.email.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-2 block text-sm text-slate-200" htmlFor="password">
                Password
              </label>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3">
                <LockKeyhole className="h-4 w-4 text-slate-400" />
                <input
                  id="password"
                  type="password"
                  placeholder="Minimal 6 karakter"
                  className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
                  {...register('password')}
                />
              </div>
              {errors.password ? (
                <p className="mt-2 text-sm text-rose-300">{errors.password.message}</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-300 px-4 py-3 text-sm font-semibold text-slate-950 transition hover:bg-amber-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting ? 'Memproses...' : 'Masuk'}
            </button>
          </form>

          <div className="mt-8 rounded-3xl border border-white/10 bg-slate-950/40 p-4 text-sm text-slate-300 lg:hidden">
            Akses sistem kasir, dashboard operasional, dan laporan penjualan dari satu
            akun sesuai role Anda.
          </div>
        </section>
      </div>
    </div>
  );
}
