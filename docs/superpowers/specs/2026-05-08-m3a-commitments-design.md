# M3A: Commitments — Design Spec

Module: M3A — Commitments
Date: 2026-05-08
Depends on: M2 (Daily Transactions)
Unlocks: M3B (Budget)

A recurring financial obligations tracker. A Commitment is a template that generates payment instances on a schedule. When paid, it creates a transaction and updates account balance. Template → Instance → Transaction.

---

## Key Decisions

| Decision | Outcome |
|---|---|
| Recurrence model | `{ every: N, period: days/weeks/months/years }` with quick presets |
| Schedule anchor | `start_date` (ISO date) replaces `due_day` |
| Duration types | Forever (manual close), After N payments (auto-deactivate), Until date (auto-deactivate) |
| Payment account | Nullable on template (suggestion only), required at payment time |
| Payment generation | Up to 64 records per commitment, idempotent |
| Overdue behavior | Accumulates, no auto-resolution, bubbles into current/future month views |
| Skip | Manual user action only, clears overdue status without creating transaction |
| Edit behavior | Preserves paid/skipped history, regenerates unpaid future payments |
| C1 list | Month-navigable, 4 status sections + summary header |
| C5 Pay | ActionSheet (quick form from C4) |
| C3 Edit | Full route-based screen |
| C2 Add | Full route-based screen |
| Category seeding | None — users create their own |
| Architecture | Thin repository, thick store (matches existing pattern) |
| Currency conversion | Only when commitment currency ≠ account currency |
| Rate override | Yes, reuse existing `exchange_rate_row` pattern |

---

## 1. Database Schema

Three separate migrations, one per DDL change.

### Migration 006 — `commitments` table

```sql
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
```

### Migration 007 — `commitment_payments` table

```sql
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

CREATE INDEX idx_cp_commitment_id ON commitment_payments(commitment_id);
CREATE INDEX idx_cp_due_date ON commitment_payments(due_date);
CREATE INDEX idx_cp_status ON commitment_payments(status);
```

### Migration 008 — Alter `transactions` table

```sql
ALTER TABLE transactions ADD COLUMN commitment_payment_id TEXT;
```

---

## 2. Entities

### `database/entities/commitment.entity.ts`

```typescript
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

### `database/entities/commitment_payment.entity.ts`

```typescript
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

### New enums in `constants/enums.ts`

```typescript
enum AmountType {
  Fixed = 'fixed',
  Variable = 'variable',
}

enum RecurrencePeriod {
  Days = 'days',
  Weeks = 'weeks',
  Months = 'months',
  Years = 'years',
}

enum DurationType {
  Forever = 'forever',
  AfterCount = 'after_count',
  UntilDate = 'until_date',
}

enum CommitmentPaymentStatus {
  Upcoming = 'upcoming',
  Due = 'due',
  Overdue = 'overdue',
  Paid = 'paid',
  Skipped = 'skipped',
}
```

---

## 3. Database Query Files

### `database/commitments.ts`

- `getCommitments(db)` — all active commitments (`is_active = 1`)
- `getCommitmentById(db, id)` — single commitment
- `addCommitment(db, data)` — INSERT, generates id/timestamps
- `updateCommitment(db, id, data)` — UPDATE partial fields
- `deactivateCommitment(db, id)` — sets `is_active = 0`

### `database/commitment_payments.ts`

- `getPaymentsByMonth(db, yearMonth)` — payments where `due_date` falls in YYYY-MM, plus any unpaid payments from previous months whose `due_date < month_start` AND `status NOT IN ('paid', 'skipped')` (overdue bubble-up: these appear in every month view until resolved)
- `getPaymentsByCommitment(db, commitmentId)` — full history for C4 detail
- `getPaymentById(db, id)` — single payment
- `addPayments(db, payments[])` — batch INSERT for generation
- `updatePaymentStatus(db, id, status, fields?)` — generic status update (pay, skip, overdue)
- `deleteUnpaidPaymentsByCommitment(db, commitmentId)` — removes upcoming/due payments for regeneration on edit
- `getLastPaidPayment(db, commitmentId)` — for account pre-fill (last used account)
- `getPaidCountByCommitment(db, commitmentId)` — for after_count auto-deactivation
- `getExistingDueDates(db, commitmentId)` — for idempotent generation
- `markCommitmentAsPaid(db, paymentId, details)` — atomic SQLite transaction:
  1. Update `commitment_payments` → status = paid, paid_date, amount_paid, account_id, exchange_rate_snapshot
  2. INSERT into `transactions` → type = expense, category from commitment, commitment_payment_id set
  3. UPDATE `accounts` → deduct balance (converted amount if currency mismatch)
  4. UPDATE `commitment_payments` → set transaction_id

