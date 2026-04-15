'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Product extends Model {
    static associate(models) {
      Product.belongsTo(models.Category, {
        foreignKey: 'categoryId',
        as: 'category'
      });
      Product.hasMany(models.TransactionItem, {
        foreignKey: 'productId',
        as: 'transactionItems'
      });
      Product.hasMany(models.StockLog, {
        foreignKey: 'productId',
        as: 'stockLogs'
      });
    }
  }

  Product.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      categoryId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      sku: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true
      },
      price: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: false
      },
      costPrice: {
        type: DataTypes.DECIMAL(15, 2),
        allowNull: true
      },
      stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
      },
      minStock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      unit: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pcs'
      },
      imageUrl: {
        type: DataTypes.STRING,
        allowNull: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      }
    },
    {
      sequelize,
      modelName: 'Product',
      tableName: 'products',
      underscored: true,
      timestamps: true
    }
  );

  return Product;
};
