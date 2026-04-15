'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Payment extends Model {
    static associate(models) {
      Payment.belongsTo(models.Transaction, {
        foreignKey: 'transactionId',
        as: 'transaction'
      });
    }
  }

  Payment.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      transactionId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        unique: true
      },
      method: {
        type: DataTypes.ENUM('cash', 'qris', 'transfer', 'card'),
        allowNull: false
      },
      amountPaid: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
      },
      changeAmount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      referenceNo: {
        type: DataTypes.STRING,
        allowNull: true
      },
      paidAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'Payment',
      tableName: 'payments',
      underscored: true,
      timestamps: false
    }
  );

  return Payment;
};

