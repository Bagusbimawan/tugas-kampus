import { useEffect } from 'react';

import { useAuthStore } from '../store/useAuthStore';
import { useSettingsStore } from '../store/useSettingsStore';

export function SettingsHydrator() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const fetchSettings = useSettingsStore((state) => state.fetchSettings);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    void fetchSettings();
  }, [fetchSettings, isAuthenticated]);

  return null;
}
