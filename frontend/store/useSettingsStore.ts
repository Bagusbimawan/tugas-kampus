import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import { api } from '../services/api';

export interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  taxRate: number;
}

interface SettingsState {
  settings: StoreSettings;
  isLoaded: boolean;
  isSaving: boolean;
  updateSettings: (payload: Partial<StoreSettings>) => void;
  fetchSettings: () => Promise<void>;
  saveSettings: (payload: StoreSettings) => Promise<void>;
}

const defaultSettings: StoreSettings = {
  storeName: 'Toko Gunadarma',
  storeAddress: 'Jl. Margonda Raya, Depok',
  storePhone: '0210000000',
  taxRate: 11
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      isLoaded: false,
      isSaving: false,
      updateSettings: (payload) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...payload
          }
        }));
      },
      fetchSettings: async () => {
        try {
          const { data } = await api.get<StoreSettings>('/settings');
          set({ settings: data, isLoaded: true });
        } catch {
          set({ isLoaded: true });
        }
      },
      saveSettings: async (payload) => {
        set({ isSaving: true });

        try {
          const { data } = await api.put<StoreSettings>('/settings', payload);
          set({ settings: data, isSaving: false });
        } catch (error) {
          set({ isSaving: false });
          throw error;
        }
      }
    }),
    {
      name: 'pos-settings-storage',
      partialize: (state) => ({ settings: state.settings })
    }
  )
);
