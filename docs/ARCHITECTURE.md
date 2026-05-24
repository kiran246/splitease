# SplitEase — Architecture Review Document

**Version:** 2.0  
**Date:** 2026-05-23  
**Tech Lead:** Alex Chen  
**Reviewer:** Claude Code  
**Branch:** `feature/collaborative-sheets`

---

## 1. System Overview

SplitEase is a monolithic full-stack web application built on Next.js App Router. The server handles both the React UI (SSR/RSC) and a REST API, backed by a Prisma ORM data layer. There is no separate backend service — the single Next.js process is the entire application.

```
┌──────────────────────────────────────────────────────────────────────┐
│                           Browser                                    │
│   Next.js React 19 — Server Components + Client Components          │
│   Tailwind CSS styling                                               │
└──────────────────────────────────┬───────────────────────────────────┘
                                   │ HTTPS
┌──────────────────────────────────▼───────────────────────────────────┐
│                    Next.js 16 Server (Node.js)                       │
│                                                                      │
│  ┌───────────────┐  ┌──────────────────┐  ┌──────────────────────┐  │
│  │  App Router   │  │   API Routes     │  │   NextAuth v5        │  │
│  │  (RSC / SSR)  │  │   (REST JSON)    │  │   (JWT + bcrypt)     │  │
│  └───────────────┘  └────────┬─────────┘  └──────────────────────┘  │
│                               │                                      │
│  ┌────────────────────────────▼─────────────────────────────────┐   │
│  │                        lib/ layer                            │   │
│  │  split.ts  settlement.ts  sheetAccess.ts  email.ts           │   │
│  │  pdf.tsx   stripe.ts      adminAuth.ts                       │   │
│  └────────────────────────────┬─────────────────────────────────┘   │
│                               │                                      │
│  ┌────────────────────────────▼─────────────────────────────────┐   │
│  │                       Prisma ORM                             │   │
│  │     PrismaLibSql (SQLite dev)  |  PrismaPg (PostgreSQL prod) │   │
│  └────────────────────────────┬─────────────────────────────────┘   │
└───────────────────────────────┬──────────────────────────────────────┘
                                │
         ┌──────────────────────┴──────────────────────┐
         │                                             │
┌────────▼────────┐                         ┌─────────▼────────────┐
│ SQLite (dev.db) │                         │  PostgreSQL (prod)   │
│ libsql driver   │                         │  pg driver + SSL     │
└─────────────────┘                         └──────────────────────┘

External Services:
┌──────────────┐  ┌────────────────────┐  ┌────────────────────────┐
│    Stripe    │  │   SMTP / Email     │  │  WhatsApp (URL scheme) │
│  (Payments)  │  │  (Nodemailer)      │  │  (no API, just links)  │
└──────────────┘  └────────────────────┘  └────────────────────────┘
```

---

## 2. Tech Stack

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| Framework | Next.js | 16.2.4 | App Router, React Server Components |
| Language | TypeScript | 5.x | Strict mode |
| UI | React | 19.2.4 | Latest; use RSC by default |
| Styling | Tailwind CSS | 4.x | Utility-first |
| ORM | Prisma | 7.7.0 | Adapter pattern for dual DB support |
| Database (dev) | SQLite via libsql | — | `file:./prisma/dev.db` |
| Database (prod) | PostgreSQL | — | Via `pg` driver with SSL |
| Auth | NextAuth | 5.0.0-beta.31 | JWT strategy, Credentials provider |
| Password | bcryptjs | 3.0.3 | Async hashing |
| Validation | Zod | 4.3.6 | Request body validation on every route |
| PDF | @react-pdf/renderer | 4.5.1 | Server-side PDF generation |
| Email | Nodemailer | 7.0.13 | SMTP with HTML templates |
| Payments | Stripe | 22.0.2 | Checkout session creation |
| API Docs | swagger-ui-react | 5.32.4 | Served at `/docs` |
| Testing | Jest + supertest + RTL | 30.x | Unit + integration |

> **Note:** Next.js 16 and React 19 are newer versions than typical training data. Refer to `node_modules/next/dist/docs/` before touching framework-specific code (per `AGENTS.md`).

---

## 3. Directory Structure