---

## 4. Repository

### `repositories/commitment.repository.ts`

```typescript
interface ICommitmentRepository {
  getAll(): Promise<Commitment[]>;
  getById(id: string): Promise<Commitment | undefined>;
  add(data: NewCommitmentInput): Promise<void>;
  update(id: string, data: UpdateCommitmentInput): Promise<void>;
  deactivate(id: string): Promise<void>;

  getPaymentsForMonth(yearMonth: string): Promise<CommitmentPayment[]>;
  getPaymentsByCommitment(commitmentId: string): Promise<CommitmentPayment[]>;
  getPaymentById(id: string): Promise<CommitmentPayment | undefined>;
  getLastPaidPayment(commitmentId: string): Promise<CommitmentPayment | undefined>;
  getPaidCount(commitmentId: string): Promise<number>;
  getExistingDueDates(commitmentId: string): Promise<string[]>;

  insertPayments(payments: CommitmentPayment[]): Promise<void>;
  deleteUnpaidPayments(commitmentId: string): Promise<void>;

  markAsPaid(paymentId: string, details: PaymentDetails): Promise<void>;
  markAsSkipped(paymentId: string): Promise<void>;
}
```

**Input types:**
- `NewCommitmentInput` — Omit<Commitment, 'id' | 'created_at' | 'updated_at' | 'is_active'>
- `UpdateCommitmentInput` — Pick<Commitment, 'name' | 'amount_type' | 'amount' | 'currency' | 'category_id' | 'recurrence_every' | 'recurrence_period' | 'start_date' | 'account_id' | 'notes' | 'duration_type' | 'end_date' | 'end_after_count'>
- `PaymentDetails` — { amount_paid: number, account_id: string, paid_date: string, exchange_rate_snapshot?: number, notes?: string }

Thin wrapper — each method calls the corresponding database query function with `getDb()`. No business logic.

---

## 5. Zustand Store

### `store/commitment.store.ts`

```typescript
interface CommitmentStoreState {
  commitments: Commitment[];
  payments: CommitmentPayment[];
  selectedMonth: string; // 'YYYY-MM'
}

interface CommitmentStore {
  state: CommitmentStoreState;

  loadCommitments(): Promise<void>;
  loadPaymentsForMonth(yearMonth: string): Promise<void>;
  setSelectedMonth(yearMonth: string): Promise<void>;

  addCommitment(data: NewCommitmentInput): Promise<void>;
  updateCommitment(id: string, data: UpdateCommitmentInput): Promise<void>;
  deactivateCommitment(id: string): Promise<void>;

  markAsPaid(paymentId: string, details: PaymentDetails): Promise<void>;
  skipPayment(paymentId: string): Promise<void>;

  generatePayments(): Promise<void>;
  regeneratePayments(commitmentId: string): Promise<void>;
  checkAndDeactivateExpired(): Promise<void>;

  getOverdue(): CommitmentPayment[];
  getDueToday(): CommitmentPayment[];
  getUpcoming(): CommitmentPayment[];
  getPaid(): CommitmentPayment[];
  getSkipped(): CommitmentPayment[];
  getPaidCount(): number;
  getTotalCount(): number;
  getTotalMonthlyCommitted(): number;

  reset(): void;
}
```

**Key behaviors:**
- `state` wraps all reactive values; setters spread previous state
- `markAsPaid` calls repository atomic operation → reloads → calls `checkAndDeactivateExpired`
- `generatePayments` iterates active commitments, computes due dates from `start_date` + recurrence, checks existing dates for idempotency, inserts up to 64 per commitment
- `updateCommitment` calls repository update → `regeneratePayments(id)` (deletes unpaid, regenerates) → reloads
- `setSelectedMonth` updates `state.selectedMonth` and triggers `loadPaymentsForMonth`
- `getOverdue` includes payments from previous months (bubble-up)
- `getTotalMonthlyCommitted` converts USD amounts using currency store rate
- Date math lives in `utils/compute_due_dates.ts` as a pure function

---

## 6. Screens

### C1 — Commitments List

Month-navigable list with summary header and 4 status sections.

