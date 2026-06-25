'use strict';

module.exports = {
  async up(queryInterface) {
    await queryInterface.bulkInsert('store_settings', [
      {
        store_name: 'Toko Gunadarma',
        store_address: 'Jl. Margonda Raya, Depok',
        store_phone: '0210000000',
        tax_rate: 11,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('store_settings', null, {});
  }
};
