'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Transaction extends Model {
    static associate(models) {
      Transaction.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      Transaction.hasMany(models.TransactionItem, {
        foreignKey: 'transactionId',
        as: 'items'
      });
      Transaction.hasOne(models.Payment, {
        foreignKey: 'transactionId',
        as: 'payment'
      });
    }
  }

  Transaction.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      invoiceNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      subtotal: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
      },
      discount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      tax: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      total: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'completed'
      },
      notes: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'Transaction',
      tableName: 'transactions',
      underscored: true,
      timestamps: true,
      updatedAt: false
    }
  );

  return Transaction;
};

