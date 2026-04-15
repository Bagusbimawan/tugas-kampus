import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';

import { LoadingScreen } from '../components/common/LoadingScreen';
import { getRoleHomePath } from '../lib/role';
import { useAuthStore } from '../store/useAuthStore';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (!isReady) {
      return;
    }

    const targetPath =
      isAuthenticated && user ? getRoleHomePath(user.role) : '/login';

    void router.replace(targetPath);
  }, [isAuthenticated, isReady, router, user]);

  return <LoadingScreen />;
}
