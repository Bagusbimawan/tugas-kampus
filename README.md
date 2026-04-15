# Sistem Informasi Kasir (POS)

Monorepo untuk aplikasi Point of Sale berbasis web dengan dua aplikasi:

- `frontend/` — Next.js 14, Pages Router, TypeScript, Tailwind CSS
- `backend/` — Node.js, Express, Sequelize v6, MySQL, TypeScript

## Struktur Proyek

```text
.
├── backend
│   ├── config
│   ├── migrations
│   ├── models
│   ├── seeders
│   └── src
├── frontend
│   ├── components
│   ├── pages
│   ├── public
│   ├── services
│   ├── store
│   └── styles
├── docker-compose.yml
└── setup-prod-db.sh
```

## Development Setup

### 1. Siapkan environment file

Copy file contoh berikut:

```bash
cp .env.example .env
cp frontend/.env.local.example frontend/.env.local
```

Isi nilai sensitif berikut sebelum menjalankan service:

- `DB_PASSWORD`
- `DB_ROOT_PASSWORD`
- `JWT_SECRET`

### 2. Jalankan MySQL dan phpMyAdmin

```bash
docker compose up -d
docker compose ps
docker compose logs -f mysql
```

phpMyAdmin tersedia di `http://localhost:8080`.

Perintah tambahan:

```bash
docker compose down
docker compose down -v
docker compose exec mysql mysql -u kasir_user -p kasir_db
```

### 3. Install dependency

```bash
npm install
```

### 4. Jalankan aplikasi

Terminal 1:

```bash
npm run dev:backend
```

Terminal 2:

```bash
npm run dev:frontend
```

### 5. Menjalankan migrasi

```bash
cd backend
npm run migrate
```

## Production Setup

Production database disiapkan langsung di server Ubuntu, bukan lewat Docker.

1. Export `DB_PASSWORD` di shell server.
2. Jalankan script:

```bash
chmod +x setup-prod-db.sh
DB_PASSWORD='your-strong-password' ./setup-prod-db.sh
```

3. Pastikan backend production membaca host `127.0.0.1` dan kredensial yang sama dengan user MySQL yang dibuat script.

## AWS Production Docs

Dokumen production AWS dipisah supaya FE dan BE lebih jelas:

- Overview arsitektur: [docs/aws-production-overview.md](docs/aws-production-overview.md)
- Backend production: [docs/aws-production-backend.md](docs/aws-production-backend.md)
- Frontend production: [docs/aws-production-frontend.md](docs/aws-production-frontend.md)

## Catatan

- Semua endpoint backend nantinya akan berada di prefix `/api`.
- ORM yang digunakan adalah Sequelize, tanpa raw SQL.
- Soft delete akan dipakai untuk `users` dan `products` melalui field `isActive`.
