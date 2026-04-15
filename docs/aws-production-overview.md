# AWS Production Overview

Dokumen ini menjelaskan arsitektur production yang dipakai setelah perubahan stack:

- Frontend Next.js di AWS Amplify Hosting
- Backend Express + Sequelize di EC2 Ubuntu
- Database MySQL di Amazon Lightsail Database
- Upload file gambar ke Amazon Lightsail bucket
- Nginx di EC2 sebagai reverse proxy backend

## Arsitektur

```text
Browser
  |
  | https://app.example.com
  v
Amplify Hosting (Next.js frontend)
  |
  | https://api.example.com/api
  v
EC2 Ubuntu + Nginx
  |
  v
Backend Express
  | \
  |  \
  |   +--> Lightsail bucket (gambar produk)
  |
  +-----> Lightsail MySQL
```

## Resource AWS Yang Dibutuhkan

- 1 Amplify app untuk frontend
- 1 EC2 instance Ubuntu untuk backend
- 1 Lightsail managed MySQL database
- 1 Lightsail bucket untuk media
- 1 domain atau subdomain

Contoh domain:

- `app.example.com` untuk frontend
- `api.example.com` untuk backend

## Secret Dan Storage

Di setup ini:

- secret backend disimpan di file `.env.production` pada server EC2
- object storage memakai Lightsail bucket access key
- backend upload file ke bucket memakai AWS SDK for JavaScript v3

## Alur Upload Gambar

Backend menyediakan endpoint upload gambar produk:

```text
POST /api/products/:id/image
```

Alurnya:

1. Client upload file ke backend
2. Backend upload file ke Lightsail bucket
3. Backend membentuk URL public object
4. Backend menyimpan URL itu ke kolom `products.image_url`

Implementasi kode ada di:

- [backend/src/services/s3.service.ts](../backend/src/services/s3.service.ts)
- [backend/src/middlewares/upload.ts](../backend/src/middlewares/upload.ts)
- [backend/src/routes/product.routes.ts](../backend/src/routes/product.routes.ts)

## Dokumen Terkait

- Backend production: [aws-production-backend.md](aws-production-backend.md)
- Frontend production: [aws-production-frontend.md](aws-production-frontend.md)
- Service file systemd: [../deploy/aws/backend.service](../deploy/aws/backend.service)
- Nginx config: [../deploy/aws/nginx-kasir.conf](../deploy/aws/nginx-kasir.conf)
