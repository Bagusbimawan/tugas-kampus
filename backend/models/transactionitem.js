'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class TransactionItem extends Model {
    static associate(models) {
      TransactionItem.belongsTo(models.Transaction, {
        foreignKey: 'transactionId',
        as: 'transaction'
      });
      TransactionItem.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product'
      });
    }
  }

  TransactionItem.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      transactionId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      productId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      productName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      discount: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false,
        defaultValue: 0
      },
      subtotal: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'TransactionItem',
      tableName: 'transaction_items',
      underscored: true,
      timestamps: false
    }
  );

  return TransactionItem;
};

