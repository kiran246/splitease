# SplitEase — Product Requirements Document

**Version:** 2.1  
**Date:** 2026-05-30  
**Product Owner:** Priya Sharma  
**Status:** Living Document — reflects current implementation on `feature/collaborative-sheets`

---

## 1. Executive Summary

SplitEase is a web-based expense-splitting application that allows individuals and groups to track shared expenses, calculate fair splits, and settle debts with the minimum number of transfers. The product targets friend groups, roommates, travel companions, and small teams who need a lightweight, frictionless tool — no mobile app install required, no account needed for participants.

The v1 product is live. This document covers the full feature set through the current branch including collaborative sheets, WhatsApp invitations, transaction comments, admin tooling, password reset, and OpenAPI documentation.

---

## 2. Problem Statement

Splitting shared expenses is universally painful:

- Manual tracking in spreadsheets is error-prone and hard to share
- Existing apps (Splitwise, Tricount) require all participants to install and register
- No simple way to split expenses among people who are not tech-savvy
- Settling debts requires multiple transfers when a smarter approach could minimize them
- Delegating expense entry in a shared trip requires giving someone else your credentials

SplitEase solves this by making the sheet owner the single accountable party, keeping participants as lightweight records (no account required), and providing an optimal settlement plan that minimizes the number of money transfers.

---

## 3. Target Users

### 3.1 The Organizer (Primary)
- Manages shared expenses for a group (trip planner, household manager, event host)
- Wants a single source of truth they control and can share
- Needs to export/share a summary when the event ends
- May want to delegate expense entry to trusted group members

### 3.2 The Participant (Secondary)
- Added to a sheet by the Organizer
- May not want to create an account but needs visibility on what they owe
- Wants to receive a clear settlement summary at the end

### 3.3 The Collaborator (Secondary)
- An app-registered user invited to co-edit a sheet
- Can add and view transactions, comment on expenses
- Cannot delete the sheet or remove other collaborators

### 3.4 The Platform Administrator (Tertiary)
- Manages the SplitEase deployment
- Needs user management, audit trails, and the ability to assist locked-out users via API

---

## 4. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| Fast onboarding | Time from registration to first transaction | < 3 minutes |
| Accurate splits | Settlement correctness (unit test suite) | Zero rounding errors |
| Minimal settlement | Transfer count vs. naive round-robin | ≥ 30 % reduction |
| Collaboration | Invite accepted without creating a new account | Supported via token link |
| Export utility | % active users who export per month | > 50 % |
| Admin efficiency | Support tickets resolved via impersonation | < 5 min MTTR |

---

## 5. Feature Requirements

### 5.1 Authentication & User Management

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| AUTH-01 | Users register with email + password | Must | Done |
| AUTH-02 | Users log in via email/password; session is a signed JWT httpOnly cookie | Must | Done |
| AUTH-03 | Passwords hashed with bcryptjs (salt rounds ≥ 10) | Must | Done |
| AUTH-04 | Users can log out (session invalidated) | Must | Done |
| AUTH-05 | Users can update their display name | Should | Done |
| AUTH-06 | Admin can send a password-reset email to any user | Must | Done |
| AUTH-07 | Password reset token expires in 1 hour and is single-use | Must | Done |
| AUTH-08 | Admin can impersonate any active user for support | Must | Done |
| AUTH-09 | Impersonation tokens expire in 15 minutes and are single-use | Must | Done |
| AUTH-10 | Admin can enable or disable user accounts | Must | Done |
| AUTH-11 | Disabled accounts cannot log in (HTTP 403) | Must | Done |
| AUTH-12 | All admin actions are recorded in AdminAuditLog | Must | Done |

### 5.2 Expense Sheets

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| SHEET-01 | Authenticated users can create named expense sheets | Must | Done |
| SHEET-02 | Owner can rename or delete their sheet | Must | Done |
| SHEET-03 | Deleting a sheet cascades to all associated data | Must | Done |
| SHEET-04 | Dashboard lists sheets the user owns or collaborates on | Must | Done |
| SHEET-05 | Sheet can be marked "collaborative" to allow co-editors | Should | Done |
| SHEET-06 | Sheet view shows participants, transactions, and balance summary | Must | Done |

### 5.3 Participants

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| PART-01 | Owner can add named participants (no account required) | Must | Done |
| PART-02 | Participants can optionally have an email and/or phone | Should | Done |
| PART-03 | Owner can remove a participant | Should | Done |
| PART-04 | Adding a participant with an email automatically sends an invitation | Should | Done |
| PART-05 | Participants are unique by name within a sheet | Must | Done |

