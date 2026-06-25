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

const backendRoot = getBackendRoot();
const env = process.env.NODE_ENV || 'development';

[path.join(backendRoot, '.env'), path.join(backendRoot, '.env.production')].forEach((envFile) => {
  require('dotenv').config({ path: envFile });
});

const basename = path.basename(__filename);
const configPath = path.join(backendRoot, 'config', 'config.json');
const config = require(configPath)[env];
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
