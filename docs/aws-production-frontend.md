# AWS Production Frontend

Dokumen ini berisi langkah production untuk frontend Next.js.

Target deployment yang direkomendasikan:

- Frontend di AWS Amplify Hosting
- Backend API di EC2
- Frontend memanggil API domain production

## 1. Target Domain

Contoh domain:

- frontend: `https://app.example.com`
- backend api: `https://api.example.com/api`

Frontend harus memakai base URL backend production, bukan localhost.

## 2. Environment Frontend Production

Copy file contoh:

```bash
cp frontend/.env.production.example frontend/.env.local
```

Isi production:

```env
NEXT_PUBLIC_API_URL=https://kasir.bagusbimawan.com/api
```

Template ada di [frontend/.env.production.example](../frontend/.env.production.example).

## 3. Opsi Deploy Yang Direkomendasikan

Untuk project ini, jalur paling sederhana:

- build frontend di Amplify
- host frontend di Amplify
- backend tetap di EC2

## 4. Langkah Setup Amplify

1. Push source code ke Git provider Anda.
2. Buat app baru di AWS Amplify.
3. Connect repository.
4. Set root project ke `frontend`.
5. Tambahkan environment variable:

```env
NEXT_PUBLIC_API_URL=https://api.example.com/api
```

6. Jalankan build.
7. Sambungkan custom domain `app.example.com`.

## 5. Build Settings Amplify

Contoh `amplify.yml`:

```yaml
version: 1
frontend:
  phases:
    preBuild:
      commands:
        - npm ci
    build:
      commands:
        - npm run build
  artifacts:
    baseDirectory: .next
    files:
      - '**/*'
  cache:
    paths:
      - node_modules/**/*
```

## 6. Verifikasi Setelah Deploy

Pastikan:

- frontend terbuka di domain production
- login mengarah ke backend production
- semua request browser menuju `https://api.example.com/api`
- tidak ada request ke `localhost:3001`

## 7. Koneksi Dengan Upload Gambar

Frontend tidak upload langsung ke bucket pada POC ini. Alurnya masih lewat backend:

1. frontend kirim file ke `POST /api/products/:id/image`
2. backend upload file ke Lightsail bucket
3. backend simpan URL bucket ke database
4. frontend menampilkan `imageUrl` dari response produk

Ini cocok untuk POC karena:

- auth dan validasi tetap di backend
- tidak perlu pre-signed URL dulu
- integrasi database tetap sederhana

## 8. Checklist Frontend Production

- `NEXT_PUBLIC_API_URL` sudah benar
- domain frontend aktif
- HTTPS aktif
- CORS backend mengizinkan origin frontend production
- login, list produk, transaksi, dan laporan berhasil

## 9. Catatan Penting

- Jangan pakai `localhost` di env production frontend
- Karena env frontend diekspose ke browser, hanya simpan variabel publik seperti `NEXT_PUBLIC_API_URL`
- Secret bucket dan database hanya boleh ada di backend
