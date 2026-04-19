# SplitEase — Architecture Document

**Version:** 1.0  
**Date:** 2026-04-19  
**Tech Lead:** Alex Chen

---

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                        Browser                          │
│   Next.js App (React, Tailwind, shadcn/ui)             │
│   - Server Components (data fetching)                   │
│   - Client Components (interactivity)                   │
└───────────────────┬─────────────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────────────┐
│              Next.js Server (Node.js)                    │
│   ┌─────────────┐  ┌──────────────┐  ┌───────────────┐ │
│   │  App Router │  │  API Routes  │  │  NextAuth.js  │ │
│   │  (RSC/SSR)  │  │  (REST API)  │  │  (JWT Auth)   │ │
│   └─────────────┘  └──────┬───────┘  └───────────────┘ │
│                            │                             │
│   ┌────────────────────────▼────────────────────────┐   │
│   │                   Prisma ORM                    │   │
│   └────────────────────────┬────────────────────────┘   │
└───────────────────────────┬──────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────┐
│                    PostgreSQL Database                     │
│   Users | ExpenseSheets | Participants | Transactions     │
│   Splits                                                  │
└───────────────────────────────────────────────────────────┘

External Services:
┌────────────┐   ┌────────────────┐   ┌──────────────────┐
│   Stripe   │   │ Google Sheets  │   │  SMTP / Email    │
│  (Payments)│   │  API (Import)  │   │  (Nodemailer)    │
└────────────┘   └────────────────┘   └──────────────────┘
```

---

## 2. Directory Structure

```
splitease_new/
├── app/                          # Next.js App Router
│   ├── (auth)/
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   ├── (dashboard)/
│   │   ├── dashboard/page.tsx
│   │   ├── sheets/
│   │   │   ├── new/page.tsx
│   │   │   └── [id]/
│   │   │       ├── page.tsx
│   │   │       ├── edit/page.tsx
│   │   │       └── transactions/new/page.tsx
│   ├── api/
│   │   ├── auth/[...nextauth]/route.ts
│   │   ├── sheets/
│   │   │   ├── route.ts
│   │   │   └── [id]/
│   │   │       ├── route.ts
│   │   │       ├── participants/route.ts
│   │   │       ├── transactions/route.ts
│   │   │       ├── settlement/route.ts
│   │   │       ├── export/route.ts
│   │   │       └── import/route.ts
│   │   └── payments/create-session/route.ts
│   ├── layout.tsx
│   └── page.tsx                  # Landing page
├── components/
│   ├── ui/                       # shadcn/ui components
│   ├── auth/                     # LoginForm, RegisterForm
│   ├── sheets/                   # SheetCard, SheetList
│   ├── participants/             # ParticipantForm, ParticipantList
│   ├── transactions/             # TransactionForm, SplitSelector
│   └── settlement/               # SettlementCard, BalanceSummary
├── lib/
│   ├── auth.ts                   # NextAuth config
│   ├── db.ts                     # Prisma client singleton
│   ├── settlement.ts             # Settlement calculation algorithm
│   ├── split.ts                  # Split calculation helpers
│   ├── pdf.ts                    # PDF generation
│   ├── email.ts                  # Email sending
│   └── stripe.ts                 # Stripe helpers
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── __tests__/
│   ├── unit/
│   │   ├── settlement.test.ts
│   │   └── split.test.ts
│   └── integration/
│       ├── sheets.test.ts
│       └── transactions.test.ts
├── types/
│   └── index.ts
├── .env.local                    # Environment variables
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 3. Authentication Flow

```
User → POST /api/auth/register → Hash password → Save User → Redirect /login
User → POST /api/auth/signin → NextAuth → Verify hash → Issue JWT → Redirect /dashboard
Protected routes → middleware.ts → Verify JWT → Allow or redirect /login
```

---

## 4. Transaction + Split Flow

```
1. User opens /sheets/[id]/transactions/new
2. Selects participants (radio/toggle buttons showing initials)
3. Enters title, amount, paid-by
4. Chooses split type: Equal or Percentage
   - Equal: auto-calculates per-person amount
   - Percentage: user inputs % per person (validated sum = 100)
5. Saves → POST /api/sheets/[id]/transactions
6. Server creates Transaction + Split records in DB
7. Sheet detail page re-fetches and shows updated list
```

---

## 5. Settlement Calculation Flow

```
GET /api/sheets/[id]/settlement
1. Load all transactions + splits for sheet
2. Compute balance per participant:
   balance[p] = sum(paid by p) - sum(owed by p across all splits)
3. Separate into creditors (balance > 0) and debtors (balance < 0)
4. Greedy matching:
   while creditors and debtors exist:
     take max creditor C and max debtor D
     transfer = min(C.balance, abs(D.balance))
     record: D owes C `transfer`
     update balances
5. Return list of { from, to, amount }
```

---

## 6. Environment Variables

```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
SMTP_HOST=...
SMTP_PORT=587
SMTP_USER=...
SMTP_PASS=...
GOOGLE_SHEETS_API_KEY=...
```
