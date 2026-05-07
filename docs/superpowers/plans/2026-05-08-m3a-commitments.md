# M3A: Commitments — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a recurring financial obligations tracker with template → instance → transaction flow, month-navigable list, and dashboard integration.

**Architecture:** Thin repository over SQLite with business logic in Zustand store. Three new migrations, two new entities, one new store, five screens following existing screen anatomy. Reuses existing category/account picker sheets and exchange rate row component.

**Tech Stack:** Expo Router · TypeScript · expo-sqlite · Zustand · RHF + Zod · react-native-actions-sheet · MaterialCommunityIcons

**Spec:** `docs/superpowers/specs/2026-05-08-m3a-commitments-design.md`

---

## File Map

### New files

```
constants/enums.ts                              — ADD 4 new enums (AmountType, RecurrencePeriod, DurationType, CommitmentPaymentStatus)
constants/strings.ts                            — ADD commitment-related strings

database/migrations/006_create_commitments.ts   — CREATE TABLE commitments
database/migrations/007_create_commitment_payments.ts — CREATE TABLE commitment_payments + indexes
database/migrations/008_add_commitment_payment_id.ts — ALTER TABLE transactions ADD commitment_payment_id
database/migrations/index.ts                    — MODIFY: register 006, 007, 008

database/entities/commitment.entity.ts          — Commitment interface
database/entities/commitment_payment.entity.ts  — CommitmentPayment interface

database/commitments.ts                         — SQL queries for commitments table
database/commitment_payments.ts                 — SQL queries for commitment_payments table + atomic markAsPaid

repositories/commitment.repository.ts           — ICommitmentRepository + CommitmentRepository

store/commitment.store.ts                       — createCommitmentStore + useCommitmentStore

utils/compute_due_dates.ts                      — Pure date math function

app/(app)/(tabs)/commitments/_layout.tsx         — Stack navigator
app/(app)/(tabs)/commitments/index.tsx           — → screens/commitments (C1)
app/(app)/(tabs)/commitments/add/index.tsx       — → screens/commitments/add_commitment (C2)
app/(app)/(tabs)/commitments/[id]/index.tsx      — → screens/commitments/detail (C4)
app/(app)/(tabs)/commitments/[id]/edit/index.tsx — → screens/commitments/edit_commitment (C3)

screens/commitments/index.tsx                    — C1 SectionList
screens/commitments/commitments.hook.ts          — C1 logic
screens/commitments/commitments.state.ts         — C1 UI state
screens/commitments/commitments.anim.ts          — C1 animations
screens/commitments/components/summary_header.tsx
screens/commitments/components/commitment_row.tsx
screens/commitments/components/month_navigator.tsx
screens/commitments/components/empty_state.tsx
screens/commitments/components/commitment_form_body.tsx — Shared form (C2+C3)
screens/commitments/components/recurrence_picker.tsx
screens/commitments/components/duration_picker.tsx

screens/commitments/add_commitment/index.tsx
screens/commitments/add_commitment/add_commitment.hook.ts
screens/commitments/add_commitment/add_commitment.store.ts

screens/commitments/detail/index.tsx
screens/commitments/detail/detail.hook.ts
screens/commitments/detail/detail.state.ts
screens/commitments/detail/detail.anim.ts
screens/commitments/detail/components/detail_hero.tsx
screens/commitments/detail/components/current_cycle_card.tsx
screens/commitments/detail/components/details_card.tsx
screens/commitments/detail/components/payment_history.tsx
screens/commitments/detail/components/payment_row.tsx
screens/commitments/detail/components/pay_sheet.tsx
screens/commitments/detail/components/pay_sheet.state.ts
screens/commitments/detail/components/pay_sheet.hook.ts

screens/commitments/edit_commitment/index.tsx
screens/commitments/edit_commitment/edit_commitment.hook.ts
screens/commitments/edit_commitment/edit_commitment.store.ts
screens/commitments/edit_commitment/components/deactivate_dialog.tsx

screens/dashboard/components/commitments_card.tsx

__tests__/commitment.migration.test.ts
__tests__/compute_due_dates.test.ts
__tests__/commitment.repository.test.ts
__tests__/commitment.store.test.ts
__tests__/commitment_payments.query.test.ts
```

### Modified files

```
constants/enums.ts                              — Add 4 enums
constants/strings.ts                            — Add commitment strings
database/migrations/index.ts                    — Register 3 new migrations
utils/use_layout_init.hook.ts                   — Add commitment init calls
app/(app)/(tabs)/_layout.tsx                    — Replace bills tab with commitments
components/empty_states/index.tsx               — Add 'commitments' variant
screens/dashboard/index.tsx                     — Add CommitmentsCard
screens/dashboard/dashboard.hook.ts             — Subscribe to commitment store
```

---

## Task 1: Enums & Strings

**Files:**
- Modify: `constants/enums.ts`
- Modify: `constants/strings.ts`

- [ ] **Step 1: Add 4 new enums to `constants/enums.ts`**

Append after the existing `DatePreset` enum:

```typescript
export enum AmountType {
  Fixed = 'fixed',
  Variable = 'variable',
}

export enum RecurrencePeriod {
  Days = 'days',
  Weeks = 'weeks',
  Months = 'months',
  Years = 'years',
}

export enum DurationType {
  Forever = 'forever',
  AfterCount = 'after_count',
  UntilDate = 'until_date',
}

export enum CommitmentPaymentStatus {
  Upcoming = 'upcoming',
  Due = 'due',
  Overdue = 'overdue',
  Paid = 'paid',
  Skipped = 'skipped',
}
```

- [ ] **Step 2: Add commitment strings to `constants/strings.ts`**

Add a new `commitments` section to the `Strings` object. Include all user-visible copy for C1-C5, empty states, validation errors, status labels, etc:

