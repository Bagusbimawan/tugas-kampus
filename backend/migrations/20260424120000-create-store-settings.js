'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('store_settings', {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      store_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      store_address: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      store_phone: {
        type: Sequelize.STRING,
        allowNull: false
      },
      tax_rate: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 11
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('store_settings');
  }
};
