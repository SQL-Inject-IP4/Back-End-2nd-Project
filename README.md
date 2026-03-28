# Backend

Backend terpisah untuk:

- Login Google OAuth
- Penyimpanan user dan style website dengan PostgreSQL + Prisma
- Akses style berdasarkan status login Google OAuth

## Endpoint utama

- `GET /health`
- `GET /auth/google`
- `GET /auth/google/callback`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /api/style`
- `PATCH /api/style`

`GET /api/style` hanya bisa dipanggil oleh user yang sudah login.
`PATCH /api/style` hanya bisa dipanggil oleh user yang sudah login lewat Google OAuth.

## Setup

1. Copy `.env.example` menjadi `.env`
2. Isi kredensial Google OAuth
3. Install dependency: `npm install`
4. Generate Prisma client: `npm run prisma:generate`
5. Jalankan migrasi: `npm run prisma:migrate`
6. Seed default style: `npm run prisma:seed`
7. Jalankan server: `npm run dev`
