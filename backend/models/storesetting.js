'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class StoreSetting extends Model {}

  StoreSetting.init(
    {
      id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      storeName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      storeAddress: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      storePhone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      taxRate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 11
      }
    },
    {
      sequelize,
      modelName: 'StoreSetting',
      tableName: 'store_settings',
      underscored: true,
      timestamps: true
    }
  );

  return StoreSetting;
};
