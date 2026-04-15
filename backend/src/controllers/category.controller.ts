import { Request, Response } from 'express';

import { categoryService } from '../services/category.service';
import { validateCategoryPayload } from '../validations/category.validation';

export const categoryController = {
  async getAll(_req: Request, res: Response) {
    const categories = await categoryService.getAll();
    res.status(200).json(categories);
  },

  async create(req: Request, res: Response) {
    const payload = validateCategoryPayload(req.body);
    const category = await categoryService.create(payload);
    res.status(201).json(category);
  },

  async update(req: Request, res: Response) {
    const payload = validateCategoryPayload(req.body);
    const category = await categoryService.update(Number(req.params.id), payload);
    res.status(200).json(category);
  },

  async delete(req: Request, res: Response) {
    await categoryService.delete(Number(req.params.id));
    res.status(200).json({ message: 'Kategori berhasil dihapus' });
  }
};

