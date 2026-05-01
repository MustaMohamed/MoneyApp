# M2c — Transaction History Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the read side of M2 — paginated, searchable, filterable transaction list (U5) and read-only detail screen with delete (U7) — within the existing Transactions tab.

**Architecture:** Bottom-up TDD. (1) Foundation: theme tokens + strings + pure helpers (no React). (2) Data layer: extend `database/transactions.ts` with filter/search SQL, mirror through repository, then global Zustand store gains `setQuery`/`refresh`/`loadMore`/`getById` with a monotonic `requestId` race guard. (3) Screen-local Zustand for UI state (search query + active chip). (4) U5 list components (SectionList with sticky date headers, frosted-glass search bar, single-select chips). (5) U7 detail (gradient hero + read-only rows + Delete with confirm dialog; Edit visibly disabled with "Coming in M2d" caption). State boundaries: the global store owns the data list; the screen-local store owns chip + search; `transactions.hook.ts` is the only place that bridges them.

**Tech Stack:** React Native (Expo SDK, managed workflow), TypeScript strict, Expo Router v3 file-based routing, expo-sqlite (with `withTransactionAsync`), Zustand v5, react-native-reanimated v3, react-native-svg (already pulled in transitively by `@expo/vector-icons`), expo-linear-gradient, Jest with `npm run test:coverage` thresholds 80/95/100 on the logic layer.

**Spec:** `docs/superpowers/specs/2026-05-01-m2c-transaction-history-design.md` (commit `22b6500`).

---

## Conventions

- All file paths are absolute from the repo root.
- Snake_case filenames; camelCase TS identifiers.
- All sizing uses `ms()` / `msFont()` from `utils/responsive.ts`.
- All colors come from `constants/theme.ts` (no hex literals in components).
- All user-facing copy comes from `constants/strings.ts`.
- Tests live in `__tests__/` with snake_case names (e.g. `format_time_12h.test.ts`).
- `index.tsx` is a pure template: no `useState`, no `useSharedValue`. Logic in `*.hook.ts`. Screen-local UI state in `*.store.ts`. Animation in `*.anim.ts`.
- Per CLAUDE.md the project's logic-layer test coverage requirement (80 / 95 / 100) applies to helpers, stores, query executors, and repositories — **not** to React components, which are intentionally untested at the unit level.
- Branch is already `claude/start-m2c-vswu6`. Every commit goes there. Don't switch branches. Don't push until told to.
- Run `npm test` (or the relevant `--testPathPattern`) after every task; the suite must stay green before committing.

---

## Task 1: Add theme tokens

**Files:**
- Modify: `constants/theme.ts`

- [ ] **Step 1: Read the current file**

```bash
cat constants/theme.ts
```

Expected: see `Colors.dark`, `Colors.light`, `Colors.shared` blocks. Note that `FontFamily.soraExtra` is already defined and the font is already loaded in `app/_layout.tsx`.

- [ ] **Step 2: Append five new tokens to `Colors.shared` and one to `Colors.dark`**

In `Colors.shared`, after the existing `midnightBlue: '#1B2B4B'` line, add four colors (transfer blue + cc plum from the U5 spec, three hero gradient stops from the U7 spec):

```typescript
  shared: {
    cairoGold: '#C9973A',
    midnightBlue: '#1B2B4B',
    transferBlue: '#4A7ABF',
    ccPlum: '#5A2D55',
    heroGrad1: '#1A2948',
    heroGrad2: '#223060',
    heroGrad3: '#192A4A',
  },
```

In `Colors.dark`, after the existing `negative: '#E05A42'` line, add the danger tint used by the U7 action row's Delete button (12 % opacity over `#E05A42`):

```typescript
    negative: '#E05A42',
    dangerBg: 'rgba(224, 90, 66, 0.12)',
  },
```

Leave `Colors.light` unchanged — M2c only ships dark-mode surfaces.

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add constants/theme.ts
git commit -m "feat(m2c): add transferBlue, ccPlum, hero gradient + dangerBg theme tokens"
```

---

## Task 2: Add strings

**Files:**
- Modify: `constants/strings.ts`

- [ ] **Step 1: Append the U5 + U7 string block at the end of the `Strings` object (before the closing `} as const;`)**

Insert these lines just above `} as const;` (which currently sits at line 247):

```typescript
  // U5 Transaction List
  transactions: 'Transactions',
  searchTransactionsPlaceholder: 'Search transactions…',
  filterAll: 'All',
  filterExpense: 'Expense',
  filterIncome: 'Income',
  filterTransfer: 'Transfer',
  filterCcPayment: 'Credit Pay',
  transferTitle: 'Transfer',
  ccPaymentTitle: 'Credit Card Payment',
  unknownAccount: 'Unknown account',
  uncategorized: 'Uncategorized',
  noResultsHeadline: 'No transactions found',
  noResultsSubtext: 'Try a different search term or filter.',
  todayLabel: 'TODAY',
  yesterdayLabel: 'YESTERDAY',

  // U7 Transaction Detail
  detailHeader: 'Transaction',
  detailCategory: 'CATEGORY',
  detailAccount: 'ACCOUNT',
  detailDateTime: 'DATE & TIME',
  detailExchangeRate: 'EXCHANGE RATE',
  detailNote: 'NOTE',
  detailNoteEmpty: 'No note',
  capturedBadge: 'Captured',
  editTransaction: 'Edit Transaction',
  editComingSoon: 'Coming in M2d',
  deleteTransaction: 'Delete',
  deleteConfirmTitle: 'Delete this transaction?',
  deleteConfirmBody: 'The account balance will be restored. This cannot be undone.',
  deleteCancel: 'Cancel',
  detailNotFoundHeadline: 'Transaction not found',
  detailNotFoundCta: 'Back to transactions',
  errDeleteFailed: 'Could not delete transaction. Please try again.',
  typeBadgeExpense: 'Expense',
  typeBadgeIncome: 'Income',
  typeBadgeTransfer: 'Transfer',
  typeBadgeCcPayment: 'CC Payment',
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add constants/strings.ts
git commit -m "feat(m2c): add U5 + U7 string constants"
```

---

## Task 3: Add `formatTime12h` pure helper (TDD)

Used by `formatTransactionTitle` and the detail hero subtitle.

**Files:**
- Create: `utils/format_time_12h.ts`
- Test:   `__tests__/format_time_12h.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/format_time_12h.test.ts`:

```typescript
import { formatTime12h } from '@/utils/format_time_12h';