```
splitease_new/
├── app/
│   ├── (auth)/                        # Public auth pages (no layout chrome)
│   │   ├── login/page.tsx
│   │   ├── register/page.tsx
│   │   └── reset-password/[token]/    # Password reset UI (new)
│   │       ├── page.tsx
│   │       └── ResetForm.tsx
│   ├── (dashboard)/                   # Protected pages (with nav layout)
│   │   ├── dashboard/page.tsx
│   │   ├── profile/page.tsx
│   │   └── sheets/
│   │       ├── new/page.tsx
│   │       └── [id]/
│   │           ├── page.tsx
│   │           ├── edit/page.tsx
│   │           └── transactions/
│   │               ├── new/page.tsx
│   │               └── [tid]/edit/page.tsx
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts
│   │   │   ├── register/route.ts
│   │   │   └── reset-password/route.ts  # (new)
│   │   ├── admin/                       # (new) bearer-token protected
│   │   │   └── users/
│   │   │       ├── route.ts
│   │   │       └── [uid]/
│   │   │           ├── reset-password/route.ts
│   │   │           ├── impersonate/route.ts
│   │   │           └── status/route.ts
│   │   ├── sheets/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── participants/route.ts
│   │   │       ├── participants/[pid]/route.ts
│   │   │       ├── transactions/route.ts
│   │   │       ├── transactions/[tid]/route.ts
│   │   │       ├── transactions/[tid]/comments/route.ts
│   │   │       ├── transactions/[tid]/comments/[cid]/route.ts
│   │   │       ├── collaborators/route.ts
│   │   │       ├── collaborators/[uid]/route.ts
│   │   │       ├── invitations/route.ts
│   │   │       ├── settlement/route.ts
│   │   │       ├── export/route.ts
│   │   │       └── import/route.ts
│   │   ├── invite/[token]/
│   │   │   ├── route.ts
│   │   │   └── accept/route.ts
│   │   ├── user/profile/route.ts
│   │   ├── payments/create-session/route.ts
│   │   ├── docs/route.ts               # (new) Serves OpenAPI YAML
│   │   └── health/route.ts
│   ├── auth/impersonate/[token]/page.tsx  # (new) Admin impersonation UI
│   ├── docs/                              # (new) Swagger UI
│   │   ├── page.tsx
│   │   └── SwaggerUI.tsx
│   ├── invite/[token]/page.tsx
│   ├── layout.tsx
│   └── page.tsx                        # Landing page
├── lib/
│   ├── auth.ts          # NextAuth config (Credentials + Impersonate providers)
│   ├── db.ts            # Prisma singleton with adapter detection
│   ├── split.ts         # Split calculation (equal / percentage)
│   ├── settlement.ts    # Greedy debt-minimization algorithm
│   ├── sheetAccess.ts   # Authorization helpers (canAccessSheet, canEditTransaction)
│   ├── email.ts         # Nodemailer HTML email templates
│   ├── pdf.tsx          # React-PDF document component
│   ├── stripe.ts        # Stripe checkout session factory
│   └── adminAuth.ts     # Bearer token validation for admin endpoints (new)
├── prisma/
│   ├── schema.prisma    # Production schema (PostgreSQL provider)
│   ├── schema.prod.prisma
│   ├── prisma.config.ts
│   └── migrations/
├── __tests__/
│   └── unit/
│       ├── split.test.ts
│       ├── settlement.test.ts
│       ├── sheetAccess.test.ts
│       └── profile.test.ts
├── openapi.yaml         # 1576-line OpenAPI 3.0.3 spec (new)
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 4. Data Model

```
User ─────────────────────────────────────────────────────────────────┐
  id, email*, name, password, role, isActive, createdAt               │
  │                                                                    │
  ├──< ExpenseSheet (ownerId) >───────────────────────────┐           │
  │     id, title, ownerId, isCollaborative, createdAt    │           │
  │     │                                                 │           │
  │     ├──< Participant >──────────────────┐             │           │
  │     │     id, name, email?, phone?      │             │           │
  │     │     │                             │             │           │
  │     │     └──< Split >─────────────────┤             │           │
  │     │           id, amount, percentage? │             │           │
  │     │                                   │             │           │
  │     ├──< Transaction >─────────────────┘             │           │
  │     │     id, title, amount, paidById,               │           │
  │     │     sheetId, createdByUserId?, createdAt        │           │
  │     │     │                                           │           │
  │     │     └──< TransactionComment >──────────────────┼───────────┘
  │     │           id, text, createdAt                  │  (authorId)
  │     │                                                │
  │     ├──< SheetCollaborator >  (role: owner|collaborator)
  │     │     id, sheetId, userId, role, joinedAt
  │     │
  │     └──< SheetInvitation >
  │           id, token*, email?, phone?,
  │           status: pending|accepted, expiresAt
  │
  ├──< PasswordResetToken >
  │     id, token*, userId, expiresAt, usedAt?
  │
  ├──< ImpersonationToken >
  │     id, token*, userId, expiresAt, usedAt?
  │
  └──< AdminAuditLog >
        id, action, targetUserId, metadata?, createdAt

