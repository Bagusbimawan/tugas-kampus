import { Request, Response } from 'express';

import { productService } from '../services/product.service';
import {
  validateProductPayload,
  validateProductQuery,
  validateQuickSearchQuery
} from '../validations/product.validation';

export const productController = {
  async getAll(req: Request, res: Response) {
    const query = validateProductQuery(req.query as Record<string, unknown>);
    const products = await productService.getAll(query);
    res.status(200).json(products);
  },

  async quickSearch(req: Request, res: Response) {
    const q = validateQuickSearchQuery(req.query.q);
    const products = await productService.quickSearch(q);
    res.status(200).json(products);
  },

  async getById(req: Request, res: Response) {
    const product = await productService.getById(Number(req.params.id));
    res.status(200).json(product);
  },

  async create(req: Request, res: Response) {
    const payload = validateProductPayload(req.body);
    const product = await productService.create(payload, req.user!.id);
    res.status(201).json(product);
  },

  async update(req: Request, res: Response) {
    const payload = validateProductPayload(req.body);
    const product = await productService.update(Number(req.params.id), payload, req.user!.id);
    res.status(200).json(product);
  },

  async uploadImage(req: Request, res: Response) {
    const product = await productService.uploadImage(
      Number(req.params.id),
      req.file as Express.Multer.File | undefined
    );
    res.status(200).json(product);
  },

  async delete(req: Request, res: Response) {
    await productService.softDelete(Number(req.params.id));
    res.status(200).json({ message: 'Produk berhasil dinonaktifkan' });
  }
};
