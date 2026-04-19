# SplitEase — Refined Product Requirements Document

**Version:** 1.0  
**Date:** 2026-04-19  
**Product Owner:** Priya Sharma  
**Status:** Approved

---

## 1. Overview

SplitEase is a web application that allows groups of people to track shared expenses, split costs fairly, calculate net settlements, and optionally transfer money directly via Stripe.

---

## 2. User Stories

### 2.1 Authentication
- **US-001** — As a new user, I want to register with my email and password so I can access SplitEase.
- **US-002** — As a registered user, I want to log in with my credentials so I can access my expense sheets.
- **US-003** — As a user, I want to log out securely.

### 2.2 Expense Sheets (Groups)
- **US-004** — As a user, I want to create a new expense sheet with a title and list of participants.
- **US-005** — As a user, I want to view all my expense sheets on the homepage.
- **US-006** — As a user, I want to update an existing expense sheet (title, participants).
- **US-007** — As a user, I want to delete an expense sheet.
- **US-008** — As a user, I want to import an expense sheet from a Google Sheet with a defined template.

### 2.3 Participants (People Management)
- **US-009** — As a user, I want to add people to an expense sheet with their name and email/phone.
- **US-010** — As a user, I want to edit a participant's details.
- **US-011** — As a user, I want to remove a participant from an expense sheet.

### 2.4 Transactions (Expenses)
- **US-012** — As a user, I want to add an expense with a title, total amount, and who paid.
- **US-013** — As a user, I want to select which participants are involved in an expense.
- **US-014** — As a user, I want to split an expense equally among all selected participants.
- **US-015** — As a user, I want to split an expense by custom percentage among selected participants.
- **US-016** — As a user, I want to save a transaction to the expense sheet.
- **US-017** — As a user, I want to view all transactions in an expense sheet.
- **US-018** — As a user, I want to edit or delete an existing transaction.

### 2.5 Settlement Summary
- **US-019** — As a user, I want to see the total expense for a sheet.
- **US-020** — As a user, I want to see a simplified settlement view: who owes whom and how much.

### 2.6 Export & Sharing
- **US-021** — As a user, I want to export the expense sheet as a PDF.
- **US-022** — As a user, I want to share the sheet via email.
- **US-023** — As a user, I want to share via WhatsApp.

### 2.7 Payments
- **US-024** — As a user, I want to initiate a payment via Stripe to settle a debt directly from the app.

---

## 3. Functional Requirements

### 3.1 Split Logic
- Equal split: `amount / number_of_selected_participants`
- Percentage split: Each participant gets a user-defined percentage; percentages must sum to 100%.
- The "paid by" person's share is deducted from what others owe them.

### 3.2 Settlement Algorithm
- Use a simplified debt-minimization algorithm to reduce the number of transactions needed for settlement.

### 3.3 Google Sheets Import
Expected column format:
```
Title | Amount | Paid By | Participants (comma-separated) | Split Type | Percentages
```

---

## 4. Non-Functional Requirements
- Page load < 2s on desktop
- Mobile-responsive design
- HTTPS enforced
- Passwords stored as bcrypt hashes
- JWT session tokens, 7-day expiry
- GDPR-compliant data handling (delete account = delete all data)

---

## 5. Out of Scope (v1)
- Real-time collaboration (multi-user simultaneous editing)
- Native mobile apps
- Currency conversion
- Group chat / comments