### 5.4 Transactions & Splits

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| TXN-01 | Users can add a transaction: title, amount, payer | Must | Done |
| TXN-02 | Equal split divides amount across all selected participants | Must | Done |
| TXN-03 | Percentage split lets user define each participant's share | Must | Done |
| TXN-04 | Percentage splits must sum to 100% (validated server-side) | Must | Done |
| TXN-05 | All monetary amounts are rounded to 2 decimal places | Must | Done |
| TXN-06 | Only the sheet owner or transaction creator can edit/delete | Must | Done |
| TXN-07 | Editing a transaction recalculates all splits | Must | Done |
| TXN-08 | Users can add text comments to a transaction | Should | Done |
| TXN-09 | Comment author can delete their own comment | Should | Done |
| TXN-10 | Comments are shown with author name and timestamp | Should | Done |

### 5.5 Settlement

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| SET-01 | System calculates each participant's net balance (paid − owed) | Must | Done |
| SET-02 | Settlement plan minimizes transfer count (greedy debt-matching) | Must | Done |
| SET-03 | Amounts < $0.005 are ignored (floating-point noise filter) | Must | Done |
| SET-04 | Settlement endpoint is read-only (no DB side-effects) | Must | Done |
| SET-05 | Users can initiate a Stripe payment for a settlement transfer | Nice | Done |

### 5.6 Collaboration

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| COLLAB-01 | Owner can invite app users to co-edit via email invitation | Should | Done |
| COLLAB-02 | Invitation token is valid for 7 days | Should | Done |
| COLLAB-03 | Invitation acceptance adds user as a collaborator with `collaborator` role | Should | Done |
| COLLAB-04 | Owner can invite via WhatsApp link (phone-based) | Should | Done |
| COLLAB-05 | Owner can remove a collaborator at any time | Should | Done |
| COLLAB-06 | Collaborator can add and view transactions but cannot delete the sheet | Must | Done |
| COLLAB-07 | Invitations cannot be accepted more than once | Must | Done |

### 5.7 Export & Import

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| EXP-01 | Owner can download a PDF receipt of the sheet | Should | Done |
| EXP-02 | Owner can email the sheet summary with optional PDF attachment | Should | Done |
| EXP-03 | Owner can share the sheet as a WhatsApp-formatted text message | Should | Done |
| EXP-04 | Owner can import transactions from a CSV file | Should | Done |
| EXP-05 | CSV import reports per-row errors without aborting the full import | Should | Done |

### 5.8 Admin

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| ADMIN-01 | Admin API protected by bearer token (ADMIN_API_KEY) | Must | Done |
| ADMIN-02 | Admin can list all users with stats | Must | Done |
| ADMIN-03 | Admin can send a password-reset link to any user | Must | Done |
| ADMIN-04 | Admin can impersonate a user to diagnose support issues | Must | Done |
| ADMIN-05 | Admin can enable/disable user accounts | Must | Done |
| ADMIN-06 | All admin actions persisted to AdminAuditLog | Must | Done |
| ADMIN-07 | Web-based admin console at `/admin` (role-gated, no bearer token required) | Must | Done |
| ADMIN-08 | Admin console shows platform stats: total users, active/inactive, sheet count | Should | Done |
| ADMIN-09 | Admin can view all expense sheets across all users with owner, type, and transaction count | Must | Done |
| ADMIN-10 | Admin can delete any individual sheet | Must | Done |
| ADMIN-11 | Admin can clear all sheets owned by a specific user in one action | Must | Done |
| ADMIN-12 | Admin console link shown in dashboard nav for users with `role = admin` | Should | Done |
| ADMIN-13 | Admin role is propagated through JWT and available on `session.user.role` | Must | Done |

### 5.9 API Documentation

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| DOCS-01 | All endpoints documented in OpenAPI 3.0 | Should | Done |
| DOCS-02 | Swagger UI accessible at `/docs` | Should | Done |
| DOCS-03 | OpenAPI YAML served at `/api/docs` | Should | Done |

---

## 6. Non-Functional Requirements

### 6.1 Security
- All protected API routes validate the session before processing
- Passwords never appear in API responses or logs
- Admin endpoints use a separate bearer token independent of user sessions
- Impersonation tokens are single-use, 15-minute TTL
- Password reset tokens are single-use, 1-hour TTL
- HTTPS enforced in production (CloudFormation ALB with ACM)

### 6.2 Performance
- Settlement calculation: < 200 ms for sheets with < 100 transactions
- PDF generation: < 5 seconds for a typical sheet (< 50 transactions)
- Dashboard page: < 1 second (server-side rendered)

### 6.3 Reliability
- All API routes return structured JSON errors with correct HTTP status codes
- Health check endpoint (`GET /api/health`) enables uptime monitoring
- Database connection pooling via Prisma to handle concurrent requests

### 6.4 Portability
- Application runs on SQLite (local dev) and PostgreSQL (production) with zero code changes
- Docker support for containerized deployments
- AWS CloudFormation templates for infrastructure-as-code deployment

### 6.5 Compliance
- Deleting a user's account deletes all their data (GDPR right to erasure)
- Audit log provides immutable record of admin actions

---

## 7. User Stories with Acceptance Criteria

### Authentication

