'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StockLog extends Model {
    static associate(models) {
      StockLog.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product'
      });
      StockLog.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }

  StockLog.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      productId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      userId: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      type: {
        type: DataTypes.ENUM('in', 'out', 'adjustment'),
        allowNull: false
      },
      qtyBefore: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      qtyChange: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      qtyAfter: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      reason: {
        type: DataTypes.STRING,
        allowNull: false
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'StockLog',
      tableName: 'stock_logs',
      underscored: true,
      timestamps: true,
      updatedAt: false
    }
  );

  return StockLog;
};

