# AWS Production Backend

Dokumen ini berisi langkah production untuk backend:

- deploy ke EC2
- koneksi ke Lightsail MySQL
- upload gambar ke Lightsail bucket
- penggunaan file di folder `deploy/aws`

## 1. Target Production

Susunan direktori contoh di EC2:

```text
/opt/kasir
├── backend
│   ├── dist
│   ├── package.json
│   └── .env.production
└── frontend
```

Service yang berjalan:

- Nginx listen di port `80` atau `443`
- Backend Node.js listen di port `3001`

## 2. Provisioning AWS

Siapkan resource berikut:

- EC2 Ubuntu untuk backend
- Lightsail Database MySQL
- Lightsail bucket untuk gambar
- domain backend, misalnya `api.example.com`

## 3. Lightsail Database

Isi environment backend dengan endpoint Lightsail database:

```env
DB_HOST=ls-xxxxxxxxxxxxxxxxxxxxxx.ap-southeast-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=kasir_db
DB_USER=kasir_user
DB_PASSWORD=your-strong-password
```

Checklist:

- firewall Lightsail database hanya membuka port `3306` untuk IP backend
- kredensial database benar
- migrasi backend bisa dieksekusi dari EC2

## 4. File Env Backend Production

Buat file production:

```bash
cp backend/.env.production.example backend/.env.production
```

Contoh isi:

```env
NODE_ENV=production
PORT=3001

DB_HOST=ls-xxxxxxxxxxxxxxxxxxxxxx.ap-southeast-1.rds.amazonaws.com
DB_PORT=3306
DB_NAME=kasir_db
DB_USER=kasir_user
DB_PASSWORD=your-strong-password

JWT_SECRET=replace-with-strong-secret
JWT_EXPIRES_IN=8h

LIGHTSAIL_BUCKET_REGION=ap-southeast-1
LIGHTSAIL_BUCKET_NAME=your-lightsail-bucket-name
LIGHTSAIL_BUCKET_ACCESS_KEY_ID=LSIAxxxxxxxxxxxxxxxx
LIGHTSAIL_BUCKET_SECRET_ACCESS_KEY=replace-me
LIGHTSAIL_BUCKET_PUBLIC_URL=https://your-lightsail-bucket-name.ap-southeast-1.amazonaws.com
LIGHTSAIL_BUCKET_KEY_PREFIX=kasir-prod
MAX_UPLOAD_SIZE_MB=5
```

Template file tersedia di [backend/.env.production.example](../backend/.env.production.example).

Kalau Anda tidak mau membuat database manual, ada dua pola:

1. Pakai user admin/master untuk setup awal
2. Jalankan script [setup-lightsail-db.sh](../setup-lightsail-db.sh)

Script itu akan:

- membuat database `DB_NAME` jika belum ada
- optional membuat user aplikasi
- menjalankan migration Sequelize

## 5. Lightsail Bucket Access Keys

Di Lightsail console:

1. Buka bucket yang dipakai.
2. Masuk ke tab `Permissions`.
3. Buat `Access key`.
4. Simpan `Access key ID` dan `Secret access key`.

Nilai itu dipasang ke env berikut:

- `LIGHTSAIL_BUCKET_ACCESS_KEY_ID`
- `LIGHTSAIL_BUCKET_SECRET_ACCESS_KEY`

Isi `LIGHTSAIL_BUCKET_PUBLIC_URL` dengan URL bucket public Anda. Menurut dokumentasi AWS Lightsail, pola URL publik bucket adalah seperti `https://bucket-name.region.amazonaws.com/...`.

## 6. Setup Database Otomatis Di Lightsail

Kalau Anda punya username/password admin atau master MySQL dari Lightsail, Anda tidak perlu membuat database manual.

### Opsi A

Pakai user admin/master hanya untuk setup, lalu biarkan app memakai user terpisah:

```bash
export DB_HOST='ls-xxxxxxxx.ap-southeast-1.rds.amazonaws.com'
export DB_PORT='3306'
export DB_NAME='kasir_db'

export DB_ADMIN_USER='masteruser'
export DB_ADMIN_PASSWORD='masterpassword'

export APP_DB_USER='kasir_user'
export APP_DB_PASSWORD='password-aplikasi'

chmod +x setup-lightsail-db.sh
./setup-lightsail-db.sh
```

### Opsi B

Kalau Anda ingin langsung memakai credential admin/master itu juga untuk aplikasi:

```bash
export DB_HOST='ls-xxxxxxxx.ap-southeast-1.rds.amazonaws.com'
export DB_PORT='3306'
export DB_NAME='kasir_db'

export DB_USER='masteruser'
export DB_PASSWORD='masterpassword'
export SKIP_APP_USER_CREATE='true'

chmod +x setup-lightsail-db.sh
./setup-lightsail-db.sh
```

Setelah script selesai:

- database akan dibuat otomatis bila belum ada
- migration Sequelize akan jalan otomatis

## 7. Deploy Kode Backend Ke EC2

Contoh langkah deploy:

```bash
cd /opt/kasir
npm install
cd backend
npm run build
npm run migrate
npm run start
```

