# AMC Tracker

A hosted web app for tracking AC/HVAC AMC (Annual Maintenance Contract) service across multiple
building projects — replaces the manually-maintained Excel workbook with an uploadable, dashboarded,
multi-user system.

## Features

- **Excel upload**: upload the AMC workbook any time it's updated. Each sheet becomes a "project."
  Column layout is auto-detected on first upload; re-uploads reuse the saved mapping automatically.
- **Dashboard**: overdue/due-soon service alerts and AMC renewal alerts, computed automatically from
  a configurable service interval (default 90 days).
- **Per-project flat tables**: block no, flat no, address and four service-date columns, with
  search, filter (status / overdue / renewals due), sort and pagination.
- **Separate service and renewal due dates**: when the next *visit* is owed and when the *contract*
  must be renewed are tracked and shown independently — neither is derived from the other.
- **Add and edit by hand**: projects and individual flats can be created and edited in the app,
  not only imported from Excel.
- **Complaints**: a main tab for logging complaints, assigning the technician attending them by
  name, and tracking them through to resolution.
- **AMC offers**: generate a printable offer project-wise or flat-wise, with full offer history.
- **Service history**: how much service is done vs. pending, and on which date, per flat and
  across projects.
- **Export**: download the current database state as a formatted `.xlsx`.
- **Accounts**: three roles — **Admin** (all access), **Staff** (add and edit anything, but never
  delete), and **View only** (read-only). The owner account
  (`warehouse@dhruvishahvac.com`) is always an admin and cannot be demoted or removed.

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
4. Seed the owner account (`warehouse@dhruvishahvac.com`; set `ROOT_ADMIN_PASSWORD` to override the
   initial password):
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
6. Deploy. Log in with the seeded owner account and change the temporary password (for now, update
   it directly via the database or a new seed run — there is no in-app change-password flow yet).

### Notes for future deploys

- Prisma is intentionally pinned to the `7.x` line (not `latest`, which currently resolves to an
  8.0 release candidate). Bump deliberately, following Prisma's v7→v8 migration guide when it's out
  of RC.
- The Prisma client uses the `@prisma/adapter-pg` driver adapter (required in Prisma 7 for SQL
  providers) — `DATABASE_URL` must point at a real Postgres-compatible endpoint.
- Roles are read from the NextAuth JWT, which is minted at login. Changing someone's role takes
  effect the next time they sign in.
- AMC/service dates are stored as UTC-midnight instants and always formatted/computed via
  `src/lib/date.ts`'s helpers — see the comment there before adding new date display or arithmetic
  code, to avoid reintroducing timezone-shift bugs.
