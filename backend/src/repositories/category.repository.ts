import { Op, Sequelize } from 'sequelize';

const { Category, Product } = require('../../models');

export const categoryRepository = {
  findAll() {
    return Category.findAll({
      order: [['name', 'ASC']]
    });
  },

  findById(id: number) {
    return Category.findByPk(id);
  },

  findByName(name: string, excludedId?: number) {
    const normalizedName = name.trim().toLowerCase();
    const conditions: unknown[] = [
      Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('name')), normalizedName)
    ];

    if (excludedId) {
      conditions.push({ id: { [Op.ne]: excludedId } });
    }

    return Category.findOne({
      where: {
        [Op.and]: conditions
      }
    });
  },

  create(payload: { name: string; description?: string }) {
    return Category.create(payload);
  },

  update(category: any, payload: { name: string; description?: string }) {
    return category.update(payload);
  },

  destroy(category: any) {
    return category.destroy();
  },

  countProducts(categoryId: number) {
    return Product.count({
      where: { categoryId }
    });
  }
};