describe('formatTime12h', () => {
  it('formats midnight as 12:00 AM', () => {
    expect(formatTime12h('00:00:00')).toBe('12:00 AM');
  });

  it('formats early-morning hours with leading 12 hour', () => {
    expect(formatTime12h('00:05:00')).toBe('12:05 AM');
  });

  it('formats noon as 12:00 PM', () => {
    expect(formatTime12h('12:00:00')).toBe('12:00 PM');
  });

  it('formats afternoon time', () => {
    expect(formatTime12h('14:30:00')).toBe('2:30 PM');
  });

  it('formats end-of-day', () => {
    expect(formatTime12h('23:59:00')).toBe('11:59 PM');
  });

  it('zero-pads minutes', () => {
    expect(formatTime12h('09:05:30')).toBe('9:05 AM');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/format_time_12h.test.ts`
Expected: FAIL — `Cannot find module '@/utils/format_time_12h'`.

- [ ] **Step 3: Write the minimal implementation**

Create `utils/format_time_12h.ts`:

```typescript
/**
 * Convert a SQLite-stored 'HH:MM:SS' (24-hour) time string to 12-hour 'H:MM AM/PM'.
 *
 * Hours: 1–12 with no leading zero. Minutes: zero-padded.
 * Seconds are dropped.
 */
export function formatTime12h(time24: string): string {
  const [hStr, mStr] = time24.split(':');
  const hours24 = Number(hStr);
  const minutes = mStr.padStart(2, '0');
  const period = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${minutes} ${period}`;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/format_time_12h.test.ts`
Expected: PASS — 6 tests green.

- [ ] **Step 5: Commit**

```bash
git add utils/format_time_12h.ts __tests__/format_time_12h.test.ts
git commit -m "feat(m2c): add formatTime12h helper with tests"
```

---

## Task 4: Add `formatTransactionTitle` pure helper (TDD)

Used by `transaction_row.tsx` and the detail hero.

**Files:**
- Create: `utils/format_transaction_title.ts`
- Test:   `__tests__/format_transaction_title.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/format_transaction_title.test.ts`:

```typescript
import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { formatTransactionTitle } from '@/utils/format_transaction_title';

const baseTx: Transaction = {
  id: 'tx-1',
  type: TransactionType.Expense,
  amount: 50,
  currency: Currency.EGP,
  egp_amount: 50,
  exchange_rate: null,
  account_id: 'acc-cib',
  to_account_id: null,
  category_id: 'cat_food',
  note: null,
  transaction_date: '2026-05-01',
  transaction_time: '14:30:00',
  created_at: '2026-05-01T14:30:00.000Z',
  updated_at: '2026-05-01T14:30:00.000Z',
};

const accCib: Account = { id: 'acc-cib', name: 'CIB Savings' } as Account;
const accVf:  Account = { id: 'acc-vf',  name: 'Vodafone Cash' } as Account;
const catFood: Category = { id: 'cat_food', name: 'Food & Dining' } as Category;

describe('formatTransactionTitle — expense / income', () => {
  it('uses note when present', () => {
    const out = formatTransactionTitle({
      tx: { ...baseTx, note: 'Lunch with team' },
      account: accCib,
      category: catFood,
    });
    expect(out.title).toBe('Lunch with team');
    expect(out.subtitle).toBe('CIB Savings · 2:30 PM');
  });

  it('falls back to category name when note is empty', () => {
    const out = formatTransactionTitle({
      tx: { ...baseTx, note: '   ' },
      account: accCib,
      category: catFood,
    });
    expect(out.title).toBe('Food & Dining');
  });

  it('falls back to "Uncategorized" when both note and category are missing', () => {
    const out = formatTransactionTitle({
      tx: { ...baseTx, note: null, category_id: null },
      account: accCib,
    });
    expect(out.title).toBe(Strings.uncategorized);
  });

  it('subtitle uses "Unknown account" when account is missing', () => {
    const out = formatTransactionTitle({
      tx: baseTx,
      category: catFood,
    });
    expect(out.subtitle).toBe('Unknown account · 2:30 PM');
  });

  it('income behaves like expense', () => {
    const out = formatTransactionTitle({
      tx: { ...baseTx, type: TransactionType.Income, note: 'Monthly salary' },
      account: accCib,
      category: { id: 'cat_salary', name: 'Salary' } as Category,
    });
    expect(out.title).toBe('Monthly salary');
    expect(out.subtitle).toBe('CIB Savings · 2:30 PM');
  });
});

describe('formatTransactionTitle — transfer', () => {
  const transferTx: Transaction = {
    ...baseTx,
    type: TransactionType.Transfer,
    category_id: null,
    to_account_id: 'acc-vf',
  };

  it('uses note when present and shows source → target · time', () => {
    const out = formatTransactionTitle({
      tx: { ...transferTx, note: 'Move spending money' },
      account: accCib,
      toAccount: accVf,
    });
    expect(out.title).toBe('Move spending money');
    expect(out.subtitle).toBe('CIB Savings → Vodafone Cash · 2:30 PM');
  });

  it('falls back to "Transfer" title when no note', () => {
    const out = formatTransactionTitle({
      tx: transferTx,
      account: accCib,
      toAccount: accVf,
    });
    expect(out.title).toBe(Strings.transferTitle);
  });

  it('uses "Unknown account" for a missing target', () => {
    const out = formatTransactionTitle({
      tx: transferTx,
      account: accCib,
    });
    expect(out.subtitle).toBe('CIB Savings → Unknown account · 2:30 PM');
  });
});

describe('formatTransactionTitle — cc_payment', () => {
  const ccPaymentTx: Transaction = {
    ...baseTx,
    type: TransactionType.CCPayment,
    category_id: null,
    to_account_id: 'acc-cc',
  };
  const accCc: Account = { id: 'acc-cc', name: 'CIB Credit' } as Account;

  it('uses note when present', () => {
    const out = formatTransactionTitle({
      tx: { ...ccPaymentTx, note: 'April statement' },
      account: accCib,
      toAccount: accCc,
    });
    expect(out.title).toBe('April statement');
    expect(out.subtitle).toBe('CIB Savings → CIB Credit · 2:30 PM');
  });

  it('falls back to "Credit Card Payment" title', () => {
    const out = formatTransactionTitle({
      tx: ccPaymentTx,
      account: accCib,
      toAccount: accCc,
    });
    expect(out.title).toBe(Strings.ccPaymentTitle);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/format_transaction_title.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

Create `utils/format_transaction_title.ts`:

```typescript
import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { formatTime12h } from '@/utils/format_time_12h';

export interface FormatTitleArgs {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
}

export interface FormattedTitle {
  title: string;
  subtitle: string;
}

export function formatTransactionTitle({
  tx,
  account,
  toAccount,
  category,
}: FormatTitleArgs): FormattedTitle {
  const time = formatTime12h(tx.transaction_time);
  const accountName = account?.name ?? Strings.unknownAccount;
  const toAccountName = toAccount?.name ?? Strings.unknownAccount;
  const note = tx.note?.trim() || undefined;

  switch (tx.type) {
    case TransactionType.Expense:
    case TransactionType.Income:
      return {
        title: note ?? category?.name ?? Strings.uncategorized,
        subtitle: `${accountName} · ${time}`,
      };
    case TransactionType.Transfer:
      return {
        title: note ?? Strings.transferTitle,
        subtitle: `${accountName} → ${toAccountName} · ${time}`,
      };
    case TransactionType.CCPayment:
      return {
        title: note ?? Strings.ccPaymentTitle,
        subtitle: `${accountName} → ${toAccountName} · ${time}`,
      };
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/format_transaction_title.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add utils/format_transaction_title.ts __tests__/format_transaction_title.test.ts
git commit -m "feat(m2c): add formatTransactionTitle helper with tests"
```

---

## Task 5: Add `groupTransactionsByDate` pure helper (TDD)

Builds the `SectionList`-shaped sections with sticky date headers.

**Files:**
- Create: `utils/group_transactions_by_date.ts`
- Test:   `__tests__/group_transactions_by_date.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/group_transactions_by_date.test.ts`:

```typescript
import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import { groupTransactionsByDate } from '@/utils/group_transactions_by_date';

const NOW = new Date('2026-05-01T12:00:00.000Z');

function tx(date: string, time = '10:00:00', id = `tx-${date}-${time}`): Transaction {
  return {
    id,
    type: TransactionType.Expense,
    amount: 10,
    currency: Currency.EGP,
    egp_amount: 10,
    exchange_rate: null,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: null,
    note: null,
    transaction_date: date,
    transaction_time: time,
    created_at: `${date}T${time}.000Z`,
    updated_at: `${date}T${time}.000Z`,
  };
}

describe('groupTransactionsByDate', () => {
  it('returns empty array for no transactions', () => {
    expect(groupTransactionsByDate([], NOW)).toEqual([]);
  });

  it('labels today as TODAY · MMM D', () => {
    const out = groupTransactionsByDate([tx('2026-05-01')], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].key).toBe('TODAY · MAY 1');
    expect(out[0].data).toHaveLength(1);
  });

  it('labels yesterday as YESTERDAY · MMM D', () => {
    const out = groupTransactionsByDate([tx('2026-04-30')], NOW);
    expect(out[0].key).toBe('YESTERDAY · APR 30');
  });

  it('labels older same-year as MMM D', () => {
    const out = groupTransactionsByDate([tx('2026-04-15')], NOW);
    expect(out[0].key).toBe('APR 15');
  });

  it('labels older years as MMM D, YYYY', () => {
    const out = groupTransactionsByDate([tx('2025-12-12')], NOW);
    expect(out[0].key).toBe('DEC 12, 2025');
  });

  it('groups transactions on the same date together preserving order', () => {
    const a = tx('2026-05-01', '14:00:00', 'a');
    const b = tx('2026-05-01', '10:00:00', 'b');
    const out = groupTransactionsByDate([a, b], NOW);
    expect(out).toHaveLength(1);
    expect(out[0].data.map(t => t.id)).toEqual(['a', 'b']);
  });

  it('keeps DESC order across sections', () => {
    const today     = tx('2026-05-01', '12:00:00', 'today');
    const yesterday = tx('2026-04-30', '12:00:00', 'yest');
    const older     = tx('2026-04-15', '12:00:00', 'older');
    const lastYear  = tx('2025-12-12', '12:00:00', 'old');
    const out = groupTransactionsByDate([today, yesterday, older, lastYear], NOW);
    expect(out.map(s => s.key)).toEqual([
      'TODAY · MAY 1',
      'YESTERDAY · APR 30',
      'APR 15',
      'DEC 12, 2025',
    ]);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/group_transactions_by_date.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the minimal implementation**

Create `utils/group_transactions_by_date.ts`:

```typescript
import { Strings } from '@/constants/strings';
import type { Transaction } from '@/database/entities/transaction.entity';

export interface TransactionSection {
  key: string;
  data: Transaction[];
}

const MONTHS = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

/**
 * Group a date-sorted (DESC) Transaction[] into sections keyed by a
 * human-readable label. The input is expected to already be ordered DESC by
 * (transaction_date, transaction_time) — this helper does not re-sort.
 *
 * @param now optional reference date for testing determinism
 */
export function groupTransactionsByDate(
  txs: Transaction[],
  now: Date = new Date(),
): TransactionSection[] {
  const sections: TransactionSection[] = [];
  let currentKey: string | null = null;

  const today     = ymd(now);
  const yesterday = ymd(addDays(now, -1));
  const thisYear  = now.getFullYear();

  for (const t of txs) {
    const key = labelFor(t.transaction_date, today, yesterday, thisYear);
    if (key !== currentKey) {
      sections.push({ key, data: [] });
      currentKey = key;
    }
    sections[sections.length - 1].data.push(t);
  }
  return sections;
}

function labelFor(
  date: string,
  today: string,
  yesterday: string,
  thisYear: number,
): string {
  const [yStr, mStr, dStr] = date.split('-');
  const monthLabel = MONTHS[Number(mStr) - 1];
  const day = Number(dStr);
  const year = Number(yStr);

  if (date === today)     return `${Strings.todayLabel} · ${monthLabel} ${day}`;
  if (date === yesterday) return `${Strings.yesterdayLabel} · ${monthLabel} ${day}`;
  if (year === thisYear)  return `${monthLabel} ${day}`;
  return `${monthLabel} ${day}, ${year}`;
}

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/group_transactions_by_date.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add utils/group_transactions_by_date.ts __tests__/group_transactions_by_date.test.ts
git commit -m "feat(m2c): add groupTransactionsByDate helper with tests"
```

---

## Task 6: Add `useDebouncedValue` hook (TDD)

Generic 300 ms debounce for the search input.

**Files:**
- Create: `utils/use_debounced_value.hook.ts`
- Test:   `__tests__/use_debounced_value.hook.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/use_debounced_value.hook.test.ts`:

```typescript
import { act, renderHook } from '@testing-library/react-native';

import { useDebouncedValue } from '@/utils/use_debounced_value.hook';

describe('useDebouncedValue', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('returns the initial value synchronously', () => {
    const { result } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'hello' },
    });
    expect(result.current).toBe('hello');
  });

  it('updates after the delay', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'b' });
    expect(result.current).toBe('a');
    act(() => { jest.advanceTimersByTime(299); });
    expect(result.current).toBe('a');
    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current).toBe('b');
  });

  it('collapses rapid updates to the last value', () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: '' },
    });
    rerender({ v: 'a' });
    act(() => { jest.advanceTimersByTime(100); });
    rerender({ v: 'ab' });
    act(() => { jest.advanceTimersByTime(100); });
    rerender({ v: 'abc' });
    act(() => { jest.advanceTimersByTime(299); });
    expect(result.current).toBe('');
    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current).toBe('abc');
  });

  it('cleans up the timer on unmount', () => {
    const { rerender, unmount } = renderHook(({ v }) => useDebouncedValue(v, 300), {
      initialProps: { v: 'a' },
    });
    rerender({ v: 'b' });
    unmount();
    // No assertion needed — running pending timers must not throw / log.
    act(() => { jest.runAllTimers(); });
  });
});
```

- [ ] **Step 2: Verify the test setup is in place**

Run: `grep -l "@testing-library/react-native" package.json`
Expected: match. The repo already uses `@testing-library/react-native` for the existing M2b store tests via plain `renderHook`. If the import fails at test time, install with: `npm install --save-dev @testing-library/react-native` and re-run `npm install`.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest __tests__/use_debounced_value.hook.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the minimal implementation**

Create `utils/use_debounced_value.hook.ts`:

```typescript
import { useEffect, useState } from 'react';

/**
 * Returns `value` immediately on first render. On subsequent value changes,
 * waits `delayMs` of stillness before emitting the new value. Pending timers
 * are cancelled on value change or unmount.
 */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest __tests__/use_debounced_value.hook.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add utils/use_debounced_value.hook.ts __tests__/use_debounced_value.hook.test.ts
git commit -m "feat(m2c): add useDebouncedValue hook with tests"
```

---

## Task 7: Extend `getTransactions` SQL with filter + search (TDD)

The existing `getTransactions(db, limit, offset)` is replaced by `getTransactions(db, query)`. New `escapeLike` helper handles literal `%` / `_` in user input.

**Files:**
- Modify: `database/transactions.ts:82-93`
- Modify: `__tests__/transaction.query_executor.test.ts`

- [ ] **Step 1: Append the new failing tests at the bottom of `__tests__/transaction.query_executor.test.ts`**

Open `__tests__/transaction.query_executor.test.ts`. Find the last `describe(...)` block. Append a new top-level `describe` block at the end of the file (after the last closing `});`):

```typescript
describe('getTransactions — filter + search', () => {
  beforeEach(async () => {
    realDb.exec('DELETE FROM transactions');
    realDb
      .prepare(
        `INSERT OR IGNORE INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
         VALUES ('cat_food','Food & Dining','expense','food','#C9973A',1,0,?,?)`,
      )
      .run(NOW, NOW);
    realDb
      .prepare(
        `INSERT OR IGNORE INTO categories (id,name,type,icon,color,is_default,sort_order,created_at,updated_at)
         VALUES ('cat_salary','Salary','income','briefcase','#4CAF82',1,0,?,?)`,
      )
      .run(NOW, NOW);
  });

  async function insert(overrides: Partial<Transaction> = {}) {
    const tx: Transaction = {
      id: overrides.id ?? `tx-${Math.random().toString(36).slice(2, 9)}`,
      type: TransactionType.Expense,
      amount: 10,
      currency: Currency.EGP,
      egp_amount: 10,
      exchange_rate: null,
      account_id: 'acc_asset',
      to_account_id: null,
      category_id: 'cat_food',
      note: null,
      transaction_date: DATE,
      transaction_time: TIME,
      created_at: NOW,
      updated_at: NOW,
      ...overrides,
    };
    await addTransaction(SQLite as unknown as never, tx);
    return tx;
  }

  it('returns all transactions ordered DESC when no filter is provided', async () => {
    await insert({ id: 'a', transaction_date: '2026-04-30', transaction_time: '10:00:00' });
    await insert({ id: 'b', transaction_date: '2026-05-01', transaction_time: '10:00:00' });

    const out = await getTransactions(SQLite as unknown as never, {});
    expect(out.map((t) => t.id)).toEqual(['b', 'a']);
  });

  it('filters by type', async () => {
    await insert({ id: 'e', type: TransactionType.Expense });
    await insert({ id: 'i', type: TransactionType.Income, category_id: 'cat_salary' });

    const out = await getTransactions(SQLite as unknown as never, {
      type: TransactionType.Expense,
    });
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe('e');
  });

  it('searches by note', async () => {
    await insert({ id: 'with', note: 'Lunch with team' });
    await insert({ id: 'without', note: 'Coffee' });

    const out = await getTransactions(SQLite as unknown as never, { search: 'lunch' });
    expect(out.map((t) => t.id)).toEqual(['with']);
  });

  it('searches by category name (case-insensitive)', async () => {
    await insert({ id: 'food-tx', category_id: 'cat_food' });
    await insert({ id: 'salary-tx', type: TransactionType.Income, category_id: 'cat_salary' });

    const out = await getTransactions(SQLite as unknown as never, { search: 'FOOD' });
    expect(out.map((t) => t.id)).toEqual(['food-tx']);
  });

  it('searches by source account name', async () => {
    await insert({ id: 'on-checking' }); // account_id = acc_asset, name 'Checking'
    realDb
      .prepare(
        `INSERT OR IGNORE INTO accounts
         (id,name,type,currency,opening_balance,current_balance,
          interest_tracking,is_archived,sort_order,created_at,updated_at)
         VALUES ('acc_other','Vodafone','smart_wallet','EGP',0,0,0,0,2,?,?)`,
      )
      .run(NOW, NOW);
    await insert({ id: 'on-vodafone', account_id: 'acc_other' });

    const out = await getTransactions(SQLite as unknown as never, { search: 'check' });
    expect(out.map((t) => t.id)).toEqual(['on-checking']);
  });

  it('searches by destination account name on transfers', async () => {
    realDb
      .prepare(
        `INSERT OR IGNORE INTO accounts
         (id,name,type,currency,opening_balance,current_balance,
          interest_tracking,is_archived,sort_order,created_at,updated_at)
         VALUES ('acc_dst','Vault','physical_savings','EGP',0,0,0,0,3,?,?)`,
      )
      .run(NOW, NOW);

    await insert({
      id: 'xfer',
      type: TransactionType.Transfer,
      to_account_id: 'acc_dst',
      category_id: null,
    });

    const out = await getTransactions(SQLite as unknown as never, { search: 'vault' });
    expect(out.map((t) => t.id)).toEqual(['xfer']);
  });

  it('combines filter + search (AND)', async () => {
    await insert({ id: 'expense-food', note: 'Lunch' });
    await insert({
      id: 'income-lunch',
      type: TransactionType.Income,
      category_id: 'cat_salary',
      note: 'Lunch reimbursement',
    });

    const out = await getTransactions(SQLite as unknown as never, {
      search: 'lunch',
      type: TransactionType.Expense,
    });
    expect(out.map((t) => t.id)).toEqual(['expense-food']);
  });

  it('treats empty / whitespace search as no filter', async () => {
    await insert({ id: 'a' });
    await insert({ id: 'b' });

    const out = await getTransactions(SQLite as unknown as never, { search: '   ' });
    expect(out).toHaveLength(2);
  });

  it('escapes LIKE wildcards so a literal "%" does not match every row', async () => {
    await insert({ id: 'plain', note: 'Coffee' });
    await insert({ id: 'literal', note: '50% tip' });

    const out = await getTransactions(SQLite as unknown as never, { search: '50%' });
    expect(out.map((t) => t.id)).toEqual(['literal']);
  });

  it('paginates with LIMIT/OFFSET', async () => {
    for (let i = 0; i < 35; i++) {
      const day = String(i + 1).padStart(2, '0');
      await insert({ id: `p${i}`, transaction_date: `2026-03-${day}` });
    }

    const page1 = await getTransactions(SQLite as unknown as never, { limit: 30, offset: 0 });
    const page2 = await getTransactions(SQLite as unknown as never, { limit: 30, offset: 30 });
    expect(page1).toHaveLength(30);
    expect(page2).toHaveLength(5);
    expect(page1[0].id).not.toBe(page2[0].id);
  });
});
```

- [ ] **Step 2: Update the existing `describe('getTransactions', ...)` block to use the new signature**

Find the existing `getTransactions` callsites in this file (around the existing `describe('getTransactions'...)` and `describe('getTransactionsByAccount'...)` blocks). Replace any `getTransactions(db, limit, offset)` call with `getTransactions(db, { limit, offset })`. (Use `grep -n "getTransactions(" __tests__/transaction.query_executor.test.ts` to find every occurrence.) `getTransactionsByAccount` callsites are unchanged.

- [ ] **Step 3: Run the tests to verify the new ones fail**

Run: `npx jest __tests__/transaction.query_executor.test.ts`
Expected: the new "filter + search" describe block fails — most tests fail with "expected 1 received 2" or similar (the current SQL ignores filters). The existing tests stay green only if the signature update from Step 2 was applied; otherwise they break with "expected number, got object".

- [ ] **Step 4: Replace the existing `getTransactions` implementation in `database/transactions.ts:82-93`**

Open `database/transactions.ts`. Replace the existing `getTransactions` function with this new version, **keep** `getTransactionsByAccount`, `getTransactionById`, `addTransaction`, and `deleteTransaction` exactly as they are:

```typescript
import type { TransactionType } from '@/constants/enums';

export interface TransactionListQuery {
  limit?: number;
  offset?: number;
  type?: TransactionType;
  search?: string;
}

const PAGE_SIZE_DEFAULT = 30;

function escapeLike(input: string): string {
  // Escape SQL LIKE wildcards so user input can't act as a wildcard.
  // \ is the escape char declared by the ESCAPE clause below.
  return input.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_');
}

export async function getTransactions(
  db: SQLiteDatabase,
  query: TransactionListQuery = {},
): Promise<Transaction[]> {
  const limit  = query.limit  ?? PAGE_SIZE_DEFAULT;
  const offset = query.offset ?? 0;

  const typeParam: string | null = query.type ?? null;
  const trimmed = query.search?.trim();
  const searchParam: string | null = trimmed && trimmed.length > 0 ? trimmed : null;
  const likePattern = searchParam !== null ? `%${escapeLike(searchParam)}%` : null;

  return db.getAllAsync<Transaction>(
    `SELECT t.* FROM transactions t
     WHERE (? IS NULL OR t.type = ?)
       AND (
         ? IS NULL
         OR t.note LIKE ? ESCAPE '\\' COLLATE NOCASE
         OR EXISTS (
           SELECT 1 FROM accounts a
           WHERE a.id IN (t.account_id, t.to_account_id)
             AND a.name LIKE ? ESCAPE '\\' COLLATE NOCASE
         )
         OR EXISTS (
           SELECT 1 FROM categories c
           WHERE c.id = t.category_id
             AND c.name LIKE ? ESCAPE '\\' COLLATE NOCASE
         )
       )
     ORDER BY t.transaction_date DESC, t.transaction_time DESC
     LIMIT ? OFFSET ?`,
    [
      typeParam, typeParam,
      searchParam, likePattern, likePattern, likePattern,
      limit, offset,
    ],
  );
}
```

Notes:
- The `TransactionType` import goes at the top of the file beside the existing imports.
- The `ESCAPE '\\'` clause works alongside `COLLATE NOCASE`. SQLite is happy with both.
- The `searchParam` is used as the gating NULL-check; the three `likePattern` slots receive the wrapped pattern.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx jest __tests__/transaction.query_executor.test.ts`
Expected: all tests green (existing + new).

- [ ] **Step 6: Commit**

```bash
git add database/transactions.ts __tests__/transaction.query_executor.test.ts
git commit -m "feat(m2c): extend getTransactions with filter + search SQL"
```

---

## Task 8: Update `TransactionRepository.getAll` signature (TDD)

**Files:**
- Modify: `repositories/transaction.repository.ts:34-51`
- Modify: `__tests__/transaction.repository.test.ts`

- [ ] **Step 1: Open `__tests__/transaction.repository.test.ts` and locate the existing `getAll` describe block**

Run: `grep -n "getAll" __tests__/transaction.repository.test.ts`. Find the test that currently asserts `getTransactions` is called with `(db, 30, 0)`.

- [ ] **Step 2: Update the existing assertion to expect a query object**

Replace any `expect(getTransactions).toHaveBeenCalledWith(expect.anything(), 30, 0)` with `expect(getTransactions).toHaveBeenCalledWith(expect.anything(), { limit: 30, offset: 0 })`. Add two new tests below the existing `getAll` block:

```typescript
it('passes limit, offset, type, and search through to the executor', async () => {
  const repo = new TransactionRepository();
  await repo.getAll({ limit: 10, offset: 5, type: TransactionType.Income, search: 'food' });
  expect(getTransactions).toHaveBeenCalledWith(expect.anything(), {
    limit: 10,
    offset: 5,
    type: TransactionType.Income,
    search: 'food',
  });
});

it('defaults to an empty query object when no args are given', async () => {
  const repo = new TransactionRepository();
  await repo.getAll();
  expect(getTransactions).toHaveBeenCalledWith(expect.anything(), {});
});
```

If `TransactionType` isn't imported at the top of this test file, add `import { TransactionType } from '@/constants/enums';` next to the existing imports.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx jest __tests__/transaction.repository.test.ts`
Expected: FAIL — the existing `getAll` is `getAll(limit, offset)`, signature mismatch.

- [ ] **Step 4: Update the repository**

Open `repositories/transaction.repository.ts`. Re-export `TransactionListQuery` and update both the interface and the implementation:

```typescript
import uuid from 'react-native-uuid';

import { Currency, TransactionType } from '@/constants/enums';
import {
  addTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactions,
  getTransactionsByAccount,
  type TransactionListQuery,
} from '@/database/transactions';
import { getDb } from '@/database/client';
import type { Transaction } from '@/database/entities/transaction.entity';

export type { TransactionListQuery };

// NewTransactionInput stays exactly as-is.

export interface ITransactionRepository {
  getAll(query?: TransactionListQuery): Promise<Transaction[]>;
  getByAccount(accountId: string, limit?: number, offset?: number): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  add(data: NewTransactionInput): Promise<Transaction>;
  delete(id: string): Promise<void>;
}

export class TransactionRepository implements ITransactionRepository {
  async getAll(query: TransactionListQuery = {}): Promise<Transaction[]> {
    const db = await getDb();
    return getTransactions(db, query);
  }

  // getByAccount, getById, add, delete unchanged — copy from current file.
}
```

(Leave `getByAccount`, `getById`, `add`, and `delete` exactly as they are in the existing file.)

- [ ] **Step 5: Run the test to verify it passes**

Run: `npx jest __tests__/transaction.repository.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 6: Commit**

```bash
git add repositories/transaction.repository.ts __tests__/transaction.repository.test.ts
git commit -m "feat(m2c): repository getAll takes TransactionListQuery"
```

---

## Task 9: Rewrite global `transaction.store.ts` with paging + race guard (TDD)

The store gains: `query`, `hasMore`, `loading`, `setQuery`, `refresh`, `loadMore`, `getById`. `loadTransactions` is removed (callers will be updated in Task 10). `addTransaction` and `deleteTransaction` switch to calling `refresh()` instead of `loadTransactions()`.

**Files:**
- Modify: `store/transaction.store.ts`
- Modify: `__tests__/transaction.store.test.ts`

- [ ] **Step 1: Replace `__tests__/transaction.store.test.ts` with the new test suite**

Overwrite the file with:

```typescript
import { Currency, TransactionType } from '@/constants/enums';
import { createTransactionStore, PAGE_SIZE } from '@/store/transaction.store';
import type { Transaction } from '@/database/entities/transaction.entity';
import type {
  ITransactionRepository,
  NewTransactionInput,
  TransactionListQuery,
} from '@/repositories/transaction.repository';

const NOW = '2026-05-01T12:00:00.000Z';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: overrides.id ?? 'tx',
    type: TransactionType.Expense,
    amount: 100,
    currency: Currency.EGP,
    egp_amount: 100,
    exchange_rate: null,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat_food',
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function deferred<T>() {
  let resolve!: (v: T) => void;
  const promise = new Promise<T>((r) => { resolve = r; });
  return { promise, resolve };
}

function makeRepo(initial: Transaction[] = []): ITransactionRepository {
  let store = [...initial];
  return {
    getAll: jest.fn(async (query: TransactionListQuery = {}) => {
      let rows = store;
      if (query.type) rows = rows.filter((t) => t.type === query.type);
      const limit  = query.limit  ?? 30;
      const offset = query.offset ?? 0;
      return rows.slice(offset, offset + limit);
    }),
    getByAccount: jest.fn(async () => []),
    getById: jest.fn(async (id) => store.find((t) => t.id === id) ?? null),
    add: jest.fn(async (data: NewTransactionInput) => {
      const tx = makeTransaction({ id: 'tx-new', ...data });
      store = [tx, ...store];
      return tx;
    }),
    delete: jest.fn(async (id: string) => {
      store = store.filter((t) => t.id !== id);
    }),
  };
}

describe('transactionStore.setQuery', () => {
  it('replaces the list with the page-1 result for the new query', async () => {
    const txs = Array.from({ length: 5 }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({});
    expect(useStore.getState().transactions).toHaveLength(5);
    expect(useStore.getState().query).toEqual({});
  });

  it('sets hasMore=true at exactly PAGE_SIZE rows', async () => {
    const txs = Array.from({ length: PAGE_SIZE }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    expect(useStore.getState().hasMore).toBe(true);
  });

  it('sets hasMore=false when fewer than PAGE_SIZE rows return', async () => {
    const repo = makeRepo([makeTransaction({ id: 't1' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    expect(useStore.getState().hasMore).toBe(false);
  });

  it('toggles loading true during fetch and false on completion', async () => {
    const repo = makeRepo();
    const def = deferred<Transaction[]>();
    repo.getAll = jest.fn(() => def.promise);
    const useStore = createTransactionStore(repo);

    const inFlight = useStore.getState().setQuery({});
    expect(useStore.getState().loading).toBe(true);
    def.resolve([]);
    await inFlight;
    expect(useStore.getState().loading).toBe(false);
  });
});

describe('transactionStore.loadMore', () => {
  it('appends the next page and bumps the offset', async () => {
    const txs = Array.from({ length: PAGE_SIZE + 5 }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({});
    expect(useStore.getState().transactions).toHaveLength(PAGE_SIZE);
    await useStore.getState().loadMore();
    expect(useStore.getState().transactions).toHaveLength(PAGE_SIZE + 5);
    expect(useStore.getState().hasMore).toBe(false);
    expect(repo.getAll).toHaveBeenLastCalledWith({ limit: PAGE_SIZE, offset: PAGE_SIZE });
  });

  it('is a no-op when hasMore is false', async () => {
    const repo = makeRepo([makeTransaction({ id: 't1' })]);
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({});
    (repo.getAll as jest.Mock).mockClear();
    await useStore.getState().loadMore();
    expect(repo.getAll).not.toHaveBeenCalled();
  });

  it('is a no-op when already loading', async () => {
    const txs = Array.from({ length: PAGE_SIZE * 2 }, (_, i) => makeTransaction({ id: `t${i}` }));
    const repo = makeRepo(txs);
    const def = deferred<Transaction[]>();
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({});
    repo.getAll = jest.fn(() => def.promise);
    const first = useStore.getState().loadMore();
    const second = useStore.getState().loadMore();
    def.resolve([]);
    await Promise.all([first, second]);
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });
});

describe('transactionStore.refresh', () => {
  it('re-fetches page 1 with the current query', async () => {
    const txs = Array.from({ length: 3 }, (_, i) =>
      makeTransaction({ id: `t${i}`, type: TransactionType.Income, category_id: 'cat_salary' }),
    );
    txs.push(makeTransaction({ id: 'expense-1' }));
    const repo = makeRepo(txs);
    const useStore = createTransactionStore(repo);

    await useStore.getState().setQuery({ type: TransactionType.Income });
    (repo.getAll as jest.Mock).mockClear();
    await useStore.getState().refresh();
    expect(repo.getAll).toHaveBeenCalledWith({
      type: TransactionType.Income,
      limit: PAGE_SIZE,
      offset: 0,
    });
  });
});

describe('transactionStore.addTransaction / deleteTransaction', () => {
  it('addTransaction calls repo.add then refresh()', async () => {
    const repo = makeRepo();
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});

    await useStore.getState().addTransaction({
      type: TransactionType.Expense,
      amount: 50,
      currency: Currency.EGP,
      egp_amount: 50,
      account_id: 'acc-1',
      category_id: 'cat_food',
    });

    expect(repo.add).toHaveBeenCalled();
    expect(useStore.getState().transactions).toHaveLength(1);
  });

  it('deleteTransaction calls repo.delete then refresh()', async () => {
    const repo = makeRepo([makeTransaction({ id: 'tx-del' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().setQuery({});
    expect(useStore.getState().transactions).toHaveLength(1);

    await useStore.getState().deleteTransaction('tx-del');
    expect(repo.delete).toHaveBeenCalledWith('tx-del');
    expect(useStore.getState().transactions).toHaveLength(0);
  });
});

describe('transactionStore.getById', () => {
  it('passes through to repo.getById without touching list state', async () => {
    const tx = makeTransaction({ id: 'one' });
    const repo = makeRepo([tx]);
    const useStore = createTransactionStore(repo);
    const before = useStore.getState().transactions;

    const got = await useStore.getState().getById('one');
    expect(got?.id).toBe('one');
    expect(useStore.getState().transactions).toBe(before);
  });

  it('returns null for a missing id', async () => {
    const repo = makeRepo();
    const useStore = createTransactionStore(repo);
    const got = await useStore.getState().getById('missing');
    expect(got).toBeNull();
  });
});

describe('transactionStore — race guard', () => {
  it('drops out-of-order responses from rapid setQuery calls', async () => {
    const repo = makeRepo();
    const firstDef  = deferred<Transaction[]>();
    const secondDef = deferred<Transaction[]>();
    let call = 0;
    repo.getAll = jest.fn(() => (call++ === 0 ? firstDef.promise : secondDef.promise));

    const useStore = createTransactionStore(repo);
    const slow = useStore.getState().setQuery({ search: 'a' });
    const fast = useStore.getState().setQuery({ search: 'ab' });

    // Resolve the fresher request first, then the stale one.
    secondDef.resolve([makeTransaction({ id: 'fresh' })]);
    await fast;
    firstDef.resolve([makeTransaction({ id: 'stale' })]);
    await slow;

    expect(useStore.getState().transactions.map((t) => t.id)).toEqual(['fresh']);
    expect(useStore.getState().query).toEqual({ search: 'ab' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/transaction.store.test.ts`
Expected: FAIL — `PAGE_SIZE` and several store methods are not exported yet.

- [ ] **Step 3: Replace `store/transaction.store.ts` with the new implementation**

Overwrite the file:

```typescript
import { create } from 'zustand';

import type { TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import {
  TransactionRepository,
  type ITransactionRepository,
  type NewTransactionInput,
  type TransactionListQuery,
} from '@/repositories/transaction.repository';

export type { Transaction, NewTransactionInput, TransactionListQuery };

export const PAGE_SIZE = 30;

export interface TransactionListFilters {
  type?: TransactionType;
  search?: string;
}

interface TransactionState {
  transactions: Transaction[];
  hasMore: boolean;
  loading: boolean;
  query: TransactionListFilters;

  setQuery: (q: TransactionListFilters) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;

  getById: (id: string) => Promise<Transaction | null>;
  addTransaction: (data: NewTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
}

export function createTransactionStore(repo: ITransactionRepository) {
  // Module-scoped to this store instance — race guard for setQuery / loadMore / refresh.
  let requestId = 0;

  return create<TransactionState>((set, get) => {
    async function fetchPage(
      filters: TransactionListFilters,
      offset: number,
      mode: 'replace' | 'append',
    ) {
      const myId = ++requestId;
      set({ loading: true });
      try {
        const rows = await repo.getAll({ ...filters, limit: PAGE_SIZE, offset });
        if (myId !== requestId) return; // stale — newer request superseded us
        const hasMore = rows.length === PAGE_SIZE;
        if (mode === 'replace') {
          set({ transactions: rows, hasMore, loading: false, query: filters });
        } else {
          set({
            transactions: [...get().transactions, ...rows],
            hasMore,
            loading: false,
          });
        }
      } catch (err) {
        if (myId === requestId) set({ loading: false });
        console.error('[transactionStore] fetch failed:', err);
        throw err;
      }
    }

    return {
      transactions: [],
      hasMore: false,
      loading: false,
      query: {},

      setQuery: (q) => fetchPage(q, 0, 'replace'),

      refresh: () => fetchPage(get().query, 0, 'replace'),

      loadMore: async () => {
        const { hasMore, loading, query, transactions } = get();
        if (!hasMore || loading) return;
        await fetchPage(query, transactions.length, 'append');
      },

      getById: async (id) => repo.getById(id),

      addTransaction: async (data) => {
        const tx = await repo.add(data);
        await get().refresh();
        return tx;
      },

      deleteTransaction: async (id) => {
        await repo.delete(id);
        await get().refresh();
      },
    };
  });
}

export const useTransactionStore = createTransactionStore(new TransactionRepository());
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/transaction.store.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add store/transaction.store.ts __tests__/transaction.store.test.ts
git commit -m "feat(m2c): rewrite transaction store with paging, query, race guard, getById"
```

---

## Task 10: Replace `loadTransactions()` callsites

`loadTransactions` was removed from the store in Task 9. There's exactly one external caller: `app/(app)/_layout.tsx:14,19` (the app-level layout that warms the data on mount).

**Files:**
- Modify: `app/(app)/_layout.tsx:14,19`

- [ ] **Step 1: Find every remaining caller**

Run: `grep -rn "loadTransactions" --include="*.ts" --include="*.tsx" .`
Expected: only `app/(app)/_layout.tsx` lines 14 and 19. (If anything else shows up — fix it before continuing.)

- [ ] **Step 2: Replace the warm-up call with `setQuery({})`**

Open `app/(app)/_layout.tsx`. Replace lines 14 and 19:

```typescript
  const setTransactionQuery = useTransactionStore((s) => s.setQuery);
```

```typescript
    setTransactionQuery({}).catch(() => {});
```

The full updated effect:

```typescript
  useEffect(() => {
    loadAccounts().catch(() => {});
    loadCategories().catch(() => {});
    setTransactionQuery({}).catch(() => {});
    loadRate()
      .then(() => fetchRate())
      .catch(() => {});
  }, []);
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors. If TS reports `loadTransactions does not exist on TransactionState`, you missed a call — re-run the grep.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add app/(app)/_layout.tsx
git commit -m "chore(m2c): warm transactions via setQuery({}) instead of loadTransactions()"
```

---

## Task 11: Add screen-local UI store (TDD)

Holds search input value + active chip. Reset is invoked from the screen's `useFocusEffect` cleanup so leaving the tab returns the list to a clean state.

**Files:**
- Create: `app/(app)/(tabs)/transactions/transactions.store.ts`
- Create: `__tests__/transactions_screen.store.test.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/transactions_screen.store.test.ts`:

```typescript
import { TransactionType } from '@/constants/enums';
import { useTransactionsScreenStore } from '@/app/(app)/(tabs)/transactions/transactions.store';

describe('transactionsScreenStore', () => {
  beforeEach(() => useTransactionsScreenStore.getState().reset());

  it('starts with empty search and "all" filter', () => {
    const s = useTransactionsScreenStore.getState();
    expect(s.searchQuery).toBe('');
    expect(s.activeFilter).toBe('all');
  });

  it('setSearchQuery updates only the search field', () => {
    useTransactionsScreenStore.getState().setSearchQuery('food');
    const s = useTransactionsScreenStore.getState();
    expect(s.searchQuery).toBe('food');
    expect(s.activeFilter).toBe('all');
  });

  it('setActiveFilter updates only the filter field', () => {
    useTransactionsScreenStore.getState().setActiveFilter(TransactionType.Income);
    const s = useTransactionsScreenStore.getState();
    expect(s.activeFilter).toBe(TransactionType.Income);
    expect(s.searchQuery).toBe('');
  });

  it('clearSearch resets only the search field', () => {
    const s = useTransactionsScreenStore.getState();
    s.setSearchQuery('food');
    s.setActiveFilter(TransactionType.Expense);
    s.clearSearch();
    const next = useTransactionsScreenStore.getState();
    expect(next.searchQuery).toBe('');
    expect(next.activeFilter).toBe(TransactionType.Expense);
  });

  it('reset returns both fields to defaults', () => {
    const s = useTransactionsScreenStore.getState();
    s.setSearchQuery('x');
    s.setActiveFilter(TransactionType.Transfer);
    s.reset();
    const next = useTransactionsScreenStore.getState();
    expect(next.searchQuery).toBe('');
    expect(next.activeFilter).toBe('all');
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx jest __tests__/transactions_screen.store.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `app/(app)/(tabs)/transactions/transactions.store.ts`:

```typescript
import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';

export type TransactionFilter = TransactionType | 'all';

interface TransactionsScreenState {
  searchQuery: string;
  activeFilter: TransactionFilter;
  setSearchQuery: (q: string) => void;
  setActiveFilter: (f: TransactionFilter) => void;
  clearSearch: () => void;
  reset: () => void;
}

const INITIAL = { searchQuery: '', activeFilter: 'all' as const };

export const useTransactionsScreenStore = create<TransactionsScreenState>((set) => ({
  ...INITIAL,
  setSearchQuery: (q) => set({ searchQuery: q }),
  setActiveFilter: (f) => set({ activeFilter: f }),
  clearSearch: () => set({ searchQuery: '' }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx jest __tests__/transactions_screen.store.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/transactions.store.ts __tests__/transactions_screen.store.test.ts
git commit -m "feat(m2c): add screen-local transactions store"
```

---

## Task 12: Add screen-local animation file

**Files:**
- Create: `app/(app)/(tabs)/transactions/transactions.anim.ts`

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/transactions.anim.ts`:

```typescript
import { useSharedValue, withSequence, withSpring, withTiming } from 'react-native-reanimated';

/**
 * Press-feedback for a transaction row. Returns a shared value that the
 * row's animated style multiplies into its scale transform.
 */
export function useRowPressScale() {
  const scale = useSharedValue(1);
  return {
    scale,
    onPressIn:  () => { scale.value = withTiming(0.98, { duration: 80 }); },
    onPressOut: () => { scale.value = withSpring(1, { damping: 12, stiffness: 180 }); },
  };
}

/**
 * Press-feedback for a filter chip — a brief pop, then settle.
 */
export function useChipPressScale() {
  const scale = useSharedValue(1);
  return {
    scale,
    pop: () => {
      scale.value = withSequence(
        withTiming(1.05, { duration: 100 }),
        withSpring(1, { damping: 14, stiffness: 200 }),
      );
    },
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/transactions.anim.ts
git commit -m "feat(m2c): add transactions screen animations"
```

---

## Task 13: Extend `EmptyState` with `transactionsNoResults` variant

**Files:**
- Modify: `components/empty_states/index.tsx:8,12-38`

- [ ] **Step 1: Update the variant union and the config map**

Open `components/empty_states/index.tsx`. Two edits:

a. Line 8 — append the new variant:

```typescript
export type EmptyStateVariant =
  | 'accounts'
  | 'transactions'
  | 'transactionsNoResults'
  | 'bills'
  | 'goals'
  | 'budget';
```

b. Inside `VARIANT_CONFIG` (lines 12-38), add a new entry between `transactions` and `bills`:

```typescript
  transactionsNoResults: {
    icon: 'magnify-close',
    title: Strings.noResultsHeadline,
    sub: Strings.noResultsSubtext,
  },
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add components/empty_states/index.tsx
git commit -m "feat(m2c): add transactionsNoResults EmptyState variant"
```

---

## Task 14: Add `SearchBar` component

**Files:**
- Create: `app/(app)/(tabs)/transactions/components/search_bar.tsx`

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/components/search_bar.tsx`:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onClear: () => void;
}

export function SearchBar({ value, onChange, onClear }: Props) {
  return (
    <View style={styles.container}>
      <MaterialCommunityIcons
        name="magnify"
        size={ms(18)}
        color={Colors.dark.text2}
        style={styles.leadIcon}
      />
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={Strings.searchTransactionsPlaceholder}
        placeholderTextColor={Colors.dark.text2}
        style={styles.input}
        autoCorrect={false}
        autoCapitalize="none"
        returnKeyType="search"
      />
      {value.length > 0 && (
        <Pressable onPress={onClear} hitSlop={8} style={styles.clearBtn}>
          <MaterialCommunityIcons
            name="close-circle"
            size={ms(16)}
            color={Colors.dark.text2}
          />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    height: ms(40),
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    borderRadius: Radius.sm,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.sm,
  },
  leadIcon: { marginRight: Spacing.xs },
  input: {
    flex: 1,
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text1,
    paddingVertical: 0,
  },
  clearBtn: { marginLeft: Spacing.xs },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/components/search_bar.tsx
git commit -m "feat(m2c): add SearchBar component"
```

---

## Task 15: Add `FilterChips` component

**Files:**
- Create: `app/(app)/(tabs)/transactions/components/filter_chips.tsx`

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/components/filter_chips.tsx`:

```typescript
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';

import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';
import { useChipPressScale } from '../transactions.anim';
import type { TransactionFilter } from '../transactions.store';

interface Props {
  active: TransactionFilter;
  onChange: (f: TransactionFilter) => void;
}

const CHIPS: { key: TransactionFilter; labelKey: keyof typeof Strings }[] = [
  { key: 'all',                           labelKey: 'filterAll' },
  { key: TransactionType.Expense,         labelKey: 'filterExpense' },
  { key: TransactionType.Income,          labelKey: 'filterIncome' },
  { key: TransactionType.Transfer,        labelKey: 'filterTransfer' },
  { key: TransactionType.CCPayment,       labelKey: 'filterCcPayment' },
];

export function FilterChips({ active, onChange }: Props) {
  return (
    <View style={styles.wrap}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        {CHIPS.map((c) => (
          <Chip
            key={c.key}
            label={Strings[c.labelKey] as string}
            isActive={active === c.key}
            onPress={() => onChange(c.key)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function Chip({
  label,
  isActive,
  onPress,
}: {
  label: string;
  isActive: boolean;
  onPress: () => void;
}) {
  const { scale, pop } = useChipPressScale();
  const isActiveSv = useDerivedValue(() => withTiming(isActive ? 1 : 0, { duration: 200 }));

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      isActiveSv.value,
      [0, 1],
      [Colors.dark.surface, Colors.shared.cairoGold],
    ),
    borderColor: interpolateColor(
      isActiveSv.value,
      [0, 1],
      [Colors.dark.border, Colors.shared.cairoGold],
    ),
  }));

  const textStyle = useAnimatedStyle(() => ({
    color: interpolateColor(
      isActiveSv.value,
      [0, 1],
      [Colors.dark.text2, Colors.shared.midnightBlue],
    ),
  }));

  return (
    <Pressable
      onPress={() => {
        pop();
        onPress();
      }}
    >
      <Animated.View style={[styles.chip, containerStyle]}>
        <Animated.Text style={[styles.label, textStyle]}>{label}</Animated.Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: Spacing.sm,
  },
  row: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  chip: {
    borderWidth: 1,
    borderRadius: Radius.sm,
    paddingHorizontal: ms(12),
    paddingVertical: ms(5),
    justifyContent: 'center',
  },
  label: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(11),
    letterSpacing: 0.3,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/components/filter_chips.tsx
git commit -m "feat(m2c): add FilterChips component with single-select animations"
```

---

## Task 16: Add `DateHeader` component

**Files:**
- Create: `app/(app)/(tabs)/transactions/components/date_header.tsx`

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/components/date_header.tsx`:

```typescript
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Spacing } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';

interface Props {
  label: string;
}

export function DateHeader({ label }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: Colors.dark.bg,
    paddingHorizontal: Spacing.md,
    paddingVertical: ms(6),
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  text: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(10),
    color: Colors.dark.text2,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/components/date_header.tsx
git commit -m "feat(m2c): add DateHeader component"
```

---

## Task 17: Add `TransactionRow` component

**Files:**
- Create: `app/(app)/(tabs)/transactions/components/transaction_row.tsx`

This component is the visual heart of U5. It pulls together `formatTransactionTitle`, signed amount formatting, type-specific icons + colors, and the press animation.

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/components/transaction_row.tsx`:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { TransactionType } from '@/constants/enums';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { Account } from '@/database/entities/account.entity';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { formatTime12h } from '@/utils/format_time_12h';
import { formatTransactionTitle } from '@/utils/format_transaction_title';
import { ms, msFont } from '@/utils/responsive';
import { useRowPressScale } from '../transactions.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  tx: Transaction;
  account?: Account;
  toAccount?: Account;
  category?: Category;
  onPress: () => void;
}

const FALLBACK_ICON: IconName = 'shape-outline';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

interface TypeStyle {
  color: string;
  icon: IconName;
  prefix: string;
}

function styleForType(tx: Transaction, category?: Category): TypeStyle {
  switch (tx.type) {
    case TransactionType.Expense:
      return {
        color: Colors.dark.negative,
        icon: (category?.icon as IconName) ?? FALLBACK_ICON,
        prefix: '−',
      };
    case TransactionType.Income:
      return {
        color: Colors.dark.positive,
        icon: (category?.icon as IconName) ?? FALLBACK_ICON,
        prefix: '+',
      };
    case TransactionType.Transfer:
      return {
        color: Colors.shared.transferBlue,
        icon: 'swap-horizontal',
        prefix: '',
      };
    case TransactionType.CCPayment:
      return {
        color: Colors.shared.ccPlum,
        icon: 'credit-card-refund',
        prefix: '',
      };
  }
}

function bgFor(typeColor: string, categoryColor?: string): string {
  // Category color takes precedence for expense / income; type accent for the others.
  const base = categoryColor ?? typeColor;
  // 18% opacity tint via 8-digit hex (NN ≈ 0x2E).
  return base.length === 7 ? `${base}2E` : base;
}

export function TransactionRow({ tx, account, toAccount, category, onPress }: Props) {
  const { scale, onPressIn, onPressOut } = useRowPressScale();
  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const { title, subtitle } = formatTransactionTitle({ tx, account, toAccount, category });
  const t = styleForType(tx, category);
  const iconBg = bgFor(t.color, category?.color);
  const amountText = `${t.prefix}${numberFmt.format(tx.egp_amount)} EGP`;
  const time = formatTime12h(tx.transaction_time);

  return (
    <Pressable onPress={onPress} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.row, animStyle]}>
        <View style={[styles.iconBox, { backgroundColor: iconBg }]}>
          <MaterialCommunityIcons name={t.icon} size={ms(18)} color={t.color} />
        </View>
        <View style={styles.center}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: t.color }]}>{amountText}</Text>
          <Text style={styles.time}>{time}</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: ms(48),
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
    backgroundColor: Colors.dark.bg,
  },
  iconBox: {
    width: ms(36),
    height: ms(36),
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1 },
  title: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  subtitle: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(11),
    color: Colors.dark.text2,
    marginTop: 2,
  },
  right: { alignItems: 'flex-end' },
  amount: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
  },
  time: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(10),
    color: Colors.dark.text2,
    marginTop: 2,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/components/transaction_row.tsx
git commit -m "feat(m2c): add TransactionRow component with type-coded icons + amounts"
```

---

## Task 18: Add `LoadingFooter` component

**Files:**
- Create: `app/(app)/(tabs)/transactions/components/loading_footer.tsx`

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/components/loading_footer.tsx`:

```typescript
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Colors, Spacing } from '@/constants/theme';

export function LoadingFooter() {
  return (
    <View style={styles.wrap}>
      <ActivityIndicator color={Colors.shared.cairoGold} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/components/loading_footer.tsx
git commit -m "feat(m2c): add LoadingFooter component"
```

---

## Task 19: Add `transactions.hook.ts` (the bridge)

The single bridge between screen-local UI state, the global data store, and joined data from the account/category stores.

**Files:**
- Create: `app/(app)/(tabs)/transactions/transactions.hook.ts`

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/transactions.hook.ts`:

```typescript
import { useEffect, useMemo } from 'react';

import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionStore } from '@/store/transaction.store';
import { groupTransactionsByDate } from '@/utils/group_transactions_by_date';
import { useDebouncedValue } from '@/utils/use_debounced_value.hook';

import { useTransactionsScreenStore } from './transactions.store';

export type EmptyVariant = 'none' | 'noData' | 'noResults';

export function useTransactions() {
  // screen-local
  const searchQuery = useTransactionsScreenStore((s) => s.searchQuery);
  const activeFilter = useTransactionsScreenStore((s) => s.activeFilter);
  const setSearchQuery = useTransactionsScreenStore((s) => s.setSearchQuery);
  const setActiveFilter = useTransactionsScreenStore((s) => s.setActiveFilter);
  const clearSearch = useTransactionsScreenStore((s) => s.clearSearch);

  // global
  const transactions = useTransactionStore((s) => s.transactions);
  const hasMore = useTransactionStore((s) => s.hasMore);
  const loading = useTransactionStore((s) => s.loading);
  const setQuery = useTransactionStore((s) => s.setQuery);
  const loadMore = useTransactionStore((s) => s.loadMore);

  // joined
  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);

  const debouncedSearch = useDebouncedValue(searchQuery, 300);

  useEffect(() => {
    const trimmed = debouncedSearch.trim();
    setQuery({
      search: trimmed || undefined,
      type: activeFilter === 'all' ? undefined : activeFilter,
    }).catch(() => {});
  }, [debouncedSearch, activeFilter, setQuery]);

  const accountsById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const sections = useMemo(() => groupTransactionsByDate(transactions), [transactions]);

  const emptyVariant: EmptyVariant =
    transactions.length > 0
      ? 'none'
      : debouncedSearch.trim() || activeFilter !== 'all'
        ? 'noResults'
        : 'noData';

  return {
    sections,
    hasMore,
    loading,
    emptyVariant,
    searchQuery,
    activeFilter,
    accountsById,
    categoriesById,
    setSearchQuery,
    setActiveFilter,
    clearSearch,
    onEndReached: loadMore,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/transactions.hook.ts
git commit -m "feat(m2c): add useTransactions hook bridging screen + global state"
```

---

## Task 20: Add tab `_layout.tsx` and rewrite `index.tsx`

The tab folder needs a Stack so the dynamic detail route can be pushed without losing the tab bar. The `index.tsx` swaps from the bare `EmptyState` to the full list scaffold.

**Files:**
- Create: `app/(app)/(tabs)/transactions/_layout.tsx`
- Modify: `app/(app)/(tabs)/transactions/index.tsx` (full rewrite)

- [ ] **Step 1: Create the Stack layout**

Create `app/(app)/(tabs)/transactions/_layout.tsx`:

```typescript
import { Stack } from 'expo-router';

export default function TransactionsLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Rewrite `index.tsx`**

Overwrite `app/(app)/(tabs)/transactions/index.tsx` with:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/empty_states';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { AddTransactionSheet } from './add_transaction';
import { useAddTransactionStore } from './add_transaction/add_transaction.store';
import { DateHeader } from './components/date_header';
import { FilterChips } from './components/filter_chips';
import { LoadingFooter } from './components/loading_footer';
import { SearchBar } from './components/search_bar';
import { TransactionRow } from './components/transaction_row';
import { useTransactions } from './transactions.hook';
import { useTransactionsScreenStore } from './transactions.store';

export default function TransactionsScreen() {
  const t = useTransactions();
  const open = useAddTransactionStore((s) => s.open);
  const close = useAddTransactionStore((s) => s.close);
  const visible = useAddTransactionStore((s) => s.visible);

  // Reset filter + search when leaving the tab.
  useFocusEffect(
    useCallback(() => {
      return () => useTransactionsScreenStore.getState().reset();
    }, []),
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Text style={styles.title}>{Strings.transactions}</Text>
      </View>

      <SearchBar
        value={t.searchQuery}
        onChange={t.setSearchQuery}
        onClear={t.clearSearch}
      />
      <FilterChips active={t.activeFilter} onChange={t.setActiveFilter} />

      {t.emptyVariant !== 'none' ? (
        <View style={styles.body}>
          <EmptyState
            variant={t.emptyVariant === 'noData' ? 'transactions' : 'transactionsNoResults'}
          />
        </View>
      ) : (
        <SectionList
          sections={t.sections}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled
          renderSectionHeader={({ section }) => <DateHeader label={section.key} />}
          renderItem={({ item }) => (
            <TransactionRow
              tx={item}
              account={t.accountsById.get(item.account_id)}
              toAccount={
                item.to_account_id ? t.accountsById.get(item.to_account_id) : undefined
              }
              category={
                item.category_id ? t.categoriesById.get(item.category_id) : undefined
              }
              onPress={() =>
                router.push(`/(app)/(tabs)/transactions/detail/${item.id}`)
              }
            />
          )}
          onEndReached={t.onEndReached}
          onEndReachedThreshold={0.5}
          ListFooterComponent={t.loading && t.hasMore ? <LoadingFooter /> : null}
        />
      )}

      <Pressable
        style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
        onPress={open}
      >
        <MaterialCommunityIcons
          name="plus"
          size={ms(28)}
          color={Colors.shared.midnightBlue}
        />
      </Pressable>

      <AddTransactionSheet visible={visible} onClose={close} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    paddingHorizontal: Spacing.md,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  body: { flex: 1 },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.md,
    width: ms(56),
    height: ms(56),
    borderRadius: ms(28),
    backgroundColor: Colors.shared.cairoGold,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabPressed: { opacity: 0.85 },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Run the full test suite**

Run: `npm test`
Expected: all green (component tests aren't part of the suite, so this only verifies the logic layer didn't regress).

- [ ] **Step 5: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/_layout.tsx app/\(app\)/\(tabs\)/transactions/index.tsx
git commit -m "feat(m2c): wire transactions screen to U5 list with chips, search, and pagination"
```

---

## Task 21: Add detail screen animations

**Files:**
- Create: `app/(app)/(tabs)/transactions/detail/detail.anim.ts`

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/detail/detail.anim.ts`:

```typescript
import { useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { FadeInDown, FadeInUp } from 'react-native-reanimated';

export const heroEntering = FadeInDown.duration(300);
export const rowsEntering = FadeInUp.delay(150).duration(300);
export const actionEntering = FadeInUp.delay(250).duration(300);

/**
 * Press feedback for the Delete button in the action row.
 */
export function useDeletePressScale() {
  const scale = useSharedValue(1);
  return {
    scale,
    onPressIn:  () => { scale.value = withTiming(0.97, { duration: 80 }); },
    onPressOut: () => { scale.value = withSpring(1, { damping: 12, stiffness: 180 }); },
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/detail/detail.anim.ts
git commit -m "feat(m2c): add detail screen animations"
```

---

## Task 22: Add `DetailHero` component (gradient + SVG grid + amount)

**Files:**
- Create: `app/(app)/(tabs)/transactions/detail/components/detail_hero.tsx`

The hero uses `expo-linear-gradient` for the background and `react-native-svg` `<Pattern>` for the 26 px grid. `react-native-svg` is already installed transitively via `@expo/vector-icons` — no `npm install` needed.

- [ ] **Step 1: Verify `react-native-svg` resolves**

Run: `node -e "require.resolve('react-native-svg')"`
Expected: prints a path. If it errors with "Cannot find module", run `npm install --save react-native-svg` and re-run.

- [ ] **Step 2: Write the file**

Create `app/(app)/(tabs)/transactions/detail/components/detail_hero.tsx`:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { TransactionType } from '@/constants/enums';
import { Colors, FontFamily, Radius, Spacing } from '@/constants/theme';
import type { Category } from '@/database/entities/category.entity';
import type { Transaction } from '@/database/entities/transaction.entity';
import { ms, msFont } from '@/utils/responsive';
import { heroEntering } from '../detail.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  tx: Transaction;
  category?: Category;
  amountText: string;
  title: string;
  dateTimeText: string;
}

function colorFor(tx: Transaction, category?: Category): { color: string; icon: IconName } {
  switch (tx.type) {
    case TransactionType.Expense:
      return { color: Colors.dark.negative, icon: (category?.icon as IconName) ?? 'shape-outline' };
    case TransactionType.Income:
      return { color: Colors.dark.positive, icon: (category?.icon as IconName) ?? 'shape-outline' };
    case TransactionType.Transfer:
      return { color: Colors.shared.transferBlue, icon: 'swap-horizontal' };
    case TransactionType.CCPayment:
      return { color: Colors.shared.ccPlum, icon: 'credit-card-refund' };
  }
}

export function DetailHero({ tx, category, amountText, title, dateTimeText }: Props) {
  const { color, icon } = colorFor(tx, category);
  const tintBg = color.length === 7 ? `${color}2E` : color; // 18% opacity tint

  return (
    <Animated.View entering={heroEntering} style={styles.wrap}>
      <LinearGradient
        colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GridTexture />
      <View
        pointerEvents="none"
        style={[
          styles.glow,
          { backgroundColor: color, opacity: 0.25 },
        ]}
      />
      <View style={[styles.iconBox, { backgroundColor: tintBg }]}>
        <MaterialCommunityIcons name={icon} size={ms(28)} color={color} />
      </View>
      <Text style={[styles.amount, { color }]} numberOfLines={1}>
        {amountText}
      </Text>
      <Text style={styles.title} numberOfLines={1}>{title}</Text>
      <Text style={styles.meta} numberOfLines={1}>{dateTimeText}</Text>
    </Animated.View>
  );
}

function GridTexture() {
  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <Path d="M 26 0 L 0 0 0 26" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.02" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#grid)" />
    </Svg>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    overflow: 'hidden',
  },
  glow: {
    position: 'absolute',
    top: -ms(40),
    right: -ms(40),
    width: ms(160),
    height: ms(160),
    borderRadius: ms(80),
  },
  iconBox: {
    width: ms(52),
    height: ms(52),
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
  },
  amount: {
    fontFamily: FontFamily.soraExtra,
    fontSize: msFont(36),
    marginBottom: Spacing.xs,
  },
  title: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(16),
    color: Colors.dark.text1,
    opacity: 0.7,
  },
  meta: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(12),
    color: Colors.dark.text1,
    opacity: 0.35,
    marginTop: Spacing.xxs,
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/detail/components/detail_hero.tsx
git commit -m "feat(m2c): add DetailHero with gradient + SVG grid + type-coded amount"
```

---

## Task 23: Add `DetailRow` and `DetailRowsCard` components

**Files:**
- Create: `app/(app)/(tabs)/transactions/detail/components/detail_row.tsx`
- Create: `app/(app)/(tabs)/transactions/detail/components/detail_rows_card.tsx`

- [ ] **Step 1: Write `detail_row.tsx`**

Create `app/(app)/(tabs)/transactions/detail/components/detail_row.tsx`:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { StyleSheet, Text, View } from 'react-native';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  icon: IconName;
  label: string;
  value: string;
  badge?: string;
  sublabel?: string;
  muted?: boolean;
  showDivider?: boolean;
}

export function DetailRow({
  icon,
  label,
  value,
  badge,
  sublabel,
  muted,
  showDivider = true,
}: Props) {
  return (
    <View style={[styles.row, !showDivider && styles.noDivider]}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons name={icon} size={ms(16)} color={Colors.dark.text2} />
      </View>
      <View style={styles.center}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, muted && styles.valueMuted]} numberOfLines={2}>
          {value}
        </Text>
        {sublabel && <Text style={styles.sublabel}>{sublabel}</Text>}
      </View>
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  noDivider: { borderBottomWidth: 0 },
  iconBox: {
    width: ms(32),
    height: ms(32),
    borderRadius: Radius.sm,
    backgroundColor: Colors.dark.surfaceEl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1 },
  label: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(11),
    color: Colors.dark.text2,
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  value: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  valueMuted: { color: Colors.dark.text2 },
  sublabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(11),
    color: Colors.dark.text2,
    marginTop: 2,
  },
  badge: {
    backgroundColor: Colors.dark.surfaceEl,
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xxs,
    borderRadius: Radius.pill,
  },
  badgeText: {
    fontFamily: FontFamily.interSemi,
    fontSize: msFont(10),
    color: Colors.dark.text2,
    letterSpacing: 0.3,
  },
});
```

- [ ] **Step 2: Write `detail_rows_card.tsx`**

Create `app/(app)/(tabs)/transactions/detail/components/detail_rows_card.tsx`:

```typescript
import { StyleSheet, View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Colors, Radius, Spacing } from '@/constants/theme';
import { rowsEntering } from '../detail.anim';

interface Props {
  children: React.ReactNode;
}

export function DetailRowsCard({ children }: Props) {
  return (
    <Animated.View entering={rowsEntering} style={styles.card}>
      <View>{children}</View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.md,
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
});
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/detail/components/detail_row.tsx app/\(app\)/\(tabs\)/transactions/detail/components/detail_rows_card.tsx
git commit -m "feat(m2c): add DetailRow and DetailRowsCard components"
```

---

## Task 24: Add `ActionRow` component (Edit disabled + Delete)

**Files:**
- Create: `app/(app)/(tabs)/transactions/detail/components/action_row.tsx`

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/detail/components/action_row.tsx`:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { ms, msFont } from '@/utils/responsive';
import { actionEntering, useDeletePressScale } from '../detail.anim';

interface Props {
  onDelete: () => void;
}

export function ActionRow({ onDelete }: Props) {
  const { scale, onPressIn, onPressOut } = useDeletePressScale();
  const deleteAnim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <Animated.View entering={actionEntering} style={styles.row}>
      <View style={styles.editBtn}>
        <View style={styles.editInner}>
          <MaterialCommunityIcons
            name="pencil-outline"
            size={ms(18)}
            color={Colors.dark.text2}
          />
          <Text style={styles.editLabel}>{Strings.editTransaction}</Text>
        </View>
        <Text style={styles.editCaption}>{Strings.editComingSoon}</Text>
      </View>

      <Pressable onPress={onDelete} onPressIn={onPressIn} onPressOut={onPressOut} style={styles.deleteWrap}>
        <Animated.View style={[styles.deleteBtn, deleteAnim]}>
          <MaterialCommunityIcons
            name="delete-outline"
            size={ms(18)}
            color={Colors.dark.negative}
          />
          <Text style={styles.deleteLabel}>{Strings.deleteTransaction}</Text>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.sm,
    padding: Spacing.md,
  },
  editBtn: {
    flex: 1,
    minHeight: ms(52),
    borderRadius: Radius.cta,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
    opacity: 0.6,
  },
  editInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  editLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  editCaption: {
    fontFamily: FontFamily.interRegular,
    fontSize: msFont(10),
    color: Colors.dark.text2,
    marginTop: 2,
    letterSpacing: 0.2,
  },
  deleteWrap: { flex: 1 },
  deleteBtn: {
    flex: 1,
    minHeight: ms(52),
    borderRadius: Radius.cta,
    backgroundColor: Colors.dark.dangerBg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
  },
  deleteLabel: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.negative,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/detail/components/action_row.tsx
git commit -m "feat(m2c): add ActionRow with disabled Edit + active Delete"
```

---

## Task 25: Add `DeleteConfirmDialog`

Mirrors the existing `app/(app)/settings/categories/components/delete_confirmation_dialog.tsx` pattern (transparent native `Modal`, fade, centered card). Adds a `busy` spinner state for the in-flight delete.

**Files:**
- Create: `app/(app)/(tabs)/transactions/detail/components/delete_confirm_dialog.tsx`

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/detail/components/delete_confirm_dialog.tsx`:

```typescript
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';

interface Props {
  visible: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({ visible, busy, onCancel, onConfirm }: Props) {
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={busy ? () => {} : onCancel}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>{Strings.deleteConfirmTitle}</Text>
          <Text style={styles.body}>{Strings.deleteConfirmBody}</Text>
          <View style={styles.btnRow}>
            <Pressable
              onPress={onCancel}
              disabled={busy}
              style={[styles.btn, styles.cancelBtn]}
            >
              <Text style={styles.cancelText}>{Strings.deleteCancel}</Text>
            </Pressable>
            <Pressable
              onPress={onConfirm}
              disabled={busy}
              style={[styles.btn, styles.deleteBtn]}
            >
              {busy ? (
                <ActivityIndicator color={Colors.dark.text1} />
              ) : (
                <Text style={styles.deleteText}>{Strings.deleteTransaction}</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  dialog: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    width: '100%',
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    marginBottom: Spacing.sm,
  },
  body: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.body,
    color: Colors.dark.text2,
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  btnRow: { flexDirection: 'row', gap: Spacing.sm },
  btn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    backgroundColor: Colors.dark.surfaceEl,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  deleteBtn: { backgroundColor: Colors.dark.negative },
  cancelText: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  deleteText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/detail/components/delete_confirm_dialog.tsx
git commit -m "feat(m2c): add DeleteConfirmDialog mirroring categories delete pattern"
```

---

## Task 26: Add `NotFoundState` component

Shown when the detail route loads with an id that doesn't match any transaction (e.g. stale deep link or already-deleted row).

**Files:**
- Create: `app/(app)/(tabs)/transactions/detail/components/not_found_state.tsx`

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/detail/components/not_found_state.tsx`:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';

export function NotFoundState() {
  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>
        <MaterialCommunityIcons
          name="alert-circle-outline"
          size={Size.iconHero}
          color={Colors.dark.text2}
        />
      </View>
      <Text style={styles.title}>{Strings.detailNotFoundHeadline}</Text>
      <Pressable style={styles.cta} onPress={() => router.back()}>
        <Text style={styles.ctaText}>{Strings.detailNotFoundCta}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    gap: Spacing.sm,
  },
  iconBox: {
    width: Size.iconHero * 1.5,
    height: Size.iconHero * 1.5,
    borderRadius: Size.iconHero * 0.75,
    backgroundColor: Colors.dark.surface,
    borderWidth: 1,
    borderColor: Colors.dark.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.sm,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  cta: {
    marginTop: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.cta,
    backgroundColor: Colors.shared.cairoGold,
  },
  ctaText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.shared.midnightBlue,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/detail/components/not_found_state.tsx
git commit -m "feat(m2c): add NotFoundState component"
```

---

## Task 27: Add `detail.hook.ts`

Loads the transaction by id, derives all display values once, and owns the delete-confirmation flow. No screen-local Zustand here — all state is local React state.

**Files:**
- Create: `app/(app)/(tabs)/transactions/detail/detail.hook.ts`

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/detail/detail.hook.ts`:

```typescript
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';

import { TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionStore } from '@/store/transaction.store';
import type { Transaction } from '@/database/entities/transaction.entity';
import { formatTime12h } from '@/utils/format_time_12h';
import { formatTransactionTitle } from '@/utils/format_transaction_title';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export type DetailState = 'loading' | 'notFound' | 'ready';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: 'Bank',
  smart_wallet: 'Smart Wallet',
  physical_wallet: 'Physical Wallet',
  physical_savings: 'Physical Savings',
  credit_card: 'Credit Card',
};

const TYPE_BADGE: Record<TransactionType, string> = {
  [TransactionType.Expense]: Strings.typeBadgeExpense,
  [TransactionType.Income]: Strings.typeBadgeIncome,
  [TransactionType.Transfer]: Strings.typeBadgeTransfer,
  [TransactionType.CCPayment]: Strings.typeBadgeCcPayment,
};

function formatLongDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function signedAmount(tx: Transaction): string {
  const num = numberFmt.format(tx.egp_amount);
  if (tx.type === TransactionType.Expense) return `−${num} EGP`;
  if (tx.type === TransactionType.Income) return `+${num} EGP`;
  return `${num} EGP`;
}

export function useTransactionDetail(id: string) {
  const [tx, setTx] = useState<Transaction | null | undefined>(undefined);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const getById = useTransactionStore((s) => s.getById);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);

  useEffect(() => {
    let cancelled = false;
    getById(id)
      .then((t) => { if (!cancelled) setTx(t); })
      .catch((e) => {
        console.error('[transactionDetail] getById failed', e);
        if (!cancelled) setTx(null);
      });
    return () => { cancelled = true; };
  }, [id, getById]);

  const accountsById = useMemo(
    () => new Map(accounts.map((a) => [a.id, a])),
    [accounts],
  );
  const categoriesById = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const state: DetailState =
    tx === undefined ? 'loading' : tx === null ? 'notFound' : 'ready';

  const derived = useMemo(() => {
    if (!tx) return null;
    const account = accountsById.get(tx.account_id);
    const toAccount = tx.to_account_id ? accountsById.get(tx.to_account_id) : undefined;
    const category = tx.category_id ? categoriesById.get(tx.category_id) : undefined;
    const { title } = formatTransactionTitle({ tx, account, toAccount, category });

    const time = formatTime12h(tx.transaction_time);
    const dateLong = formatLongDate(tx.transaction_date);

    return {
      title,
      amountText: signedAmount(tx),
      dateTimeText: `${dateLong} · ${time}`,
      categoryLabel: category?.name ?? Strings.uncategorized,
      categoryBadge: TYPE_BADGE[tx.type],
      accountLabel: toAccount
        ? `${account?.name ?? Strings.unknownAccount} → ${toAccount.name}`
        : account?.name ?? Strings.unknownAccount,
      accountTypeLabel: account ? ACCOUNT_TYPE_LABELS[account.type] : undefined,
      exchangeRateText:
        tx.exchange_rate !== null
          ? `1 USD = ${numberFmt.format(tx.exchange_rate)} EGP`
          : undefined,
      noteText: tx.note?.trim() || Strings.detailNoteEmpty,
      category,
    };
  }, [tx, accountsById, categoriesById]);

  const openDeleteConfirm = useCallback(() => setConfirmVisible(true), []);
  const closeDeleteConfirm = useCallback(() => {
    if (!deleting) setConfirmVisible(false);
  }, [deleting]);

  const confirmDelete = useCallback(async () => {
    if (!tx) return;
    setDeleting(true);
    try {
      await deleteTransaction(tx.id);
      router.back();
    } catch (e) {
      console.error('[transactionDetail] delete failed', e);
      Alert.alert(Strings.errDeleteFailed);
    } finally {
      setDeleting(false);
      setConfirmVisible(false);
    }
  }, [tx, deleteTransaction]);

  return {
    state,
    tx,
    derived,
    confirmVisible,
    deleting,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/detail/detail.hook.ts
git commit -m "feat(m2c): add useTransactionDetail hook with derived display values"
```

---

## Task 28: Add the detail route `[id].tsx`

Pure template, no logic. Reads `id` from `useLocalSearchParams`, renders one of three states.

**Files:**
- Create: `app/(app)/(tabs)/transactions/detail/[id].tsx`

- [ ] **Step 1: Write the file**

Create `app/(app)/(tabs)/transactions/detail/[id].tsx`:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import { ActionRow } from './components/action_row';
import { DeleteConfirmDialog } from './components/delete_confirm_dialog';
import { DetailHero } from './components/detail_hero';
import { DetailRow } from './components/detail_row';
import { DetailRowsCard } from './components/detail_rows_card';
import { NotFoundState } from './components/not_found_state';
import { useTransactionDetail } from './detail.hook';

export default function TransactionDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const d = useTransactionDetail(id);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <MaterialCommunityIcons
            name="chevron-left"
            size={Size.iconBack}
            color={Colors.dark.text2}
          />
        </Pressable>
        <Text style={styles.title}>{Strings.detailHeader}</Text>
        <View style={styles.backBtn} />
      </View>

      {d.state === 'loading' && (
        <View style={styles.center}>
          <ActivityIndicator color={Colors.shared.cairoGold} />
        </View>
      )}

      {d.state === 'notFound' && <NotFoundState />}

      {d.state === 'ready' && d.tx && d.derived && (
        <>
          <ScrollView contentContainerStyle={styles.scroll}>
            <DetailHero
              tx={d.tx}
              category={d.derived.category}
              amountText={d.derived.amountText}
              title={d.derived.title}
              dateTimeText={d.derived.dateTimeText}
            />

            <DetailRowsCard>
              <DetailRow
                icon="shape"
                label={Strings.detailCategory}
                value={d.derived.categoryLabel}
                badge={d.derived.categoryBadge}
              />
              <DetailRow
                icon="card-bulleted-outline"
                label={Strings.detailAccount}
                value={d.derived.accountLabel}
                sublabel={d.derived.accountTypeLabel}
              />
              <DetailRow
                icon="calendar"
                label={Strings.detailDateTime}
                value={d.derived.dateTimeText}
              />
              {d.derived.exchangeRateText && (
                <DetailRow
                  icon="earth"
                  label={Strings.detailExchangeRate}
                  value={d.derived.exchangeRateText}
                  badge={Strings.capturedBadge}
                />
              )}
              <DetailRow
                icon="text"
                label={Strings.detailNote}
                value={d.derived.noteText}
                muted={!d.tx.note}
                showDivider={false}
              />
            </DetailRowsCard>

            <ActionRow onDelete={d.openDeleteConfirm} />
          </ScrollView>

          <DeleteConfirmDialog
            visible={d.confirmVisible}
            busy={d.deleting}
            onCancel={d.closeDeleteConfirm}
            onConfirm={d.confirmDelete}
          />
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  header: {
    height: Size.headerHeight,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.dark.border,
  },
  backBtn: {
    width: Size.backBtn,
    height: Size.backBtn,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.title,
    color: Colors.dark.text1,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { paddingBottom: ms(40) },
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `npx tsc --noEmit`
Expected: zero errors.

- [ ] **Step 3: Run the full test suite**

Run: `npm test`
Expected: all green.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/\(tabs\)/transactions/detail/\[id\].tsx
git commit -m "feat(m2c): wire U7 detail route with read-only rows + delete dialog"
```

---

## Task 29: Coverage check

**Files:** none modified.

- [ ] **Step 1: Run coverage**

Run: `npm run test:coverage`
Expected: Jest reports the configured thresholds (per `jest.config.js` — currently `80 / 95 / 100` on lines / functions / branches for the logic layer). All thresholds must pass.

- [ ] **Step 2: If a threshold fails, identify the file**

Coverage failures call out the exact file. The likely candidates:
- `database/transactions.ts` — `escapeLike`'s rare paths (e.g., backslash literal). Add a test if so.
- `store/transaction.store.ts` — the `loading: false` path in the catch when the request is stale. Add a test that throws inside a stale request to cover it.
- `utils/group_transactions_by_date.ts` — the `addDays` path is hit indirectly via "yesterday"; if not, add a direct yesterday test (already present).

Add the targeted test, re-run coverage, and only proceed when 80 / 95 / 100 is green.

- [ ] **Step 3: If everything is green, no commit needed**

Skip to Task 30.

---

## Task 30: Manual smoke test

This is the final gate before the plan is considered done. The dev server may not be available in the agent environment — if not, mark steps as "untestable in this environment" and call it out.

**Files:** none.

- [ ] **Step 1: Start the Expo dev server**

Run: `npm start` (or `npx expo start`)
Expected: a QR code + Metro bundler. If the environment doesn't support it, skip steps 2-13 and write "Not testable in this environment — needs device or simulator." in the final report.

- [ ] **Step 2: Open the app on a device or simulator and seed at least one of each transaction type**

Use the Add Transaction FAB to create:
- One Expense with a note ("Lunch")
- One Expense without a note (should fall back to category name)
- One Income
- One Transfer between two accounts
- One CC Payment from a non-CC asset to a CC account
- One Expense in USD with an exchange rate (e.g., 50 EGP per USD)

- [ ] **Step 3: Verify list rendering**
- All transactions appear under the correct date header (`TODAY · MMM D` for today).
- Order is DESC by `transaction_date` then `transaction_time`.
- Color coding: expense = red, income = green, transfer = blue, cc_payment = plum.
- Subtitle for transfer/cc_payment shows `From → To · time`.
- The amount-without-note expense shows the category name as the row title.

- [ ] **Step 4: Filter chips**
- Tap each chip — only matching rows visible.
- "All" returns the unfiltered list.
- Tap chips rapidly — the gold animates smoothly without flicker.

- [ ] **Step 5: Search**
- Type a partial word in a transaction note (e.g., "lun" for "Lunch") — the row appears after ~300 ms.
- Search by category ("food").
- Search by account name ("CIB").
- Combine with a chip — both AND.
- Empty search → list returns to full data.
- The clear (x) button shows when search has text and clears the input on tap.

- [ ] **Step 6: Pagination**
- Seed 35+ transactions (use the FAB rapidly or add via SQL).
- Scroll to the bottom — the next 30 rows append; spinner appears briefly while loading.
- Reaching the end of the list — no more loading attempts.

- [ ] **Step 7: Empty states**
- Filter by `Income` when no income exists → `noResults` empty state.
- Search for "zzzz" → `noResults` state.
- On a fresh install with no data → `transactions` (zero-data) state.

- [ ] **Step 8: Tab blur reset**
- Set chip = `Expense`, type something in search.
- Switch to another tab and back.
- The list resets to `All` + empty search.

- [ ] **Step 9: Detail navigation**
- Tap any row — detail screen appears with the gradient hero, all the metadata rows, and the action row.
- Edit button is visibly dimmed with the "Coming in M2d" caption underneath.
- Tap Back → returns to the list at the same scroll position.

- [ ] **Step 10: Detail metadata correctness**
- For an Expense with USD: the Exchange Rate row appears with "1 USD = 50 EGP" + "Captured" badge.
- For an EGP-only transaction: no Exchange Rate row.
- Empty note shows "No note" muted.

- [ ] **Step 11: Delete flow — happy path**
- Tap Delete → confirmation dialog appears.
- Tap Cancel → dialog closes, transaction still present.
- Re-open detail, tap Delete → Confirm → spinner spins → navigates back to the list, the row is gone, the source account's balance is restored. For cc_payment: both source AND CC `revolving_balance` restore.

- [ ] **Step 12: Delete-while-filtered**
- Apply a filter (e.g., `Expense`).
- Open and delete an expense.
- Returns to the list with the filter still active.

- [ ] **Step 13: Stale deep link**
- Open detail for an existing transaction.
- Without leaving, ssh in (or use SQLite browser) to delete that row from the DB.
- Pull-to-refresh isn't available; instead navigate back and re-tap. The detail should now show the `NotFoundState`.

- [ ] **Step 14: Final tests pass**

Run: `npm run test:coverage`
Expected: thresholds still green.

- [ ] **Step 15: Push the branch**

Run: `git push -u origin claude/start-m2c-vswu6`
Expected: `Everything up-to-date` if already pushed each commit, or new commits sent. Retry up to 4 times with exponential backoff (2s, 4s, 8s, 16s) on network failure.

- [ ] **Step 16: Mark M2c done**

Report to the user: feature complete, branch pushed, coverage green, manual smoke pass log (or a list of the steps that couldn't be run in the agent environment).

---

## Spec coverage map

This is a self-check of the plan against `docs/superpowers/specs/2026-05-01-m2c-transaction-history-design.md`. Every spec section maps to one or more tasks.

| Spec section | Task(s) |
|---|---|
| §1 Overview / In scope | Tasks 1–28 (full implementation) |
| §1 Out of scope (Edit, U31, Budget Impact) | Documented in Task 24 (Edit disabled caption) and the spec itself; no work in this plan |
| §2 File layout | Tasks 1–28 (each new file landed in its own task; updated files modified in their respective tasks) |
| §3.1 `getTransactions` extension + `escapeLike` | Task 7 |
| §3.2 Repository signature | Task 8 |
| §3.3 Store shape (`setQuery`, `refresh`, `loadMore`, `getById`, race guard) | Task 9 |
| §3.4 Add/delete under filter behaviour | Tested in Task 9; documented in Task 30 step 12 |
| §4.1 `transactions.store.ts` | Task 11 |
| §4.2 `transactions.hook.ts` | Task 19 |
| §4.3 `index.tsx` template + `useFocusEffect` reset | Task 20 |
| §4.4 `transactions.anim.ts` | Task 12 |
| §5.1 `search_bar.tsx` | Task 14 |
| §5.2 `filter_chips.tsx` | Task 15 |
| §5.3 `transaction_row.tsx` | Task 17 |
| §5.4 `date_header.tsx` | Task 16 |
| §5.5 `loading_footer.tsx` | Task 18 |
| §5.6 `EmptyState` extension | Task 13 |
| §5.7 `format_transaction_title.ts` | Task 4 |
| §5.8 `group_transactions_by_date.ts` | Task 5 |
| §5.9 `format_time_12h.ts` | Task 3 |
| §5.10 `use_debounced_value.hook.ts` | Task 6 |
| §6.1 `detail/[id].tsx` template | Task 28 |
| §6.2 `detail.hook.ts` | Task 27 |
| §6.3 `detail_hero.tsx` | Task 22 |
| §6.4 `detail_rows_card.tsx` | Task 23 |
| §6.5 `detail_row.tsx` | Task 23 |
| §6.6 `action_row.tsx` | Task 24 |
| §6.7 `delete_confirm_dialog.tsx` | Task 25 |
| §6.8 `not_found_state.tsx` | Task 26 |
| §6.9 `detail.anim.ts` | Task 21 |
| §7.1 Theme additions | Task 1 |
| §7.2 String additions | Task 2 |
| §7.3 Font (already loaded — no work) | Verified in spec; no task required |
| §8 Tests | Tasks 3–11 (per-task TDD) + Task 29 (coverage gate) |
| §9 Animation reference | Tasks 12 + 21 + per-component animations |
| §10 Definition of Done | Task 30 step-by-step manual smoke test |
| §11 Notes & Deferrals | Reflected in Tasks 24 (Edit caption) and 27 (no Edit handler) |

No spec section without a task. No task without a spec section.

