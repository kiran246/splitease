# SplitEase

Web-based expense splitting app. Track shared expenses, calculate fair splits, and settle debts with the minimum number of transfers.

**Stack:** Next.js 16 · TypeScript · Tailwind CSS · Prisma 7 · NextAuth v5 · SQLite (dev) / PostgreSQL (prod)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create .env (copy from example and fill in secrets)
cp .env.example .env

# 3. Create the database and run migrations
npm run db:migrate

# 4. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | SQLite: `file:./dev.db` · PostgreSQL: `postgresql://...` |
| `NEXTAUTH_SECRET` | Yes | Random 32+ char string for JWT signing |
| `AUTH_TRUST_HOST` | Dev | Set to `1` in local dev; use `AUTH_URL` in production |
| `ADMIN_API_KEY` | Yes | Bearer token for REST admin endpoints (≥ 32 chars) |
| `SMTP_HOST` | Yes | SMTP server for email (invitation, password reset) |
| `SMTP_PORT` | Yes | SMTP port (587 for TLS) |
| `SMTP_USER` | Yes | SMTP username |
| `SMTP_PASS` | Yes | SMTP password or app password |
| `STRIPE_SECRET_KEY` | Optional | Stripe secret key for payment sessions |
| `STRIPE_PUBLISHABLE_KEY` | Optional | Stripe publishable key |

---

## Key Commands

```bash
npm run dev          # Dev server at localhost:3000
npm test             # Unit tests (Jest)
npm run db:migrate   # Run Prisma migrations
npm run db:generate  # Regenerate Prisma client after schema changes
npm run db:studio    # Prisma Studio GUI (direct DB browser)
npm run build        # Production build
```

---

## Creating an Admin User

After running migrations, create your first admin user:

```bash
node -e "
const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');
const client = createClient({ url: 'file:./dev.db' });
const hash = bcrypt.hashSync('yourpassword', 12);
client.execute({
  sql: \"INSERT INTO User (id, email, name, password, role, isActive, createdAt) VALUES (lower(hex(randomblob(16))), 'admin@example.com', 'Admin', ?, 'admin', 1, datetime('now'))\",
  args: [hash]
}).then(() => { console.log('Done'); process.exit(0); });
"
```

Log in at `/login`, then navigate to `/admin` for the admin console.

---

## Admin Console

`/admin` — role-gated to users with `role = admin`.

| Page | Description |
|------|-------------|
| `/admin` | Overview: user/sheet stats, recent audit log |
| `/admin/users` | List, search, filter, edit, enable/disable, impersonate, reset password, delete users |
| `/admin/users/new` | Create a new user |
| `/admin/sheets` | List all sheets across all users; filter by owner; delete individual sheets or clear all sheets for a user |

All destructive admin actions are logged to `AdminAuditLog`.

---

## Architecture

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full architecture review.

| Document | Description |
|----------|-------------|
| [`docs/PRD.md`](docs/PRD.md) | Product requirements and user stories |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System design, data model, auth flows, API reference |
| [`docs/TDD.md`](docs/TDD.md) | Test specifications and coverage goals |
| [`docs/TECH_DESIGN.md`](docs/TECH_DESIGN.md) | Technical design decisions |
| [`docs/TEAM.md`](docs/TEAM.md) | Team norms and contribution guidelines |
| [`openapi.yaml`](openapi.yaml) | OpenAPI 3.0 spec (also served at `/api/docs`, UI at `/docs`) |

---

## Deployment

AWS CloudFormation templates are in [`infrastructure/`](infrastructure/). The stack provisions ECS Fargate + RDS PostgreSQL + ALB with HTTPS.

For Docker:

```bash
docker build -t splitease .
docker run -p 3000:3000 --env-file .env splitease
```
