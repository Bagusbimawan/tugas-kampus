import { Request, Response } from 'express';

import { settingsService } from '../services/settings.service';
import { validateStoreSettingsPayload } from '../validations/settings.validation';

export const settingsController = {
  async getSettings(_req: Request, res: Response) {
    const settings = await settingsService.getSettings();
    res.status(200).json(settings);
  },

  async updateSettings(req: Request, res: Response) {
    const payload = validateStoreSettingsPayload(req.body);
    const settings = await settingsService.updateSettings(payload);
    res.status(200).json(settings);
  }
};
