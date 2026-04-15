import { UserRole } from '../types/auth';

export const getRoleLabel = (role?: UserRole | null) => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'manager':
      return 'Manager Toko';
    case 'kasir':
      return 'Kasir';
    default:
      return '-';
  }
};

export const getRoleHomePath = (role: UserRole) => {
  switch (role) {
    case 'kasir':
      return '/kasir';
    case 'manager':
      return '/dashboard/laporan';
    case 'admin':
    default:
      return '/dashboard';
  }
};
