# SplitEase — Test-Driven Development Guide

**Version:** 1.0  
**Date:** 2026-05-23  
**Tech Lead:** Alex Chen  
**Status:** Living Document

---

## 1. Testing Philosophy

Per `TEAM.md`:
- Unit tests are required for **all business logic**
- Integration tests are required for **all API routes**
- Acceptance criteria are validated by the Product Owner before closing a ticket

TDD in this project means:
1. Write a failing test that captures the requirement
2. Write the minimum code to make it pass
3. Refactor without breaking the test

For bug fixes: write a test that reproduces the bug first, then fix it.

---

## 2. Test Stack

| Tool | Purpose | Config |
|------|---------|--------|
| Jest 30 | Test runner | `jest.config.js` / `jest.config.ts` |
| ts-jest | TypeScript compilation | `preset: 'ts-jest'` |
| @testing-library/react 16 | React component rendering | — |
| supertest 7 | HTTP integration testing | — |
| jest-mock / manual mocks | Prisma & external service mocking | `__mocks__/` |

**Test location:** `__tests__/`

```
__tests__/
├── unit/
│   ├── split.test.ts           ✓ exists
│   ├── settlement.test.ts      ✓ exists
│   ├── sheetAccess.test.ts     ✓ exists
│   └── profile.test.ts         ✓ exists
└── integration/                ✗ missing — needs to be built
    ├── auth.test.ts
    ├── sheets.test.ts
    ├── participants.test.ts
    ├── transactions.test.ts
    ├── comments.test.ts
    ├── collaboration.test.ts
    ├── settlement.test.ts
    ├── export.test.ts
    ├── import.test.ts
    ├── admin.test.ts
    └── health.test.ts
```

---

## 3. Current Coverage Assessment

### What exists (unit tests only)

| File | Tests | Coverage |
|------|-------|---------|
| `lib/split.ts` | 6 tests: equal split, percentage split, invalid percentage | Core paths covered |
| `lib/settlement.ts` | 4 tests: balance calc, greedy matching, zero balances | Core paths covered |
| `lib/sheetAccess.ts` | 9 tests: owner, collaborator, stranger, transaction edit perms | Good coverage |
| `lib/auth.ts` (profile) | ~4 tests | Partial |

### What is missing

- Integration tests for all 36+ API routes (required by team norms)
- Component tests for key UI interactions
- Edge case unit tests (see §5)
- Admin feature tests (new, untested)
- Collaborative sheet invitation flow tests

---

## 4. Test Pyramid

```
         ▲
        / \
       /E2E\          2–5 critical user journeys
      /─────\
     /       \
    /  Integ  \       One test per API route × method (happy + error paths)
   /───────────\
  /             \
 /     Unit      \    All lib/* functions, all edge cases
/─────────────────\
```

Target distribution: **70 % unit, 25 % integration, 5 % E2E**

---

## 5. Unit Test Specifications

### 5.1 `lib/split.ts`

**Existing tests — keep and expand:**

```typescript
// ✓ Already tested
describe('calculateSplits - equal', () => {
  it('divides amount evenly across participants')
  it('rounds to 2 decimal places')
})

describe('calculateSplits - percentage', () => {
  it('calculates each participant share from percentage')
  it('throws when percentages do not sum to 100')
})

// ✗ Missing — add these
describe('calculateSplits - edge cases', () => {
  it('handles single participant (100% share)', () => {
    // equal: amount/1 = full amount
    // percentage: 100% → full amount
  })

  it('distributes rounding residual to payer when equal split', () => {
    // $10 / 3 = $3.33, $3.33, $3.34 (not $9.99)
    // Currently failing — documents the known rounding bug
  })

  it('throws when amount is zero', () => {
    // 0 / 3 = 0 per person — arguably valid, test it is not an error
  })

  it('throws when amount is negative', () => {
    // Negative expenses should be rejected
  })

  it('throws when participant list is empty', () => {
    // Division by zero guard
  })
})
```

### 5.2 `lib/settlement.ts`

**Existing tests — keep:**