**US-001 — Registration**
```
As a new user, I want to register with my email and password
so that I can create and manage expense sheets.

Acceptance Criteria:
- POST /api/auth/register returns 201 on success
- Duplicate email returns 409 Conflict
- Password is stored as bcrypt hash, never in plaintext
- User is redirected to /dashboard after registration
```

**US-002 — Login**
```
As a returning user, I want to log in with my credentials
so that I can access my sheets.

Acceptance Criteria:
- Invalid credentials return 401 with a generic message (no email enumeration)
- Disabled account returns 403 with "Account disabled" message
- Successful login sets a signed httpOnly JWT session cookie
- User is redirected to /dashboard
```

**US-005 — Password Reset**
```
As a user who forgot my password, I want to receive a reset link by email
so that I can regain access to my account.

Acceptance Criteria:
- Admin POSTs to /api/admin/users/[uid]/reset-password
- User receives an email with a unique token link
- Token expires after 1 hour
- Visiting /reset-password/[token] shows a reset form
- Submitting the form updates the password and marks the token as used
- Reusing the same token returns 400
```

### Expense Sheets

**US-010 — Create Sheet**
```
As a logged-in user, I want to create a new expense sheet
so that I can start tracking shared expenses.

Acceptance Criteria:
- POST /api/sheets with { title } returns 201 with the new sheet
- Sheet is owned by the authenticated user
- Sheet appears on the /dashboard list
```

**US-015 — Split a Transaction**
```
As a sheet owner, I want to add a transaction with a percentage-based split
so that participants who consumed more pay more.

Acceptance Criteria:
- Percentages must sum to exactly 100%; otherwise returns 400
- Each participant's split amount = amount × (percentage / 100), rounded to 2 dp
- Transaction and splits are created atomically
```

**US-020 — View Settlement Plan**
```
As a sheet owner, I want to see who owes whom and how much
so that we can settle debts efficiently.

Acceptance Criteria:
- GET /api/sheets/[id]/settlement returns { balances, settlements }
- balances lists each participant's net (paid − owed)
- settlements lists { from, to, amount } transfer records
- Number of transfers ≤ (number of participants − 1)
- Amounts < $0.01 are omitted
```

### Collaboration

**US-030 — Invite Collaborator**
```
As a sheet owner, I want to invite a registered user to co-edit my sheet
so that they can enter their own expenses.

Acceptance Criteria:
- POST /api/sheets/[id]/invitations sends an email with a unique token
- Token is valid for 7 days
- Recipient visits /invite/[token] and accepts
- POST /api/invite/[token]/accept adds the user as a collaborator
- Accepting twice returns 400
```

**US-031 — WhatsApp Invite**
```
As a sheet owner, I want to generate a WhatsApp invite link
so that non-technical participants can join without email.

Acceptance Criteria:
- POST /api/sheets/[id]/invitations with { phone } returns a WhatsApp URL
- URL contains a pre-filled message with the join link
- Join link works the same as email invitation acceptance
```

### Admin

**US-040 — User Impersonation**
```
As an admin, I want to temporarily log in as another user
so that I can diagnose reported issues without their password.

Acceptance Criteria:
- POST /api/admin/users/[uid]/impersonate (bearer auth) returns { token, url }
- Visiting /auth/impersonate/[token] shows a confirmation UI
- Confirming signs the admin in as the target user for 15 minutes
- Token cannot be reused after first use
- Impersonation event is written to AdminAuditLog
```

**US-041 — Admin Console**
```
As an admin, I want a web UI to manage users and sheets
so that I can perform common tasks without using the API directly.

Acceptance Criteria:
- /admin redirects non-admin users to /dashboard
- Overview page shows user count (total, active, inactive) and sheet count
- Users page lists all users with search, role filter, and status filter
- Admin can edit user name/email/role, enable/disable, reset password, impersonate, or delete from the UI
- Sheets page lists all sheets with owner info, type, transaction count, participant count, collaborator count
- Admin can filter sheets by owner and delete any sheet
- "Clear all sheets" for a selected user deletes all their owned sheets in one action
- All destructive actions show a confirmation dialog before executing
- Audit log entries for sheet deletion and clear-all are visible on the overview page
```

---

## 8. Out of Scope (v1)

- Native mobile apps (iOS / Android)
- Real-time collaboration (live cursor / websocket sync)
- Multi-currency with live FX rates
- Recurring/scheduled transactions
- Group chat beyond per-transaction comments
- Public read-only sheet links (no auth required for viewers)

---

## 9. Future Roadmap

| Phase | Feature |
|-------|---------|
| v1.1 | Multi-currency with FX rate snapshot at transaction time |
| v1.2 | Recurring expense templates |
| v1.3 | Public read-only share links |
| v1.4 | Notifications (push / in-app) for new transactions on shared sheets |
| v2.0 | Real-time collaborative editing via WebSockets |
| v2.1 | Group budget goals and overspend alerts |
| v2.2 | Native mobile app (React Native) |
