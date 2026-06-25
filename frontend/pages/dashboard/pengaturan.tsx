import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { Save } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { AuthGuard } from '../../components/AuthGuard';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { getStorePhoneError } from '../../lib/validation';
import { useSettingsStore } from '../../store/useSettingsStore';

const settingsSchema = z.object({
  storeName: z.string().trim().min(1, 'Nama toko wajib diisi').max(255, 'Nama toko terlalu panjang'),
  storeAddress: z
    .string()
    .trim()
    .min(1, 'Alamat toko wajib diisi')
    .max(1000, 'Alamat terlalu panjang'),
  storePhone: z
    .string()
    .trim()
    .superRefine((value, ctx) => {
      const error = getStorePhoneError(value);

      if (error) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: error });
      }
    }),
  taxRate: z.coerce.number().min(0, 'Pajak minimal 0').max(100, 'Pajak maksimal 100')
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function DashboardPengaturanPage() {
  const { settings, saveSettings, isSaving } = useSettingsStore();
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
    try {
      await saveSettings(values);
      toast.success('Pengaturan toko disimpan');
    } catch (error) {
      if (axios.isAxiosError(error)) {
        toast.error(error.response?.data?.message || 'Gagal menyimpan pengaturan');
        return;
      }

      toast.error('Terjadi kesalahan saat menyimpan pengaturan');
    }
  };

  return (
    <AuthGuard allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-600">Pengaturan</p>
            <h1 className="mt-2 text-2xl font-semibold text-slate-900">Identitas toko</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              Pengaturan ini disimpan di server dan dipakai oleh semua user untuk nama toko,
              struk, serta perhitungan pajak di kasir.
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
                  placeholder="0211234567 atau 081234567890"
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
                  step={0.01}
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
                  Perubahan pajak langsung memengaruhi transaksi baru di kasir. Struk transaksi
                  juga menampilkan nama, alamat, dan telepon toko dari pengaturan ini.
                </p>
              </div>

              <div className="sm:col-span-2">
                <button
                  type="submit"
                  disabled={isSubmitting || isSaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white disabled:opacity-60"
                >
                  <Save className="h-4 w-4" />
                  {isSaving ? 'Menyimpan...' : 'Simpan Pengaturan'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </DashboardLayout>
    </AuthGuard>
  );
}
