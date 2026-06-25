'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');

function getBackendRoot() {
  const parentDir = path.basename(path.dirname(__dirname));

  if (parentDir === 'dist') {
    return path.resolve(__dirname, '..', '..');
  }

  return path.resolve(__dirname, '..');
}

function loadDatabaseConfig(envName) {
  const backendRoot = getBackendRoot();

  [path.join(backendRoot, '.env.production'), path.join(backendRoot, '.env')].forEach((envFile) => {
    require('dotenv').config({ path: envFile });
  });

  try {
    const configModule = require(path.join(backendRoot, 'config', 'config.js'));
    const config = configModule[envName];

    if (config) {
      return config;
    }
  } catch (error) {
    console.warn('config/config.js tidak ditemukan, memakai environment variable DB_*');
  }

  const resolvedHost =
    !process.env.DB_HOST || process.env.DB_HOST === 'mysql'
      ? '127.0.0.1'
      : process.env.DB_HOST;

  return {
    database: process.env.DB_NAME || 'kasir_db',
    username: process.env.DB_USER || 'kasir_user',
    password: process.env.DB_PASSWORD || '',
    host: resolvedHost,
    port: Number(process.env.DB_PORT || 3306),
    dialect: 'mysql',
    define: {
      underscored: true
    }
  };
}

const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';
const config = loadDatabaseConfig(env);
const db = {};
const resolvedHost =
  !process.env.DB_HOST || process.env.DB_HOST === 'mysql'
    ? '127.0.0.1'
    : process.env.DB_HOST;

const sequelize = new Sequelize(
  process.env.DB_NAME || config.database,
  process.env.DB_USER || config.username,
  process.env.DB_PASSWORD || config.password,
  {
    host: resolvedHost,
    port: Number(process.env.DB_PORT || config.port),
    dialect: config.dialect,
    define: config.define || {}
  }
);

fs.readdirSync(__dirname)
  .filter((file) => {
    return file.indexOf('.') !== 0 && file !== basename && file.endsWith('.js');
  })
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach((modelName) => {
  if (typeof db[modelName].associate === 'function') {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = {
  sequelize,
  Sequelize,
  User: db.User,
  Category: db.Category,
  Product: db.Product,
  Transaction: db.Transaction,
  TransactionItem: db.TransactionItem,
  Payment: db.Payment,
  StockLog: db.StockLog,
  StoreSetting: db.StoreSetting
};
