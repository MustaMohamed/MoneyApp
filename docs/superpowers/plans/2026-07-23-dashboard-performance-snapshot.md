# Dashboard Performance Snapshot Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the Dashboard’s independent loaders with one bounded, request-owned SQLite snapshot that publishes atomically, preserves warm content through refreshes, and virtualizes large account groups.

**Architecture:** Add a Dashboard-owned read projection with two bounded aggregate queries, one repository orchestration boundary, and one generation-owned Zustand store. Keep currency and screen-only state external, derive all card view models from one snapshot reference, and map snapshot status to UI through a pure presentation function. Preserve the current HeroUI Native screen composition and use core `FlatList` only as list infrastructure for groups with at least eight accounts.

**Tech Stack:** Expo SDK 55 bare workflow via `expo-dev-client`, React Native 0.83/Fabric, TypeScript strict, expo-sqlite, Zustand 5, HeroUI Native 1.0.3, Uniwind/Tailwind v4, Jest with better-sqlite3 logic tests, oxlint, oxfmt.

---

## Scope and dependency gates

- The approved spec is `docs/superpowers/specs/2026-07-23-dashboard-performance-snapshot-design.md`.
- PR 1 is merged into `origin/main` at `8074711`. The implementation executor must update this feature branch onto that merged baseline before production edits; this plan-writing turn must not rebase. All tasks assume the merged cancellable/error-safe `runAfterInteractions(callback, options?)` contract and PR 1 startup/currency ownership behavior.
- Do not edit `src/utils/run_after_interactions.ts`; PR 1 owns it.
- Do not add dependencies, native changes, migrations, indexes, app routes, shared caches, Signals, TanStack Query, or mutation-store changes.
- Do not edit Budget/Commitment workload code owned by audit PR 3.
- Do not add `.tsx` render tests. Delete the obsolete Dashboard render test after its state assertions move into pure `.ts` presentation tests.
- Do not push or merge. Finish with green local CI parity, performance evidence, and the user-owned physical-device QA gate.

## Exact file map

### Create

- `src/modules/dashboard/database/dashboard_snapshot.ts`: month-window calculation plus the one transaction-history aggregate query and one current-month budget-limit query.
- `src/modules/dashboard/repositories/dashboard.repository.ts`: single-DB, at-most-five-read snapshot coordinator and snapshot contracts.
- `src/modules/dashboard/screens/dashboard/dashboard.presentation.ts`: pure snapshot-status-to-UI mapping.
- `src/modules/dashboard/screens/dashboard/components/dashboard_load_error.tsx`: HeroUI Native `Alert` plus the existing project `Button` retry composition.
- `__tests__/dashboard_snapshot.query.test.ts`: real-SQL financial parity, month boundaries, empty data, budget bounds, and query-plan coverage.
- `__tests__/dashboard.repository.test.ts`: one-DB ownership, complete-or-error assembly, captured clock, read count, and empty-account behavior.
- `__tests__/screens/dashboard/dashboard_presentation.test.ts`: cold/warm/error/zero-account presentation matrix.
- `__tests__/screens/dashboard/account_carousel.helpers.test.ts`: virtualization threshold, discriminated items, keys, and geometry.

### Modify

- `src/modules/accounts/database/account_stats.ts:10-109`: accept an additive captured `now` argument without changing existing query semantics.
- `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts:1-113`: retain current financial helpers and add pure transaction, budget, account-count, delta, and commitment reducers.
- `src/modules/dashboard/screens/dashboard/dashboard.store.ts:1-87`: replace section values/loaded flags with snapshot/status/request-generation ownership.
- `src/modules/dashboard/screens/dashboard/dashboard.state.ts:9-36`: keep only breakdown visibility and selected segment; remove refresh state.
- `src/modules/dashboard/screens/dashboard/dashboard.hook.ts:1-358`: become a focus/refresh adapter over one snapshot plus currency/UI state.
- `src/modules/dashboard/screens/dashboard/components/account_carousel.tsx:1-59`: preserve the small `ScrollView` path and add the thresholded horizontal `FlatList` path.
- `src/modules/dashboard/screens/dashboard/index.tsx:1-260`: consume pure presentation state, keep warm cards mounted, and place one initial/overlay error surface.
- `src/constants/strings.ts:126-141`: add generic Dashboard load, refresh, and retry strings.
- `__tests__/account_stats.query_executor.test.ts:1-258`: prove injected-clock month/week boundaries and retain transfer/native-currency parity.
- `__tests__/dashboard.store.test.ts:1-114`: replace setter tests with lifecycle, deduplication, generation, publication, and reset tests.
- `__tests__/screens/dashboard/dashboard_helpers.test.ts:1-284`: retain existing net-worth/liquidity tests and add snapshot reducer parity.
- `__tests__/screens/dashboard/dashboard_hook.test.ts:1-548`: replace direct-query mocks with snapshot-store focus/refresh/retry/currency derivation tests.
- `__tests__/screens/dashboard/dashboard_state.test.ts:1-46`: remove obsolete refresh-state assertions and retain UI-only state coverage.

### Delete

- `__tests__/screens/dashboard/dashboard_screen.test.tsx`: its cold/warm assertions move to `dashboard_presentation.test.ts`; no replacement render test is allowed.

### Explicitly unchanged

- `src/app/**`
- `src/utils/run_after_interactions.ts`
- `src/modules/accounts/store/account.store.ts`
- `src/modules/budget/**`
- `src/modules/commitments/**`
- `src/modules/currency/**`
- `src/modules/transactions/**`
- `src/components/ui/**`
- `package.json`, `package-lock.json`, `app.json`, `ios/`, `android/`, and `src/database/migrations/**`

## Stable implementation contracts

Use these exact public contracts throughout the tasks so repository, store, hook, and tests do not drift:

```ts
export interface DashboardMonthFacts {
  totals: { incomeEgp: number; expenseEgp: number; netEgp: number };
  spend: { totalEgp: number; usdNative: number; count: number };
}

export interface DashboardSnapshot {
  key: string;
  yearMonth: string;
  previousYearMonth: string;
  accounts: Account[];
  statsMap: Record<string, AccountStats>;
  currentMonth: DashboardMonthFacts;
  previousMonth: DashboardMonthFacts;
  budgetSummary: BudgetDashboardSummaryVM;
  commitmentPayments: CommitmentPayment[];
  loadedAt: number;
}

export interface DashboardLoadInput {
  yearMonth: string;
  now: Date;
}

export type DashboardSnapshotStatus =
  | 'idle'
  | 'initialLoading'
  | 'ready'
  | 'refreshing'
  | 'refreshErrorWithData'
  | 'initialError';

export interface IDashboardRepository {
  getSnapshot(input: DashboardLoadInput): Promise<DashboardSnapshot>;
}
```

## Task 0: Rebase prerequisite and capture the unchanged baseline

**Files:**
- Modify: none
- Verify: `src/utils/run_after_interactions.ts`
- Verify: `src/modules/currency/store/currency.store.ts`

- [ ] **Step 1: Confirm the worktree and preserve unrelated work**

Run:

```bash
git branch --show-current
git status --short
git log --oneline --decorate -3
```

Expected: branch is `perf/dashboard-owned-snapshot`; inspect every status entry before continuing and do not discard another worker’s changes.

- [ ] **Step 2: Update onto the merged PR 1 baseline at implementation start**

Run:

```bash
git rev-parse --short origin/main
git rebase origin/main
git merge-base --is-ancestor 8074711 HEAD
```

Expected: `origin/main` resolves to `8074711` or a later commit containing it, rebase succeeds, and the ancestry command exits `0`. Resolve only conflicts in files owned by this plan; stop if a conflict would require changing merged PR 1 scheduler/startup behavior. Do not run this step during plan writing.

- [ ] **Step 3: Verify the inherited scheduler contract**

Run:

```bash
rg -n "interface RunAfterInteractionsOptions|onError|Promise.resolve" src/utils/run_after_interactions.ts
npm test -- --runInBand __tests__/utils/run_after_interactions.test.ts
```

Expected: the helper exposes optional `onError`, contains sync/async failures, cancellation suppresses late delivery, and the focused test passes.

- [ ] **Step 4: Run the unchanged Dashboard baseline suite**

Run:

```bash
npm test -- --runInBand \
  __tests__/dashboard.store.test.ts \
  __tests__/screens/dashboard/dashboard_helpers.test.ts \
  __tests__/screens/dashboard/dashboard_hook.test.ts \
  __tests__/screens/dashboard/dashboard_state.test.ts \
  __tests__/screens/dashboard/dashboard_screen.test.tsx \
  __tests__/account_stats.query_executor.test.ts \
  __tests__/transactions_get_period_totals.test.ts \
  __tests__/budget_stats.query.test.ts
```

