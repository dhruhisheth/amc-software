# AMC Tracker

A hosted web app for tracking AC/HVAC AMC (Annual Maintenance Contract) service across multiple
building projects — replaces the manually-maintained Excel workbook with an uploadable, dashboarded,
multi-user system.

## Features

- **Excel upload**: upload the AMC workbook any time it's updated. Each sheet becomes a "project."
  Column layout is auto-detected on first upload; re-uploads reuse the saved mapping automatically.
- **Dashboard**: overdue/due-soon service alerts and AMC renewal alerts, computed automatically from
  a configurable service interval (default 90 days).
- **Per-project unit tables**: search, filter (status / overdue / renewals due), sort, paginate.
- **In-app editing**: update contact info, status, remarks, and mark a service visit done without
  re-uploading Excel.
- **Export**: download the current database state as a formatted `.xlsx`.
- **Accounts**: admin/staff roles. Admins manage uploads, settings, and team accounts; staff can view
  and edit unit records.

## Tech stack

Next.js 16 (App Router) · Prisma 7 + PostgreSQL · NextAuth v4 (credentials/JWT) · Tailwind CSS ·
exceljs · dayjs

## Local development

Requires Node 20+ and a PostgreSQL database.

1. Install dependencies:
   ```bash
   npm install
   ```
2. Copy `.env` and set:
   - `DATABASE_URL` — a Postgres connection string
   - `NEXTAUTH_SECRET` — any random string (`openssl rand -base64 32`)
   - `NEXTAUTH_URL` — `http://localhost:3000` for local dev
3. Run migrations:
   ```bash
   npx prisma migrate deploy
   ```
4. Seed the first admin account (edit `scripts/seed.ts` to change the email/temp password first if
   needed):
   ```bash
   npm run seed
   ```
5. Start the dev server:
   ```bash
   npm run dev
   ```

### Verifying the import engine

`scripts/import-check.ts` runs the parsing engine against a real workbook and reports per-sheet row
counts, skipped blank rows, and unparsed date/AMC-period counts — a fast regression check whenever
`src/lib/import/*` changes:

```bash
npm run import-check -- /path/to/workbook.xlsx
```

## Deployment

This app is built to deploy on **Vercel** with a **Neon** (or any managed) Postgres database — both
have free tiers sufficient for a small internal tool.

1. **Database**: create a Postgres database (e.g. at [neon.tech](https://neon.tech)) and copy its
   connection string.
2. **Push this repo to GitHub** (or GitLab/Bitbucket).
3. **Import the repo into Vercel** ([vercel.com/new](https://vercel.com/new)).
4. **Set environment variables** in the Vercel project settings:
   - `DATABASE_URL` — the Neon connection string
   - `NEXTAUTH_SECRET` — a random string, different from your local dev value
   - `NEXTAUTH_URL` — your production URL (e.g. `https://your-app.vercel.app`)
5. **Run migrations against production** once, from your local machine, pointed at the production
   `DATABASE_URL`:
   ```bash
   DATABASE_URL="<production-url>" npx prisma migrate deploy
   DATABASE_URL="<production-url>" npm run seed
   ```
6. Deploy. Log in with the seeded admin account and change the temporary password from Settings
   (once a change-password flow exists — for now, update it directly via the database or a new seed
   run).

### Notes for future deploys

- Prisma is intentionally pinned to the `7.x` line (not `latest`, which currently resolves to an
  8.0 release candidate). Bump deliberately, following Prisma's v7→v8 migration guide when it's out
  of RC.
- The Prisma client uses the `@prisma/adapter-pg` driver adapter (required in Prisma 7 for SQL
  providers) — `DATABASE_URL` must point at a real Postgres-compatible endpoint.
- AMC/service dates are stored as UTC-midnight instants and always formatted/computed via
  `src/lib/date.ts`'s helpers — see the comment there before adding new date display or arithmetic
  code, to avoid reintroducing timezone-shift bugs.