* unique index
```

### Key Relationships
- `ExpenseSheet` ←→ `User` is Many-to-Many via `SheetCollaborator` (plus the direct `ownerId` FK)
- `Transaction.paidById` → `Participant` (not User — participants don't need accounts)
- `Transaction.createdByUserId` → `User?` (nullable; set when a logged-in user adds the transaction)
- Cascade deletes: Sheet → Participant, Transaction, Split, Collaborator, Invitation

---

## 5. Authentication & Authorization

### 5.1 Auth Flow

```
Registration:
  POST /api/auth/register → bcrypt.hash(password) → prisma.user.create → 201

Login (Credentials):
  POST /api/auth/signin → NextAuth CredentialsProvider
    → prisma.user.findUnique (by email)
    → check isActive (403 if false)
    → bcrypt.compare(password, hash)
    → JWT signed with NEXTAUTH_SECRET → httpOnly cookie

Admin Impersonation:
  POST /api/admin/users/[uid]/impersonate → create ImpersonationToken (15 min)
  GET /auth/impersonate/[token] → UI confirmation
  POST → NextAuth impersonate provider → sign in as target user
```

### 5.2 Authorization Layers

| Layer | Mechanism | Where |
|-------|-----------|-------|
| Session auth | `auth()` from NextAuth — all protected routes | Every API route |
| Sheet access | `canAccessSheet(sheetId, userId)` — owner OR collaborator | Sheet endpoints |
| Sheet ownership | `isSheetOwner(sheetId, userId)` — owner only | Delete sheet, manage collaborators |
| Transaction edit | `canEditTransaction(sheetId, tid, userId)` — owner OR creator | PUT/DELETE transactions |
| Admin access | `isAdminRequest(req)` — `Authorization: Bearer <ADMIN_API_KEY>` | `/api/admin/*` |
| Comment delete | `comment.authorId === userId` inline check | DELETE comment |

### 5.3 Security Observations

**Strengths:**
- JWTs are signed and stored in httpOnly cookies (XSS-resistant)
- Admin endpoints use a completely separate auth mechanism (bearer token)
- Impersonation tokens are short-lived (15 min), single-use, and audit-logged
- Password reset tokens are short-lived (1 hr) and single-use

**Risks to address:**
- `bcryptjs` is a pure-JS implementation; `bcrypt` (native) is faster and reduces timing risks at high load
- `NEXTAUTH_SECRET` must be a cryptographically random 32+ byte string in production; no enforcement exists in the codebase
- `ADMIN_API_KEY` has no minimum-length enforcement; documentation should require ≥ 32 chars
- Rate limiting is not implemented on login or password-reset endpoints (brute-force risk)

---

## 6. API Design

### 6.1 Conventions
- All routes return `Content-Type: application/json`
- Success responses: `200 OK` (read/update), `201 Created` (create)
- Error responses: `{ error: string }` with 400/401/403/404/500
- All request bodies validated with Zod schemas before DB access
- Session checked at the top of every handler before any other logic

### 6.2 Endpoint Summary

| Group | Method | Path | Auth |
|-------|--------|------|------|
| Auth | POST | `/api/auth/register` | Public |
| Auth | GET/POST | `/api/auth/[...nextauth]` | Public |
| Auth | POST | `/api/auth/reset-password` | Public (token) |
| User | GET/PUT | `/api/user/profile` | Session |
| Sheets | GET/POST | `/api/sheets` | Session |
| Sheets | GET/PUT/DELETE | `/api/sheets/[id]` | Session + owner |
| Participants | GET/POST | `/api/sheets/[id]/participants` | Session + access |
| Participants | PUT/DELETE | `/api/sheets/[id]/participants/[pid]` | Session + owner |
| Transactions | GET/POST | `/api/sheets/[id]/transactions` | Session + access |
| Transactions | PUT/DELETE | `/api/sheets/[id]/transactions/[tid]` | Session + edit permission |
| Comments | GET/POST | `…/transactions/[tid]/comments` | Session + access |
| Comments | DELETE | `…/comments/[cid]` | Session + author |
| Collaborators | GET/POST | `/api/sheets/[id]/collaborators` | Session + access |
| Collaborators | DELETE | `/api/sheets/[id]/collaborators/[uid]` | Session + owner |
| Invitations | GET/POST | `/api/sheets/[id]/invitations` | Session + owner |
| Invite Accept | GET/POST | `/api/invite/[token]` / `/accept` | Public |
| Settlement | GET | `/api/sheets/[id]/settlement` | Session + access |
| Export | GET/POST | `/api/sheets/[id]/export` | Session + owner |
| Import | POST | `/api/sheets/[id]/import` | Session + owner |
| Payments | POST | `/api/payments/create-session` | Session |
| Admin | GET | `/api/admin/users` | Bearer token |
| Admin | POST | `/api/admin/users/[uid]/reset-password` | Bearer token |
| Admin | POST | `/api/admin/users/[uid]/impersonate` | Bearer token |
| Admin | PATCH | `/api/admin/users/[uid]/status` | Bearer token |
| Docs | GET | `/api/docs` | Public |
| Health | GET | `/api/health` | Public |

### 6.3 Documentation
Full OpenAPI 3.0.3 spec is in `openapi.yaml` (1576 lines). All endpoints, request/response schemas, and error codes are documented. Served via Swagger UI at `/docs`.

---

## 7. Business Logic

### 7.1 Split Calculation (`lib/split.ts`)

```
Equal split:
  perPerson = round(amount / count, 2)

Percentage split:
  Validate: sum(percentages) === 100  → throw if not
  Each split: round(amount × (pct / 100), 2)
```

**Risk:** Rounding can cause splits to sum to ±0.01 of the original amount (e.g., $10 / 3 = $3.33 × 3 = $9.99). The system does not currently redistribute the rounding residual. Consider assigning the remainder to the first participant or the payer.

### 7.2 Settlement Algorithm (`lib/settlement.ts`)

```
1. computeBalances(transactions, participantIds)
   → net[p] = sum(paid by p) - sum(owed by p)

2. computeSettlements(balances)
   → creditors = participants with net > 0 (sorted descending)
   → debtors   = participants with net < 0 (sorted ascending)
   → while both lists non-empty:
       transfer = min(creditor.net, abs(debtor.net))
       if transfer < 0.005 → skip (floating-point noise)
       record { from: debtor, to: creditor, amount: transfer }
       adjust both balances, shift pointers when balance reaches 0
```

**Correctness:** The greedy algorithm produces the optimal result for the 2-person case and a good (though not necessarily optimal in all cases) result for n persons. For typical group sizes (< 20), the difference from the true optimum is negligible.

---

## 8. Database Architecture

### 8.1 Adapter Pattern (`lib/db.ts`)

```typescript
// Detects DATABASE_URL prefix to select the right adapter
if (url.startsWith("file:")) → PrismaLibSql (SQLite)
else                         → PrismaPg (PostgreSQL with SSL in prod)
```

This avoids the need for separate code paths but requires that `DATABASE_URL` always be set correctly.

### 8.2 Migrations

| Migration | Date | Change |
|-----------|------|--------|
| `20260419172550_init` | 2026-04-19 | Initial schema (User, Sheet, Participant, Transaction, Split) |
| `20260421004226_collaborative_sheets` | 2026-04-21 | SheetCollaborator, SheetInvitation, isCollaborative flag |
| `20260421005737_invitation_email_optional_phone` | 2026-04-21 | Email nullable, phone field on SheetInvitation |
| `20260425160532_add_admin_features` | 2026-04-25 | PasswordResetToken, ImpersonationToken, AdminAuditLog; User.role, User.isActive |

### 8.3 Indexing Gaps
The schema has no explicit `@@index` annotations beyond the unique constraints. For production workloads, add indexes on:
- `Transaction.sheetId` (used in every transaction list query)
- `Participant.sheetId` (used in every settlement query)
- `SheetCollaborator.userId` (used in `canAccessSheet`)
- `SheetInvitation.token` (already unique, covered)
- `AdminAuditLog.createdAt` (for admin log pagination)

---

## 9. Deployment Architecture

```
AWS (CloudFormation):
┌──────────────────────────────────────────────────────────────────┐
│  Route 53 (DNS)                                                  │
│       │                                                          │
│  ALB (HTTPS + ACM certificate)                                   │
│       │                                                          │
│  ECS Fargate Task (Docker container: splitease:latest)           │
│       │                                                          │
│  RDS PostgreSQL (Multi-AZ, private subnet)                       │
│                                                                  │
│  ECR (Docker image registry)                                     │
│  Secrets Manager (DATABASE_URL, NEXTAUTH_SECRET, etc.)           │
└──────────────────────────────────────────────────────────────────┘
```

Local development uses the Docker Compose setup (implied by `Dockerfile`) with SQLite.

---

## 10. Identified Risks & Gaps

### High Priority

| # | Risk | Impact | Recommendation |
|---|------|--------|----------------|
| R1 | No rate limiting on `/api/auth/register` or login | Brute-force / account enumeration | Add middleware rate limiter (e.g., `@upstash/ratelimit` or nginx config) |
| R2 | `Float` type for monetary amounts | Floating-point accumulation errors | Migrate to `Decimal` (Prisma `@db.Decimal(10,2)`) or store amounts as integer cents |
| R3 | Rounding residual in equal splits (e.g. $10/3 = $9.99) | Settlement imbalance | Assign remainder to payer's split |
| R4 | No integration tests for API routes | Regressions undetected | Implement per AGENTS.md: "integration tests required for all API routes" |
| R5 | `ADMIN_API_KEY` has no minimum entropy enforcement | Weak admin key risk | Enforce ≥ 32 chars in startup health check |

### Medium Priority

| # | Risk | Impact | Recommendation |
|---|------|--------|----------------|
| R6 | Missing DB indexes on hot query paths | Query performance at scale | Add `@@index` as documented in §8.3 |
| R7 | `bcryptjs` (pure JS) vs. `bcrypt` (native) | Slower auth under load | Switch to native `bcrypt` package |
| R8 | `createdByUserId` nullable on Transaction | Can't audit who added a transaction in collaborative sheet | Make it required for collaborative sheets |
| R9 | No CSRF protection on state-mutating routes | CSRF risk if cookies are used | NextAuth v5 has CSRF token support — verify it's enabled |
| R10 | Settlement endpoint has no caching | Recalculates on every view | Cache with short TTL or invalidate on transaction change |

### Low Priority

| # | Risk | Impact | Recommendation |
|---|------|--------|----------------|
| R11 | Swagger UI served with no auth | API surface visible to anyone | Add optional auth or IP restriction for production |
| R12 | PDF generation blocks the Node.js event loop | Slow under concurrent PDF requests | Move to background job queue or edge function |
| R13 | No request size limits on CSV import | Large file could exhaust memory | Add `Content-Length` check (e.g., 5 MB max) |

---

## 11. Architectural Strengths

- **Adapter pattern for DB** cleanly separates dev/prod without `if(isDev)` branches in business logic
- **`lib/sheetAccess.ts`** centralizes authorization logic — no scattered inline checks
- **Zod validation** on every POST/PUT prevents malformed data from reaching the DB
- **Greedy settlement** is simple, correct, and fast — appropriate for the problem size
- **OpenAPI 3.0 spec** provides a machine-readable contract for future clients
- **Audit logging** provides compliance trail for admin actions
- **Single-use tokens** for both password reset and impersonation minimizes token reuse risk

---

## 12. Recommendations Summary

1. **Immediate:** Replace `Float` with integer cents or Prisma `Decimal` for all monetary fields
2. **Immediate:** Add rate limiting on auth and admin endpoints
3. **Short term:** Add missing DB indexes (see §8.3)
4. **Short term:** Write integration tests for all API routes (per team norms in `TEAM.md`)
5. **Short term:** Fix equal-split rounding residual distribution
6. **Medium term:** Replace `bcryptjs` with native `bcrypt`
7. **Medium term:** Enforce `ADMIN_API_KEY` minimum entropy at startup
8. **Long term:** Consider splitting admin API to a separate service or securing `/docs` in production
