import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface StoreSettings {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  taxRate: number;
}

interface SettingsState {
  settings: StoreSettings;
  updateSettings: (payload: Partial<StoreSettings>) => void;
}

const defaultSettings: StoreSettings = {
  storeName: 'Toko Gunadarma',
  storeAddress: 'Jl. Margonda Raya, Depok',
  storePhone: '021-000000',
  taxRate: 11
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      settings: defaultSettings,
      updateSettings: (payload) => {
        set((state) => ({
          settings: {
            ...state.settings,
            ...payload
          }
        }));
      }
    }),
    {
      name: 'pos-settings-storage'
    }
  )
);

