# Backend

Backend project ini menangani authentication, authorization, session, dan penyimpanan style global website. Stack utamanya adalah Express 5, Better Auth, Prisma ORM 7, dan PostgreSQL.

## Tanggung Jawab Backend

Backend bertanggung jawab untuk:

- menjalankan login Google OAuth
- membuat dan memvalidasi session user
- menentukan role `EDITOR` atau `VIEWER`
- membatasi endpoint perubahan style hanya untuk editor
- menyimpan warna dan font website secara global ke PostgreSQL
- menambahkan hardening dasar seperti CORS allowlist, security headers, validasi input, dan rate limiting

## Tech Stack

- Node.js
- Express 5
- Better Auth
- Prisma ORM 7
- PostgreSQL
- Zod
- cookie-parser
- cors

## Mekanisme Auth dan RBAC

### Authentication

Login menggunakan Google OAuth melalui Better Auth.

Alur singkat:

1. frontend memanggil `GET /auth/google`
2. backend mengarahkan user ke Google
3. Google mengembalikan user ke callback Better Auth
4. Better Auth membuat session cookie `httpOnly`
5. frontend memanggil `GET /auth/me` untuk mengambil user aktif

### Authorization

Backend menggunakan RBAC sederhana:

- `EDITOR`
- `VIEWER`

Aturannya:

- semua akun Google bisa login
- hanya akun editor yang didaftarkan pada `REGISTERED_GOOGLE_ACCOUNTS` yang menjadi `EDITOR`
- akun Google lain tetap bisa login, tetapi otomatis menjadi `VIEWER`

Enforcement dilakukan di backend, terutama pada endpoint `PATCH /api/style`.

## Endpoint Utama

### Health

- `GET /health`

### Auth

- `GET /auth/google`
- `GET /auth/me`
- `POST /auth/logout`

### Better Auth internal

- mounted di `/api/auth/*`
- callback Google aktif di `/api/auth/callback/google`

### Style

- `GET /api/style`
- `PATCH /api/style`

Aturan akses:

- `GET /api/style` bersifat publik
- `PATCH /api/style` hanya untuk user dengan role `EDITOR`

## Struktur Folder Penting

```text
Backend/
|-- prisma/
|   |-- migrations/
|   |-- schema.prisma
|   `-- seed.ts
`-- src/
    |-- config/
    |   `-- env.ts
    |-- lib/
    |   |-- better-auth.ts
    |   |-- prisma.ts
    |   `-- rbac.ts
    |-- middleware/
    |   |-- authenticate.ts
    |   `-- security.ts
    |-- routes/
    |   |-- auth.ts
    |   `-- style.ts
    `-- server.ts