Expected: PASS before production changes. Record any pre-existing failure verbatim; do not hide it by weakening assertions.

- [ ] **Step 5: Prepare the deterministic audit fixture on a disposable development install**

Use Android Studio Database Inspector against `com.moneyapp.app`, run the following SQL with the app paused, then resume the app. The IDs are prefixed so the fixture is repeatable and does not require deleting non-fixture rows.

```sql
WITH RECURSIVE seq(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM seq WHERE i < 100
)
INSERT OR REPLACE INTO accounts (
  id, name, type, currency, opening_balance, current_balance, color,
  credit_limit, revolving_balance, minimum_payment, statement_due_day,
  interest_tracking, apr, is_archived, sort_order, created_at, updated_at,
  balance_review_required
)
SELECT
  printf('perf-account-%03d', i),
  printf('Perf Account %03d', i),
  CASE i % 5
    WHEN 1 THEN 'bank'
    WHEN 2 THEN 'smart_wallet'
    WHEN 3 THEN 'physical_wallet'
    WHEN 4 THEN 'physical_savings'
    ELSE 'credit_card'
  END,
  CASE WHEN i % 2 = 0 THEN 'USD' ELSE 'EGP' END,
  1000 + i,
  1000 + i,
  NULL,
  CASE WHEN i % 5 = 0 THEN 50000 ELSE NULL END,
  CASE WHEN i % 5 = 0 THEN 5000 ELSE NULL END,
  CASE WHEN i % 5 = 0 THEN 500 ELSE NULL END,
  CASE WHEN i % 5 = 0 THEN 28 ELSE NULL END,
  0,
  NULL,
  0,
  i,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z',
  0
FROM seq;

WITH RECURSIVE seq(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM seq WHERE i < 100
)
INSERT OR REPLACE INTO commitments (
  id, name, amount_type, amount, currency, category_id, recurrence_every,
  recurrence_period, start_date, account_id, notes, duration_type, end_date,
  end_after_count, is_active, created_at, updated_at
)
SELECT
  printf('perf-commitment-%03d', i),
  printf('Perf Commitment %03d', i),
  'fixed',
  100 + i,
  CASE WHEN i % 2 = 0 THEN 'USD' ELSE 'EGP' END,
  'cat_bills',
  1,
  'months',
  date('now', 'localtime', 'start of month'),
  printf('perf-account-%03d', ((i - 1) % 100) + 1),
  NULL,
  'forever',
  NULL,
  NULL,
  1,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
FROM seq;

WITH RECURSIVE seq(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM seq WHERE i < 100
)
INSERT OR REPLACE INTO commitment_payments (
  id, commitment_id, due_date, paid_date, skipped_date, amount_due,
  amount_paid, currency, exchange_rate_snapshot, account_id, transaction_id,
  status, notes, created_at, updated_at
)
SELECT
  printf('perf-payment-%03d', i),
  printf('perf-commitment-%03d', i),
  date('now', 'localtime', 'start of month', printf('+%d days', (i - 1) % 28)),
  NULL,
  NULL,
  100 + i,
  NULL,
  CASE WHEN i % 2 = 0 THEN 'USD' ELSE 'EGP' END,
  NULL,
  NULL,
  NULL,
  CASE i % 4
    WHEN 0 THEN 'overdue'
    WHEN 1 THEN 'due'
    WHEN 2 THEN 'upcoming'
    ELSE 'paid'
  END,
  NULL,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
FROM seq;

WITH RECURSIVE months(i, ym) AS (
  SELECT 0, strftime('%Y-%m', 'now', 'localtime', 'start of month')
  UNION ALL
  SELECT i + 1, strftime('%Y-%m', ym || '-01', '-1 month')
  FROM months
  WHERE i < 23
)
INSERT OR REPLACE INTO budgets (
  id, category_id, name, limit_amount, effective_from, created_at, updated_at
)
SELECT
  'perf-budget-' || ym,
  'cat_food',
  'Perf Budget',
  10000 + i,
  ym,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
FROM months;

WITH RECURSIVE seq(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM seq WHERE i < 5000
)
INSERT OR REPLACE INTO transactions (
  id, type, amount, currency, egp_amount, exchange_rate, to_amount,
  minimum_payment_snapshot, revolving_balance_delta, account_id,
  to_account_id, category_id, budget_id, note, transaction_date,
  transaction_time, commitment_payment_id, installment_id, created_at,
  updated_at
)
SELECT
  printf('perf-transaction-%05d', i),
  CASE i % 10
    WHEN 0 THEN 'income'
    WHEN 1 THEN 'income'
    WHEN 2 THEN 'transfer'
    WHEN 3 THEN 'cc_payment'
    ELSE 'expense'
  END,
  10 + (i % 500),
  CASE WHEN i % 2 = 0 THEN 'USD' ELSE 'EGP' END,
  CASE WHEN i % 2 = 0 THEN (10 + (i % 500)) * 50.0 ELSE 10 + (i % 500) END,
  CASE WHEN i % 2 = 0 THEN 50.0 ELSE NULL END,
  CASE WHEN i % 10 IN (2, 3) THEN 10 + (i % 500) ELSE NULL END,
  CASE WHEN i % 10 = 3 THEN 500 ELSE NULL END,
  NULL,
  CASE WHEN i % 10 = 0 THEN 'perf-account-005' ELSE printf('perf-account-%03d', ((i - 1) % 100) + 1) END,
  CASE
    WHEN i % 10 = 2 THEN printf('perf-account-%03d', (i % 100) + 1)
    WHEN i % 10 = 3 THEN 'perf-account-005'
    ELSE NULL
  END,
  CASE
    WHEN i % 10 = 0 THEN 'cat_food'
    WHEN i % 10 = 1 THEN 'cat_salary'
    WHEN i % 10 IN (2, 3) THEN NULL
    ELSE 'cat_food'
  END,
  NULL,
  NULL,
  date(
    'now',
    'localtime',
    'start of month',
    printf('-%d months', i % 24),
    printf('+%d days', i % 28)
  ),
  '12:00:00',
  CASE WHEN i % 50 = 4 THEN printf('perf-payment-%03d', ((i - 1) % 100) + 1) ELSE NULL END,
  NULL,
  '2026-01-01T00:00:00.000Z',
  '2026-01-01T00:00:00.000Z'
FROM seq;
```

- [ ] **Step 6: Verify exact fixture cardinality**

Run in Database Inspector:

```sql
SELECT
  (SELECT COUNT(*) FROM transactions WHERE id LIKE 'perf-transaction-%') AS transactions,
  (SELECT COUNT(*) FROM accounts WHERE id LIKE 'perf-account-%' AND is_archived = 0) AS accounts,
  (SELECT COUNT(*) FROM commitment_payments WHERE id LIKE 'perf-payment-%') AS payments,
  (SELECT COUNT(DISTINCT effective_from) FROM budgets WHERE id LIKE 'perf-budget-%') AS budget_months;
```

Expected: `{ transactions: 5000, accounts: 100, payments: 100, budget_months: 24 }`.

- [ ] **Step 7: Record the pre-change device baseline**

Use the same Hermes/New Architecture development client for React commit profiling and the same release-like Android build for elapsed/frame traces. Record device model, Android API, build profile, fixture prefix, and run count. Capture:

1. React Native DevTools Profiler: 20 Dashboard focus cycles after 5 warmups; count Dashboard commits and per-card completion cascades.
2. Warm focus elapsed time: 20 runs after 5 warmups; calculate median and p95.
3. Pull-to-refresh elapsed time: 10 runs; calculate median and p95.
4. Perfetto/Android frame trace during focus and fast horizontal scroll; record Dashboard-caused JS tasks at least 50 ms.
5. React/native inspector mounted account-card count for the 100-account fixture.
6. Screen recording of warm refresh to preserve geometry for after-comparison.

Expected: a complete baseline record exists outside the repository before Task 1. Do not add temporary instrumentation or fixture code to the production tree.

## Task 1: Consolidate month facts and inject the account-stats clock

**Files:**
- Create: `src/modules/dashboard/database/dashboard_snapshot.ts`
- Modify: `src/modules/accounts/database/account_stats.ts:10-30`
- Create: `__tests__/dashboard_snapshot.query.test.ts`
- Modify: `__tests__/account_stats.query_executor.test.ts`

- [ ] **Step 1: Write failing month-window tests**

Add these assertions to `__tests__/dashboard_snapshot.query.test.ts`:

