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
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
└── src/
    ├── config/
    │   └── env.ts
    ├── lib/
    │   ├── better-auth.ts
    │   ├── prisma.ts
    │   └── rbac.ts
    ├── middleware/
    │   ├── authenticate.ts
    │   └── security.ts
    ├── routes/
    │   ├── auth.ts
    │   └── style.ts
    └── server.ts
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

Variable penting:
- `PORT`
- `NODE_ENV`
- `DATABASE_URL`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL`
- `FRONTEND_URL`
- `FRONTEND_URLS`
- `FRONTEND_LOGIN_SUCCESS_URL`
- `FRONTEND_LOGIN_FAILURE_URL`
- `BETTER_AUTH_SECRET`
- `REGISTERED_GOOGLE_ACCOUNTS`

Contoh callback lokal yang aktif sekarang:

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

## Catatan Deploy

Kalau frontend dan backend dipisah deployment:
- `FRONTEND_URL` harus mengarah ke domain frontend
- `FRONTEND_LOGIN_SUCCESS_URL` dan `FRONTEND_LOGIN_FAILURE_URL` harus mengarah ke frontend
- `GOOGLE_CALLBACK_URL` harus mengarah ke domain backend
- redirect URI yang sama harus didaftarkan juga di Google Cloud Console
