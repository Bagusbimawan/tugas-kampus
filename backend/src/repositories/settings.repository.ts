const { StoreSetting } = require('../../models');

import { StoreSettingsInput } from '../validations/settings.validation';

export const settingsRepository = {
  async getSingleton() {
    const settings = await StoreSetting.findOne({
      order: [['id', 'ASC']]
    });

    return settings;
  },

  async updateSingleton(payload: StoreSettingsInput) {
    const settings = await this.getSingleton();

    if (!settings) {
      return StoreSetting.create(payload);
    }

    return settings.update(payload);
  }
};