```typescript
// Commitments — C1 List
commitmentsTitle: 'Commitments',
commitmentsPaidSummary: 'Paid this month',
commitmentsTotalCommitted: 'Total committed',
commitmentsOverdue: 'Overdue',
commitmentsDueToday: 'Due Today',
commitmentsUpcoming: 'Upcoming',
commitmentsPaid: 'Paid',
commitmentsSkipped: 'Skipped',

// Commitments — Empty state
commitmentsEmptyTitle: 'No commitments yet',
commitmentsEmptySub: 'Add rent, subscriptions, or any regular payment',
commitmentsEmptyCta: 'Add Commitment',

// Commitments — C2 Add / C3 Edit
commitmentsAddTitle: 'New Commitment',
commitmentsEditTitle: 'Edit Commitment',
commitmentsFieldName: 'Name',
commitmentsFieldAmountType: 'Amount Type',
commitmentsFieldAmount: 'Amount',
commitmentsFieldCurrency: 'Currency',
commitmentsFieldCategory: 'Category',
commitmentsFieldRecurrence: 'Recurrence',
commitmentsFieldCustomRecurrence: 'Custom Recurrence',
commitmentsFieldStartDate: 'Start Date',
commitmentsFieldDefaultAccount: 'Default Account',
commitmentsFieldDuration: 'Duration',
commitmentsFieldNotes: 'Notes',
commitmentsAmountFixed: 'Fixed',
commitmentsAmountVariable: 'Variable',
commitmentsRecurrenceMonthly: 'Monthly',
commitmentsRecurrenceWeekly: 'Weekly',
commitmentsRecurrenceAnnually: 'Annually',
commitmentsRecurrenceCustom: 'Custom',
commitmentsRecurrenceEvery: 'Every',
commitmentsDurationForever: 'Forever',
commitmentsDurationAfterCount: 'After N payments',
commitmentsDurationUntilDate: 'Until date',
commitmentsDurationStopAfter: 'Stop after',
commitmentsDurationPayments: 'payments',
commitmentsSave: 'Save Commitment',
commitmentsOptional: '(optional)',

// Commitments — validation errors
commitmentsErrNameRequired: 'Name is required',
commitmentsErrNameMax: 'Name must be 50 characters or less',
commitmentsErrAmountRequired: 'Amount is required for fixed commitments',
commitmentsErrAmountPositive: 'Amount must be greater than zero',
commitmentsErrCategoryRequired: 'Category is required',
commitmentsErrStartDateRequired: 'Start date is required',
commitmentsErrEveryMin: 'Must be at least 1',
commitmentsErrEveryMax: 'Must be 365 or less',

// Commitments — C4 Detail
commitmentsDetailRecurrence: 'Recurrence',
commitmentsDetailStartDate: 'Start Date',
commitmentsDetailDefaultAccount: 'Default Account',
commitmentsDetailDuration: 'Duration',
commitmentsDetailCurrency: 'Currency',
commitmentsDetailNone: 'None',
commitmentsDetailPaymentHistory: 'Payment History',
commitmentsDetailCurrentCycle: 'Current Cycle',
commitmentsDetailNotes: 'Notes',
commitmentsDetailEdit: 'Edit',
commitmentsMarkAsPaid: 'Mark as Paid',
commitmentsSkip: 'Skip',

// Commitments — C5 Pay Sheet
commitmentsPayTitle: (name: string) => `Pay ${name}`,
commitmentsPayAmount: 'Amount',
commitmentsPayAccount: 'Pay from Account',
commitmentsPayDate: 'Payment Date',
commitmentsPayNotes: 'Notes',
commitmentsPayConfirm: 'Confirm Payment',
commitmentsPayErrAmountRequired: 'Amount is required',
commitmentsPayErrAccountRequired: 'Select an account',

// Commitments — Deactivate
commitmentsDeactivate: 'Deactivate Commitment',
commitmentsDeactivateTitle: 'Deactivate this commitment?',
commitmentsDeactivateBody: 'It will be removed from your list. Past payment records are preserved.',
commitmentsDeactivateCancel: 'Cancel',
commitmentsDeactivateConfirm: 'Deactivate',

// Commitments — status badges
commitmentsStatusOverdue: 'Overdue',
commitmentsStatusDue: 'Due',
commitmentsStatusUpcoming: 'Upcoming',
commitmentsStatusPaid: 'Paid',
commitmentsStatusSkipped: 'Skipped',

// Dashboard — commitments card
dashboardCommitmentsTitle: 'Commitments',
dashboardCommitmentsPaid: (paid: number, total: number) => `${paid} of ${total} paid`,
dashboardCommitmentsOverdue: (count: number) => `${count} overdue`,
```

- [ ] **Step 3: Commit**

```bash
git add constants/enums.ts constants/strings.ts
git commit -m "feat(m3a): add commitment enums and strings"
```

---

## Task 2: Migration 006 — `commitments` table

**Files:**
- Create: `database/migrations/006_create_commitments.ts`
- Modify: `database/migrations/index.ts`
- Create: `__tests__/commitment.migration.test.ts`

- [ ] **Step 1: Write the migration test**

```typescript
// __tests__/commitment.migration.test.ts
import Database from 'better-sqlite3';
import { MIGRATIONS } from '@/database/migrations';

let db: ReturnType<typeof Database>;

beforeEach(() => {
  db = new Database(':memory:');
  // Run all migrations up to and including 006
  for (const m of MIGRATIONS) {
    if (m.version <= 6) db.exec(m.up);
  }
});

afterEach(() => db.close());

describe('migration006 — commitments table', () => {
  it('creates the commitments table', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='commitments'")
      .get();
    expect(row).toBeDefined();
  });

  it('has all expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('commitments')").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'id', 'name', 'amount_type', 'amount', 'currency', 'category_id',
        'recurrence_every', 'recurrence_period', 'start_date', 'account_id',
        'notes', 'duration_type', 'end_date', 'end_after_count', 'is_active',
        'created_at', 'updated_at',
      ]),
    );
  });

  it('rejects invalid amount_type', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        `INSERT INTO commitments (id,name,amount_type,currency,category_id,recurrence_every,recurrence_period,start_date,duration_type,is_active,created_at,updated_at)
         VALUES ('c1','Rent','invalid','EGP','cat1',1,'months','2026-01-01','forever',1,?,?)`,
      ).run(now, now);
    }).toThrow();
  });

  it('rejects invalid recurrence_period', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        `INSERT INTO commitments (id,name,amount_type,currency,category_id,recurrence_every,recurrence_period,start_date,duration_type,is_active,created_at,updated_at)
         VALUES ('c1','Rent','fixed','EGP','cat1',1,'biweekly','2026-01-01','forever',1,?,?)`,
      ).run(now, now);
    }).toThrow();
  });

  it('rejects invalid duration_type', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        `INSERT INTO commitments (id,name,amount_type,currency,category_id,recurrence_every,recurrence_period,start_date,duration_type,is_active,created_at,updated_at)
         VALUES ('c1','Rent','fixed','EGP','cat1',1,'months','2026-01-01','quarterly',1,?,?)`,
      ).run(now, now);
    }).toThrow();
  });

  it('accepts a valid commitment row', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        `INSERT INTO commitments (id,name,amount_type,amount,currency,category_id,recurrence_every,recurrence_period,start_date,duration_type,is_active,created_at,updated_at)
         VALUES ('c1','Rent','fixed',5000,'EGP','cat1',1,'months','2026-01-01','forever',1,?,?)`,
      ).run(now, now);
    }).not.toThrow();
  });

  it('is idempotent — running twice does not error', () => {
    expect(() => db.exec(MIGRATIONS.find((m) => m.version === 6)!.up)).not.toThrow();
  });

  it('has version 6', () => {
    expect(MIGRATIONS.find((m) => m.version === 6)!.version).toBe(6);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/commitment.migration.test.ts --no-coverage`
Expected: FAIL — cannot resolve `006_create_commitments`

- [ ] **Step 3: Write the migration**

