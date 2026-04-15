import { FindOptions, Op } from 'sequelize';

const { Category, Product } = require('../../models');

const buildSearchCondition = (q?: string) => {
  if (!q) {
    return {};
  }

  return {
    [Op.or]: [
      { name: { [Op.like]: `%${q}%` } },
      { sku: { [Op.like]: `%${q}%` } }
    ]
  };
};

const categoryInclude = {
  model: Category,
  as: 'category',
  attributes: ['id', 'name']
};

export const productRepository = {
  findAndCountAll(params: {
    q?: string;
    categoryId?: number;
    isActive?: boolean;
    limit: number;
    offset: number;
  }) {
    const where: Record<string, unknown> = {
      ...buildSearchCondition(params.q)
    };

    if (params.categoryId) {
      where.categoryId = params.categoryId;
    }

    if (typeof params.isActive === 'boolean') {
      where.isActive = params.isActive;
    }

    return Product.findAndCountAll({
      where,
      include: [categoryInclude],
      limit: params.limit,
      offset: params.offset,
      order: [['createdAt', 'DESC']]
    });
  },

  quickSearch(q: string) {
    return Product.findAll({
      where: {
        isActive: true,
        ...buildSearchCondition(q)
      },
      include: [categoryInclude],
      limit: 20,
      order: [['name', 'ASC']]
    });
  },

  findById(id: number, options: FindOptions = {}) {
    return Product.findByPk(id, {
      include: [categoryInclude],
      ...options
    });
  },

  findBySku(sku: string, excludedId?: number) {
    const where: Record<string, unknown> = { sku };

    if (excludedId) {
      where.id = { [Op.ne]: excludedId };
    }

    return Product.findOne({ where });
  },

  create(payload: Record<string, unknown>, transaction?: unknown) {
    return Product.create(payload, transaction ? { transaction } : undefined);
  },

  update(product: any, payload: Record<string, unknown>, transaction?: unknown) {
    return product.update(payload, transaction ? { transaction } : undefined);
  }
};
