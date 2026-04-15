import { Request, Response } from 'express';

import { transactionService } from '../services/transaction.service';
import {
  validateCreateTransactionPayload,
  validateTransactionQuery
} from '../validations/transaction.validation';

export const transactionController = {
  async create(req: Request, res: Response) {
    const payload = validateCreateTransactionPayload(req.body);
    const result = await transactionService.create(payload, req.user!.id);
    res.status(201).json(result);
  },

  async getAll(req: Request, res: Response) {
    const query = validateTransactionQuery(req.query as Record<string, unknown>);
    const result = await transactionService.getAll(query);
    res.status(200).json(result);
  },

  async getById(req: Request, res: Response) {
    const transaction = await transactionService.getById(Number(req.params.id));
    res.status(200).json(transaction);
  },

  async cancel(req: Request, res: Response) {
    const result = await transactionService.cancel(Number(req.params.id), req.user!.id);
    res.status(200).json(result);
  },

  async getReceipt(req: Request, res: Response) {
    const receipt = await transactionService.getReceipt(Number(req.params.id));
    res.status(200).json(receipt);
  }
};