```ts
expect(resolveDashboardMonthWindow('2026-07')).toEqual({
  currentYearMonth: '2026-07',
  previousYearMonth: '2026-06',
  previousMonthStart: '2026-06-01',
  currentMonthStart: '2026-07-01',
  nextMonthStart: '2026-08-01',
});

expect(resolveDashboardMonthWindow('2026-01')).toEqual({
  currentYearMonth: '2026-01',
  previousYearMonth: '2025-12',
  previousMonthStart: '2025-12-01',
  currentMonthStart: '2026-01-01',
  nextMonthStart: '2026-02-01',
});
```

- [ ] **Step 2: Run the month-window test and verify RED**

Run:

```bash
npm test -- --runInBand __tests__/dashboard_snapshot.query.test.ts
```

Expected: FAIL because `dashboard_snapshot.ts` does not exist.

- [ ] **Step 3: Implement the exact query contracts and month window**

Create these types and exports in `src/modules/dashboard/database/dashboard_snapshot.ts`:

```ts
import type { SQLiteDatabase } from 'expo-sqlite';

import { shiftYearMonth } from '@/utils/year_month';

export interface DashboardMonthWindow {
  currentYearMonth: string;
  previousYearMonth: string;
  previousMonthStart: string;
  currentMonthStart: string;
  nextMonthStart: string;
}

export interface DashboardTransactionFactRow {
  year_month: string;
  category_id: string | null;
  income_egp: number;
  expense_egp: number;
  usd_native: number;
  transaction_count: number;
}

export interface DashboardBudgetLimitRow {
  category_id: string;
  limit_amount: number;
}

export function resolveDashboardMonthWindow(yearMonth: string): DashboardMonthWindow {
  const previousYearMonth = shiftYearMonth(yearMonth, -1);
  return {
    currentYearMonth: yearMonth,
    previousYearMonth,
    previousMonthStart: `${previousYearMonth}-01`,
    currentMonthStart: `${yearMonth}-01`,
    nextMonthStart: `${shiftYearMonth(yearMonth, 1)}-01`,
  };
}
```

- [ ] **Step 4: Write failing consolidated-query financial tests**

Using `better-sqlite3`, `MIGRATIONS`, and the existing Expo SQLite test facade, seed one fixture containing:

- EGP and USD expense rows;
- non-card cash income;
- credit-card income;
- transfer and `cc_payment`;
- a commitment-linked expense;
- a null-category expense;
- archived source-account history;
- rows on previous-month first day, current-month first day, next-month first day, and outside the two-month range.

Assert:

```ts
expect(current).toMatchObject({
  income_egp: 1000,
  expense_egp: 900,
  usd_native: 9,
  transaction_count: 4,
});
expect(previous).toMatchObject({
  income_egp: 500,
  expense_egp: 200,
});
expect(rows.some((row) => row.year_month === '2026-08')).toBe(false);
expect(rows.some((row) => row.category_id === null)).toBe(true);
```

The exact expected values must come from this deterministic fixture: a 600 EGP expense, a 150 EGP card credit, a 10 USD expense, a 1 USD card credit, and the stated cash income. Transfers and card payments must not change any aggregate.

- [ ] **Step 5: Run the consolidated-query tests and verify RED**

Run:

```bash
npm test -- --runInBand __tests__/dashboard_snapshot.query.test.ts
```

Expected: FAIL because the aggregate query export is missing.

- [ ] **Step 6: Implement the one-scan transaction query**

Add `getDashboardTransactionFactRows(db, window)` using this SQL shape and parameter order:

```ts
export async function getDashboardTransactionFactRows(
  db: SQLiteDatabase,
  window: DashboardMonthWindow,
): Promise<DashboardTransactionFactRow[]> {
  return db.getAllAsync<DashboardTransactionFactRow>(
    `SELECT
       CASE
         WHEN transaction_row.transaction_date >= ? THEN ?
         ELSE ?
       END AS year_month,
       CASE
         WHEN transaction_row.transaction_date >= ? THEN transaction_row.category_id
         ELSE NULL
       END AS category_id,
       COALESCE(SUM(CASE
         WHEN transaction_row.type = 'income' AND account_row.type <> 'credit_card'
           THEN transaction_row.egp_amount
         ELSE 0
       END), 0) AS income_egp,
       COALESCE(SUM(CASE
         WHEN transaction_row.type = 'expense' THEN transaction_row.egp_amount
         WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card'
           THEN -transaction_row.egp_amount
         ELSE 0
       END), 0) AS expense_egp,
       COALESCE(SUM(CASE
         WHEN transaction_row.currency = 'USD' AND transaction_row.type = 'expense'
           THEN transaction_row.amount
         WHEN transaction_row.currency = 'USD'
           AND transaction_row.type = 'income'
           AND account_row.type = 'credit_card'
           THEN -transaction_row.amount
         ELSE 0
       END), 0) AS usd_native,
       COALESCE(SUM(CASE
         WHEN transaction_row.type = 'expense' THEN 1
         WHEN transaction_row.type = 'income' AND account_row.type = 'credit_card' THEN 1
         ELSE 0
       END), 0) AS transaction_count
     FROM transactions transaction_row INDEXED BY idx_transactions_date
     JOIN accounts account_row ON account_row.id = transaction_row.account_id
     WHERE transaction_row.transaction_date >= ?
       AND transaction_row.transaction_date < ?
       AND transaction_row.type IN ('expense', 'income')
     GROUP BY year_month, category_id
     ORDER BY year_month ASC, category_id ASC`,
    [
      window.currentMonthStart,
      window.currentYearMonth,
      window.previousYearMonth,
      window.currentMonthStart,
      window.previousMonthStart,
      window.nextMonthStart,
    ],
  );
}
```

Do not filter `account_row.is_archived`; archived-account history remains valid.

- [ ] **Step 7: Add failing current-budget and query-plan tests**

Seed two named budgets for `cat_food` in the current month, one current budget for another category, and historical budgets. Assert:

```ts
await expect(getDashboardBudgetLimitRows(db, '2026-07')).resolves.toEqual([
  { category_id: 'cat_food', limit_amount: 7000 },
  { category_id: 'cat_transport', limit_amount: 3000 },
]);
```

Capture the actual SQL and params passed to `getAllAsync`, run `EXPLAIN QUERY PLAN` against the transaction query, and assert:

```ts
expect(plan.some((row) => /SEARCH transaction_row USING INDEX idx_transactions_date/.test(row.detail)))
  .toBe(true);
expect(plan.some((row) => /transaction_date[<>?]/.test(row.detail))).toBe(true);
```

- [ ] **Step 8: Implement the bounded budget query**

```ts
export async function getDashboardBudgetLimitRows(
  db: SQLiteDatabase,
  yearMonth: string,
): Promise<DashboardBudgetLimitRow[]> {
  return db.getAllAsync<DashboardBudgetLimitRow>(
    `SELECT category_id, COALESCE(SUM(limit_amount), 0) AS limit_amount
       FROM budgets
      WHERE effective_from = ?
      GROUP BY category_id
      ORDER BY category_id ASC`,
    [yearMonth],
  );
}
```

- [ ] **Step 9: Write the failing captured-clock account-stats test**

Set the process clock to July, pass a captured May clock, and seed May/July rows:

```ts
jest.setSystemTime(new Date('2026-07-20T12:00:00.000Z'));
const stats = await getAccountsStats(
  mockDb,
  ['acc_bank'],
  new Date('2026-05-10T12:00:00.000Z'),
);

expect(stats.acc_bank).toEqual({
  month_in: 500,
  month_out: 200,
  week_in: 500,
  week_out: 200,
});
```

Expected fixture dates: May 4–10 contribute to the captured week/month; July rows do not.

- [ ] **Step 10: Run the account-stats test and verify RED**

Run:

```bash
npm test -- --runInBand __tests__/account_stats.query_executor.test.ts
```

Expected: FAIL because `getAccountsStats` still reads its own `new Date()`.

- [ ] **Step 11: Inject the clock without changing default callers**

Change:

```ts
function computeDates(now: Date): { monthStart: string; weekStart: string }

export async function getAccountsStats(
  db: SQLiteDatabase,
  accountIds: string[],
  now: Date = new Date(),
): Promise<Record<string, AccountStats>>
```

Clone `now` before adjusting Monday:

```ts
const monday = new Date(now);
monday.setDate(now.getDate() + diffToMonday);
```

Keep the empty-ID early return before SQL and retain `amount`/`to_amount` native-currency semantics.

- [ ] **Step 12: Run all query tests**

Run:

```bash
npm test -- --runInBand \
  __tests__/dashboard_snapshot.query.test.ts \
  __tests__/account_stats.query_executor.test.ts \
  __tests__/transactions_get_period_totals.test.ts \
  __tests__/budget_stats.query.test.ts
```

Expected: PASS, including January rollover, first-day inclusion, next-month exclusion, card-credit negative expense, USD native values, commitment-linked expense, and the date-index range search.

- [ ] **Step 13: Commit the query slice**

```bash
git add \
  src/modules/dashboard/database/dashboard_snapshot.ts \
  src/modules/accounts/database/account_stats.ts \
  __tests__/dashboard_snapshot.query.test.ts \
  __tests__/account_stats.query_executor.test.ts
git commit -m "perf(dashboard): consolidate snapshot queries"
```

## Task 2: Build pure reducers and the complete snapshot repository

**Files:**
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts`
- Create: `src/modules/dashboard/repositories/dashboard.repository.ts`
- Modify: `__tests__/screens/dashboard/dashboard_helpers.test.ts`
- Create: `__tests__/dashboard.repository.test.ts`

- [ ] **Step 1: Write failing transaction-fact reducer tests**

Add a fixture with current rows split across categories and one previous aggregate row:

```ts
const reduced = reduceDashboardTransactionFacts(
  [
    {
      year_month: '2026-07',
      category_id: 'food',
      income_egp: 0,
      expense_egp: 600,
      usd_native: 10,
      transaction_count: 2,
    },
    {
      year_month: '2026-07',
      category_id: 'food',
      income_egp: 0,
      expense_egp: -750,
      usd_native: -15,
      transaction_count: 1,
    },
    {
      year_month: '2026-07',
      category_id: null,
      income_egp: 1000,
      expense_egp: 0,
      usd_native: 0,
      transaction_count: 0,
    },
    {
      year_month: '2026-06',
      category_id: null,
      income_egp: 500,
      expense_egp: 200,
      usd_native: 4,
      transaction_count: 1,
    },
  ],
  '2026-07',
  '2026-06',
);

expect(reduced.currentMonth).toEqual({
  totals: { incomeEgp: 1000, expenseEgp: -150, netEgp: 1150 },
  spend: { totalEgp: -150, usdNative: -5, count: 3 },
});
expect(reduced.previousMonth.totals).toEqual({
  incomeEgp: 500,
  expenseEgp: 200,
  netEgp: 300,
});
expect(reduced.currentCategorySpendEgp).toEqual({ food: -150 });
```

- [ ] **Step 2: Run reducer tests and verify RED**

Run:

```bash
npm test -- --runInBand __tests__/screens/dashboard/dashboard_helpers.test.ts
```

Expected: FAIL because the snapshot reducers do not exist.

- [ ] **Step 3: Implement month facts and reducer**

Add `DashboardMonthFacts`, `ReducedDashboardTransactionFacts`, `emptyDashboardMonthFacts()`, and `reduceDashboardTransactionFacts(...)`. Accumulate rows only when `year_month` matches current or previous; set `spend.totalEgp` equal to the same accumulated `expenseEgp`; calculate `netEgp` after accumulation; and do not clamp category facts here.

```ts
export interface ReducedDashboardTransactionFacts {
  currentMonth: DashboardMonthFacts;
  previousMonth: DashboardMonthFacts;
  currentCategorySpendEgp: Record<string, number>;
}
```

- [ ] **Step 4: Write failing budget-summary parity tests**

```ts
expect(
  buildDashboardBudgetSummary(
    [
      { category_id: 'food', limit_amount: 7000 },
      { category_id: 'transport', limit_amount: 3000 },
    ],
    { food: -150, transport: 500, unbudgeted: 900 },
  ),
).toEqual({
  budgeted: 10000,
  spent: 500,
  left: 9500,
  pct: 0.05,
  categoryCount: 2,
});
```

This proves category-level credit clamping and exclusion of unbudgeted categories.

- [ ] **Step 5: Implement budget, account, delta, and commitment reducers**

Add these exact pure exports to `dashboard.helpers.ts`:

```ts
export function buildDashboardBudgetSummary(
  limits: DashboardBudgetLimitRow[],
  categorySpendEgp: Record<string, number>,
): BudgetDashboardSummaryVM;

export function computeDashboardAccountCounts(
  accounts: Account[],
): { assets: number; liabilities: number };

export function computeDashboardSpendDeltaPct(currentEgp: number, previousEgp: number): number | null;

export function computeDashboardCommitmentSummary(payments: CommitmentPayment[]): {
  counts: {
    paid: number;
    overdue: number;
    due: number;
    upcoming: number;
    skipped: number;
    total: number;
  };
  totalsByCurrency: Map<string, number>;
};
```

For commitments, exclude skipped rows from `total` and currency totals; for paid rows use `amount_paid ?? amount_due`; for other included statuses use `amount_due`.

- [ ] **Step 6: Run helper tests**

Run:

```bash
npm test -- --runInBand __tests__/screens/dashboard/dashboard_helpers.test.ts
```

Expected: PASS for all existing net-worth/liquidity/liability behavior plus transaction, budget, delta, account-count, and commitment reducers.

- [ ] **Step 7: Write failing repository assembly tests**

Mock `getDb()` to return one typed SQLite facade and exercise the real query functions. Assert:

```ts
const snapshot = await repository.getSnapshot({
  yearMonth: '2026-07',
  now: new Date('2026-07-23T10:00:00.000Z'),
});

expect(getDb).toHaveBeenCalledTimes(1);
expect(snapshot).toMatchObject({
  key: '2026-07',
  yearMonth: '2026-07',
  previousYearMonth: '2026-06',
  loadedAt: new Date('2026-07-23T10:00:00.000Z').getTime(),
});
expect(snapshot.accounts.map((account) => account.id)).toEqual(['active-first', 'active-second']);
expect(sqlite.getAllAsync).toHaveBeenCalledTimes(5);
```

Also assert:

- zero accounts return `statsMap: {}` and execute four `getAllAsync` reads;
- `getAccountsStats` receives the same `now` object passed to `getSnapshot`;
- one subquery rejection makes `getSnapshot` reject without returning partial data;
- empty tables produce a complete zero-valued snapshot, not an exception;
- current and previous month facts and budget summary equal the pure reducer outputs.

- [ ] **Step 8: Run repository tests and verify RED**

Run:

```bash
npm test -- --runInBand __tests__/dashboard.repository.test.ts
```

Expected: FAIL because `dashboard.repository.ts` does not exist.

- [ ] **Step 9: Implement the single-owner repository**

Create the contracts from “Stable implementation contracts,” then implement this orchestration order:

```ts
export class DashboardRepository implements IDashboardRepository {
  async getSnapshot({ yearMonth, now }: DashboardLoadInput): Promise<DashboardSnapshot> {
    const db = await getDb();
    const window = resolveDashboardMonthWindow(yearMonth);
    const accounts = await getAccounts(db);

    const [transactionRows, budgetLimits, commitmentPayments, statsMap] = await Promise.all([
      getDashboardTransactionFactRows(db, window),
      getDashboardBudgetLimitRows(db, yearMonth),
      getPaymentsByMonth(db, yearMonth),
      getAccountsStats(
        db,
        accounts.map((account) => account.id),
        now,
      ),
    ]);
    const facts = reduceDashboardTransactionFacts(
      transactionRows,
      window.currentYearMonth,
      window.previousYearMonth,
    );

    return {
      key: yearMonth,
      yearMonth,
      previousYearMonth: window.previousYearMonth,
      accounts,
      statsMap,
      currentMonth: facts.currentMonth,
      previousMonth: facts.previousMonth,
      budgetSummary: buildDashboardBudgetSummary(
        budgetLimits,
        facts.currentCategorySpendEgp,
      ),
      commitmentPayments,
      loadedAt: now.getTime(),
    };
  }
}

export const dashboardRepository = new DashboardRepository();
```

Use canonical imports from module `database/` and `entities/` paths. Do not call the account, budget, commitment, or transaction stores/repositories.

- [ ] **Step 10: Run repository and financial parity tests**

Run:

```bash
npm test -- --runInBand \
  __tests__/dashboard_snapshot.query.test.ts \
  __tests__/dashboard.repository.test.ts \
  __tests__/screens/dashboard/dashboard_helpers.test.ts \
  __tests__/account.repository.test.ts \
  __tests__/account_stats.query_executor.test.ts \
  __tests__/commitment_payments.query.test.ts
```

Expected: PASS with at most five reads, exactly one transaction-history aggregate query, preserved active-account ordering, and canonical commitment ordering.

- [ ] **Step 11: Commit the repository slice**

```bash
git add \
  src/modules/dashboard/repositories/dashboard.repository.ts \
  src/modules/dashboard/screens/dashboard/dashboard.helpers.ts \
  __tests__/dashboard.repository.test.ts \
  __tests__/screens/dashboard/dashboard_helpers.test.ts