```typescript
describe('computeBalances', () => {
  it('calculates net balance: paid minus owed')
  it('handles participant who only pays, never owes')
})

describe('computeSettlements', () => {
  it('generates correct transfers for 3-person scenario')
  it('returns empty array when all balances are zero')
})

// ✗ Missing — add these
describe('computeSettlements - edge cases', () => {
  it('ignores transfers below $0.005 threshold', () => {
    // Floating-point noise: net = 0.001 → no transfer generated
  })

  it('handles 2-person scenario (A paid, B owes)', () => {
    // Trivial case: one transfer
  })

  it('produces at most (n-1) transfers for n participants', () => {
    // Property test: settlement count ≤ participants - 1
  })

  it('total transferred equals total debt (conservation)', () => {
    // sum(transfers) should equal sum(negative balances)
  })
})
```

### 5.3 `lib/sheetAccess.ts`

**Existing tests — keep:**

```typescript
describe('canAccessSheet', () => {
  it('returns true for sheet owner')
  it('returns true for collaborator')
  it('returns false for unrelated user')
})

describe('isSheetOwner', () => {
  it('returns true when userId matches ownerId')
  it('returns false for collaborator')
})

describe('canEditTransaction', () => {
  it('returns true for sheet owner')
  it('returns true for transaction creator')
  it('returns false for collaborator who did not create the transaction')
})

// ✗ Missing — add these
describe('sheetAccess - edge cases', () => {
  it('canAccessSheet returns false for non-collaborative sheet even for registered user')
  it('canEditTransaction returns false when createdByUserId is null (pre-collab transaction)')
})
```

### 5.4 `lib/adminAuth.ts` (new — no tests exist)

```typescript
describe('isAdminRequest', () => {
  it('returns true when Authorization header matches ADMIN_API_KEY')
  it('returns false when header is missing')
  it('returns false when header has wrong token')
  it('returns false when header format is not "Bearer <token>"')
  it('returns false when ADMIN_API_KEY env var is not set')
})
```

### 5.5 `lib/email.ts`

```typescript
// Mock nodemailer.createTransport().sendMail

describe('sendInvitationEmail', () => {
  it('calls sendMail with correct to, subject, and html body')
  it('includes the invitation URL in the email body')
  it('includes 7-day expiry notice')
})

describe('sendPasswordResetEmail', () => {
  it('calls sendMail with the reset link in the body')
  it('includes 1-hour expiry notice')
})

describe('sendSheetEmail', () => {
  it('sends without attachment when no PDF provided')
  it('attaches PDF buffer when provided')
})
```

---

## 6. Integration Test Specifications

Integration tests call the actual Next.js route handlers via `supertest`. They mock Prisma and NextAuth session but use real business logic.

### 6.1 Setup / Teardown Pattern

```typescript
// __tests__/integration/helpers.ts
import { createMocks } from 'node-mocks-http'

// Mock Prisma singleton
jest.mock('../../lib/db', () => ({
  prisma: {
    user: { findUnique: jest.fn(), create: jest.fn(), ... },
    expenseSheet: { ... },
    // etc.
  }
}))

// Mock NextAuth session
jest.mock('next-auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user-1', email: 'test@example.com' } })
}))
```

### 6.2 Auth Routes (`__tests__/integration/auth.test.ts`)

```typescript
describe('POST /api/auth/register', () => {
  it('201: creates user and returns id + email')
  it('409: rejects duplicate email')
  it('400: rejects missing email')
  it('400: rejects missing password')
  it('400: rejects password shorter than 8 chars')
})

describe('POST /api/auth/reset-password', () => {
  it('200: updates password when token is valid and unused')
  it('400: rejects expired token')
  it('400: rejects already-used token')
  it('400: rejects unknown token')
})
```

### 6.3 Sheet Routes (`__tests__/integration/sheets.test.ts`)

```typescript
describe('GET /api/sheets', () => {
  it('200: returns sheets owned by or collaborated on by current user')
  it('401: returns 401 when not authenticated')
})

describe('POST /api/sheets', () => {
  it('201: creates sheet with correct ownerId')
  it('400: rejects missing title')
  it('401: unauthenticated returns 401')
})

describe('GET /api/sheets/[id]', () => {
  it('200: returns sheet data for owner')
  it('200: returns sheet data for collaborator')
  it('403: returns 403 for non-collaborator')
  it('404: returns 404 for non-existent sheet')
})

describe('PUT /api/sheets/[id]', () => {
  it('200: updates title for owner')
  it('403: collaborator cannot update title')
  it('403: stranger cannot update')
})

describe('DELETE /api/sheets/[id]', () => {
  it('200: deletes sheet and cascades to transactions, participants')
  it('403: collaborator cannot delete')
})
```

