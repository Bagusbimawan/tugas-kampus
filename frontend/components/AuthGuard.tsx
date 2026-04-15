import { ReactNode, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/router';

import { LoadingScreen } from './common/LoadingScreen';
import { getRoleHomePath } from '../lib/role';
import { UserRole } from '../types/auth';
import { useAuthStore } from '../store/useAuthStore';

interface AuthGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
}

export const AuthGuard = ({ allowedRoles, children }: AuthGuardProps) => {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [isChecking, setIsChecking] = useState(true);

  const redirectPath = useMemo(() => {
    if (!user) {
      return '/login';
    }

    return getRoleHomePath(user.role);
  }, [user]);

  useEffect(() => {
    if (!isAuthenticated) {
      void router.replace('/login');
      return;
    }

    if (!user || !allowedRoles.includes(user.role)) {
      void router.replace(redirectPath);
      return;
    }

    setIsChecking(false);
  }, [allowedRoles, isAuthenticated, redirectPath, router, user]);

  if (isChecking) {
    return <LoadingScreen />;
  }

  return <>{children}</>;
};