git commit -m "perf(dashboard): assemble owned read snapshot"
```

## Task 3: Replace section setters with generation-owned snapshot state

**Files:**
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.store.ts`
- Rewrite: `__tests__/dashboard.store.test.ts`

- [ ] **Step 1: Write failing initial-load and publication tests**

Build stores with `createDashboardStore(repo)` and a deferred repository promise:

```ts
const load = deferred<DashboardSnapshot>();
const repo = { getSnapshot: jest.fn(() => load.promise) };
const store = createDashboardStore(repo);
const publications: Array<{ status: DashboardSnapshotStatus; snapshot: DashboardSnapshot | undefined }> = [];
const unsubscribe = store.subscribe((state) => {
  publications.push({ status: state.status, snapshot: state.snapshot });
});

const request = store.getState().ensureSnapshot(input('2026-07'));
expect(store.getState()).toMatchObject({
  status: 'initialLoading',
  snapshot: undefined,
  requestedKey: '2026-07',
  requestGeneration: 1,
});

load.resolve(snapshot('2026-07'));
await request;

expect(store.getState()).toMatchObject({
  status: 'ready',
  snapshot: snapshot('2026-07'),
  requestedKey: '2026-07',
});
expect(publications.filter((entry) => entry.snapshot !== undefined)).toHaveLength(1);
unsubscribe();
```

Use one stored snapshot object in the assertion so reference identity is testable.

- [ ] **Step 2: Run store tests and verify RED**

Run:

```bash
npm test -- --runInBand __tests__/dashboard.store.test.ts
```

Expected: FAIL because the store still exposes per-section values and setters.

- [ ] **Step 3: Implement the store shape and production singleton**

Use:

```ts
interface DashboardStoreShape {
  snapshot: DashboardSnapshot | undefined;
  status: DashboardSnapshotStatus;
  requestedKey: string | undefined;
  requestGeneration: number;
}

interface DashboardStoreActions {
  ensureSnapshot(input: DashboardLoadInput): Promise<void>;
  refresh(input: DashboardLoadInput): Promise<void>;
  retry(input: DashboardLoadInput): Promise<void>;
  invalidate(): void;
  reset(): void;
}
```

Inside `createDashboardStore(repository)` keep private `generation`, `freshKey`, and one `inFlight` record:

```ts
type InFlight = {
  key: string;
  generation: number;
  promise: Promise<void>;
};
```

Create the production singleton with `dashboardRepository`; do not export section setters or empty successful snapshot constants.

- [ ] **Step 4: Write failing warm-refresh and failure tests**

Assert exact reference preservation:

```ts
store.setState({
  snapshot: warmSnapshot,
  status: 'ready',
  requestedKey: warmSnapshot.key,
});

const refresh = store.getState().refresh(input('2026-07'));
expect(store.getState()).toMatchObject({ status: 'refreshing' });
expect(store.getState().snapshot).toBe(warmSnapshot);

load.reject(new Error('db unavailable'));
await expect(refresh).resolves.toBeUndefined();
expect(store.getState()).toMatchObject({ status: 'refreshErrorWithData' });
expect(store.getState().snapshot).toBe(warmSnapshot);
```

For cold failure:

```ts
await expect(store.getState().ensureSnapshot(input('2026-07'))).resolves.toBeUndefined();
expect(store.getState()).toMatchObject({
  status: 'initialError',
  snapshot: undefined,
});
expect(console.error).toHaveBeenCalledTimes(1);
```

- [ ] **Step 5: Implement owned request start/success/failure**

Implement one private `startRequest(input, force)` path:

1. Return `inFlight.promise` for the same key.
2. Let non-forced `ensureSnapshot` resolve immediately only when `freshKey === input.yearMonth` and `snapshot?.key === input.yearMonth`.
3. Increment `generation` for every new request and publish it to `requestGeneration`.
4. Preserve same-key data with `status: 'refreshing'`.
5. For a missing or different-key snapshot, atomically set `snapshot: undefined`, `status: 'initialLoading'`, and `requestedKey: input.yearMonth`.
6. On owned success, set `freshKey`, then publish `snapshot`, `status: 'ready'`, `requestedKey`, and `requestGeneration` in one `set(...)`.
7. On owned failure, log once and publish only `refreshErrorWithData` or `initialError`; resolve the action promise.
8. Clear `inFlight` in `finally` only when its generation still owns the record.

- [ ] **Step 6: Write failing generation, dedupe, month-shift, invalidate, and reset tests**

Cover:

```ts
const focusRequest = store.getState().ensureSnapshot(input('2026-07'));
const refreshRequest = store.getState().refresh(input('2026-07'));
expect(repo.getSnapshot).toHaveBeenCalledTimes(1);
load.resolve(snapshot('2026-07'));
await Promise.all([focusRequest, refreshRequest]);
```

Then cover:

- deferred July and August resolve out of order; only August publishes;
- a new-month request clears July before its repository promise resolves;
- `invalidate()` advances `requestGeneration`, preserves the warm snapshot reference, drops freshness/in-flight ownership, and blocks late publication;
- `reset()` advances the generation, restores `idle`, clears snapshot/requested key, and blocks late publication;
- a second `ensureSnapshot` in one focus session is a no-op after success;
- after `invalidate()`, the next `ensureSnapshot` revalidates the warm same-key snapshot;
- stale request failures neither log nor change status.

- [ ] **Step 7: Implement invalidate and reset**

`invalidate()` must not clear or replace `snapshot` and must not alter `status`; update only the diagnostic generation:

```ts
generation += 1;
freshKey = undefined;
inFlight = undefined;
set({ requestGeneration: generation });
```

`reset()` must perform the same private invalidation, then:

```ts
set({
  snapshot: undefined,
  status: 'idle',
  requestedKey: undefined,
  requestGeneration: generation,
});
```

- [ ] **Step 8: Run store tests**

Run:

```bash
npm test -- --runInBand __tests__/dashboard.store.test.ts
```

Expected: PASS for atomic publication, same-key reference preservation, cold/warm failures, deduplication, stale generation suppression, blur invalidation, reset, and month change.

- [ ] **Step 9: Commit the state-ownership slice**

```bash
git add \
  src/modules/dashboard/screens/dashboard/dashboard.store.ts \
  __tests__/dashboard.store.test.ts
git commit -m "perf(dashboard): own snapshot request lifecycle"
```

## Task 4: Project cold, warm, error, and zero-account UI state in pure logic

**Files:**
- Create: `src/modules/dashboard/screens/dashboard/dashboard.presentation.ts`
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.state.ts`
- Create: `__tests__/screens/dashboard/dashboard_presentation.test.ts`
- Modify: `__tests__/screens/dashboard/dashboard_state.test.ts`

- [ ] **Step 1: Write the failing presentation matrix**

Use table-driven `.ts` tests:

```ts
it.each([
  ['idle', undefined, true, false, false, false],
  ['initialLoading', undefined, true, false, false, false],
  ['initialError', undefined, false, true, false, false],
  ['ready', populatedSnapshot, false, false, false, false],
  ['refreshing', populatedSnapshot, false, false, false, true],
  ['refreshErrorWithData', populatedSnapshot, false, false, true, false],
] as const)(
  '%s selects the expected presentation',
  (status, snapshot, cardLoading, showInitialError, showRefreshError, isRefreshing) => {
    expect(
      selectDashboardPresentation({
        status,
        snapshot,
        requestedKey: snapshot?.key ?? '2026-07',
      }),
    ).toMatchObject({
      cardLoading,
      showInitialError,
      showRefreshError,
      isRefreshing,
    });
  },
);
```

Add explicit assertions:

```ts
expect(
  selectDashboardPresentation({
    status: 'ready',
    snapshot: zeroAccountSnapshot,
    requestedKey: zeroAccountSnapshot.key,
  }),
)
  .toMatchObject({ showAccountsEmptyState: true });
expect(
  selectDashboardPresentation({
    status: 'initialError',
    snapshot: undefined,
    requestedKey: '2026-07',
  }),
)
  .toMatchObject({ showAccountsEmptyState: false });
expect(
  selectDashboardPresentation({
    status: 'refreshing',
    snapshot: populatedSnapshot,
    requestedKey: populatedSnapshot.key,
  }),
)
  .toMatchObject({ showDashboardBody: true, cardLoading: false });