### 6.4 Transaction Routes (`__tests__/integration/transactions.test.ts`)

```typescript
describe('POST /api/sheets/[id]/transactions', () => {
  it('201: creates transaction with equal split')
  it('201: creates transaction with percentage split')
  it('400: rejects percentage split where sum ≠ 100')
  it('400: rejects zero amount')
  it('400: rejects unknown paidById')
  it('403: non-collaborator cannot add transaction')
})

describe('PUT /api/sheets/[id]/transactions/[tid]', () => {
  it('200: owner can edit any transaction')
  it('200: creator can edit their own transaction')
  it('403: collaborator who is not creator cannot edit')
  it('200: editing recalculates all splits')
})

describe('DELETE /api/sheets/[id]/transactions/[tid]', () => {
  it('200: owner can delete any transaction')
  it('200: creator can delete their own transaction')
  it('403: non-creator collaborator cannot delete')
})
```

### 6.5 Settlement Route (`__tests__/integration/settlement.test.ts`)

```typescript
describe('GET /api/sheets/[id]/settlement', () => {
  it('200: returns correct balances and settlement plan')
  it('200: returns empty settlements when sheet has no transactions')
  it('200: omits transfers below $0.01')
  it('403: returns 403 for non-collaborator')
  it('200: settlement plan has at most (n-1) transfers')
})
```

### 6.6 Collaboration Routes (`__tests__/integration/collaboration.test.ts`)

```typescript
describe('POST /api/sheets/[id]/invitations', () => {
  it('201: creates invitation and sends email when email provided')
  it('201: returns WhatsApp URL when phone provided')
  it('403: non-owner cannot create invitation')
  it('400: rejects invitation with neither email nor phone')
})

describe('POST /api/invite/[token]/accept', () => {
  it('200: adds user as collaborator on valid token')
  it('400: rejects already-accepted token')
  it('400: rejects expired token')
  it('404: returns 404 for unknown token')
})

describe('DELETE /api/sheets/[id]/collaborators/[uid]', () => {
  it('200: owner can remove a collaborator')
  it('403: collaborator cannot remove others')
})
```

### 6.7 Admin Routes (`__tests__/integration/admin.test.ts`)

```typescript
describe('GET /api/admin/users', () => {
  it('200: returns user list with valid bearer token')
  it('401: returns 401 without bearer token')
  it('401: returns 401 with wrong bearer token')
})

describe('POST /api/admin/users/[uid]/reset-password', () => {
  it('200: creates reset token and sends email')
  it('404: returns 404 for non-existent user')
  it('401: returns 401 without bearer token')
})

describe('POST /api/admin/users/[uid]/impersonate', () => {
  it('200: creates impersonation token and returns URL')
  it('400: returns 400 for inactive user')
  it('404: returns 404 for non-existent user')
  it('401: returns 401 without bearer token')
})

describe('PATCH /api/admin/users/[uid]/status', () => {
  it('200: disables active user and logs audit event')
  it('200: enables disabled user and logs audit event')
  it('404: returns 404 for non-existent user')
  it('401: returns 401 without bearer token')
})
```

### 6.8 Export / Import Routes (`__tests__/integration/export.test.ts`)

```typescript
describe('GET /api/sheets/[id]/export', () => {
  it('200: returns PDF buffer with correct Content-Type')
  it('403: non-owner cannot export')
})

describe('POST /api/sheets/[id]/export', () => {
  it('200: sends email with sheet summary')
  it('200: generates WhatsApp text when type=whatsapp')
})

describe('POST /api/sheets/[id]/import', () => {
  it('200: imports valid CSV rows and returns created count')
  it('200: returns per-row errors for invalid rows without aborting')
  it('400: rejects non-CSV content type')
  it('403: non-owner cannot import')
})
```

### 6.9 Health Route

```typescript
describe('GET /api/health', () => {
  it('200: returns { status: "ok" } when DB is reachable')
  it('503: returns { status: "error" } when DB is unavailable')
})
```

---

## 7. Component Tests (React Testing Library)

Focus on interactive client components that contain non-trivial logic.

### 7.1 `app/(auth)/reset-password/[token]/ResetForm.tsx`

```typescript
describe('ResetForm', () => {
  it('shows password and confirm-password fields')
  it('shows error when passwords do not match on submit')
  it('calls reset API and redirects on success')
  it('shows server error message on API failure')
})
```