**Layout:**
- Month navigator: left/right arrows + month label, default = current month
- Summary header card: paid count (X of Y), total committed in base currency, progress bar
- SectionList with sections: Overdue → Due Today → Upcoming → Paid → Skipped (if any)
- Overdue items from past months bubble up into current/future month views
- Each row: category icon (40×40), name, due date, amount (~ prefix if variable), currency, status badge
- FAB: gold gradient, bottom-right, navigates to C2
- Empty state: icon + "No commitments yet" + subtitle + CTA

**Files:**
```
screens/commitments/
  index.tsx
  commitments.hook.ts
  commitments.state.ts
  commitments.anim.ts
  components/
    summary_header.tsx
    commitment_row.tsx
    month_navigator.tsx
    empty_state.tsx
```

### C2 — Add Commitment

Full-screen form with recurrence presets and duration picker.

**Fields:**
- Name (required, max 50 chars)
- Amount type: Fixed | Variable toggle
- Amount (required if fixed, optional/estimated if variable)
- Currency: EGP | USD
- Category: grouped picker (reuses existing category_picker_sheet)
- Recurrence: preset chips (Monthly, Weekly, Annually, Custom) + custom "Every N [period]" row
- Start date: date picker (required)
- Default account: optional (reuses existing account_picker_sheet)
- Duration: chips (Forever, After N payments, Until date) + conditional fields
- Notes (optional, max 200 chars)

**Presets map to custom model:**
- Monthly → { every: 1, period: 'months' }
- Weekly → { every: 1, period: 'weeks' }
- Annually → { every: 1, period: 'years' }
- Custom → user picks N + period

**On save:** create commitment → generate payments → navigate back to C1.

**Validation:** RHF + Zod. `end_date` and `end_after_count` mutually exclusive (enforced by duration_type).

**Files:**
```
screens/commitments/add_commitment/
  index.tsx
  add_commitment.hook.ts
  add_commitment.store.ts
  components/
    recurrence_picker.tsx
    duration_picker.tsx
```

### C4 — Commitment Detail

Template info, current status CTA, and payment history.

**Layout:**
- Header: back button + Edit button (navigates to C3)
- Hero: category icon (56×56), commitment name, category label, amount, amount type + recurrence subtitle
- Current cycle card: due date, status badge, colored left border. "Mark as Paid" gold CTA (opens C5 ActionSheet) + "Skip" secondary button. Both disabled if already paid/skipped this cycle.
- Details card: read-only rows for recurrence (human-readable), start date, default account, duration, currency
- Payment history: chronological list of all past commitment_payment records. Status dot (green = paid, gray = skipped, red = overdue), month label, payment details, amount.
- Notes card: shown only if notes exist

**Files:**
```
screens/commitments/detail/
  index.tsx
  detail.hook.ts
  detail.state.ts
  detail.anim.ts
  components/
    detail_hero.tsx
    current_cycle_card.tsx
    details_card.tsx
    payment_history.tsx
    payment_row.tsx
    pay_sheet.tsx
    pay_sheet.state.ts
    pay_sheet.hook.ts
```

### C5 — Pay Commitment (ActionSheet)

Opened from C4's "Mark as Paid" CTA.

**Fields:**
- Amount: pre-filled for fixed (editable), empty for variable (required). Currency chip displayed (not editable).
- Account picker: always visible, always editable. Pre-fill order: template default → last paid account for this commitment → primary account. Shows account balance.
- Exchange rate row: only shown when commitment currency ≠ account currency. Default rate from currency store. User can toggle override and enter custom rate.
- Converted total: shown when exchange rate row is visible. "50 USD × 50.25 = 2,512.50 EGP will be deducted."
- Payment date: defaults to today, editable
- Notes: optional

**Currency behavior:**
- commitment currency = account currency → no exchange rate row, no snapshot
- commitment currency ≠ account currency → exchange rate row visible, snapshot recorded
- Changing account dynamically shows/hides exchange rate row based on currency match
- Rate override toggle reuses existing `exchange_rate_row.tsx` pattern

**On confirm (atomic SQLite transaction):**
1. Update `commitment_payments` → status = paid, paid_date, amount_paid, account_id, exchange_rate_snapshot
2. INSERT into `transactions` → commitment_payment_id set
3. UPDATE `accounts` → deduct balance (converted if currency mismatch)
4. UPDATE `commitment_payments` → set transaction_id
5. Run `checkAndDeactivateExpired()`
6. Reload commitments + payments

**Guards:**
- Cannot pay if already paid this cycle (CTA disabled)
- Amount required
- Account required

### C3 — Edit Commitment

Full-screen form, same layout as C2 with pre-filled fields.