```

- [ ] **Step 2: Run presentation tests and verify RED**

Run:

```bash
npm test -- --runInBand __tests__/screens/dashboard/dashboard_presentation.test.ts
```

Expected: FAIL because `dashboard.presentation.ts` does not exist.

- [ ] **Step 3: Implement the exact pure presentation output**

```ts
export interface DashboardPresentation {
  hasSnapshot: boolean;
  showDashboardBody: boolean;
  showAccountsEmptyState: boolean;
  showInitialError: boolean;
  showRefreshError: boolean;
  cardLoading: boolean;
  isRefreshing: boolean;
}

export function selectDashboardPresentation(input: {
  status: DashboardSnapshotStatus;
  snapshot: DashboardSnapshot | undefined;
  requestedKey: string | undefined;
}): DashboardPresentation {
  const matchingSnapshot =
    input.snapshot?.key === input.requestedKey ? input.snapshot : undefined;
  const hasSnapshot = matchingSnapshot !== undefined;
  const showInitialError = !hasSnapshot && input.status === 'initialError';
  const showAccountsEmptyState =
    matchingSnapshot !== undefined && matchingSnapshot.accounts.length === 0;

  return {
    hasSnapshot,
    showDashboardBody: !showInitialError && !showAccountsEmptyState,
    showAccountsEmptyState,
    showInitialError,
    showRefreshError:
      hasSnapshot && input.status === 'refreshErrorWithData',
    cardLoading: !hasSnapshot && !showInitialError,
    isRefreshing: hasSnapshot && input.status === 'refreshing',
  };
}
```

Do not return financial zeroes from this function.

- [ ] **Step 4: Remove refresh state from the UI-state store**

Delete `refreshing` and `setRefreshing` from `dashboard.state.ts`. The exact remaining shape is:

```ts
interface DashboardStateShape {
  isBreakdownVisible: boolean;
  selectedSegment: DashboardSegment;
}

type DashboardState = DashboardStateShape & {
  setBreakdownVisible: (value: boolean) => void;
  setSelectedSegment: (segment: DashboardSegment) => void;
  reset: () => void;
};
```

- [ ] **Step 5: Update UI-state tests**

Remove only the obsolete refresh assertions. Keep initial state, breakdown toggle, segment switch, and reset tests; reset must return `{ isBreakdownVisible: false, selectedSegment: 'overview' }`.

- [ ] **Step 6: Run presentation and UI-state tests**

Run:

```bash
npm test -- --runInBand \
  __tests__/screens/dashboard/dashboard_presentation.test.ts \
  __tests__/screens/dashboard/dashboard_state.test.ts
```

Expected: PASS and no `.tsx` test is introduced.

- [ ] **Step 7: Commit the presentation slice**

```bash
git add \
  src/modules/dashboard/screens/dashboard/dashboard.presentation.ts \
  src/modules/dashboard/screens/dashboard/dashboard.state.ts \
  __tests__/screens/dashboard/dashboard_presentation.test.ts \
  __tests__/screens/dashboard/dashboard_state.test.ts
git commit -m "refactor(dashboard): project snapshot presentation"
```

## Task 5: Turn `useDashboard` into one focus/refresh adapter

**Files:**
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.hook.ts`
- Rewrite: `__tests__/screens/dashboard/dashboard_hook.test.ts`

- [ ] **Step 1: Replace direct-query mocks with failing snapshot-action tests**

Mock only:

- `useDashboardStore` with `snapshot`, `status`, `requestedKey`, and `ensureSnapshot`/`refresh`/`retry`/`invalidate`;
- `useDashboardState` with breakdown and segment state/actions;
- `useCurrencyStore` with `rate` and `isManualOverride`;
- `runAfterInteractions`;
- Expo Router focus and navigation.

Delete mocks for `getDb`, account store, account stats, Budget repository, Commitment repository, and transaction queries. Assert those modules are not imported by `dashboard.hook.ts`.

- [ ] **Step 2: Write the failing focus ownership test**

Freeze time and drive the captured focus callback:

```ts
jest.useFakeTimers({ now: new Date('2026-07-23T10:00:00.000Z') });
renderHook(() => useDashboard());

const cleanup = capturedFocusCallback?.();
expect(setSelectedSegment).toHaveBeenCalledWith('overview');
expect(runAfterInteractions).toHaveBeenCalledTimes(1);
expect(ensureSnapshot).not.toHaveBeenCalled();

act(() => scheduledTask.callback());
expect(ensureSnapshot).toHaveBeenCalledWith({
  yearMonth: '2026-07',
  now: new Date('2026-07-23T10:00:00.000Z'),
});

act(() => cleanup?.());
expect(scheduledTask.cancel).toHaveBeenCalledTimes(1);
expect(invalidate).toHaveBeenCalledTimes(1);
```

- [ ] **Step 3: Run the focus test and verify RED**

Run:

```bash
npm test -- --runInBand __tests__/screens/dashboard/dashboard_hook.test.ts
```

Expected: FAIL because the hook still schedules four loaders and owns account stats separately.

- [ ] **Step 4: Implement one captured load input and focus path**

Use `currentYearMonth(now)` from `@/utils/year_month`. Capture one `Date` per action:

```ts
function createDashboardLoadInput(now = new Date()): DashboardLoadInput {
  return { yearMonth: currentYearMonth(now), now };
}
```

The focus effect must:

```ts
setSelectedSegment('overview');
const task = runAfterInteractions(() =>
  useDashboardStore.getState().ensureSnapshot(createDashboardLoadInput()),
);
return () => {
  task.cancel();
  useDashboardStore.getState().invalidate();
};
```

Do not add an `onError` callback: store actions contain repository failures and resolve after status publication.

- [ ] **Step 5: Write failing immediate refresh and retry tests**

```ts
await result.current.refresh();
expect(runAfterInteractions).not.toHaveBeenCalled();
expect(refreshSnapshot).toHaveBeenCalledWith({
  yearMonth: '2026-07',
  now: expect.any(Date),
});

await result.current.retry();
expect(retrySnapshot).toHaveBeenCalledWith({
  yearMonth: '2026-07',
  now: expect.any(Date),
});
```

Advance the fake clock into August before retry and assert `yearMonth: '2026-08'`; this proves the month key is not mount-memoized.

- [ ] **Step 6: Implement immediate refresh/retry actions**

Read actions outside render:

```ts
const refresh = useCallback(
  () => useDashboardStore.getState().refresh(createDashboardLoadInput()),
  [],
);
const retry = useCallback(
  () => useDashboardStore.getState().retry(createDashboardLoadInput()),
  [],
);
```

- [ ] **Step 7: Write failing single-snapshot derivation tests**

Provide one populated snapshot and assert:

- account/net-worth/liquidity/liability/grouping outputs match existing helper behavior;
- month-spend totals and delta use `snapshot.currentMonth`/`previousMonth`;
- transaction card values use the same two month facts;
- budget card uses `snapshot.budgetSummary`;
- commitment counts/totals use `snapshot.commitmentPayments`;
- every card `loading` flag equals `presentation.cardLoading`;
- `refreshing` with data sets only `presentation.isRefreshing`;
- `initialError` produces `showInitialError` and never selects the accounts empty state.

- [ ] **Step 8: Implement one shallow snapshot subscription and derived view models**

Subscribe once:

```ts
const { snapshot, status, requestedKey } = useDashboardStore(
  useShallow((state) => ({
    snapshot: state.snapshot,
    status: state.status,
    requestedKey: state.requestedKey,
  })),
);
```

Subscribe separately to currency and UI-only state. Use module-level presentation-only empty arrays/maps/month facts while no snapshot exists; they must never be stored or published as a successful `DashboardSnapshot`. Derive all output from the single `snapshot` reference and current `rate`.

- [ ] **Step 9: Write the failing currency-only rerender test**

Rerender the hook after changing only the mocked currency rate:

```ts
expect(result.current.state.netWorth.assetsEgp).toBe(5000);
currencyState.rate = 55;
rerender({});
expect(result.current.state.netWorth.assetsEgp).toBe(5500);
expect(ensureSnapshot).not.toHaveBeenCalled();
expect(refreshSnapshot).not.toHaveBeenCalled();
```

Use a 100 USD account in the snapshot.

- [ ] **Step 10: Complete the hook return contract**

Return:

```ts
return {
  state: {
    presentation,
    accounts,
    rate,
    isManualOverride,
    netWorth,
    liquidity,
    liabilities,
    groupedAccounts,
    statsMap,
    isBreakdownVisible,
    selectedSegment,
    monthSpend,
    accountCounts,
    commitments,
    transactions,
    budget,
  },
  setBreakdownVisible,
  setSelectedSegment,
  refresh,
  retry,
  goToAccount,
  goToAddAccount,
  goToSettings,
  goToTransactions,
  goToBudget,
  goToCommitments,
};
```

