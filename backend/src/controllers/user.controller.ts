import { Request, Response } from 'express';

import { userService } from '../services/user.service';
import {
  validateCreateUserPayload,
  validatePasswordPayload,
  validateUpdateUserPayload
} from '../validations/user.validation';

export const userController = {
  async getAll(_req: Request, res: Response) {
    const users = await userService.getAll();
    res.status(200).json(users);
  },

  async create(req: Request, res: Response) {
    const payload = validateCreateUserPayload(req.body);
    const user = await userService.create(payload);
    res.status(201).json(user);
  },

  async update(req: Request, res: Response) {
    const payload = validateUpdateUserPayload(req.body);
    const user = await userService.update(Number(req.params.id), payload);
    res.status(200).json(user);
  },

  async updatePassword(req: Request, res: Response) {
    const payload = validatePasswordPayload(req.body);
    const result = await userService.updatePassword(Number(req.params.id), payload);
    res.status(200).json(result);
  },

  async delete(req: Request, res: Response) {
    const result = await userService.softDelete(Number(req.params.id));
    res.status(200).json(result);
  }
};

