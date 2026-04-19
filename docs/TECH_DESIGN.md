# SplitEase — Technical Design Document

**Version:** 1.0  
**Date:** 2026-04-19  
**Tech Lead:** Alex Chen

---

## 1. Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | Next.js 14 (App Router) | Full-stack, SSR/SSG, API routes |
| Language | TypeScript | Type safety across frontend and backend |
| Styling | Tailwind CSS + shadcn/ui | Rapid, accessible, consistent UI |
| ORM | Prisma | Type-safe DB access, migrations |
| Database | PostgreSQL (local: SQLite via `@prisma/client`) | Relational, ACID, good for financial data |
| Auth | NextAuth.js v5 | JWT sessions, credential provider |
| Password Hashing | bcrypt | Industry standard |
| Validation | Zod | Runtime + compile-time schema validation |
| PDF Generation | @react-pdf/renderer | Programmatic PDF from React components |
| Email | Nodemailer (SMTP) | Send sheets via email |
| Payments | Stripe | Checkout sessions for debt settlement |
| Google Sheets | googleapis | Sheet import via OAuth2 or public sheet URL |
| Testing | Jest + React Testing Library + Supertest | Unit + integration |
| Linting | ESLint + Prettier | Code quality |

---

## 2. Data Models

### User
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String
  password  String
  sheets    ExpenseSheet[]
  createdAt DateTime @default(now())
}
```

### ExpenseSheet
```prisma
model ExpenseSheet {
  id           String        @id @default(cuid())
  title        String
  owner        User          @relation(fields: [ownerId], references: [id])
  ownerId      String
  participants Participant[]
  transactions Transaction[]
  createdAt    DateTime      @default(now())
  updatedAt    DateTime      @updatedAt
}
```

### Participant
```prisma
model Participant {
  id           String       @id @default(cuid())
  name         String
  email        String?
  phone        String?
  sheet        ExpenseSheet @relation(fields: [sheetId], references: [id], onDelete: Cascade)
  sheetId      String
  splits       Split[]
  paidFor      Transaction[]
}
```

### Transaction
```prisma
model Transaction {
  id        String       @id @default(cuid())
  title     String
  amount    Float
  paidBy    Participant  @relation(fields: [paidById], references: [id])
  paidById  String
  sheet     ExpenseSheet @relation(fields: [sheetId], references: [id], onDelete: Cascade)
  sheetId   String
  splits    Split[]
  createdAt DateTime     @default(now())
}
```

### Split
```prisma
model Split {
  id            String      @id @default(cuid())
  transaction   Transaction @relation(fields: [transactionId], references: [id], onDelete: Cascade)
  transactionId String
  participant   Participant @relation(fields: [participantId], references: [id])
  participantId String
  amount        Float
  percentage    Float?
}
```

---

## 3. API Routes

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/[...nextauth]` | NextAuth login/logout |
| GET | `/api/sheets` | List user's sheets |
| POST | `/api/sheets` | Create sheet |
| GET | `/api/sheets/[id]` | Get sheet detail |
| PUT | `/api/sheets/[id]` | Update sheet |
| DELETE | `/api/sheets/[id]` | Delete sheet |
| GET | `/api/sheets/[id]/participants` | List participants |
| POST | `/api/sheets/[id]/participants` | Add participant |
| PUT | `/api/sheets/[id]/participants/[pid]` | Update participant |
| DELETE | `/api/sheets/[id]/participants/[pid]` | Remove participant |
| GET | `/api/sheets/[id]/transactions` | List transactions |
| POST | `/api/sheets/[id]/transactions` | Add transaction |
| PUT | `/api/sheets/[id]/transactions/[tid]` | Update transaction |
| DELETE | `/api/sheets/[id]/transactions/[tid]` | Delete transaction |
| GET | `/api/sheets/[id]/settlement` | Get settlement summary |
| POST | `/api/sheets/[id]/export` | Generate PDF / email |
| POST | `/api/sheets/[id]/import` | Import from Google Sheet |
| POST | `/api/payments/create-session` | Create Stripe checkout session |

---

## 4. Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Landing | Marketing / hero page |
| `/auth/login` | LoginPage | Email + password login |
| `/auth/register` | RegisterPage | New account creation |
| `/dashboard` | Dashboard | List of expense sheets |
| `/sheets/new` | NewSheet | Create sheet + add participants |
| `/sheets/[id]` | SheetDetail | View transactions + settlement |
| `/sheets/[id]/edit` | EditSheet | Edit title + participants |
| `/sheets/[id]/transactions/new` | NewTransaction | Add expense with split |

---

## 5. Split Calculation Logic

```typescript
// Equal split
const perPerson = totalAmount / selectedParticipants.length;

// Percentage split
const splits = selectedParticipants.map(p => ({
  participantId: p.id,
  percentage: p.percentage,
  amount: (totalAmount * p.percentage) / 100,
}));
// Validate: percentages.reduce((a, b) => a + b, 0) === 100
```

---

## 6. Settlement Algorithm

```typescript
// Simplified debt minimization (greedy)
// 1. Compute net balance per person (paid - owed)
// 2. Separate into creditors (positive) and debtors (negative)
// 3. Greedily match largest debtor to largest creditor
```