```typescript
// database/migrations/006_create_commitments.ts
export const migration006 = {
  version: 6,
  up: `
    CREATE TABLE IF NOT EXISTS commitments (
      id                TEXT PRIMARY KEY,
      name              TEXT NOT NULL,
      amount_type       TEXT NOT NULL CHECK(amount_type IN ('fixed', 'variable')),
      amount            REAL,
      currency          TEXT NOT NULL DEFAULT 'EGP',
      category_id       TEXT NOT NULL,
      recurrence_every  INTEGER NOT NULL DEFAULT 1,
      recurrence_period TEXT NOT NULL CHECK(recurrence_period IN ('days', 'weeks', 'months', 'years')),
      start_date        TEXT NOT NULL,
      account_id        TEXT,
      notes             TEXT,
      duration_type     TEXT NOT NULL DEFAULT 'forever' CHECK(duration_type IN ('forever', 'after_count', 'until_date')),
      end_date          TEXT,
      end_after_count   INTEGER,
      is_active         INTEGER NOT NULL DEFAULT 1,
      created_at        TEXT NOT NULL,
      updated_at        TEXT NOT NULL,
      FOREIGN KEY (account_id)  REFERENCES accounts(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `,
};
```

- [ ] **Step 4: Register migration in index.ts**

Add to `database/migrations/index.ts`:

```typescript
import { migration006 } from './006_create_commitments';
```

And append `migration006` to the `MIGRATIONS` array.

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/commitment.migration.test.ts --no-coverage`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add database/migrations/006_create_commitments.ts database/migrations/index.ts __tests__/commitment.migration.test.ts
git commit -m "feat(m3a): migration 006 — commitments table"
```

---

## Task 3: Migration 007 — `commitment_payments` table

**Files:**
- Create: `database/migrations/007_create_commitment_payments.ts`
- Modify: `database/migrations/index.ts`
- Modify: `__tests__/commitment.migration.test.ts`

- [ ] **Step 1: Add tests for migration 007 to the existing test file**

Append to `__tests__/commitment.migration.test.ts` (update `beforeEach` to run through version 7):

```typescript
describe('migration007 — commitment_payments table', () => {
  it('creates the commitment_payments table', () => {
    const row = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='commitment_payments'")
      .get();
    expect(row).toBeDefined();
  });

  it('has all expected columns', () => {
    const cols = db.prepare("PRAGMA table_info('commitment_payments')").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    expect(names).toEqual(
      expect.arrayContaining([
        'id', 'commitment_id', 'due_date', 'paid_date', 'skipped_date',
        'amount_due', 'amount_paid', 'currency', 'exchange_rate_snapshot',
        'account_id', 'transaction_id', 'status', 'notes',
        'created_at', 'updated_at',
      ]),
    );
  });

  it('creates expected indexes', () => {
    const indexes = db
      .prepare("SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='commitment_payments'")
      .all() as { name: string }[];
    const names = indexes.map((i) => i.name);
    expect(names).toContain('idx_cp_commitment_id');
    expect(names).toContain('idx_cp_due_date');
    expect(names).toContain('idx_cp_status');
  });

  it('rejects invalid status', () => {
    const now = new Date().toISOString();
    expect(() => {
      db.prepare(
        `INSERT INTO commitment_payments (id,commitment_id,due_date,currency,status,created_at,updated_at)
         VALUES ('cp1','c1','2026-05-01','EGP','invalid',?,?)`,
      ).run(now, now);
    }).toThrow();
  });

  it('accepts a valid payment row with nullable account_id', () => {
    const now = new Date().toISOString();
    // Insert parent commitment first
    db.prepare(
      `INSERT INTO commitments (id,name,amount_type,currency,category_id,recurrence_every,recurrence_period,start_date,duration_type,is_active,created_at,updated_at)
       VALUES ('c1','Rent','fixed','EGP','cat1',1,'months','2026-01-01','forever',1,?,?)`,
    ).run(now, now);
    expect(() => {
      db.prepare(
        `INSERT INTO commitment_payments (id,commitment_id,due_date,currency,account_id,status,created_at,updated_at)
         VALUES ('cp1','c1','2026-05-01','EGP',NULL,'upcoming',?,?)`,
      ).run(now, now);
    }).not.toThrow();
  });

  it('is idempotent', () => {
    expect(() => db.exec(MIGRATIONS.find((m) => m.version === 7)!.up)).not.toThrow();
  });

  it('has version 7', () => {
    expect(MIGRATIONS.find((m) => m.version === 7)!.version).toBe(7);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/commitment.migration.test.ts --no-coverage`
Expected: FAIL — cannot resolve `007_create_commitment_payments`

- [ ] **Step 3: Write the migration**

```typescript
// database/migrations/007_create_commitment_payments.ts
export const migration007 = {
  version: 7,
  up: `
    CREATE TABLE IF NOT EXISTS commitment_payments (
      id                      TEXT PRIMARY KEY,
      commitment_id           TEXT NOT NULL,
      due_date                TEXT NOT NULL,
      paid_date               TEXT,
      skipped_date            TEXT,
      amount_due              REAL,
      amount_paid             REAL,
      currency                TEXT NOT NULL,
      exchange_rate_snapshot  REAL,
      account_id              TEXT,
      transaction_id          TEXT,
      status                  TEXT NOT NULL CHECK(status IN ('upcoming', 'due', 'overdue', 'paid', 'skipped')),
      notes                   TEXT,
      created_at              TEXT NOT NULL,
      updated_at              TEXT NOT NULL,
      FOREIGN KEY (commitment_id)  REFERENCES commitments(id),
      FOREIGN KEY (account_id)     REFERENCES accounts(id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id)
    );

    CREATE INDEX IF NOT EXISTS idx_cp_commitment_id ON commitment_payments(commitment_id);
    CREATE INDEX IF NOT EXISTS idx_cp_due_date ON commitment_payments(due_date);
    CREATE INDEX IF NOT EXISTS idx_cp_status ON commitment_payments(status);
  `,
};
```

- [ ] **Step 4: Register in index.ts**

Import `migration007` and add to `MIGRATIONS` array.

- [ ] **Step 5: Update `beforeEach` in test file to run all migrations through version 7**

Change the loop to `if (m.version <= 7)` or simply run all migrations (since version 8 is next).

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest __tests__/commitment.migration.test.ts --no-coverage`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add database/migrations/007_create_commitment_payments.ts database/migrations/index.ts __tests__/commitment.migration.test.ts
git commit -m "feat(m3a): migration 007 — commitment_payments table"
```

---

## Task 4: Migration 008 — ALTER transactions table

**Files:**
- Create: `database/migrations/008_add_commitment_payment_id.ts`
- Modify: `database/migrations/index.ts`
- Modify: `__tests__/commitment.migration.test.ts`

- [ ] **Step 1: Add tests for migration 008**

Append to `__tests__/commitment.migration.test.ts`:

```typescript
describe('migration008 — commitment_payment_id column on transactions', () => {
  it('adds commitment_payment_id column', () => {
    const cols = db.prepare("PRAGMA table_info('transactions')").all() as { name: string }[];
    const names = cols.map((c) => c.name);
    expect(names).toContain('commitment_payment_id');
  });

  it('has version 8', () => {
    expect(MIGRATIONS.find((m) => m.version === 8)!.version).toBe(8);
  });

  it('allows inserting a transaction with commitment_payment_id', () => {
    const now = new Date().toISOString();
    db.prepare(
      `INSERT INTO accounts (id,name,type,currency,opening_balance,current_balance,interest_tracking,is_archived,sort_order,created_at,updated_at)
       VALUES ('acc1','Test','bank','EGP',0,0,0,0,0,?,?)`,
    ).run(now, now);
    expect(() => {
      db.prepare(
        `INSERT INTO transactions (id,type,amount,currency,egp_amount,account_id,transaction_date,transaction_time,commitment_payment_id,created_at,updated_at)
         VALUES ('t1','expense',100,'EGP',100,'acc1','2026-01-01','12:00:00','cp1',?,?)`,
      ).run(now, now);
    }).not.toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/commitment.migration.test.ts --no-coverage`
Expected: FAIL

- [ ] **Step 3: Write the migration**

```typescript
// database/migrations/008_add_commitment_payment_id.ts
export const migration008 = {
  version: 8,
  up: `
    ALTER TABLE transactions ADD COLUMN commitment_payment_id TEXT;
  `,
};
```

- [ ] **Step 4: Register in index.ts**

Import `migration008` and add to `MIGRATIONS` array.

- [ ] **Step 5: Update `beforeEach` to run ALL migrations**

Change to run all: `for (const m of MIGRATIONS) db.exec(m.up);`

- [ ] **Step 6: Run test to verify it passes**

Run: `npx jest __tests__/commitment.migration.test.ts --no-coverage`
Expected: All tests PASS

- [ ] **Step 7: Commit**

```bash
git add database/migrations/008_add_commitment_payment_id.ts database/migrations/index.ts __tests__/commitment.migration.test.ts
git commit -m "feat(m3a): migration 008 — add commitment_payment_id to transactions"
```

---

## Task 5: Entities

**Files:**
- Create: `database/entities/commitment.entity.ts`
- Create: `database/entities/commitment_payment.entity.ts`

- [ ] **Step 1: Create commitment entity**

```typescript
// database/entities/commitment.entity.ts
import type { AmountType, Currency, DurationType, RecurrencePeriod } from '@/constants/enums';

export interface Commitment {
  id: string;
  name: string;
  amount_type: AmountType;
  amount: number | null;
  currency: Currency;
  category_id: string;
  recurrence_every: number;
  recurrence_period: RecurrencePeriod;
  start_date: string;
  account_id: string | null;
  notes: string | null;
  duration_type: DurationType;
  end_date: string | null;
  end_after_count: number | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 2: Create commitment payment entity**

```typescript
// database/entities/commitment_payment.entity.ts
import type { CommitmentPaymentStatus, Currency } from '@/constants/enums';

export interface CommitmentPayment {
  id: string;
  commitment_id: string;
  due_date: string;
  paid_date: string | null;
  skipped_date: string | null;
  amount_due: number | null;
  amount_paid: number | null;
  currency: Currency;
  exchange_rate_snapshot: number | null;
  account_id: string | null;
  transaction_id: string | null;
  status: CommitmentPaymentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

- [ ] **Step 3: Commit**

```bash
git add database/entities/commitment.entity.ts database/entities/commitment_payment.entity.ts
git commit -m "feat(m3a): commitment and commitment_payment entities"
```

---

## Task 6: Date computation utility

**Files:**
- Create: `utils/compute_due_dates.ts`
- Create: `__tests__/compute_due_dates.test.ts`

- [ ] **Step 1: Write the tests**

```typescript
// __tests__/compute_due_dates.test.ts
import { RecurrencePeriod, DurationType } from '@/constants/enums';
import { computeDueDates } from '@/utils/compute_due_dates';

describe('computeDueDates', () => {
  describe('days period', () => {
    it('generates daily dates', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 1,
        period: RecurrencePeriod.Days,
        durationType: DurationType.Forever,
        maxCount: 5,
      });
      expect(result).toEqual([
        '2026-01-01', '2026-01-02', '2026-01-03', '2026-01-04', '2026-01-05',
      ]);
    });

    it('generates every 3 days', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 3,
        period: RecurrencePeriod.Days,
        durationType: DurationType.Forever,
        maxCount: 4,
      });
      expect(result).toEqual(['2026-01-01', '2026-01-04', '2026-01-07', '2026-01-10']);
    });
  });

  describe('weeks period', () => {
    it('generates weekly dates', () => {
      const result = computeDueDates({
        startDate: '2026-01-05',
        every: 1,
        period: RecurrencePeriod.Weeks,
        durationType: DurationType.Forever,
        maxCount: 4,
      });
      expect(result).toEqual(['2026-01-05', '2026-01-12', '2026-01-19', '2026-01-26']);
    });

    it('generates biweekly dates', () => {
      const result = computeDueDates({
        startDate: '2026-01-05',
        every: 2,
        period: RecurrencePeriod.Weeks,
        durationType: DurationType.Forever,
        maxCount: 3,
      });
      expect(result).toEqual(['2026-01-05', '2026-01-19', '2026-02-02']);
    });
  });

  describe('months period', () => {
    it('generates monthly dates', () => {
      const result = computeDueDates({
        startDate: '2026-01-15',
        every: 1,
        period: RecurrencePeriod.Months,
        durationType: DurationType.Forever,
        maxCount: 4,
      });
      expect(result).toEqual(['2026-01-15', '2026-02-15', '2026-03-15', '2026-04-15']);
    });

    it('clamps to end of month (Jan 31 + 1 month = Feb 28)', () => {
      const result = computeDueDates({
        startDate: '2026-01-31',
        every: 1,
        period: RecurrencePeriod.Months,
        durationType: DurationType.Forever,
        maxCount: 3,
      });
      expect(result).toEqual(['2026-01-31', '2026-02-28', '2026-03-31']);
    });

    it('handles quarterly (every 3 months)', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 3,
        period: RecurrencePeriod.Months,
        durationType: DurationType.Forever,
        maxCount: 4,
      });
      expect(result).toEqual(['2026-01-01', '2026-04-01', '2026-07-01', '2026-10-01']);
    });
  });

  describe('years period', () => {
    it('generates annual dates', () => {
      const result = computeDueDates({
        startDate: '2026-03-15',
        every: 1,
        period: RecurrencePeriod.Years,
        durationType: DurationType.Forever,
        maxCount: 3,
      });
      expect(result).toEqual(['2026-03-15', '2027-03-15', '2028-03-15']);
    });

    it('handles leap year (Feb 29 → Feb 28 on non-leap year)', () => {
      const result = computeDueDates({
        startDate: '2028-02-29',
        every: 1,
        period: RecurrencePeriod.Years,
        durationType: DurationType.Forever,
        maxCount: 3,
      });
      expect(result).toEqual(['2028-02-29', '2029-02-28', '2030-02-28']);
    });
  });

  describe('duration types', () => {
    it('AfterCount stops at end_after_count', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 1,
        period: RecurrencePeriod.Months,
        durationType: DurationType.AfterCount,
        endAfterCount: 3,
        maxCount: 64,
      });
      expect(result).toHaveLength(3);
    });

    it('UntilDate stops at end_date', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 1,
        period: RecurrencePeriod.Months,
        durationType: DurationType.UntilDate,
        endDate: '2026-03-15',
        maxCount: 64,
      });
      expect(result).toEqual(['2026-01-01', '2026-02-01', '2026-03-01']);
    });

    it('Forever generates up to maxCount', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 1,
        period: RecurrencePeriod.Months,
        durationType: DurationType.Forever,
        maxCount: 64,
      });
      expect(result).toHaveLength(64);
    });

    it('AfterCount respects maxCount cap', () => {
      const result = computeDueDates({
        startDate: '2026-01-01',
        every: 1,
        period: RecurrencePeriod.Days,
        durationType: DurationType.AfterCount,
        endAfterCount: 100,
        maxCount: 64,
      });
      expect(result).toHaveLength(64);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/compute_due_dates.test.ts --no-coverage`
Expected: FAIL — cannot find module

- [ ] **Step 3: Implement the utility**

```typescript
// utils/compute_due_dates.ts
import { DurationType, RecurrencePeriod } from '@/constants/enums';

interface ComputeDueDatesInput {
  startDate: string;
  every: number;
  period: RecurrencePeriod;
  durationType: DurationType;
  endAfterCount?: number;
  endDate?: string;
  maxCount?: number;
}

export function computeDueDates(input: ComputeDueDatesInput): string[] {
  const { startDate, every, period, durationType, endAfterCount, endDate, maxCount = 64 } = input;
  const dates: string[] = [];

  const limit =
    durationType === DurationType.AfterCount && endAfterCount !== undefined
      ? Math.min(endAfterCount, maxCount)
      : maxCount;

  const [startYear, startMonth, startDay] = startDate.split('-').map(Number);

  for (let i = 0; i < limit; i++) {
    let date: string;

    if (period === RecurrencePeriod.Days) {
      const d = new Date(Date.UTC(startYear, startMonth - 1, startDay + every * i));
      date = formatDate(d);
    } else if (period === RecurrencePeriod.Weeks) {
      const d = new Date(Date.UTC(startYear, startMonth - 1, startDay + 7 * every * i));
      date = formatDate(d);
    } else if (period === RecurrencePeriod.Months) {
      const totalMonths = (startMonth - 1) + every * i;
      const y = startYear + Math.floor(totalMonths / 12);
      const m = (totalMonths % 12) + 1;
      const maxDay = daysInMonth(y, m);
      const d = Math.min(startDay, maxDay);
      date = `${y}-${pad(m)}-${pad(d)}`;
    } else {
      // Years
      const y = startYear + every * i;
      const maxDay = daysInMonth(y, startMonth);
      const d = Math.min(startDay, maxDay);
      date = `${y}-${pad(startMonth)}-${pad(d)}`;
    }

    if (durationType === DurationType.UntilDate && endDate && date > endDate) break;

    dates.push(date);
  }

  return dates;
}

function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatDate(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx jest __tests__/compute_due_dates.test.ts --no-coverage`
Expected: All tests PASS

- [ ] **Step 5: Commit**

```bash
git add utils/compute_due_dates.ts __tests__/compute_due_dates.test.ts
git commit -m "feat(m3a): compute_due_dates utility with full period + duration support"
```

---

## Task 7: Database query files

**Files:**
- Create: `database/commitments.ts`
- Create: `database/commitment_payments.ts`
- Create: `__tests__/commitment_payments.query.test.ts`

- [ ] **Step 1: Write `database/commitments.ts`**

```typescript
// database/commitments.ts
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Commitment } from './entities/commitment.entity';

export async function getCommitments(db: SQLiteDatabase): Promise<Commitment[]> {
  return db.getAllAsync<Commitment>(
    'SELECT * FROM commitments WHERE is_active = 1 ORDER BY created_at DESC',
  );
}

export async function getCommitmentById(
  db: SQLiteDatabase,
  id: string,
): Promise<Commitment | null> {
  const rows = await db.getAllAsync<Commitment>('SELECT * FROM commitments WHERE id = ?', [id]);
  return rows[0] ?? null;
}

export async function addCommitment(db: SQLiteDatabase, commitment: Commitment): Promise<void> {
  await db.runAsync(
    `INSERT INTO commitments (id, name, amount_type, amount, currency, category_id,
      recurrence_every, recurrence_period, start_date, account_id, notes,
      duration_type, end_date, end_after_count, is_active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      commitment.id, commitment.name, commitment.amount_type, commitment.amount,
      commitment.currency, commitment.category_id, commitment.recurrence_every,
      commitment.recurrence_period, commitment.start_date, commitment.account_id,
      commitment.notes, commitment.duration_type, commitment.end_date,
      commitment.end_after_count, commitment.is_active,
      commitment.created_at, commitment.updated_at,
    ],
  );
}

export interface UpdateCommitmentData {
  name: string;
  amount_type: string;
  amount: number | null;
  currency: string;
  category_id: string;
  recurrence_every: number;
  recurrence_period: string;
  start_date: string;
  account_id: string | null;
  notes: string | null;
  duration_type: string;
  end_date: string | null;
  end_after_count: number | null;
}

export async function updateCommitment(
  db: SQLiteDatabase,
  id: string,
  data: UpdateCommitmentData,
): Promise<void> {
  await db.runAsync(
    `UPDATE commitments SET
      name = ?, amount_type = ?, amount = ?, currency = ?, category_id = ?,
      recurrence_every = ?, recurrence_period = ?, start_date = ?, account_id = ?,
      notes = ?, duration_type = ?, end_date = ?, end_after_count = ?,
      updated_at = ?
     WHERE id = ?`,
    [
      data.name, data.amount_type, data.amount, data.currency, data.category_id,
      data.recurrence_every, data.recurrence_period, data.start_date, data.account_id,
      data.notes, data.duration_type, data.end_date, data.end_after_count,
      new Date().toISOString(), id,
    ],
  );
}

export async function deactivateCommitment(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync(
    'UPDATE commitments SET is_active = 0, updated_at = ? WHERE id = ?',
    [new Date().toISOString(), id],
  );
}
```

- [ ] **Step 2: Write `database/commitment_payments.ts`**

This file contains all payment queries plus the atomic `markCommitmentAsPaid` operation. See spec Section 3 for the full query list. Key patterns:
- `getPaymentsByMonth` — fetches payments for a month + overdue bubble-up
- `addPayments` — batch insert for generation
- `markCommitmentAsPaid` — atomic `db.withTransactionAsync` wrapping payment update + transaction insert + account balance update
- `deleteUnpaidPaymentsByCommitment` — for edit regeneration
- `getExistingDueDates` — for idempotent generation
- `getLastPaidPayment` — for account pre-fill
- `getPaidCountByCommitment` — for after_count deactivation

The `markCommitmentAsPaid` function follows the same `db.withTransactionAsync()` pattern as `addTransaction` in `database/transactions.ts`. It receives the full payment details + a pre-built Transaction object, and within the transaction: updates the payment status, inserts the transaction row, and deducts the account balance.

- [ ] **Step 3: Write query tests**

Create `__tests__/commitment_payments.query.test.ts` testing:
- `getPaymentsByMonth` returns correct payments for a given month
- `getPaymentsByMonth` includes overdue from previous months
- `addPayments` batch inserts correctly
- `getExistingDueDates` returns only dates for the specified commitment
- `deleteUnpaidPaymentsByCommitment` only removes upcoming/due, not paid/skipped
- `getPaidCountByCommitment` counts correctly
- `getLastPaidPayment` returns most recent paid payment

Use `better-sqlite3` in-memory DB like existing query tests.

- [ ] **Step 4: Run tests and verify they pass**

Run: `npx jest __tests__/commitment_payments.query.test.ts --no-coverage`

- [ ] **Step 5: Commit**

```bash
git add database/commitments.ts database/commitment_payments.ts __tests__/commitment_payments.query.test.ts
git commit -m "feat(m3a): commitment and commitment_payment query files"
```

---

## Task 8: Repository

**Files:**
- Create: `repositories/commitment.repository.ts`
- Create: `__tests__/commitment.repository.test.ts`

- [ ] **Step 1: Write the repository**

Follow the exact pattern from `repositories/category.repository.ts`:
- Define `NewCommitmentInput` — `Omit<Commitment, 'id' | 'created_at' | 'updated_at' | 'is_active'>`
- Define `UpdateCommitmentInput` — the `UpdateCommitmentData` shape
- Define `PaymentDetails` — `{ amount_paid: number, account_id: string, paid_date: string, exchange_rate_snapshot?: number, notes?: string }`
- Interface `ICommitmentRepository` with all methods from spec Section 4
- Class `CommitmentRepository` implementing it — thin wrapper calling database functions with `getDb()`
- `add()` generates UUID + timestamps, builds full `Commitment` object, calls `addCommitment(db, commitment)`
- Export singleton instance

- [ ] **Step 2: Write repository tests**

Follow pattern from `__tests__/category.repository.test.ts` — mock the database functions, test that repository methods call the correct DB functions with correct args.

- [ ] **Step 3: Run tests**

Run: `npx jest __tests__/commitment.repository.test.ts --no-coverage`

- [ ] **Step 4: Commit**

```bash
git add repositories/commitment.repository.ts __tests__/commitment.repository.test.ts
git commit -m "feat(m3a): commitment repository with ICommitmentRepository interface"
```

---

## Task 9: Zustand store

**Files:**
- Create: `store/commitment.store.ts`
- Create: `__tests__/commitment.store.test.ts`

- [ ] **Step 1: Write the store**

Follow `store/category.store.ts` pattern exactly:
- `INITIAL_STATE` with `commitments`, `payments`, `selectedMonth`
- `createCommitmentStore(repo: ICommitmentRepository)` factory function
- All actions from spec Section 5
- `generatePayments()` — iterates active commitments, calls `computeDueDates`, filters against existing dates, batch inserts new payments
- `markAsPaid()` — calls repo atomic operation, reloads, calls `checkAndDeactivateExpired`
- `skipPayment()` — calls repo `markAsSkipped`, reloads
- `regeneratePayments(commitmentId)` — deletes unpaid, regenerates from scratch
- `checkAndDeactivateExpired()` — checks each commitment's duration rules
- Computed selectors (`getOverdue`, `getDueToday`, etc.) filter `state.payments`
- `getTotalMonthlyCommitted()` — sum fixed amounts + estimated variable, convert USD via currency store rate
- Export: `export const useCommitmentStore = createCommitmentStore(new CommitmentRepository());`

- [ ] **Step 2: Write store tests**

Follow `__tests__/category.store.test.ts` pattern:
- Mock `ICommitmentRepository`
- Test `loadCommitments` populates state
- Test `addCommitment` calls repo + reloads
- Test `markAsPaid` calls repo + reloads + calls checkAndDeactivateExpired
- Test `skipPayment` calls repo + reloads
- Test `setSelectedMonth` updates state + loads payments
- Test computed selectors filter correctly by status
- Test `generatePayments` calls computeDueDates + repo.insertPayments

- [ ] **Step 3: Run tests**

Run: `npx jest __tests__/commitment.store.test.ts --no-coverage`

- [ ] **Step 4: Commit**

```bash
git add store/commitment.store.ts __tests__/commitment.store.test.ts
git commit -m "feat(m3a): commitment Zustand store with generation, payment, and deactivation logic"
```

---

## Task 10: Routing & Tab setup

**Files:**
- Modify: `app/(app)/(tabs)/_layout.tsx` — replace `bills/index` tab with `commitments`
- Create: `app/(app)/(tabs)/commitments/_layout.tsx`
- Create: `app/(app)/(tabs)/commitments/index.tsx`
- Create: `app/(app)/(tabs)/commitments/add/index.tsx`
- Create: `app/(app)/(tabs)/commitments/[id]/index.tsx`
- Create: `app/(app)/(tabs)/commitments/[id]/edit/index.tsx`
- Modify: `components/empty_states/index.tsx` — add `commitments` variant

- [ ] **Step 1: Create commitments stack layout**

```typescript
// app/(app)/(tabs)/commitments/_layout.tsx
import { Stack } from 'expo-router';
import { Colors } from '@/constants/theme';

export default function CommitmentsLayout() {
  return (
    <Stack
      screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.dark.bg } }}
    />
  );
}
```

- [ ] **Step 2: Create route one-liners**

```typescript
// app/(app)/(tabs)/commitments/index.tsx
export { default } from '@/screens/commitments';