**Differences from C2:**
- Pre-filled with existing commitment values
- Header: "Edit Commitment"
- Deactivate button at bottom (red, destructive) with confirmation dialog → sets `is_active = 0`
- On save: update commitment → delete unpaid future payments → regenerate with new schedule → navigate back to C4

**Shared form body:** `commitment_form_body.tsx` extracted and used by both C2 and C3 (same pattern as `transaction_form_body.tsx`).

**Files:**
```
screens/commitments/edit_commitment/
  index.tsx
  edit_commitment.hook.ts
  edit_commitment.store.ts
  components/
    deactivate_dialog.tsx

screens/commitments/components/
  commitment_form_body.tsx    -- shared between C2 and C3
```

---

## 7. App Launch Hook

Added to `utils/use_layout_init.hook.ts` after existing init:

```
Existing:
  1. runMigrations(db)
  2. loadOnboardingState()
  3. loadAccounts()
  4. loadCategories()
  5. loadRate()

New:
  6. generatePayments()
  7. checkAndDeactivateExpired()
  8. loadCommitments()
  9. loadPaymentsForMonth(currentYearMonth)
```

---

## 8. Navigation / Routing

```
app/(tabs)/commitments/
  _layout.tsx          — stack navigator
  index.tsx            — → screens/commitments (C1)
  add/index.tsx        — → screens/commitments/add_commitment (C2)
  [id]/index.tsx       — → screens/commitments/detail (C4)
  [id]/edit/index.tsx  — → screens/commitments/edit_commitment (C3)
```

C5 (Pay) has no route — ActionSheet opened from C4.

---

## 9. Dashboard Integration

New `commitments_card.tsx` component in `screens/dashboard/components/`.

**Shows:**
- "Commitments" title + current month label
- Paid count: "X of Y paid"
- Progress bar: paid / total ratio
- Total committed in base currency
- Overdue badge: red chip with count (hidden if 0)
- Tap → navigates to Commitments tab (C1)

---

## 10. Utility: Date Computation

### `utils/compute_due_dates.ts`

Pure function: takes `start_date`, `{ every, period }`, and `max_count` (default 64). Returns array of ISO date strings.

Handles:
- Days: add N days iteratively
- Weeks: add N * 7 days iteratively
- Months: add N months, clamp to end of month (e.g., Jan 31 + 1 month = Feb 28)
- Years: add N years, handle Feb 29 → Feb 28 on non-leap years

Also respects `duration_type`:
- Forever: generate up to max_count
- AfterCount: generate min(end_after_count, max_count)
- UntilDate: generate up to max_count but stop at end_date

---

## 11. Business Rules

| Rule | Detail |
|---|---|
| BR-1 | Every paid commitment generates exactly one transaction |
| BR-2 | Deactivating a commitment is soft delete — history preserved |
| BR-3 | Variable commitment amounts show ~ prefix in all views |
| BR-4 | A commitment_payment cannot be marked paid twice |
| BR-5 | Editing a commitment preserves paid/skipped history, regenerates unpaid future payments |
| BR-6 | Payment generation is idempotent (run N times = same result) |
| BR-7 | Total monthly committed = sum of fixed + estimated variable, converted to base currency |
| BR-8 | Commitment transactions have commitment_payment_id set |
| BR-9 | Template account is a suggestion only — nullable |
| BR-10 | Payment account selected at payment time, recorded on commitment_payment |
| BR-11 | Pay modal pre-fills account: template default → last used → primary account |
| BR-12 | Duration types are mutually exclusive (forever, after_count, until_date) |
| BR-13 | System auto-deactivates when end_date reached or end_after_count payments made |
| BR-14 | Time-boxed commitments have no balance tracking — not installment plans |
| BR-15 | Exchange rate snapshot recorded only when commitment currency ≠ account currency |
| BR-16 | Dashboard total converts all currencies to base currency using current rate |
| BR-17 | Overdue payments bubble up into current and future month views |
| BR-18 | Skip is a manual user action only — no auto-skip |
| BR-19 | Up to 64 payment records generated per commitment |
| BR-20 | Forever commitments are closed manually by the user |

---

## 12. Out of Scope for M3A

| Feature | Where |
|---|---|
| Installment plans | M5 |
| BNPL / CC installments | M5 |
| Debt / loan repayments | M5 |
| Budget allocation | M3B |
| Push notifications | M4 |
| Commitment analytics | M6 |
| Partial payments | Deferred |
| Auto-suggest recurring transactions | M6 |

---

## 13. Done When

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
