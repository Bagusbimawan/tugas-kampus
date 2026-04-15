import { Request, Response } from 'express';

import { authService } from '../services/auth.service';
import { validateLoginPayload } from '../validations/auth.validation';

export const authController = {
  async login(req: Request, res: Response) {
    const payload = validateLoginPayload(req.body);
    const result = await authService.login(payload);
    res.status(200).json(result);
  },

  async me(req: Request, res: Response) {
    const user = await authService.getCurrentUser(req.user!.id);
    res.status(200).json(user);
  }
};

