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

