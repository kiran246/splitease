@AGENTS.md

# SplitEase — Claude Code Guide

## Project Overview
Full-stack expense-splitting web app. Next.js 14 App Router + TypeScript + Tailwind + Prisma 7 (SQLite via libsql adapter) + NextAuth v5.

## Key Commands
```bash
npm run dev          # Start dev server at localhost:3000
npm test             # Run unit tests (Jest)
npm run db:migrate   # Run Prisma migrations (creates prisma/dev.db)
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:studio    # Prisma Studio GUI
npm run build        # Production build
```

## Architecture
- **App Router**: `app/(auth)/` for login/register, `app/(dashboard)/` for protected pages
- **API routes**: `app/api/` — all protected with `auth()` from NextAuth
- **Database**: SQLite (`prisma/dev.db`) via `@prisma/adapter-libsql` + `PrismaLibSql`
- **Auth**: NextAuth v5 Credentials provider, JWT sessions
- **Business logic**: `lib/split.ts` (split calculation), `lib/settlement.ts` (debt minimization)

## Prisma 7 Notes
- Schema has no `url` in datasource — URL is in `prisma.config.ts` (for CLI) and passed via `PrismaLibSql({ url })` adapter in `lib/db.ts` (for runtime)
- `DATABASE_URL` env var = `file:./prisma/dev.db` for local dev

## Team
- **Priya Sharma** (PO), **Alex Chen** (Tech Lead)
- **Sam Rivera** (Auth/Frontend), **Jordan Lee** (Expense/CRUD), **Morgan Patel** (Split/Settlement), **Riley Thompson** (Export/Stripe)

## Env vars needed (.env)
```
DATABASE_URL="file:./prisma/dev.db"
NEXTAUTH_SECRET="..."
STRIPE_SECRET_KEY="sk_test_..."
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
```
