import { settingsRepository } from '../repositories/settings.repository';
import { ApiError } from '../utils/api-error';
import { StoreSettingsInput } from '../validations/settings.validation';

const defaultSettings = {
  storeName: 'Toko Gunadarma',
  storeAddress: 'Jl. Margonda Raya, Depok',
  storePhone: '0210000000',
  taxRate: 11
};

const mapSettings = (settings: any) => ({
  storeName: settings.storeName,
  storeAddress: settings.storeAddress,
  storePhone: settings.storePhone,
  taxRate: Number(settings.taxRate)
});

export const settingsService = {
  async getSettings() {
    const settings = await settingsRepository.getSingleton();

    if (!settings) {
      return defaultSettings;
    }

    return mapSettings(settings);
  },

  async getTaxRate() {
    const settings = await this.getSettings();
    return settings.taxRate / 100;
  },

  async updateSettings(payload: StoreSettingsInput) {
    const updated = await settingsRepository.updateSingleton(payload);

    if (!updated) {
      throw new ApiError(500, 'Gagal menyimpan pengaturan toko');
    }

    return mapSettings(updated);
  }
};