Remove `accountsLoaded`, screen refresh state, all direct repositories/database imports, four loader callbacks, account-store subscription, `loadAccounts()`, and the account-stats effect.

- [ ] **Step 11: Run hook and ownership tests**

Run:

```bash
npm test -- --runInBand \
  __tests__/screens/dashboard/dashboard_hook.test.ts \
  __tests__/dashboard.store.test.ts \
  __tests__/screens/dashboard/dashboard_helpers.test.ts \
  __tests__/screens/dashboard/dashboard_presentation.test.ts
```

Expected: PASS; focus schedules one snapshot request, cleanup invalidates, refresh/retry are immediate, month rollover is recaptured, and currency changes do not query SQLite.

- [ ] **Step 12: Commit the hook adapter**

```bash
git add \
  src/modules/dashboard/screens/dashboard/dashboard.hook.ts \
  __tests__/screens/dashboard/dashboard_hook.test.ts
git commit -m "perf(dashboard): adapt focus loading to snapshot"
```

## Task 6: Virtualize account groups at the approved threshold

**Files:**
- Modify: `src/modules/dashboard/screens/dashboard/components/account_carousel.tsx`
- Create: `__tests__/screens/dashboard/account_carousel.helpers.test.ts`

- [ ] **Step 1: Write failing threshold and item-contract tests**

```ts
expect(shouldVirtualizeAccountCarousel(7)).toBe(false);
expect(shouldVirtualizeAccountCarousel(8)).toBe(true);

const items = buildAccountCarouselItems(AccountType.Bank, [accountA, accountB]);
expect(items).toEqual([
  { kind: 'account', account: accountA },
  { kind: 'account', account: accountB },
  { kind: 'add', accountType: AccountType.Bank },
]);
expect(items.map(getAccountCarouselItemKey)).toEqual([
  'account:a',
  'account:b',
  'add:bank',
]);
```

- [ ] **Step 2: Write failing geometry tests**

```ts
const cardWidth = 214.5;
expect(getAccountCarouselItemLayout(cardWidth, 0)).toEqual({
  index: 0,
  length: cardWidth + Spacing.xxs + Spacing.xs,
  offset: 0,
});
expect(getAccountCarouselItemLayout(cardWidth, 3)).toEqual({
  index: 3,
  length: cardWidth + Spacing.xxs + Spacing.xs,
  offset: 3 * (cardWidth + Spacing.xxs + Spacing.xs),
});
```

`Spacing.xxs` is the existing 4-baseline item leading margin and `Spacing.xs` is the 8-baseline inter-item gap.

- [ ] **Step 3: Run helper tests and verify RED**

Run:

```bash
npm test -- --runInBand __tests__/screens/dashboard/account_carousel.helpers.test.ts
```

Expected: FAIL because the pure carousel helpers do not exist.

- [ ] **Step 4: Add discriminated items and pure helpers**

Export from `account_carousel.tsx`:

```ts
export type AccountCarouselItem =
  | { kind: 'account'; account: Account }
  | { kind: 'add'; accountType: AccountType };

export const ACCOUNT_CAROUSEL_VIRTUALIZATION_THRESHOLD = 8;

export function shouldVirtualizeAccountCarousel(accountCount: number): boolean {
  return accountCount >= ACCOUNT_CAROUSEL_VIRTUALIZATION_THRESHOLD;
}

export function buildAccountCarouselItems(
  accountType: AccountType,
  accounts: Account[],
): AccountCarouselItem[] {
  return [
    ...accounts.map((account) => ({ kind: 'account', account }) as const),
    { kind: 'add', accountType },
  ];
}

export function getAccountCarouselItemKey(item: AccountCarouselItem): string {
  return item.kind === 'account'
    ? `account:${item.account.id}`
    : `add:${item.accountType}`;
}

export function getAccountCarouselItemLayout(cardWidth: number, index: number) {
  const length = cardWidth + Spacing.xxs + Spacing.xs;
  return { index, length, offset: length * index };
}
```

- [ ] **Step 5: Implement the small-list path with token-identical geometry**

Keep horizontal `ScrollView`, hidden indicator, and account/Add card order. Replace numeric spacing calls with the exact existing tokens:

```ts
contentContainerStyle={{
  paddingHorizontal: Spacing.md,
  paddingVertical: Spacing.xxs,
  columnGap: Spacing.xs,
  alignItems: 'stretch',
}}
```

Do not change `AccountCard` or `AddCard`; both remain HeroUI `Card` plus `PressableFeedback`.

- [ ] **Step 6: Implement the large-list path**

Use React Native `FlatList<AccountCarouselItem>`:

```tsx
<FlatList
  horizontal
  data={items}
  renderItem={renderItem}
  keyExtractor={getAccountCarouselItemKey}
  ItemSeparatorComponent={AccountCarouselSeparator}
  getItemLayout={(_, index) => getAccountCarouselItemLayout(cardWidth, index)}
  initialNumToRender={3}
  maxToRenderPerBatch={3}
  windowSize={3}
  removeClippedSubviews={Platform.OS === 'android'}
  showsHorizontalScrollIndicator={false}
  contentContainerStyle={{
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xxs,
    alignItems: 'stretch',
  }}
/>
```

Define `AccountCarouselSeparator` outside the component with `style={{ width: Spacing.xs }}`. Memoize `items`, per-account press handlers, `renderItem`, and `getItemLayout`; pass `onAddPress` directly. Keep the existing `windowWidth * 0.55` card width and do not add snapping.

- [ ] **Step 7: Run carousel and type tests**

Run:

```bash
npm test -- --runInBand __tests__/screens/dashboard/account_carousel.helpers.test.ts
npm run typecheck
```

Expected: PASS with threshold 7/8, stable unique keys, Add Account last, and exact item length/offset math.

- [ ] **Step 8: Commit the virtualization slice**

```bash
git add \
  src/modules/dashboard/screens/dashboard/components/account_carousel.tsx \
  __tests__/screens/dashboard/account_carousel.helpers.test.ts
git commit -m "perf(dashboard): virtualize large account groups"
```

## Task 7: Wire HeroUI error states without shifting warm content

**Files:**
- Create: `src/modules/dashboard/screens/dashboard/components/dashboard_load_error.tsx`
- Modify: `src/modules/dashboard/screens/dashboard/index.tsx`
- Modify: `src/constants/strings.ts`
- Delete: `__tests__/screens/dashboard/dashboard_screen.test.tsx`
- Verify: `__tests__/screens/dashboard/dashboard_presentation.test.ts`

- [ ] **Step 1: Add the exact centralized strings**

```ts
dashboardLoadError: 'Could not load dashboard.',
dashboardRefreshError: 'Could not refresh dashboard.',
dashboardLoadRetry: 'Retry',
```

Keep them with the existing Dashboard strings. Do not add branding or onboarding copy.

- [ ] **Step 2: Implement the HeroUI Native error composition**

Use the installed 1.0.3 compound API and existing `TransactionLoadError` pattern:

```tsx
import { Alert } from 'heroui-native';
import { View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

interface DashboardLoadErrorProps {
  variant: 'initial' | 'refresh';
  onRetry: () => void;
}

export function DashboardLoadError({
  variant,
  onRetry,
}: DashboardLoadErrorProps): React.ReactElement {
  const alert = (
    <Alert status="danger" className="w-full">
      <Alert.Indicator />
      <Alert.Content>
        <Alert.Title>
          {variant === 'initial'
            ? Strings.dashboardLoadError
            : Strings.dashboardRefreshError}
        </Alert.Title>
      </Alert.Content>
      <Button
        variant="secondary"
        size="sm"
        label={Strings.dashboardLoadRetry}
        accessibilityLabel={Strings.dashboardLoadRetry}
        onPress={onRetry}
      />
    </Alert>
  );

  if (variant === 'initial') {
    return (
      <View className="flex-1 items-center justify-center px-4">
        {alert}
      </View>
    );
  }

  return (
    <View className="absolute right-4 bottom-24 left-4 z-50">
      {alert}
    </View>
  );
}
```

This is a composition of HeroUI `Alert` and the HeroUI-backed project `Button`, not a parallel primitive.

- [ ] **Step 3: Wire the screen to pure presentation**

Destructure `retry` from `useDashboard()`. Replace local `accountsLoaded`/`refreshing` derivation with:

```ts
const presentation = state.presentation;
const visibleTypes = TYPE_ORDER.filter(
  (type) => state.groupedAccounts[type]?.length,
);
```

After the header separator:

