import { zodResolver } from '@hookform/resolvers/zod';
import { Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { AuthGuard } from '../../components/AuthGuard';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { useSettingsStore } from '../../store/useSettingsStore';

const settingsSchema = z.object({
  storeName: z.string().min(1, 'Nama toko wajib diisi'),
  storeAddress: z.string().min(1, 'Alamat toko wajib diisi'),
  storePhone: z.string().min(1, 'Nomor telepon wajib diisi'),
  taxRate: z.coerce.number().min(0, 'Pajak minimal 0').max(100, 'Pajak maksimal 100')
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function DashboardPengaturanPage() {
  const { settings, updateSettings } = useSettingsStore();
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors, isSubmitting }
  } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings
  });

  useEffect(() => {
    reset(settings);
  }, [reset, settings]);

  const onSubmit = async (values: SettingsFormValues) => {
    updateSettings(values);
    toast.success('Pengaturan toko disimpan');
  };

  return (
    <AuthGuard allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Pengaturan</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Identitas toko</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Pengaturan ini disimpan lokal di browser dan dipakai sebagai baseline nama
              toko serta default pajak di halaman kasir dan dashboard.
            </p>
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <form onSubmit={handleSubmit(onSubmit)} className="grid gap-4 sm:grid-cols-2">
              <label className="block text-sm text-slate-600">
                Nama Toko
                <input
                  {...register('storeName')}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                />
                {errors.storeName ? (
                  <p className="mt-2 text-rose-600">{errors.storeName.message}</p>
                ) : null}
              </label>

              <label className="block text-sm text-slate-600">
                Nomor Telepon
                <input
                  {...register('storePhone')}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                />
                {errors.storePhone ? (
                  <p className="mt-2 text-rose-600">{errors.storePhone.message}</p>
                ) : null}
              </label>

              <label className="block text-sm text-slate-600 sm:col-span-2">
                Alamat Toko
                <textarea
                  rows={4}
                  {...register('storeAddress')}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                />
                {errors.storeAddress ? (
                  <p className="mt-2 text-rose-600">{errors.storeAddress.message}</p>
                ) : null}
              </label>

              <label className="block text-sm text-slate-600">
                Pajak Default (%)
                <input
                  type="number"
                  min={0}
                  max={100}
                  {...register('taxRate')}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
                />
                {errors.taxRate ? (
                  <p className="mt-2 text-rose-600">{errors.taxRate.message}</p>
                ) : null}
              </label>

              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Catatan</p>
                <p className="mt-2">
                  Jika nanti Anda ingin pengaturan ini tersimpan di server dan terbaca oleh
                  semua user, tahap berikutnya adalah menambahkan model dan API
                  `store_settings` di backend.
                </p>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </section>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
