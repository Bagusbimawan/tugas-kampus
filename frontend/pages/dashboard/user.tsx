import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { KeyRound, Pencil, Plus, ShieldCheck, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { z } from 'zod';

import { AuthGuard } from '../../components/AuthGuard';
import { SummaryCard } from '../../components/dashboard/SummaryCard';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { getRoleLabel } from '../../lib/role';
import { api } from '../../services/api';

type UserRole = 'admin' | 'manager' | 'kasir';

interface ManagedUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const userSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter').optional(),
  role: z.enum(['admin', 'manager', 'kasir']),
  isActive: z.boolean()
});

const passwordSchema = z.object({
  password: z.string().min(6, 'Password minimal 6 karakter')
});

type UserFormValues = z.infer<typeof userSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

const emptyUserValues: UserFormValues = {
  name: '',
  email: '',
  password: '',
  role: 'kasir',
  isActive: true
};

const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || fallback;
  }

  return fallback;
};

interface UserFormModalProps {
  isOpen: boolean;
  initialUser: ManagedUser | null;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: UserFormValues) => Promise<void>;
}

const UserFormModal = ({
  isOpen,
  initialUser,
  isSubmitting,
  onClose,
  onSubmit
}: UserFormModalProps) => {
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors }
  } = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: emptyUserValues
  });

  useEffect(() => {
    if (!isOpen) {
      reset(emptyUserValues);
      return;
    }

    if (!initialUser) {
      reset(emptyUserValues);
      return;
    }

    reset({
      name: initialUser.name,
      email: initialUser.email,
      password: '',
      role: initialUser.role,
      isActive: initialUser.isActive
    });
  }, [initialUser, isOpen, reset]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-slate-950/70 p-0 backdrop-blur sm:items-center sm:justify-center sm:p-6">
      <div className="w-full rounded-t-[28px] border border-slate-200 bg-white sm:max-w-2xl sm:rounded-[28px]">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
              {initialUser ? 'Edit User' : 'Tambah User'}
            </p>
            <h3 className="mt-1 text-xl font-semibold text-slate-900">
              {initialUser ? 'Perbarui data akun' : 'Buat akun pengguna baru'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 p-2 text-slate-500"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="grid gap-4 p-5 sm:grid-cols-2 sm:p-6"
        >
          <label className="block text-sm text-slate-600">
            Nama
            <input
              {...register('name')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
            {errors.name ? <p className="mt-2 text-rose-600">{errors.name.message}</p> : null}
          </label>

          <label className="block text-sm text-slate-600">
            Email
            <input
              {...register('email')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
            {errors.email ? <p className="mt-2 text-rose-600">{errors.email.message}</p> : null}
          </label>

          <label className="block text-sm text-slate-600">
            Password {initialUser ? '(opsional)' : '*'}
            <input
              type="password"
              {...register('password')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
            {errors.password ? (
              <p className="mt-2 text-rose-600">{errors.password.message}</p>
            ) : null}
          </label>

          <label className="block text-sm text-slate-600">
            Role
            <select
              {...register('role')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            >
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
              <option value="kasir">Kasir</option>
            </select>
          </label>

          <label className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 sm:col-span-2">
            <div>
              <p className="text-sm font-medium text-slate-900">Status aktif</p>
              <p className="mt-1 text-sm text-slate-500">User nonaktif tidak bisa login.</p>
            </div>
            <input type="checkbox" {...register('isActive')} className="h-5 w-5" />
          </label>

          <div className="flex gap-3 sm:col-span-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? 'Menyimpan...' : initialUser ? 'Simpan Perubahan' : 'Tambah User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface PasswordModalProps {
  isOpen: boolean;
  isSubmitting: boolean;
  user: ManagedUser | null;
  onClose: () => void;
  onSubmit: (values: PasswordFormValues) => Promise<void>;
}

const PasswordModal = ({
  isOpen,
  isSubmitting,
  user,
  onClose,
  onSubmit
}: PasswordModalProps) => {
  const {
    register,
    reset,
    handleSubmit,
    formState: { errors }
  } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      password: ''
    }
  });

  useEffect(() => {
    if (!isOpen) {
      reset({ password: '' });
    }
  }, [isOpen, reset]);

  if (!isOpen || !user) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-6 backdrop-blur">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-6">
        <h3 className="text-xl font-semibold text-slate-900">Reset Password</h3>
        <p className="mt-2 text-sm text-slate-500">
          Atur password baru untuk {user.name}.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
          <label className="block text-sm text-slate-600">
            Password baru
            <input
              type="password"
              {...register('password')}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none"
            />
            {errors.password ? (
              <p className="mt-2 text-rose-600">{errors.password.message}</p>
            ) : null}
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isSubmitting ? 'Menyimpan...' : 'Update Password'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function DashboardUserPage() {
  const queryClient = useQueryClient();
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [passwordTarget, setPasswordTarget] = useState<ManagedUser | null>(null);

  const usersQuery = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data } = await api.get<ManagedUser[]>('/users');
      return data;
    }
  });

  const invalidateUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  const saveUserMutation = useMutation({
    mutationFn: async (values: UserFormValues) => {
      const payload = {
        ...values,
        password: values.password?.trim() || undefined
      };

      if (selectedUser) {
        const { data } = await api.put<ManagedUser>(`/users/${selectedUser.id}`, payload);
        return data;
      }

      const { data } = await api.post<ManagedUser>('/users', payload);
      return data;
    },
    onSuccess: async () => {
      toast.success(selectedUser ? 'User diperbarui' : 'User ditambahkan');
      setIsUserModalOpen(false);
      setSelectedUser(null);
      await invalidateUsers();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Gagal menyimpan user'));
    }
  });

  const disableUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      await api.delete(`/users/${userId}`);
    },
    onSuccess: async () => {
      toast.success('User dinonaktifkan');
      await invalidateUsers();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Gagal menonaktifkan user'));
    }
  });

  const passwordMutation = useMutation({
    mutationFn: async (values: PasswordFormValues) => {
      if (!passwordTarget) {
        return;
      }

      await api.put(`/users/${passwordTarget.id}/password`, values);
    },
    onSuccess: () => {
      toast.success('Password berhasil diperbarui');
      setPasswordTarget(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error, 'Gagal memperbarui password'));
    }
  });

  const stats = useMemo(() => {
    const rows = usersQuery.data || [];
    return {
      total: rows.length,
      active: rows.filter((item) => item.isActive).length,
      admin: rows.filter((item) => item.role === 'admin').length,
      cashier: rows.filter((item) => item.role === 'kasir').length
    };
  }, [usersQuery.data]);

  return (
    <AuthGuard allowedRoles={['admin']}>
      <DashboardLayout>
        <div className="space-y-6">
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <SummaryCard
              icon={ShieldCheck}
              label="Total User"
              value={String(stats.total)}
              accentClass="bg-sky-100 text-sky-700"
            />
            <SummaryCard
              icon={ShieldCheck}
              label="User Aktif"
              value={String(stats.active)}
              accentClass="bg-emerald-100 text-emerald-700"
            />
            <SummaryCard
              icon={ShieldCheck}
              label="Admin"
              value={String(stats.admin)}
              accentClass="bg-amber-100 text-amber-700"
            />
            <SummaryCard
              icon={ShieldCheck}
              label="Kasir"
              value={String(stats.cashier)}
              accentClass="bg-rose-100 text-rose-700"
            />
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-amber-600">User</p>
                <h1 className="mt-2 text-2xl font-semibold text-slate-900">
                  Manajemen akun pengguna
                </h1>
                <p className="mt-2 text-sm text-slate-500">
                  Tambah, edit, reset password, dan nonaktifkan akun pengguna sistem.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSelectedUser(null);
                  setIsUserModalOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              >
                <Plus className="h-4 w-4" />
                Tambah User
              </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-200">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50 text-left text-slate-500">
                    <tr>
                      <th className="px-4 py-4">Nama</th>
                      <th className="px-4 py-4">Email</th>
                      <th className="px-4 py-4">Role</th>
                      <th className="px-4 py-4">Status</th>
                      <th className="px-4 py-4">Dibuat</th>
                      <th className="px-4 py-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {usersQuery.isLoading
                      ? Array.from({ length: 6 }).map((_, index) => (
                          <tr key={index}>
                            <td className="px-4 py-4" colSpan={6}>
                              <div className="h-10 animate-pulse rounded-2xl bg-slate-100" />
                            </td>
                          </tr>
                        ))
                      : (usersQuery.data || []).map((user) => (
                          <tr key={user.id}>
                            <td className="px-4 py-4 font-medium text-slate-900">{user.name}</td>
                            <td className="px-4 py-4 text-slate-600">{user.email}</td>
                            <td className="px-4 py-4">
                              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                                {getRoleLabel(user.role)}
                              </span>
                            </td>
                            <td className="px-4 py-4">
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                                  user.isActive
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : 'bg-slate-200 text-slate-600'
                                }`}
                              >
                                {user.isActive ? 'Aktif' : 'Nonaktif'}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-slate-600">
                              {new Date(user.createdAt).toLocaleDateString('id-ID')}
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedUser(user);
                                    setIsUserModalOpen(true);
                                  }}
                                  className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-100"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setPasswordTarget(user)}
                                  className="rounded-xl border border-slate-200 p-2 text-sky-700 transition hover:bg-sky-50"
                                >
                                  <KeyRound className="h-4 w-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const confirmed = window.confirm(
                                      'Apakah Anda yakin ingin menonaktifkan user ini?'
                                    );
                                    if (confirmed) {
                                      disableUserMutation.mutate(user.id);
                                    }
                                  }}
                                  className="rounded-xl border border-slate-200 p-2 text-rose-600 transition hover:bg-rose-50"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </div>

        <UserFormModal
          isOpen={isUserModalOpen}
          initialUser={selectedUser}
          isSubmitting={saveUserMutation.isPending}
          onClose={() => {
            setIsUserModalOpen(false);
            setSelectedUser(null);
          }}
          onSubmit={async (values) => {
            await saveUserMutation.mutateAsync(values);
          }}
        />

        <PasswordModal
          isOpen={Boolean(passwordTarget)}
          isSubmitting={passwordMutation.isPending}
          user={passwordTarget}
          onClose={() => setPasswordTarget(null)}
          onSubmit={async (values) => {
            await passwordMutation.mutateAsync(values);
          }}
        />
      </DashboardLayout>
    </AuthGuard>
  );
}
