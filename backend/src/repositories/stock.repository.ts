import { col, Op } from 'sequelize';

const { Category, Product, sequelize, StockLog, User } = require('../../models');

const productInclude = {
  model: Product,
  as: 'product',
  attributes: ['id', 'name', 'sku']
};

const userInclude = {
  model: User,
  as: 'user',
  attributes: ['id', 'name']
};

export const stockRepository = {
  sequelize,

  findLogs(params: {
    productId?: number;
    userId?: number;
    type?: string;
    startDate?: string;
    endDate?: string;
    limit: number;
    offset: number;
  }) {
    const where: Record<string, unknown> = {};

    if (params.productId) {
      where.productId = params.productId;
    }

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.type) {
      where.type = params.type;
    }

    if (params.startDate && params.endDate) {
      where.createdAt = {
        [Op.between]: [new Date(params.startDate), new Date(params.endDate)]
      };
    }

    return StockLog.findAndCountAll({
      where,
      include: [productInclude, userInclude],
      limit: params.limit,
      offset: params.offset,
      order: [['createdAt', 'DESC']]
    });
  },

  findLogsByProductId(productId: number) {
    return StockLog.findAll({
      where: { productId },
      include: [userInclude],
      order: [['createdAt', 'DESC']]
    });
  },

  findProductById(productId: number, transaction?: unknown) {
    return Product.findByPk(productId, {
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      transaction,
      lock: transaction ? true : undefined
    });
  },

  incrementStock(productId: number, qty: number, transaction: unknown) {
    return Product.increment('stock', {
      by: qty,
      where: { id: productId },
      transaction
    });
  },

  decrementStock(productId: number, qty: number, transaction: unknown) {
    return Product.decrement('stock', {
      by: qty,
      where: { id: productId },
      transaction
    });
  },

  createLog(payload: Record<string, unknown>, transaction: unknown) {
    return StockLog.create(payload, { transaction });
  },

  findAlerts() {
    return Product.findAll({
      where: {
        isActive: true,
        stock: {
          [Op.lte]: col('min_stock')
        }
      },
      include: [
        {
          model: Category,
          as: 'category',
          attributes: ['id', 'name']
        }
      ],
      order: [['stock', 'ASC']]
    });
  }
};
