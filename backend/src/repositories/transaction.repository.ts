import { FindOptions, Op } from 'sequelize';

const {
  Payment,
  Product,
  sequelize,
  StockLog,
  Transaction,
  TransactionItem,
  User
} = require('../../models');

const listInclude = [
  {
    model: User,
    as: 'user',
    attributes: ['id', 'name']
  },
  {
    model: TransactionItem,
    as: 'items',
    attributes: ['id', 'quantity']
  },
  {
    model: Payment,
    as: 'payment'
  }
];

const detailInclude = [
  {
    model: User,
    as: 'user',
    attributes: ['id', 'name', 'email', 'role']
  },
  {
    model: TransactionItem,
    as: 'items',
    include: [
      {
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'sku']
      }
    ]
  },
  {
    model: Payment,
    as: 'payment'
  }
];

export const transactionRepository = {
  sequelize,

  countTodayTransactions(startOfDay: Date, endOfDay: Date, transaction?: unknown) {
    return Transaction.count({
      where: {
        createdAt: {
          [Op.between]: [startOfDay, endOfDay]
        }
      },
      transaction
    });
  },

  findActiveProductByIdForUpdate(productId: number, transaction: unknown) {
    return Product.findOne({
      where: { id: productId, isActive: true },
      transaction,
      lock: true
    });
  },

  createTransaction(payload: Record<string, unknown>, transaction: unknown) {
    return Transaction.create(payload, { transaction });
  },

  createItems(items: Record<string, unknown>[], transaction: unknown) {
    return TransactionItem.bulkCreate(items, { transaction });
  },

  decrementProductStock(productId: number, quantity: number, transaction: unknown) {
    return Product.decrement('stock', {
      by: quantity,
      where: { id: productId },
      transaction
    });
  },

  incrementProductStock(productId: number, quantity: number, transaction: unknown) {
    return Product.increment('stock', {
      by: quantity,
      where: { id: productId },
      transaction
    });
  },

  createStockLog(payload: Record<string, unknown>, transaction: unknown) {
    return StockLog.create(payload, { transaction });
  },

  createPayment(payload: Record<string, unknown>, transaction: unknown) {
    return Payment.create(payload, { transaction });
  },

  findAndCountAll(params: {
    startDate?: string;
    endDate?: string;
    userId?: number;
    status?: string;
    limit: number;
    offset: number;
  }) {
    const where: Record<string, unknown> = {};

    if (params.startDate && params.endDate) {
      where.createdAt = {
        [Op.between]: [new Date(params.startDate), new Date(params.endDate)]
      };
    }

    if (params.userId) {
      where.userId = params.userId;
    }

    if (params.status) {
      where.status = params.status;
    }

    return Transaction.findAndCountAll({
      where,
      include: listInclude,
      limit: params.limit,
      offset: params.offset,
      order: [['createdAt', 'DESC']]
    });
  },

  findById(id: number, options: FindOptions = {}) {
    return Transaction.findByPk(id, {
      include: detailInclude,
      ...options
    });
  },

  findByIdWithItems(id: number, transaction?: unknown) {
    return Transaction.findByPk(id, {
      include: [
        {
          model: TransactionItem,
          as: 'items'
        }
      ],
      transaction,
      lock: transaction ? true : undefined
    });
  },

  updateTransactionStatus(target: any, status: 'completed' | 'cancelled', transaction: unknown) {
    return target.update({ status }, { transaction });
  }
};
