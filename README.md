# Backend

Backend terpisah untuk:

- Login Google OAuth
- Penyimpanan user dan style website dengan PostgreSQL + Prisma
- RBAC untuk akun Google yang terdaftar

## Endpoint utama

- `GET /health`
- `GET /auth/google`
- `GET /auth/google/callback`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /api/style`
- `PATCH /api/style`

`GET /api/style` bisa dipanggil semua user untuk membaca style global website.
`PATCH /api/style` hanya bisa dipanggil oleh user yang login dengan role `EDITOR`.

## Setup

1. Copy `.env.example` menjadi `.env`
2. Isi kredensial Google OAuth
3. Daftarkan akun Google pada `REGISTERED_GOOGLE_ACCOUNTS` dengan format `email:ROLE`
4. Gunakan role `EDITOR` untuk akun yang boleh ubah style, dan `VIEWER` untuk akun yang hanya boleh login dan melihat
5. Install dependency: `npm install`
6. Generate Prisma client: `npm run prisma:generate`
7. Jalankan migrasi: `npm run prisma:migrate`
8. Seed default style dan akun terdaftar: `npm run prisma:seed`
9. Jalankan server: `npm run dev`