### 7.2 `app/(dashboard)/sheets/[id]/transactions/new/page.tsx`

```typescript
describe('New Transaction form', () => {
  it('shows equal split with pre-calculated amounts when Equal selected')
  it('shows percentage inputs when Percentage selected')
  it('disables submit when percentage sum ≠ 100')
  it('updates split preview as amount changes')
})
```

### 7.3 `app/auth/impersonate/[token]/page.tsx`

```typescript
describe('Impersonation confirmation page', () => {
  it('shows target user display name and email')
  it('shows expiry countdown')
  it('calls impersonate API on confirm')
  it('shows error on expired token')
})
```

---

## 8. Test Fixtures

Create a shared fixture factory to reduce boilerplate:

```typescript
// __tests__/fixtures.ts

export const makeUser = (overrides = {}) => ({
  id: 'user-1',
  email: 'alice@example.com',
  name: 'Alice',
  role: 'user',
  isActive: true,
  createdAt: new Date(),
  ...overrides,
})

export const makeSheet = (overrides = {}) => ({
  id: 'sheet-1',
  title: 'Paris Trip',
  ownerId: 'user-1',
  isCollaborative: false,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
})

export const makeParticipant = (overrides = {}) => ({
  id: 'part-1',
  name: 'Alice',
  email: null,
  phone: null,
  sheetId: 'sheet-1',
  ...overrides,
})

export const makeTransaction = (overrides = {}) => ({
  id: 'txn-1',
  title: 'Dinner',
  amount: 90,
  paidById: 'part-1',
  sheetId: 'sheet-1',
  createdByUserId: 'user-1',
  createdAt: new Date(),
  ...overrides,
})

export const makeSplit = (overrides = {}) => ({
  id: 'split-1',
  transactionId: 'txn-1',
  participantId: 'part-1',
  amount: 30,
  percentage: null,
  ...overrides,
})
```

---

## 9. Mocking Strategy

### Prisma

Mock the entire `lib/db` module. Each test file should reset mocks in `beforeEach`:

```typescript
jest.mock('../../lib/db')
const { prisma } = require('../../lib/db')

beforeEach(() => jest.clearAllMocks())
```

### NextAuth

```typescript
jest.mock('next-auth', () => ({
  auth: jest.fn(),
}))
import { auth } from 'next-auth'
const mockAuth = auth as jest.Mock

// In each test:
mockAuth.mockResolvedValue({ user: { id: 'user-1' } })      // authenticated
mockAuth.mockResolvedValue(null)                              // unauthenticated
```

### Nodemailer

```typescript
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}))
```

### Stripe

```typescript
jest.mock('../../lib/stripe', () => ({
  createPaymentSession: jest.fn().mockResolvedValue({ url: 'https://stripe.com/pay/test' }),
}))
```

---

## 10. Coverage Goals

| Area | Target Line Coverage |
|------|---------------------|
| `lib/split.ts` | 100 % |
| `lib/settlement.ts` | 100 % |
| `lib/sheetAccess.ts` | 100 % |
| `lib/adminAuth.ts` | 100 % |
| `lib/email.ts` | ≥ 90 % |
| `app/api/**` (integration) | ≥ 80 % |
| React components | ≥ 60 % |

Run coverage: `npm test -- --coverage`

---

## 11. Known Bugs to Capture as Tests (Write Test First)

| Bug | Test to write |
|-----|--------------|
| Equal split rounding residual: $10/3 = $9.99 | `split.test.ts`: assert splits sum to exact transaction amount |
| No rate limiting on auth endpoints | Integration test: 11th POST within 1s should return 429 (add rate limiter first) |
| Impersonation of disabled user may succeed | `admin.test.ts`: POST /impersonate on isActive=false user returns 400 |

---

## 12. CI Integration

Add to your CI pipeline (`.github/workflows/test.yml` or equivalent):

```yaml
- name: Run tests
  run: npm test -- --ci --coverage --forceExit

- name: Upload coverage
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/lcov.info
```

The `--forceExit` flag is needed because Next.js may leave open handles after integration tests.

---

## 13. Running Tests

```bash
# All unit tests
npm test

# Watch mode (during development)
npm test -- --watch

# Single file
npm test -- --testPathPattern=split

# With coverage
npm test -- --coverage

# Integration tests only
npm test -- --testPathPattern=integration

# Verbose output
npm test -- --verbose
```