```

## Model Database

Model utama di Prisma:

- `User`
- `Session`
- `Account`
- `Verification`
- `AllowedGoogleAccount`
- `StyleSetting`

Fungsi model:

- `User`: menyimpan identitas user dan role
- `Session`: menyimpan session Better Auth
- `Account`: relasi user dengan akun provider Google
- `Verification`: kebutuhan internal Better Auth
- `AllowedGoogleAccount`: daftar akun editor terdaftar
- `StyleSetting`: menyimpan warna dan font global

## Environment Variable

Isi `.env` berdasarkan `.env.example`.

| Variable                     | Fungsi                                                         |
| ---------------------------- | -------------------------------------------------------------- |
| `PORT`                       | Port server Express                                            |
| `NODE_ENV`                   | Mode runtime aplikasi                                          |
| `DATABASE_URL`               | Koneksi PostgreSQL untuk Prisma                                |
| `GOOGLE_CLIENT_ID`           | Client ID Google OAuth                                         |
| `GOOGLE_CLIENT_SECRET`       | Client secret Google OAuth                                     |
| `GOOGLE_CALLBACK_URL`        | Callback URL yang dipakai Better Auth                          |
| `FRONTEND_URL`               | Origin frontend utama                                          |
| `FRONTEND_URLS`              | Daftar origin frontend tambahan untuk CORS dan trusted origins |
| `FRONTEND_LOGIN_SUCCESS_URL` | URL redirect setelah login berhasil                            |
| `FRONTEND_LOGIN_FAILURE_URL` | URL redirect setelah login gagal                               |
| `AUTH_USE_FRONTEND_PROXY`    | Menentukan apakah flow auth memakai proxy frontend             |
| `BETTER_AUTH_SECRET`         | Secret utama Better Auth                                       |
| `REGISTERED_GOOGLE_ACCOUNTS` | Daftar akun editor yang diizinkan                              |

Contoh callback lokal:

```env
GOOGLE_CALLBACK_URL="http://localhost:4000/api/auth/callback/google"
```

Contoh daftar editor:

```env
REGISTERED_GOOGLE_ACCOUNTS="email1@gmail.com:EDITOR,email2@gmail.com:EDITOR"
```

Catatan:

- akun editor harus didaftarkan di environment
- akun viewer tidak perlu didaftarkan
- akun Google yang tidak ada di daftar tetap bisa login, tetapi otomatis menjadi `VIEWER`

## Mode Integrasi Frontend

Backend ini mendukung dua pola integrasi dengan frontend.

| Mode                        | Digunakan untuk                         | Cara frontend mengakses backend                                                                     | Callback Google                                              | `AUTH_USE_FRONTEND_PROXY` |
| --------------------------- | --------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ | ------------------------- |
| Direct backend              | Lokal dan deployment umum               | Frontend memanggil backend langsung                                                                 | Mengarah ke domain backend                                   | `false`                   |
| Frontend proxy untuk Vercel | Frontend dan backend terpisah di Vercel | Browser mengakses route auth/style lewat domain frontend, lalu Vercel rewrite meneruskan ke backend | Mengarah ke domain frontend pada `/api/auth/callback/google` | `true`                    |

### Konfigurasi Direct Backend

Pakai mode ini untuk:

- development lokal
- deployment umum

Aturannya:

- frontend mengisi `VITE_BACKEND_URL` ke URL backend
- `GOOGLE_CALLBACK_URL` mengarah ke backend
- `FRONTEND_LOGIN_SUCCESS_URL` dan `FRONTEND_LOGIN_FAILURE_URL` tetap mengarah ke frontend

Contoh:

```env
FRONTEND_URL="http://localhost:5173"
FRONTEND_LOGIN_SUCCESS_URL="http://localhost:5173/"
FRONTEND_LOGIN_FAILURE_URL="http://localhost:5173/"
GOOGLE_CALLBACK_URL="http://localhost:4000/api/auth/callback/google"
AUTH_USE_FRONTEND_PROXY="false"
```

### Konfigurasi Frontend Proxy untuk Vercel

Pakai mode ini saat:

- frontend dan backend berada di project atau repository berbeda dan keduanya dideploy terpisah di Vercel
- frontend menjadi entry point untuk auth flow

Route yang umumnya diproxy dari frontend ke backend:

- `/auth/*`
- `/api/auth/*`
- `/api/style`

Contoh:

```env
FRONTEND_URL="https://fe-pekapel.vercel.app"
FRONTEND_URLS="https://fe-pekapel.vercel.app"
FRONTEND_LOGIN_SUCCESS_URL="https://fe-pekapel.vercel.app/"
FRONTEND_LOGIN_FAILURE_URL="https://fe-pekapel.vercel.app/"
GOOGLE_CALLBACK_URL="https://fe-pekapel.vercel.app/api/auth/callback/google"
AUTH_USE_FRONTEND_PROXY="true"
```

## Setup Lokal

1. Copy `.env.example` menjadi `.env`
2. Isi kredensial Google OAuth dan `DATABASE_URL`
3. Pastikan redirect URI Google Console cocok dengan `GOOGLE_CALLBACK_URL`
4. Install dependency
5. Generate Prisma client
6. Apply migration
7. Seed data awal
8. Jalankan backend

Perintah:

```bash
npm install
npm run prisma:generate
npx prisma migrate deploy
npm run prisma:seed
npm run dev
```

Backend akan berjalan di:

```text
http://localhost:4000
```

## Build Production

```bash
npm run build
npm start
```

## Fitur Keamanan yang Diimplementasikan

- Google OAuth melalui Better Auth
- session cookie `httpOnly`
- RBAC editor/viewer
- validasi payload style dengan Zod
- CORS allowlist
- security headers dasar:
  - `X-Content-Type-Options`
  - `X-Frame-Options`
  - `Referrer-Policy`
  - `Permissions-Policy`
  - `Cross-Origin-Resource-Policy`
- rate limiting dasar untuk auth dan style endpoint
- sanitasi error response
- pembatasan data publik agar email editor terakhir tidak terekspos di snapshot style
