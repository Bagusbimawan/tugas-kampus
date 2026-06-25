import { UserRole } from '../types/auth';

export const getRoleLabel = (role?: UserRole | null) => {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'kasir':
      return 'Kasir';
    default:
      return '-';
  }
};

export const getRoleHomePath = (role: UserRole) => {
  if (role === 'kasir') {
    return '/kasir';
  }

  return '/dashboard';
};
