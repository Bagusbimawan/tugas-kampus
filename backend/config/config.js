'use strict';

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '..', '.env') });

const resolvedHost =
  !process.env.DB_HOST || process.env.DB_HOST === 'mysql'
    ? '127.0.0.1'
    : process.env.DB_HOST;

const shared = {
  username: process.env.DB_USER || 'kasir_user',
  password: process.env.DB_PASSWORD || 'CHANGE_ME',
  database: process.env.DB_NAME || 'kasir_db',
  port: Number(process.env.DB_PORT || 3306),
  dialect: 'mysql',
  define: {
    underscored: true
  }
};

module.exports = {
  development: {
    ...shared,
    host: resolvedHost
  },
  production: {
    ...shared,
    host: resolvedHost
  }
};