1. Render `DashboardLoadError variant="initial"` when `presentation.showInitialError`.
2. Render the existing accounts `EmptyState` when `presentation.showAccountsEmptyState`.
3. Otherwise preserve the current HeroUI `Tabs`, gesture detector, `ScreenScroll`, card order, geometry, and breakdown sheet.

- [ ] **Step 4: Keep refresh state out of every card**

Use:

```tsx
<RefreshControl
  refreshing={presentation.isRefreshing}
  onRefresh={() => {
    void refresh();
  }}
  tintColor={Colors.shared.cairoGold}
/>
```

Pass only the hook’s per-section `loading` values:

```tsx
<HeroCard isLoading={state.presentation.cardLoading} />
<StatCards
  netWorthLoading={state.presentation.cardLoading}
  monthSpendLoading={state.monthSpend.loading}
/>
<TransactionsCard isLoading={state.transactions.loading} />
<BudgetCard isLoading={state.budget.loading} />
<CommitmentsCard isLoading={state.commitments.loading} />
```

Do not OR any card loading prop with `presentation.isRefreshing`.

- [ ] **Step 5: Overlay the warm error outside scroll layout**

Place this as a sibling after the gesture/scroll content, not inside `ScreenScroll`:

```tsx
{presentation.showRefreshError ? (
  <DashboardLoadError
    variant="refresh"
    onRetry={() => {
      void retry();
    }}
  />
) : null}
```

This preserves scroll offset, card coordinates, account carousel state, and breakdown-sheet mount identity.

- [ ] **Step 6: Delete the obsolete render test**

Delete `__tests__/screens/dashboard/dashboard_screen.test.tsx`. Confirm its two behaviors are covered by pure presentation assertions:

- cold loading does not select accounts empty state and sets `cardLoading: true`;
- warm refreshing keeps `cardLoading: false` and sets only `isRefreshing: true`.

- [ ] **Step 7: Run Dashboard logic and static checks**

Run:

```bash
npm test -- --runInBand \
  __tests__/dashboard.store.test.ts \
  __tests__/screens/dashboard/dashboard_helpers.test.ts \
  __tests__/screens/dashboard/dashboard_hook.test.ts \
  __tests__/screens/dashboard/dashboard_presentation.test.ts \
  __tests__/screens/dashboard/dashboard_state.test.ts \
  __tests__/screens/dashboard/account_carousel.helpers.test.ts
npm run lint
npm run typecheck
```

Expected: PASS; no `.tsx` Dashboard screen test remains, no custom alert primitive exists, and the screen retains `Screen edges={['top']}`, `ScreenScroll`, HeroUI `Tabs`, `Surface`, `Separator`, `Button`, and existing HeroUI-backed cards/sheet.

- [ ] **Step 8: Commit the UI state shift**

```bash
git add \
  src/modules/dashboard/screens/dashboard/components/dashboard_load_error.tsx \
  src/modules/dashboard/screens/dashboard/index.tsx \
  src/constants/strings.ts \
  __tests__/screens/dashboard/dashboard_presentation.test.ts \
  __tests__/screens/dashboard/dashboard_screen.test.tsx
git commit -m "feat(dashboard): preserve data through refresh errors"
```

## Task 8: Verify query/publication budgets, performance, CI parity, and device QA handoff

**Files:**
- Modify only the exact files in the file map if verification exposes a defect.
- Do not create permanent profiling or fixture files.

- [ ] **Step 1: Run the complete targeted suite**

Run:

```bash
npm test -- --runInBand \
  __tests__/dashboard_snapshot.query.test.ts \
  __tests__/dashboard.repository.test.ts \
  __tests__/dashboard.store.test.ts \
  __tests__/screens/dashboard/dashboard_hook.test.ts \
  __tests__/screens/dashboard/dashboard_helpers.test.ts \
  __tests__/screens/dashboard/dashboard_presentation.test.ts \
  __tests__/screens/dashboard/account_carousel.helpers.test.ts \
  __tests__/screens/dashboard/dashboard_state.test.ts \
  __tests__/account_stats.query_executor.test.ts \
  __tests__/account.repository.test.ts \
  __tests__/commitment_payments.query.test.ts \
  __tests__/transactions_get_period_totals.test.ts \
  __tests__/budget_stats.query.test.ts \
  __tests__/utils/run_after_interactions.test.ts
```

Expected: PASS with no unhandled rejection, timer throw, React act warning, or open handle.

- [ ] **Step 2: Reconfirm automated performance invariants**

Run:

```bash
npm test -- --runInBand \
  __tests__/dashboard.repository.test.ts \
  __tests__/dashboard.store.test.ts \
  __tests__/dashboard_snapshot.query.test.ts
```

Expected:

- successful non-empty snapshot: no more than five SQLite reads;
- zero-account snapshot: four SQLite reads;
- exactly one transaction-history aggregate read;
- exactly one data-bearing Zustand publication per owned success;
- no stale completion publication;
- date-index range search in `EXPLAIN QUERY PLAN`.

- [ ] **Step 3: Capture after-change performance on the same fixture/device**

Repeat Task 0 Step 7 with identical device, Android API, build profile, fixture prefix, warmups, and run counts. Acceptance:

- warm focus median at most 100 ms and p95 at most 200 ms;
- pull-to-refresh p95 at most 250 ms and both median/p95 improve from baseline;
- at most start-status and success-status Dashboard commits attributable to one warm snapshot load;
- no per-card completion cascade;
- no Dashboard-caused JS long task at least 50 ms;
- mounted large-group cards remain bounded to the `FlatList` render window;
- no warm-refresh skeleton remount, scroll jump, coordinate shift, or carousel reset.

If the unchanged baseline hardware cannot meet a numeric latency target, retain the before/after median and p95, require the query/publication targets to pass, and send the trace to Tariq for review before recommending merge.

- [ ] **Step 4: Inspect the focused diff before broad verification**

Run:

```bash
git diff --check
git status --short
git diff --stat 8074711...HEAD
git diff --name-only 8074711...HEAD
```

Expected: only the files in this plan appear. There must be no route, migration, package, lockfile, native, scheduler, shared UI-wrapper, or mutation-store change.

- [ ] **Step 5: Run exact local CI parity**

Run the repository-mandated chain from the worktree root:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ CI parity green — safe to push"
```

Expected: all six CI-equivalent jobs pass and the final green message prints. Do not push.

- [ ] **Step 6: Commit only verification fixes if the tree contains them**

If Steps 1–5 required edits to mapped files, stage those exact changed paths after inspecting `git status --short`, then commit:

```bash
git add \
  src/modules/dashboard \
  src/modules/accounts/database/account_stats.ts \
  src/constants/strings.ts \
  __tests__/dashboard_snapshot.query.test.ts \
  __tests__/dashboard.repository.test.ts \
  __tests__/dashboard.store.test.ts \
  __tests__/account_stats.query_executor.test.ts \
  __tests__/screens/dashboard
git commit -m "test(dashboard): verify snapshot performance ownership"
```

If there are no verification edits, do not create an empty commit.

- [ ] **Step 7: Prepare the mandatory user device-QA gate**

Hand the user this exact matrix; do not mark it complete on their behalf:

1. First Dashboard entry shows skeleton geometry, then real values; no financial zero flash.
2. Tab away and back: warm data stays mounted while one focus revalidation runs.
3. Pull to refresh on Overview and Accounts: only the native refresh indicator moves; cards do not skeletonize or jump.
4. Force an initial Dashboard query failure: header/settings remain usable and one centered HeroUI retry alert appears; no accounts empty state.
5. Force a warm refresh failure: existing values remain, refresh stops, and one absolute retry alert appears without moving content or blocking the global action area.
6. Zero-account database: the existing accounts `EmptyState` appears only after a successful snapshot.
7. Seven same-type accounts use the `ScrollView` path; eight use the `FlatList` path with identical first offset and next-card peek.
8. One hundred accounts: fast horizontal flings remain responsive, cards do not clip shadows, Add Account stays last, and account navigation opens the correct ID.
9. Verify 320/390/430-width emulations plus large font scaling.
10. Cross a controlled month boundary: old-month values are not shown beneath the new month label.

- [ ] **Step 8: Final handoff**

Report:

- targeted test and CI-parity command results;
- before/after SQL reads, data publications, React commits, median/p95 timings, long-task result, mounted-card count, and geometry result;
- the exact remaining user device-QA items;
- confirmation that no dependency, native, migration, auth/secure-store, push, merge, or destructive action occurred.

Do not recommend merge until automated verification is green, Tariq has reviewed any missed device latency guardrail, and the user completes physical-device QA.
