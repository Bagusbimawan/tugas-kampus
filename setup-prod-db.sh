#!/usr/bin/env bash

set -euo pipefail

DB_NAME="${DB_NAME:-kasir_db}"
DB_USER="${DB_USER:-kasir_user}"
DB_PASSWORD="${DB_PASSWORD:-}"
MYSQL_CONFIG_FILE="/etc/mysql/mysql.conf.d/mysqld.cnf"

if [[ -z "${DB_PASSWORD}" ]]; then
  echo "DB_PASSWORD harus diisi di environment." >&2
  exit 1
fi

sudo apt update
sudo DEBIAN_FRONTEND=noninteractive apt install -y mysql-server
sudo systemctl enable --now mysql

sudo mysql <<SQL
ALTER USER 'root'@'localhost' IDENTIFIED WITH auth_socket;
DELETE FROM mysql.user WHERE User='';
DROP DATABASE IF EXISTS test;
DELETE FROM mysql.db WHERE Db='test' OR Db='test\\_%';
FLUSH PRIVILEGES;
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER IF NOT EXISTS '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
ALTER USER '${DB_USER}'@'localhost' IDENTIFIED BY '${DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP
  ON \`${DB_NAME}\`.* TO '${DB_USER}'@'localhost';
FLUSH PRIVILEGES;
SQL

if [[ -f "${MYSQL_CONFIG_FILE}" ]]; then
  sudo sed -i "s/^bind-address.*/bind-address = 127.0.0.1/" "${MYSQL_CONFIG_FILE}" || true
  if ! grep -q "^character-set-server" "${MYSQL_CONFIG_FILE}"; then
    echo "character-set-server = utf8mb4" | sudo tee -a "${MYSQL_CONFIG_FILE}" >/dev/null
  fi
  if ! grep -q "^collation-server" "${MYSQL_CONFIG_FILE}"; then
    echo "collation-server = utf8mb4_unicode_ci" | sudo tee -a "${MYSQL_CONFIG_FILE}" >/dev/null
  fi
  if ! grep -q "^innodb_buffer_pool_size" "${MYSQL_CONFIG_FILE}"; then
    echo "innodb_buffer_pool_size = 256M" | sudo tee -a "${MYSQL_CONFIG_FILE}" >/dev/null
  fi
  if ! grep -q "^slow_query_log" "${MYSQL_CONFIG_FILE}"; then
    echo "slow_query_log = 1" | sudo tee -a "${MYSQL_CONFIG_FILE}" >/dev/null
  fi
fi

sudo systemctl restart mysql

cd backend
npx sequelize-cli db:migrate

echo "Setup MySQL production selesai untuk database ${DB_NAME}."

