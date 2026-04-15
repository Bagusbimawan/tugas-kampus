import { Request, Response } from 'express';

import { stockService } from '../services/stock.service';
import {
  validateStockAdjustmentPayload,
  validateStockLogQuery
} from '../validations/stock.validation';

export const stockController = {
  async getLogs(req: Request, res: Response) {
    const query = validateStockLogQuery(req.query as Record<string, unknown>);
    const result = await stockService.getLogs(query);
    res.status(200).json(result);
  },

  async getLogsByProductId(req: Request, res: Response) {
    const result = await stockService.getLogsByProductId(Number(req.params.productId));
    res.status(200).json(result);
  },

  async adjust(req: Request, res: Response) {
    const payload = validateStockAdjustmentPayload(req.body);
    const result = await stockService.adjustStock(payload, req.user!.id);
    res.status(200).json(result);
  },

  async getAlerts(_req: Request, res: Response) {
    const result = await stockService.getAlerts();
    res.status(200).json(result);
  }
};

