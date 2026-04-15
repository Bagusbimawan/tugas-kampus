import { col, fn, literal, Op } from 'sequelize';

const {
  Category,
  Product,
  sequelize,
  Transaction,
  TransactionItem,
  User
} = require('../../models');

const buildCompletedDateFilter = (startDate?: string, endDate?: string) => {
  const where: Record<string, unknown> = {
    status: 'completed'
  };

  if (startDate && endDate) {
    where.createdAt = {
      [Op.between]: [new Date(startDate), new Date(endDate)]
    };
  }

  return where;
};

export const reportRepository = {
  sequelize,

  findSalesSummary(startDate?: string, endDate?: string) {
    return Transaction.findAll({
      where: buildCompletedDateFilter(startDate, endDate),
      attributes: [
        [fn('COALESCE', fn('SUM', col('total')), 0), 'totalRevenue'],
        [fn('COUNT', col('id')), 'totalTransactions']
      ],
      raw: true
    });
  },

  findSoldItemsSummary(startDate?: string, endDate?: string) {
    return TransactionItem.findAll({
      attributes: [[fn('COALESCE', fn('SUM', col('quantity')), 0), 'totalItems']],
      include: [
        {
          model: Transaction,
          as: 'transaction',
          attributes: [],
          where: buildCompletedDateFilter(startDate, endDate)
        }
      ],
      raw: true
    });
  },

  findDailySales(startDate?: string, endDate?: string) {
    return Transaction.findAll({
      where: buildCompletedDateFilter(startDate, endDate),
      attributes: [
        [fn('DATE', col('created_at')), 'date'],
        [fn('COALESCE', fn('SUM', col('total')), 0), 'revenue'],
        [fn('COUNT', col('id')), 'transactions']
      ],
      group: [fn('DATE', col('created_at'))],
      order: [[fn('DATE', col('created_at')), 'ASC']],
      raw: true
    });
  },

  findTopProducts(startDate?: string, endDate?: string, limit = 10) {
    return TransactionItem.findAll({
      attributes: [
        'productId',
        'productName',
        [fn('SUM', col('quantity')), 'totalQty'],
        [fn('SUM', col('subtotal')), 'totalRevenue']
      ],
      include: [
        {
          model: Transaction,
          as: 'transaction',
          attributes: [],
          where: buildCompletedDateFilter(startDate, endDate)
        }
      ],
      group: ['productId', 'productName'],
      order: [[literal('totalQty'), 'DESC']],
      limit,
      raw: true
    });
  },

  findRevenueByCategory(startDate?: string, endDate?: string) {
    return TransactionItem.findAll({
      attributes: [
        [col('product.category.id'), 'categoryId'],
        [col('product.category.name'), 'categoryName'],
        [fn('SUM', col('TransactionItem.subtotal')), 'totalRevenue'],
        [fn('SUM', col('quantity')), 'totalQty']
      ],
      include: [
        {
          model: Transaction,
          as: 'transaction',
          attributes: [],
          where: buildCompletedDateFilter(startDate, endDate)
        },
        {
          model: Product,
          as: 'product',
          attributes: [],
          include: [
            {
              model: Category,
              as: 'category',
              attributes: []
            }
          ]
        }
      ],
      group: ['product.category.id', 'product.category.name'],
      order: [[literal('totalRevenue'), 'DESC']],
      raw: true
    });
  },

  findRevenueByCashier(startDate?: string, endDate?: string) {
    return Transaction.findAll({
      where: buildCompletedDateFilter(startDate, endDate),
      attributes: [
        'userId',
        [col('user.name'), 'userName'],
        [fn('COUNT', col('Transaction.id')), 'totalTransactions'],
        [fn('SUM', col('total')), 'totalRevenue']
      ],
      include: [
        {
          model: User,
          as: 'user',
          attributes: []
        }
      ],
      group: ['userId', 'user.name'],
      order: [[literal('totalRevenue'), 'DESC']],
      raw: true
    });
  }
};