// app/(app)/(tabs)/commitments/add/index.tsx
export { default } from '@/screens/commitments/add_commitment';

// app/(app)/(tabs)/commitments/[id]/index.tsx
export { default } from '@/screens/commitments/detail';

// app/(app)/(tabs)/commitments/[id]/edit/index.tsx
export { default } from '@/screens/commitments/edit_commitment';
```

- [ ] **Step 3: Replace bills tab with commitments in `_layout.tsx`**

In `app/(app)/(tabs)/_layout.tsx`, replace the `bills/index` `Tabs.Screen` with:

```typescript
<Tabs.Screen
  name="commitments"
  options={{
    title: 'Commitments',
    tabBarIcon: ({ color }) => tabIcon('calendar-check', color),
  }}
/>
```

Remove or hide the old `bills/index` screen. Keep the bills directory with a placeholder so Expo Router doesn't break.

- [ ] **Step 4: Add `commitments` variant to EmptyState**

In `components/empty_states/index.tsx`, add to the `EmptyStateVariant` type and `VARIANT_CONFIG`:

```typescript
commitments: {
  icon: 'calendar-check-outline',
  title: Strings.commitmentsEmptyTitle,
  sub: Strings.commitmentsEmptySub,
},
```

- [ ] **Step 5: Commit**

```bash
git add app/(app)/(tabs)/commitments/ app/(app)/(tabs)/_layout.tsx components/empty_states/index.tsx
git commit -m "feat(m3a): commitments tab routing and navigation setup"
```

---

## Task 11: C1 — Commitments List Screen

**Files:**
- Create: `screens/commitments/index.tsx`
- Create: `screens/commitments/commitments.hook.ts`
- Create: `screens/commitments/commitments.state.ts`
- Create: `screens/commitments/commitments.anim.ts`
- Create: `screens/commitments/components/summary_header.tsx`
- Create: `screens/commitments/components/commitment_row.tsx`
- Create: `screens/commitments/components/month_navigator.tsx`
- Create: `screens/commitments/components/empty_state.tsx`

- [ ] **Step 1: Create `commitments.state.ts`**

Zustand UI state store following existing pattern:

```typescript
import { create } from 'zustand';

