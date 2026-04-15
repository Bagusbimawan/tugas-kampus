import { stockRepository } from '../repositories/stock.repository';
import { ApiError } from '../utils/api-error';
import {
  StockAdjustmentInput,
  StockLogQueryInput
} from '../validations/stock.validation';

const normalizeDateRange = (startDate?: string, endDate?: string) => {
  if (!startDate || !endDate) {
    return {};
  }

  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString()
  };
};

export const stockService = {
  async getLogs(params: StockLogQueryInput) {
    const offset = (params.page - 1) * params.limit;
    const normalizedDates = normalizeDateRange(params.startDate, params.endDate);
    const result = await stockRepository.findLogs({
      ...params,
      ...normalizedDates,
      offset
    });

    return {
      data: result.rows,
      total: result.count,
      page: params.page,
      totalPages: Math.ceil(result.count / params.limit) || 1
    };
  },

  async getLogsByProductId(productId: number) {
    const product = await stockRepository.findProductById(productId);

    if (!product) {
      throw new ApiError(404, 'Produk tidak ditemukan');
    }

    return stockRepository.findLogsByProductId(productId);
  },

  async adjustStock(payload: StockAdjustmentInput, userId: number) {
    try {
      return await stockRepository.sequelize.transaction(async (t: unknown) => {
        const product = await stockRepository.findProductById(payload.productId, t);

        if (!product) {
          throw new Error('Produk tidak ditemukan');
        }

        const qtyBefore = product.stock;
        const qtyChange = payload.qtyChange;

        if (payload.type === 'adjustment' && qtyBefore + qtyChange < 0) {
          throw new Error('Stok tidak boleh negatif');
        }

        if (payload.type === 'in') {
          await stockRepository.incrementStock(payload.productId, qtyChange, t);
        } else if (qtyChange >= 0) {
          await stockRepository.incrementStock(payload.productId, qtyChange, t);
        } else {
          await stockRepository.decrementStock(payload.productId, Math.abs(qtyChange), t);
        }

        const qtyAfter = qtyBefore + qtyChange;

        await stockRepository.createLog(
          {
            productId: payload.productId,
            userId,
            type: payload.type,
            qtyBefore,
            qtyChange,
            qtyAfter,
            reason: payload.reason
          },
          t
        );

        return {
          message: 'Penyesuaian stok berhasil',
          productId: payload.productId,
          qtyBefore,
          qtyAfter
        };
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Gagal menyesuaikan stok';
      throw new ApiError(400, message);
    }
  },

  getAlerts() {
    return stockRepository.findAlerts();
  }
};

