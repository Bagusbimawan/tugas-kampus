import { Request, Response } from 'express';

import { reportService } from '../services/report.service';
import { validateReportQuery } from '../validations/report.validation';

export const reportController = {
  async getSalesSummary(req: Request, res: Response) {
    const query = validateReportQuery(req.query as Record<string, unknown>);
    const result = await reportService.getSalesSummary(query);
    res.status(200).json(result);
  },

  async getTopProducts(req: Request, res: Response) {
    const query = validateReportQuery(req.query as Record<string, unknown>);
    const result = await reportService.getTopProducts(query);
    res.status(200).json(result);
  },

  async getRevenueByCategory(req: Request, res: Response) {
    const query = validateReportQuery(req.query as Record<string, unknown>);
    const result = await reportService.getRevenueByCategory(query);
    res.status(200).json(result);
  },

  async getRevenueByCashier(req: Request, res: Response) {
    const query = validateReportQuery(req.query as Record<string, unknown>);
    const result = await reportService.getRevenueByCashier(query);
    res.status(200).json(result);
  }
};