Kalau source code sudah ada di server, pastikan file `.env.production` juga sudah ada di `/opt/kasir/backend/.env.production`.

## 8. Jalankan Sebagai Service

File service contoh ada di [deploy/aws/backend.service](../deploy/aws/backend.service).

Pasang:

```bash
cp backend/.env.production /opt/kasir/backend/.env.production
sudo cp deploy/aws/backend.service /etc/systemd/system/kasir-backend.service
sudo systemctl daemon-reload
sudo systemctl enable kasir-backend
sudo systemctl start kasir-backend
```

Cek status:

```bash
sudo systemctl status kasir-backend
journalctl -u kasir-backend -f
```

Penjelasan file `deploy/aws/backend.service`:

- `WorkingDirectory=/opt/kasir/backend` berarti source backend diletakkan di folder itu
- `EnvironmentFile=/opt/kasir/backend/.env.production` berarti service membaca env dari file production
- `ExecStart=/usr/bin/npm run start` menjalankan backend production

## 9. Reverse Proxy Nginx

File config contoh ada di [deploy/aws/nginx-kasir.conf](../deploy/aws/nginx-kasir.conf).

Pasang:

```bash
sudo cp deploy/aws/nginx-kasir.conf /etc/nginx/sites-available/kasir-api
sudo ln -s /etc/nginx/sites-available/kasir-api /etc/nginx/sites-enabled/kasir-api
sudo nginx -t
sudo systemctl reload nginx
```

Kalau sudah memakai HTTPS via Certbot, tambahkan sertifikat ke server block yang sama.

Penjelasan file `deploy/aws/nginx-kasir.conf`:

- `server_name api.example.com` ganti ke domain API Anda
- `proxy_pass http://127.0.0.1:3001` meneruskan request ke backend Node di port `3001`
- `client_max_body_size 10M` mengatur batas upload di layer Nginx

## 10. Lightsail Bucket Untuk Upload Gambar

Environment yang dipakai backend:

```env
LIGHTSAIL_BUCKET_REGION=ap-southeast-1
LIGHTSAIL_BUCKET_NAME=your-lightsail-bucket-name
LIGHTSAIL_BUCKET_ACCESS_KEY_ID=LSIAxxxxxxxxxxxxxxxx
LIGHTSAIL_BUCKET_SECRET_ACCESS_KEY=replace-me
LIGHTSAIL_BUCKET_PUBLIC_URL=https://your-lightsail-bucket-name.ap-southeast-1.amazonaws.com
LIGHTSAIL_BUCKET_KEY_PREFIX=kasir-prod
MAX_UPLOAD_SIZE_MB=5
```

Endpoint upload:

```text
POST /api/products/:id/image
```

Aturan endpoint:

- auth wajib
- role harus `admin` atau `manager`
- request harus `multipart/form-data`
- field file harus bernama `image`
- mime type yang diterima: `image/jpeg`, `image/png`, `image/webp`

Contoh request:

```bash
curl -X POST https://api.example.com/api/products/1/image \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -F "image=@/path/to/product.png"
```

Hasil:

- file diupload ke Lightsail bucket
- backend membentuk URL public
- URL disimpan ke `products.image_url`
- response berisi data produk terbaru

## 11. Penjelasan POC Folder `deploy/aws`

Folder `deploy/aws` dipakai sebagai POC deployment, bukan tool deploy otomatis.

Isi folder:

- [deploy/aws/backend.service](../deploy/aws/backend.service)
  Fungsi: template service `systemd` agar backend auto-start di EC2.
- [deploy/aws/nginx-kasir.conf](../deploy/aws/nginx-kasir.conf)
  Fungsi: template reverse proxy Nginx dari `api.example.com` ke backend Node di `127.0.0.1:3001`.

Jadi alurnya:

1. upload code backend ke EC2
2. taruh `.env.production` di folder backend
3. build backend
4. pasang `backend.service`
5. pasang `nginx-kasir.conf`
6. arahkan domain ke EC2

## 12. Checklist Sebelum Go Live

- backend build sukses
- migrasi sukses
- backend bisa connect ke Lightsail database
- backend bisa upload object ke Lightsail bucket
- domain `api.example.com` sudah mengarah ke EC2
- HTTPS aktif
- `NEXT_PUBLIC_API_URL` frontend sudah mengarah ke endpoint production

## 13. Troubleshooting

Jika backend gagal start:

- cek `journalctl -u kasir-backend -f`
- cek file `/opt/kasir/backend/.env.production`
- cek koneksi database ke Lightsail
- jika database belum ada, jalankan `./setup-lightsail-db.sh`

Jika upload gambar gagal:

- cek `LIGHTSAIL_BUCKET_NAME`
- cek `LIGHTSAIL_BUCKET_ACCESS_KEY_ID`
- cek `LIGHTSAIL_BUCKET_SECRET_ACCESS_KEY`
- cek `LIGHTSAIL_BUCKET_PUBLIC_URL`
- cek ukuran file tidak melebihi `MAX_UPLOAD_SIZE_MB`
