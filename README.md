# FWMS

# Family Wealth Management System

> **A private, self-hosted family financial analytics dashboard.**
> Track wealth, accounts, income, expenses, assets, and liabilities from your own machine.
> No cloud dependency. No external AI. No paid APIs.

---

##  Overview

FWMS is a personal wealth management platform designed around one principle:

> **Your financial truth should come from your ledger, not manually edited numbers.**

Instead of storing account balances and hoping they stay accurate, FWMS derives financial information from real transactions.

Every balance, net worth calculation, liability, and cash flow figure is calculated from the underlying financial records.

---

# Features

## Wealth Dashboard

A central view of your family's financial position:

* Total net worth
* Cash position
* Assets
* Liabilities
* Income tracking
* Expense tracking
* Savings rate
* Recent financial activity
* Local rule-based financial insights

---

## 🏦 Account Management

Supports:

* Checking accounts
* Savings accounts
* Cash wallets
* Investment accounts

Account balances are:

✅ Calculated dynamically
❌ Never manually stored

Opening balances are recorded as ledger adjustments, maintaining a complete financial history.

---

##  Income & Expense Tracking

A unified transaction engine powers:

* Income records
* Expense records
* Categories
* Search
* Filtering
* Financial summaries

Security features:

* Server validates transaction type
* Income cannot accidentally become an expense
* Expenses cannot artificially increase balances
* Input validation using Zod

---

## Asset Management

Track:

* Real estate
* Land
* Vehicles
* Investments
* Other valuables

Assets support:

* Purchase values
* Current valuations
* Valuation history
* Future appreciation tracking

---

## Loan Management

FWMS tracks:

* Original loan amount
* Remaining balance
* Interest rate
* Monthly payments
* Payment history

Loan payments are calculated safely:

```
Payment Amount - Interest = Principal Reduction
```

This prevents inconsistent loan records.

---

# Architecture

FWMS follows a layered architecture:

```
User Interface
      |
      ↓
Server Actions
      |
      ↓
Service Layer
      |
      ↓
Prisma Database
      |
      ↓
SQLite Ledger
```

## Design Principles

### Single Source of Truth

All financial calculations originate from the ledger.

Examples:

* Account balance
* Net worth
* Loan remaining balance
* Cash flow
* Savings rate

---

### Transaction-Based Accounting

Money movement follows:

```
Transaction
      ↓
Account Balance
      ↓
Financial Summary
      ↓
Net Worth
```

No duplicated balance fields.

---

### Secure Mutation Flow

All writes follow:

```
User Action
     ↓
Server Action
     ↓
Validation
     ↓
Service Logic
     ↓
Database Transaction
     ↓
Audit Log
```

---

# Security

FWMS includes:

✅ bcrypt password hashing
✅ HTTP-only signed session cookies
✅ Server-side authentication checks
✅ Role-based permissions
✅ Zod input validation
✅ Prisma parameterized queries
✅ Audit logging
✅ Soft deletion through VOID status

The application is designed to run on a trusted local machine or private network.

---

# 🛠️ Technology Stack

| Layer          | Technology            |
| -------------- | --------------------- |
| Frontend       | Next.js 14 App Router |
| Language       | TypeScript            |
| Styling        | Tailwind CSS          |
| Database       | SQLite                |
| ORM            | Prisma                |
| Authentication | bcrypt + jose         |
| Validation     | Zod                   |
| Testing        | Vitest                |

---

#  Installation

## Requirements

* Node.js 18.18+
* Node 20/22 recommended

---

## Setup

Clone the repository:

```bash
git clone https://github.com/YOUR_USERNAME/FWMS.git
cd FWMS
```

Install dependencies:

```bash
npm install
```

Create environment:

```bash
cp .env.example .env
```

Generate authentication secret:

```bash
openssl rand -base64 48
```

Run database migration:

```bash
npm run db:migrate
```

Load sample data:

```bash
npm run db:seed
```

Start application:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

#  Demo Accounts

Development accounts:

| Account | Email                                         | Password    | Role   |
| ------- | --------------------------------------------- | ----------- | ------ |
| Owner   | [owner@fwms.local](mailto:owner@fwms.local)   | changeme123 | OWNER  |
| Member  | [member@fwms.local](mailto:member@fwms.local) | changeme123 | MEMBER |

⚠️ Change these credentials before real usage.

---

#  Testing

FWMS includes unit and integration testing.

Run:

```bash
npm test
```

Current coverage includes:

* Money calculations
* Ledger formulas
* Transaction validation
* Account balances
* Loan calculations
* Asset valuation
* Net worth calculations
* Database integration flows

Current status:

```
69 tests passing ✅
```

---

# Project Structure

```
src/

├── app/
│   ├── dashboard/
│   ├── accounts/
│   ├── income/
│   ├── expenses/
│   ├── assets/
│   └── loans/

├── actions/
│   └── Server Actions

├── services/
│   └── Business Logic

├── lib/
│   ├── money
│   ├── ledger-math
│   ├── auth
│   └── validators

├── components/
│   └── UI Components

tests/

├── unit/
└── integration/
```

---

# Roadmap

## Completed 

* Authentication system
* Household accounts
* Ledger engine
* Income tracking
* Expense tracking
* Asset management
* Loan tracking
* Loan payment ledger integration
* Audit logging
* Backup/export system
* Automated testing

---

## Future Development

### Phase 4

* Financial reports
* Charts and analytics
* Document storage
* Wealth trends

### Phase 5

* Advanced AI insights
* Financial forecasting
* Automated recommendations
* Family financial planning tools

---

# 💾 Data & Privacy

FWMS is designed around local ownership.

Your financial data stays with you.

The database is simply:

```
prisma/dev.db
```

Backup options:

* Export from the application
* Copy database file
* Store encrypted backups

---

# 📸 Screenshots

*Add screenshots here*

Example:

```
docs/
 └── screenshots/
      ├── dashboard.png
      ├── accounts.png
      └── loans.png
```

---

# 👨‍💻 Philosophy

FWMS is built with a simple idea:

> Financial software should preserve history, explain every number, and never hide where money came from.

Built as a long-term personal wealth management platform.

