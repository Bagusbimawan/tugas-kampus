'use strict';

const defaultCategories = [
  {
    name: 'Makanan Ringan',
    description: 'Snack kemasan, biskuit, keripik, dan camilan cepat saji.'
  },
  {
    name: 'Minuman',
    description: 'Air mineral, teh, kopi, jus, soda, dan minuman siap minum.'
  },
  {
    name: 'Sembako',
    description: 'Beras, gula, minyak, tepung, mie, dan kebutuhan pokok rumah tangga.'
  },
  {
    name: 'Kebersihan',
    description: 'Sabun, deterjen, pembersih lantai, tisu, dan produk sanitasi.'
  },
  {
    name: 'Perawatan Pribadi',
    description: 'Shampoo, pasta gigi, skincare dasar, dan kebutuhan perawatan diri.'
  },
  {
    name: 'Frozen Food',
    description: 'Makanan beku seperti nugget, sosis, dan olahan siap masak.'
  }
];

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const [rows] = await queryInterface.sequelize.query(
      'SELECT name FROM categories'
    );
    const existingNames = new Set(rows.map((row) => row.name));
    const categoriesToInsert = defaultCategories
      .filter((category) => !existingNames.has(category.name))
      .map((category) => ({
        ...category,
        created_at: now,
        updated_at: now
      }));

    if (categoriesToInsert.length === 0) {
      return;
    }

    await queryInterface.bulkInsert('categories', categoriesToInsert);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('categories', {
      name: defaultCategories.map((category) => category.name)
    });
  }
};
