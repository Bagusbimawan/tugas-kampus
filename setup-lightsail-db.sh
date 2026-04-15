#!/usr/bin/env bash

set -euo pipefail

DB_HOST="${DB_HOST:?DB_HOST harus diisi}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-kasir_db}"

DB_ADMIN_USER="${DB_ADMIN_USER:-${DB_USER:-}}"
DB_ADMIN_PASSWORD="${DB_ADMIN_PASSWORD:-${DB_PASSWORD:-}}"

APP_DB_USER="${APP_DB_USER:-${DB_USER:-}}"
APP_DB_PASSWORD="${APP_DB_PASSWORD:-${DB_PASSWORD:-}}"
APP_DB_HOST_PATTERN="${APP_DB_HOST_PATTERN:-%}"
SKIP_APP_USER_CREATE="${SKIP_APP_USER_CREATE:-false}"

if [[ -z "${DB_ADMIN_USER}" || -z "${DB_ADMIN_PASSWORD}" ]]; then
  echo "DB_ADMIN_USER dan DB_ADMIN_PASSWORD harus diisi. Jika ingin memakai kredensial yang sama, isi DB_USER dan DB_PASSWORD." >&2
  exit 1
fi

if ! command -v mysql >/dev/null 2>&1; then
  echo "mysql client belum terinstall. Install dulu mysql client di mesin ini." >&2
  exit 1
fi

echo "Membuat database ${DB_NAME} di ${DB_HOST}:${DB_PORT}..."

mysql \
  --host="${DB_HOST}" \
  --port="${DB_PORT}" \
  --user="${DB_ADMIN_USER}" \
  --password="${DB_ADMIN_PASSWORD}" <<SQL
CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`
  CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
SQL

if [[ "${SKIP_APP_USER_CREATE}" != "true" ]]; then
  if [[ -z "${APP_DB_USER}" || -z "${APP_DB_PASSWORD}" ]]; then
    echo "APP_DB_USER dan APP_DB_PASSWORD harus diisi jika SKIP_APP_USER_CREATE tidak true." >&2
    exit 1
  fi

  echo "Membuat atau update user aplikasi ${APP_DB_USER}@${APP_DB_HOST_PATTERN}..."

  mysql \
    --host="${DB_HOST}" \
    --port="${DB_PORT}" \
    --user="${DB_ADMIN_USER}" \
    --password="${DB_ADMIN_PASSWORD}" <<SQL
CREATE USER IF NOT EXISTS '${APP_DB_USER}'@'${APP_DB_HOST_PATTERN}' IDENTIFIED BY '${APP_DB_PASSWORD}';
ALTER USER '${APP_DB_USER}'@'${APP_DB_HOST_PATTERN}' IDENTIFIED BY '${APP_DB_PASSWORD}';
GRANT SELECT, INSERT, UPDATE, DELETE, CREATE, ALTER, INDEX, DROP
  ON \`${DB_NAME}\`.* TO '${APP_DB_USER}'@'${APP_DB_HOST_PATTERN}';
FLUSH PRIVILEGES;
SQL
fi

export NODE_ENV="${NODE_ENV:-production}"
export DB_HOST
export DB_PORT
export DB_NAME

if [[ "${SKIP_APP_USER_CREATE}" == "true" ]]; then
  export DB_USER="${DB_ADMIN_USER}"
  export DB_PASSWORD="${DB_ADMIN_PASSWORD}"
else
  export DB_USER="${APP_DB_USER}"
  export DB_PASSWORD="${APP_DB_PASSWORD}"
fi

echo "Menjalankan migration Sequelize ke database ${DB_NAME}..."
cd backend
npm run migrate

echo "Setup Lightsail MySQL selesai untuk database ${DB_NAME}."