interface CommitmentsScreenStateShape {
  refreshing: boolean;
}

interface CommitmentsScreenState {
  state: CommitmentsScreenStateShape;
  setRefreshing: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: CommitmentsScreenStateShape = {
  refreshing: false,
};

export const useCommitmentsScreenState = create<CommitmentsScreenState>((set) => ({
  state: INITIAL_STATE,
  setRefreshing: (v) => set((s) => ({ state: { ...s.state, refreshing: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 2: Create `commitments.anim.ts`**

Reanimated entrance animations for rows (follow existing patterns from transactions.anim.ts or dashboard.anim.ts).

- [ ] **Step 3: Create `commitments.hook.ts`**

Hook subscribes to `useCommitmentStore` and `useCategoryStore`, groups payments into sections (overdue/dueToday/upcoming/paid/skipped), provides month navigation, refresh handler, and computed summary values.

Returns:
```typescript
{
  state: {
    sections: SectionListData[],
    selectedMonth: string,
    paidCount: number,
    totalCount: number,
    totalCommitted: number,
    refreshing: boolean,
    isEmpty: boolean,
    categoriesById: Map<string, Category>,
    commitmentsById: Map<string, Commitment>,
  },
  navigateMonth: (direction: 'prev' | 'next') => void,
  onRefresh: () => Promise<void>,
  goToDetail: (paymentId: string, commitmentId: string) => void,
  goToAdd: () => void,
}
```

- [ ] **Step 4: Create components**

Build each component:
- `month_navigator.tsx` — left/right arrows + month label ("May 2026"), calls `navigateMonth`
- `summary_header.tsx` — paid count, total committed, progress bar. Uses theme tokens.
- `commitment_row.tsx` — category icon, name, due date, amount (~ prefix if variable), currency, status badge with colored background
- `empty_state.tsx` — wrapper around shared EmptyState with `commitments` variant + onAction callback

- [ ] **Step 5: Create `screens/commitments/index.tsx`**

SectionList with:
- `month_navigator` above list
- `summary_header` as ListHeaderComponent
- Sections from hook (overdue, dueToday, upcoming, paid, skipped)
- Section headers with colored labels
- `commitment_row` as renderItem
- FAB button (gold gradient, bottom-right, ms(56), navigates to add)
- RefreshControl
- Empty state when no commitments

- [ ] **Step 6: Test in browser / device**

Start dev server (`npx expo start`), navigate to Commitments tab, verify:
- Empty state shows correctly
- Tab icon and label are correct
- Navigation to add screen works (will 404 until C2 is built — that's ok)

- [ ] **Step 7: Commit**

```bash
git add screens/commitments/
git commit -m "feat(m3a): C1 commitments list screen with month navigation and section grouping"
```

---

## Task 12: C2 — Add Commitment Screen

**Files:**
- Create: `screens/commitments/add_commitment/index.tsx`
- Create: `screens/commitments/add_commitment/add_commitment.hook.ts`
- Create: `screens/commitments/add_commitment/add_commitment.store.ts`
- Create: `screens/commitments/components/commitment_form_body.tsx`
- Create: `screens/commitments/components/recurrence_picker.tsx`
- Create: `screens/commitments/components/duration_picker.tsx`

- [ ] **Step 1: Create `add_commitment.store.ts`**

Screen-scoped Zustand store for form draft state (selected recurrence preset, custom values):

```typescript
import { create } from 'zustand';
import { AmountType, DurationType } from '@/constants/enums';

type RecurrencePreset = 'monthly' | 'weekly' | 'annually' | 'custom';

interface AddCommitmentStoreShape {
  amountType: AmountType;
  recurrencePreset: RecurrencePreset;
  durationType: DurationType;
}

interface AddCommitmentStore {
  state: AddCommitmentStoreShape;
  setAmountType: (v: AmountType) => void;
  setRecurrencePreset: (v: RecurrencePreset) => void;
  setDurationType: (v: DurationType) => void;
  reset: () => void;
}

const INITIAL_STATE: AddCommitmentStoreShape = {
  amountType: AmountType.Fixed,
  recurrencePreset: 'monthly',
  durationType: DurationType.Forever,
};

export const useAddCommitmentStore = create<AddCommitmentStore>((set) => ({
  state: INITIAL_STATE,
  setAmountType: (v) => set((s) => ({ state: { ...s.state, amountType: v } })),
  setRecurrencePreset: (v) => set((s) => ({ state: { ...s.state, recurrencePreset: v } })),
  setDurationType: (v) => set((s) => ({ state: { ...s.state, durationType: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 2: Create `add_commitment.hook.ts`**

RHF + Zod form hook. Follow `add_transaction.hook.ts` pattern:
- Zod schema validates: name (required, max 50), amount (required if fixed, optional if variable, must be > 0), currency, categoryId (required), recurrence_every (1-365), recurrence_period, startDate (required), accountId (optional), durationType, endDate/endAfterCount (conditional)
- `useZodForm` with the schema
- `onValid` handler: builds `NewCommitmentInput`, calls `addCommitment`, generates payments, navigates back
- Reuses existing `CategoryPickerSheet` and `AccountPickerSheet`
- Returns form, handlers, picker visibility state

- [ ] **Step 3: Create shared `commitment_form_body.tsx`**

Reusable form body component (used by both C2 and C3). Props:
- All form fields + handlers
- `locked` flag (false for add, some fields locked for edit)
- `title` string
- `saving` boolean
- `onClose` and `handleSave` callbacks

Layout: ScrollView with fields in order: Name → Amount Type toggle → Amount + Currency → Category picker → Recurrence picker → Start Date → Default Account → Duration picker → Notes → Save CTA

- [ ] **Step 4: Create `recurrence_picker.tsx`**

Preset chips (Monthly, Weekly, Annually, Custom) + conditional "Every N [period]" row when Custom is selected. Period dropdown uses the 4 `RecurrencePeriod` values.

- [ ] **Step 5: Create `duration_picker.tsx`**

Type chips (Forever, After N payments, Until date) + conditional fields:
- AfterCount: numeric input for count
- UntilDate: date picker

- [ ] **Step 6: Create `screens/commitments/add_commitment/index.tsx`**

Wire hook + form body + pickers. Follow existing screen index pattern (no useState/useSharedValue).

- [ ] **Step 7: Test in browser / device**

Navigate to add screen, fill form, save. Verify:
- Validation errors show inline
- Category and account pickers work
- Recurrence presets map correctly
- Duration picker conditional fields show/hide
- Save creates commitment and navigates back to C1
- New commitment appears in C1 list

- [ ] **Step 8: Commit**

```bash
git add screens/commitments/add_commitment/ screens/commitments/components/
git commit -m "feat(m3a): C2 add commitment screen with form validation and recurrence/duration pickers"
```

---

## Task 13: C4 — Commitment Detail Screen

**Files:**
- Create: `screens/commitments/detail/index.tsx`
- Create: `screens/commitments/detail/detail.hook.ts`
- Create: `screens/commitments/detail/detail.state.ts`
- Create: `screens/commitments/detail/detail.anim.ts`
- Create: `screens/commitments/detail/components/detail_hero.tsx`
- Create: `screens/commitments/detail/components/current_cycle_card.tsx`
- Create: `screens/commitments/detail/components/details_card.tsx`
- Create: `screens/commitments/detail/components/payment_history.tsx`
- Create: `screens/commitments/detail/components/payment_row.tsx`

- [ ] **Step 1: Create `detail.state.ts`**

UI state for loading, skip confirm visibility:

```typescript
import { create } from 'zustand';

interface DetailStateShape {
  skipConfirmVisible: boolean;
}

interface CommitmentDetailState {
  state: DetailStateShape;
  setSkipConfirmVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: DetailStateShape = {
  skipConfirmVisible: false,
};

export const useCommitmentDetailState = create<CommitmentDetailState>((set) => ({
  state: INITIAL_STATE,
  setSkipConfirmVisible: (v) => set((s) => ({ state: { ...s.state, skipConfirmVisible: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 2: Create `detail.hook.ts`**

Follow `screens/transactions/detail/detail.hook.ts` pattern:
- Load commitment by ID + all payments for that commitment
- Compute `currentPayment` — the most relevant payment (first overdue or due or upcoming)
- Compute `viewState`: loading | notFound | ready
- Lookup category, account by ID from stores
- Derive display strings (recurrence label, duration label, etc.)
- Handlers: `openPaySheet`, `skipPayment`, `goToEdit`
- Return `{ state, openPaySheet, skipPayment, goToEdit }`

- [ ] **Step 3: Create `detail.anim.ts`**

Hero entrance animation (fade + slide from Reanimated).

- [ ] **Step 4: Create detail components**

- `detail_hero.tsx` — category icon (56×56), commitment name, category label, amount (~ prefix if variable), recurrence subtitle
- `current_cycle_card.tsx` — due date, status badge, colored left border, "Mark as Paid" CTA + "Skip" button. Both disabled if already paid/skipped.
- `details_card.tsx` — read-only rows: recurrence, start date, default account, duration, currency
- `payment_history.tsx` — FlatList of payment_row items
- `payment_row.tsx` — status dot (colored), month label, payment details, amount

- [ ] **Step 5: Create `screens/commitments/detail/index.tsx`**

ScrollView layout with: header (back + edit) → hero → current cycle card → details card → payment history → notes card (conditional)

- [ ] **Step 6: Test in browser / device**

Tap a commitment row in C1 → detail screen. Verify:
- Hero shows correct info
- Current cycle card shows correct status
- Payment history lists past records
- Skip button marks as skipped and refreshes
- Edit button navigates (will 404 until C3)

- [ ] **Step 7: Commit**

```bash
git add screens/commitments/detail/
git commit -m "feat(m3a): C4 commitment detail screen with hero, current cycle, and payment history"
```

---

## Task 14: C5 — Pay Commitment (ActionSheet)

**Files:**
- Create: `screens/commitments/detail/components/pay_sheet.tsx`
- Create: `screens/commitments/detail/components/pay_sheet.state.ts`
- Create: `screens/commitments/detail/components/pay_sheet.hook.ts`

- [ ] **Step 1: Create `pay_sheet.state.ts`**

```typescript
import { create } from 'zustand';

interface PaySheetStateShape {
  visible: boolean;
  saving: boolean;
}

interface PaySheetState {
  state: PaySheetStateShape;
  setVisible: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: PaySheetStateShape = {
  visible: false,
  saving: false,
};

export const usePaySheetState = create<PaySheetState>((set) => ({
  state: INITIAL_STATE,
  setVisible: (v) => set((s) => ({ state: { ...s.state, visible: v } })),
  setSaving: (v) => set((s) => ({ state: { ...s.state, saving: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 2: Create `pay_sheet.hook.ts`**

- Accepts `commitment: Commitment`, `payment: CommitmentPayment`
- RHF + Zod for: amount (required, > 0), accountId (required), date, notes, exchangeRate
- Pre-fill logic: amount from commitment (if fixed), account from template default → last paid → primary, date = today
- Computes `requiresRate` = commitment.currency ≠ selectedAccount.currency
- `onValid`: builds `PaymentDetails`, calls `markAsPaid`, reloads accounts, closes sheet
- Reuses `AccountPickerSheet` and `ExchangeRateRow` from transactions
- Returns: `{ form, state (saving, requiresRate, selectedAccount, accounts), handlers }`

- [ ] **Step 3: Create `pay_sheet.tsx`**

ActionSheet with:
- Header: commitment name, due date, type info
- Amount field (pre-filled for fixed, empty for variable) + currency chip
- Account picker (always visible, shows balance)
- Exchange rate row (conditional on currency mismatch)
- Converted total display (when rate row visible)
- Date picker
- Notes
- Confirm Payment CTA (gold gradient)
- Guards: disabled if already paid, validation blocks confirm

Follow existing ActionSheet pattern from `category_picker_sheet.tsx` — useRef to ActionSheetRef, show/hide via useEffect.

- [ ] **Step 4: Integrate pay sheet into C4 detail**

In `detail.hook.ts`, add `openPaySheet` handler that sets `usePaySheetState.setVisible(true)`. In `detail/index.tsx`, render `PaySheet` component at the bottom.

- [ ] **Step 5: Test in browser / device**

From C4, tap "Mark as Paid" → pay sheet opens. Verify:
- Amount pre-filled for fixed, empty for variable
- Account picker works, shows balances
- Changing to different-currency account shows exchange rate row
- Confirm creates transaction + updates balance
- Transaction appears in Transactions tab
- C1 list updates (payment moves to Paid section)

- [ ] **Step 6: Commit**

```bash
git add screens/commitments/detail/components/pay_sheet.tsx screens/commitments/detail/components/pay_sheet.state.ts screens/commitments/detail/components/pay_sheet.hook.ts screens/commitments/detail/detail.hook.ts screens/commitments/detail/index.tsx
git commit -m "feat(m3a): C5 pay commitment ActionSheet with currency-aware exchange rate handling"
```

---

## Task 15: C3 — Edit Commitment Screen

**Files:**
- Create: `screens/commitments/edit_commitment/index.tsx`
- Create: `screens/commitments/edit_commitment/edit_commitment.hook.ts`
- Create: `screens/commitments/edit_commitment/edit_commitment.store.ts`
- Create: `screens/commitments/edit_commitment/components/deactivate_dialog.tsx`

- [ ] **Step 1: Create `edit_commitment.store.ts`**

Same shape as `add_commitment.store.ts` but initialized from existing commitment values.

- [ ] **Step 2: Create `edit_commitment.hook.ts`**

Similar to add hook but:
- Loads existing commitment by ID (from route params)
- Pre-fills RHF form with existing values
- `onValid`: calls `updateCommitment` which triggers `regeneratePayments`, then navigates back to C4
- `handleDeactivate`: shows confirmation, calls `deactivateCommitment`, navigates back to C1

- [ ] **Step 3: Create `deactivate_dialog.tsx`**

Follow `delete_confirm_dialog.tsx` from transactions. Modal with title, body, cancel + deactivate buttons (red destructive style).

- [ ] **Step 4: Create `screens/commitments/edit_commitment/index.tsx`**

Reuses `commitment_form_body.tsx` with pre-filled values + deactivate button at bottom.

- [ ] **Step 5: Test in browser / device**

From C4, tap Edit → edit screen. Verify:
- All fields pre-filled correctly
- Editing and saving works, future payments regenerated
- Deactivate shows confirmation, removes from list
- Past payments preserved in history

- [ ] **Step 6: Commit**

```bash
git add screens/commitments/edit_commitment/
git commit -m "feat(m3a): C3 edit commitment screen with deactivation and payment regeneration"
```

---

## Task 16: App launch hook & dashboard integration

**Files:**
- Modify: `utils/use_layout_init.hook.ts`
- Create: `screens/dashboard/components/commitments_card.tsx`
- Modify: `screens/dashboard/index.tsx`
- Modify: `screens/dashboard/dashboard.hook.ts`

- [ ] **Step 1: Update app launch hook**

In `utils/use_layout_init.hook.ts`, after existing init calls, add:

```typescript
import { useCommitmentStore } from '@/store/commitment.store';

// Inside the async IIFE, after existing init:
const commitmentStore = useCommitmentStore.getState();
await commitmentStore.generatePayments();
await commitmentStore.checkAndDeactivateExpired();
await commitmentStore.loadCommitments();
const now = new Date();
const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
await commitmentStore.loadPaymentsForMonth(currentMonth);
```

- [ ] **Step 2: Create `commitments_card.tsx`**

Dashboard card component:
- Title: "Commitments" + current month
- "X of Y paid" text
- Progress bar (paid / total)
- Total committed in base currency
- Overdue badge (red, hidden if 0)
- Pressable: tap navigates to commitments tab

Follow existing dashboard card styling patterns (Colors.dark.surface, Radius.md, Spacing).

- [ ] **Step 3: Integrate into dashboard**

In `dashboard.hook.ts`:
- Subscribe to `useCommitmentStore` for paidCount, unpaidCount, totalCommitted, overdue count
- Add `goToCommitments` navigation handler

In `dashboard/index.tsx`:
- Render `CommitmentsCard` after the stat cards section
- Pass data from hook

- [ ] **Step 4: Test in browser / device**

Restart app, verify:
- App launches without errors
- Payments generated on startup
- Dashboard shows commitments card with correct data
- Tapping card navigates to commitments tab
- Overdue badge appears when overdue items exist

- [ ] **Step 5: Commit**

```bash
git add utils/use_layout_init.hook.ts screens/dashboard/components/commitments_card.tsx screens/dashboard/index.tsx screens/dashboard/dashboard.hook.ts
git commit -m "feat(m3a): app launch hook + dashboard commitments card"
```

---

## Task 17: Full integration test & polish

- [ ] **Step 1: Run full test suite**

Run: `npm run test:coverage`
Verify all tests pass and coverage thresholds are met.

- [ ] **Step 2: Smoke test all flows**

Test in the app:
1. Add a fixed monthly commitment (Rent, 5000 EGP, monthly, forever)
2. Add a variable weekly commitment (Groceries, ~500 EGP, weekly, after 12 payments)
3. Add a USD commitment (Netflix, fixed $15, monthly, forever)
4. Navigate months forward/backward on C1
5. Pay the EGP commitment from C4 → verify transaction in Transactions tab
6. Pay the USD commitment from an EGP account → verify exchange rate row appears, snapshot recorded
7. Skip a payment → verify it moves to Skipped section
8. Edit a commitment (change recurrence) → verify future payments regenerated
9. Deactivate a commitment → verify it disappears but history preserved
10. Verify overdue detection: create a commitment with past start_date, verify overdue badge
11. Verify dashboard card shows correct counts
12. Force-close and reopen → verify idempotent generation (no duplicates)

- [ ] **Step 3: Fix any issues found**

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat(m3a): integration polish and fixes"
```

---

## Done-When Checklist

Cross-reference with spec Section 13:

- [ ] `commitments` table created (migration 006)
- [ ] `commitment_payments` table created (migration 007)
- [ ] `transactions` table altered with `commitment_payment_id` (migration 008)
- [ ] Entities and enums added
- [ ] Repository implements full interface
- [ ] commitmentStore implements full interface
- [ ] `compute_due_dates` utility with all period types
- [ ] C1: month-navigable list with 4 sections + summary header
- [ ] C2: add commitment form with recurrence presets + custom + duration picker
- [ ] C4: detail with hero, current cycle card, payment history
- [ ] C5: pay ActionSheet with currency-aware exchange rate handling
- [ ] C3: edit form with shared form body, regenerates future payments
- [ ] Paying a commitment creates a transaction visible in Transactions screen
- [ ] Account picker in Pay sheet is always editable
- [ ] Exchange rate row shows only on currency mismatch, supports override
- [ ] Time-boxed commitments auto-deactivate when end condition met
- [ ] Variable commitments show ~ prefix throughout
- [ ] Payment generation is idempotent, up to 64 per commitment
- [ ] markAsPaid is atomic (single SQLite transaction)
- [ ] Overdue detection bubbles across month boundaries
- [ ] Skip is manual user action, clears overdue without transaction
- [ ] Dashboard commitments summary card added
- [ ] Soft delete preserves all history
- [ ] App launch hook initializes commitment state
