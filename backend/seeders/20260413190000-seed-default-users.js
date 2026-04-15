'use strict';

const bcrypt = require('bcryptjs');

const saltRounds = 10;

module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const password = await bcrypt.hash('admin123', saltRounds);

    await queryInterface.bulkInsert('users', [
      {
        name: 'Administrator',
        email: 'admin@toko.com',
        password,
        role: 'admin',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        name: 'Manager Toko',
        email: 'manager@toko.com',
        password,
        role: 'manager',
        is_active: true,
        created_at: now,
        updated_at: now
      },
      {
        name: 'Kasir Toko',
        email: 'kasir@toko.com',
        password,
        role: 'kasir',
        is_active: true,
        created_at: now,
        updated_at: now
      }
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: ['admin@toko.com', 'manager@toko.com', 'kasir@toko.com']
    });
  }
};
