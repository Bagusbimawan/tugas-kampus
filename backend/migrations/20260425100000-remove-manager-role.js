'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      "UPDATE users SET role = 'admin' WHERE role = 'manager'"
    );

    await queryInterface.changeColumn('users', 'role', {
      type: Sequelize.ENUM('admin', 'kasir'),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('users', 'role', {
      type: Sequelize.ENUM('admin', 'manager', 'kasir'),
      allowNull: false
    });
  }
};
