# Section 5 · Dashboard — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Dashboard domain to HeroUI Native + Cairo Nights, introduce a 2-segment IA (Overview · Accounts) inside the Dashboard tab, redesign the Net Worth Breakdown sheet around the Liquid/Reserve liquidity-tier framing, and retire the last `react-native-actions-sheet` consumer in this domain.

**Architecture:** v1/v2 directory split (same pattern §2 used). V1 code at `screens/dashboard/` stays untouched until the cleanup task. V2 code lives in `screens/dashboard_v2/`. The route file `app/(app)/(tabs)/dashboard/index.tsx` becomes a flag-branch component reading `FeatureFlags.newDashboard`. After local QA, a single promotion commit flips the flag; a cleanup commit deletes V1, restores the route to a one-line re-export, removes the flag, and updates CLAUDE.md.

**Tech Stack:** React Native · Expo · TypeScript strict · Expo Router v3 · expo-sqlite · Zustand v5 · HeroUI Native v1.0 · Unistyles 3 (via Uniwind) · @gorhom/bottom-sheet v5 · react-native-reanimated v4 · MaterialCommunityIcons · expo-linear-gradient · Jest · React Native Testing Library

**Spec:** [`docs/superpowers/specs/2026-05-16-section-5-dashboard-design.md`](../specs/2026-05-16-section-5-dashboard-design.md)

---

## Parallel Execution Map

```
Group A (Shared infra)              ─── no deps ──► can start immediately
  Task 1: Helpers — computeLiquidityBreakdown + computeLiabilitiesBreakdown
  Task 2: Strings — add new keys

Group B (V2 scaffold)               ─── depends on A ──► after Task 1 + Task 2
  Task 3: V2 store + anim + state (mostly copies; state adds selectedSegment)
  Task 4: V2 hook

Group C (V2 new components)         ─── depends on A ──► parallel with B and D
  Task 5: SegmentSwitcher + tests
  Task 6: TotalBalanceStrip + tests

Group D (V2 re-skinned components)  ─── depends on Strings (A) ──► parallel with B and C
  Task 7:  HeroCard V2
  Task 8:  StatCards V2
  Task 9:  CommitmentsCard V2
  Task 10: SectionHeader V2
  Task 11: AccountCard V2
  Task 12: AddCard V2
  Task 13: AccountCarousel V2 (depends on Tasks 11 + 12)

Group E (Breakdown sheet)           ─── depends on A ──► parallel with B/C/D
  Task 14: NetWorthBreakdownSheet V2 + tests

Group F (Screen integration)        ─── depends on B + C + D + E
  Task 15: DashboardScreenV2 index.tsx + screen smoke test

Group G (Route flag-branch + QA)    ─── depends on F
  Task 16: Update route to flag-branch (flag still false)
  Task 17: Manual QA window (no code; verification gate)

Group H (Promotion + cleanup)       ─── depends on G
  Task 18: Promotion commit — flip flag to true
  Task 19: Cleanup commit — delete V1 tree, restore one-liner, remove flag, update CLAUDE.md
```

**Parallel-safe within Group D after Tasks 11 + 12 land:** Tasks 7, 8, 9, 10 (all four parallel). Then Tasks 11, 12 (parallel pair). Then Task 13 (sequential after 11 + 12).

---

## File Map

### New files (under `screens/dashboard_v2/` unless noted)

```
screens/dashboard_v2/index.tsx
screens/dashboard_v2/dashboard.hook.ts
screens/dashboard_v2/dashboard.state.ts
screens/dashboard_v2/dashboard.store.ts
screens/dashboard_v2/dashboard.anim.ts
screens/dashboard_v2/components/segment_switcher.tsx
screens/dashboard_v2/components/total_balance_strip.tsx
screens/dashboard_v2/components/hero_card.tsx
screens/dashboard_v2/components/stat_cards.tsx
screens/dashboard_v2/components/commitments_card.tsx
screens/dashboard_v2/components/section_header.tsx
screens/dashboard_v2/components/account_card.tsx
screens/dashboard_v2/components/add_card.tsx
screens/dashboard_v2/components/account_carousel.tsx
screens/dashboard_v2/components/net_worth_breakdown_sheet.tsx

__tests__/screens/dashboard_v2/dashboard_helpers.test.ts
__tests__/screens/dashboard_v2/dashboard_hook.test.ts
__tests__/screens/dashboard_v2/dashboard_screen.test.tsx
__tests__/screens/dashboard_v2/components/segment_switcher.test.tsx
__tests__/screens/dashboard_v2/components/total_balance_strip.test.tsx
__tests__/screens/dashboard_v2/components/net_worth_breakdown_sheet.test.tsx
```

### Modified files

```
screens/dashboard/dashboard.helpers.ts    (extend — additive, shared by V1 + V2)
app/(app)/(tabs)/dashboard/index.tsx      (route → flag-branch, then back to one-liner in cleanup)
constants/strings.ts                       (new keys)
constants/feature_flags.ts                 (flip newDashboard, then remove in cleanup)
CLAUDE.md                                  (remove net_worth_breakdown_sheet.tsx from legacy list in cleanup)
```

### Deleted files (cleanup task only)

```
screens/dashboard/                         (entire V1 directory)
```

---

## Task 1: Helpers — computeLiquidityBreakdown + computeLiabilitiesBreakdown

**Goal:** Extend the shared dashboard helpers with two new pure functions used only by V2.

**Files:**
- Modify: `screens/dashboard/dashboard.helpers.ts`
- Create: `__tests__/screens/dashboard_v2/dashboard_helpers.test.ts`

- [ ] **Step 1: Read the existing helpers file to anchor on conventions**

Run: read `screens/dashboard/dashboard.helpers.ts` end-to-end. Confirm the existing `Account` import, `computeNetWorth` signature, USD-conversion pattern (`a.currency === Currency.USD ? a.current_balance * rate : a.current_balance`), and the existing exports.

- [ ] **Step 2: Write the failing tests**

Create `__tests__/screens/dashboard_v2/dashboard_helpers.test.ts` with:

```typescript
import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/store/account.store';
import {
  computeLiquidityBreakdown,
  computeLiabilitiesBreakdown,
} from '@/screens/dashboard/dashboard.helpers';

function mkAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'acc-1',
    name: 'Account',
    type: AccountType.Bank,
    currency: Currency.EGP,
    current_balance: 0,
    opening_balance: 0,
    is_archived: 0,
    created_at: '2026-05-16T00:00:00.000Z',
    updated_at: '2026-05-16T00:00:00.000Z',
    ...overrides,
  } as Account;
}

describe('computeLiquidityBreakdown', () => {
  it('splits accounts into liquid and reserve tiers (L-01 canonical)', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.Bank, current_balance: 27000 }),
      mkAccount({ id: '2', type: AccountType.SmartWallet, current_balance: 3500 }),
      mkAccount({ id: '3', type: AccountType.PhysicalWallet, current_balance: 2000 }),
      mkAccount({ id: '4', type: AccountType.PhysicalSavings, current_balance: 10000 }),
      mkAccount({ id: '5', type: AccountType.CreditCard, current_balance: 4080 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBe(32500);
    expect(result.liquidCount).toBe(3);
    expect(result.reserveEgp).toBe(10000);
    expect(result.reserveCount).toBe(1);
  });

  it('excludes credit cards from both tiers', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.CreditCard, current_balance: 4080 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBe(0);
    expect(result.reserveEgp).toBe(0);
  });

  it('excludes archived accounts (L-07)', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.Bank, current_balance: 1000, is_archived: 1 }),
      mkAccount({ id: '2', type: AccountType.Bank, current_balance: 2000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBe(2000);
    expect(result.liquidCount).toBe(1);
  });

  it('converts USD accounts via the rate (L-03)', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.Bank, currency: Currency.USD, current_balance: 100 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBeCloseTo(4885, 0);
  });

  it('returns zeros for empty input (L-02)', () => {
    const result = computeLiquidityBreakdown([], 48.85);
    expect(result).toEqual({ liquidEgp: 0, liquidCount: 0, reserveEgp: 0, reserveCount: 0 });
  });

  it('returns zero reserve when no PhysicalSavings present', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.Bank, current_balance: 1000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.reserveEgp).toBe(0);
    expect(result.reserveCount).toBe(0);
  });

  it('returns zero liquid when only PhysicalSavings present (L-05)', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.PhysicalSavings, current_balance: 1000 }),
    ];
    const result = computeLiquidityBreakdown(accounts, 48.85);
    expect(result.liquidEgp).toBe(0);
    expect(result.reserveEgp).toBe(1000);
  });
});

describe('computeLiabilitiesBreakdown', () => {
  it('returns one row per credit card, ordered by balance descending (L-08)', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', name: 'Visa A', type: AccountType.CreditCard, current_balance: 1000 }),
      mkAccount({ id: '2', name: 'Visa B', type: AccountType.CreditCard, current_balance: 4080 }),
    ];
    const result = computeLiabilitiesBreakdown(accounts, 48.85);
    expect(result).toEqual([
      { id: '2', name: 'Visa B', balanceEgp: 4080 },
      { id: '1', name: 'Visa A', balanceEgp: 1000 },
    ]);
  });

  it('returns an empty array when no credit cards', () => {
    const accounts: Account[] = [
      mkAccount({ id: '1', type: AccountType.Bank, current_balance: 1000 }),
    ];
    expect(computeLiabilitiesBreakdown(accounts, 48.85)).toEqual([]);
  });

  it('excludes archived credit cards (L-07)', () => {
    const accounts: Account[] = [
      mkAccount({
        id: '1',
        name: 'Old Visa',
        type: AccountType.CreditCard,
        current_balance: 1000,
        is_archived: 1,
      }),
    ];
    expect(computeLiabilitiesBreakdown(accounts, 48.85)).toEqual([]);
  });

  it('converts USD credit card balance to EGP via the rate (L-03)', () => {
    const accounts: Account[] = [
      mkAccount({
        id: '1',
        name: 'USD Card',
        type: AccountType.CreditCard,
        currency: Currency.USD,
        current_balance: 100,
      }),
    ];
    const [row] = computeLiabilitiesBreakdown(accounts, 48.85);
    expect(row.balanceEgp).toBeCloseTo(4885, 0);
  });

  it('uses absolute value if a card balance is stored as negative (defensive)', () => {
    const accounts: Account[] = [
      mkAccount({
        id: '1',
        name: 'Visa',
        type: AccountType.CreditCard,
        current_balance: -1000,
      }),
    ];
    const [row] = computeLiabilitiesBreakdown(accounts, 48.85);
    expect(row.balanceEgp).toBe(1000);
  });
});
```

- [ ] **Step 3: Run the new tests — they must fail because the functions do not exist**

Run: `npm test -- __tests__/screens/dashboard_v2/dashboard_helpers.test.ts`
Expected: FAIL with `computeLiquidityBreakdown is not a function` (or similar import error).

- [ ] **Step 4: Implement the two new helpers in the shared file**

Edit `screens/dashboard/dashboard.helpers.ts` and APPEND these exports below the existing ones. Do not touch `computeNetWorth` or `groupAccountsByType`.

```typescript
export interface LiquidityBreakdown {
  liquidEgp: number;
  liquidCount: number;
  reserveEgp: number;
  reserveCount: number;
}

const LIQUID_TYPES: ReadonlySet<AccountType> = new Set([
  AccountType.Bank,
  AccountType.SmartWallet,
  AccountType.PhysicalWallet,
]);

const RESERVE_TYPES: ReadonlySet<AccountType> = new Set([AccountType.PhysicalSavings]);

export function computeLiquidityBreakdown(
  accounts: Account[],
  rate: number,
): LiquidityBreakdown {
  let liquidEgp = 0;
  let liquidCount = 0;
  let reserveEgp = 0;
  let reserveCount = 0;

  for (const a of accounts) {
    if (a.is_archived) continue;
    const balanceEgp =
      a.currency === Currency.USD ? a.current_balance * rate : a.current_balance;
    if (LIQUID_TYPES.has(a.type)) {
      liquidEgp += balanceEgp;
      liquidCount++;
    } else if (RESERVE_TYPES.has(a.type)) {
      reserveEgp += balanceEgp;
      reserveCount++;
    }
  }

  return { liquidEgp, liquidCount, reserveEgp, reserveCount };
}

export interface LiabilityRow {
  id: string;
  name: string;
  balanceEgp: number;
}

export function computeLiabilitiesBreakdown(
  accounts: Account[],
  rate: number,
): LiabilityRow[] {
  const rows: LiabilityRow[] = [];
  for (const a of accounts) {
    if (a.is_archived) continue;
    if (a.type !== AccountType.CreditCard) continue;
    const balanceEgp =
      a.currency === Currency.USD ? a.current_balance * rate : a.current_balance;
    rows.push({ id: a.id, name: a.name, balanceEgp: Math.abs(balanceEgp) });
  }
  rows.sort((a, b) => b.balanceEgp - a.balanceEgp);
  return rows;
}
```

- [ ] **Step 5: Run the tests — they must pass**

Run: `npm test -- __tests__/screens/dashboard_v2/dashboard_helpers.test.ts`
Expected: PASS (12 tests).

- [ ] **Step 6: Run full type check to confirm no regression**

Run: `npx tsc --noEmit`
Expected: clean, no errors.

- [ ] **Step 7: Commit**

```bash
git add screens/dashboard/dashboard.helpers.ts __tests__/screens/dashboard_v2/dashboard_helpers.test.ts
git commit -m "feat(§5-T1): add computeLiquidityBreakdown + computeLiabilitiesBreakdown helpers"
```

---

## Task 2: Strings — add new keys

**Goal:** Add the 13 new string keys §5 needs. No reads from these keys until later tasks.

**Files:**
- Modify: `constants/strings.ts`

- [ ] **Step 1: Locate the existing dashboard string block in `constants/strings.ts`**

Run: open `constants/strings.ts`, find the lines around `dashAvailableToSpend: 'Available to Spend'` and `dashNetWorthTitle: 'Net Worth'`. New keys will live in the same block.

- [ ] **Step 2: Add the new keys**

Insert these keys near the existing `dash*` entries. Function-style entries follow the existing pattern (see `categoriesDeleteBody` for reference).

```typescript
  // §5 Dashboard v2 — segments + breakdown
  dashboardSegmentOverview: 'Overview',
  dashboardSegmentAccounts: 'Accounts',
  dashboardTotalBalance: 'Total balance',
  dashboardAccountsLabel: 'Accounts',
  dashboardBreakdownTitle: 'Net Worth',
  dashboardBreakdownNetWorthLabel: 'Net Worth',
  dashboardBreakdownAssetsHeader: (egp: string, count: number) =>
    `${egp} EGP · ${count} ${count === 1 ? 'acct' : 'accts'}`,
  dashboardBreakdownLiabilitiesHeader: (egp: string, count: number) =>
    `${egp} EGP · ${count} ${count === 1 ? 'card' : 'cards'}`,
  dashboardBreakdownLiquid: 'Liquid',
  dashboardBreakdownReserve: 'Reserve',
  dashboardBreakdownLiquidCaption: 'Bank, Smart Wallet, Cash',
  dashboardBreakdownReserveCaption: 'Savings',
  dashboardBreakdownTotalDebt: 'Total debt',
```

- [ ] **Step 3: Run type check**

Run: `npx tsc --noEmit`
Expected: clean (the new keys compile under the existing `Strings` const-as-const pattern).

- [ ] **Step 4: Commit**

```bash
git add constants/strings.ts
git commit -m "feat(§5-T2): add Dashboard v2 string keys (segments + breakdown sheet)"
```

---

## Task 3: V2 scaffold — state + store + anim

**Goal:** Stand up the V2 directory's data plumbing files. `store` and `anim` are byte-identical to V1 (this is the duplicate-once-then-diverge pattern §2 used). `state` adds `selectedSegment`.

**Files:**
- Create: `screens/dashboard_v2/dashboard.store.ts`
- Create: `screens/dashboard_v2/dashboard.anim.ts`
- Create: `screens/dashboard_v2/dashboard.state.ts`

- [ ] **Step 1: Create `screens/dashboard_v2/dashboard.store.ts` as a verbatim copy of V1**

```typescript
import { create } from 'zustand';

import type { AccountStats } from '@/database/account_stats';
import type { CommitmentPayment } from '@/database/entities/commitment_payment.entity';

interface MonthSpendStats {
  totalEgp: number;
  usdNative: number;
  count: number;
}

interface DashboardStoreShape {
  statsMap: Record<string, AccountStats>;
  currentMonthCommitmentPayments: CommitmentPayment[];
  currentMonthSpend: MonthSpendStats;
  previousMonthSpend: MonthSpendStats;
}

interface DashboardStore {
  state: DashboardStoreShape;
  setStatsMap: (m: Record<string, AccountStats>) => void;
  setCurrentMonthCommitmentPayments: (p: CommitmentPayment[]) => void;
  setMonthSpendStats: (current: MonthSpendStats, previous: MonthSpendStats) => void;
  reset: () => void;
}

const EMPTY_SPEND: MonthSpendStats = { totalEgp: 0, usdNative: 0, count: 0 };

const INITIAL_STATE: DashboardStoreShape = {
  statsMap: {},
  currentMonthCommitmentPayments: [],
  currentMonthSpend: EMPTY_SPEND,
  previousMonthSpend: EMPTY_SPEND,
};

export const useDashboardV2Store = create<DashboardStore>((set) => ({
  state: INITIAL_STATE,
  setStatsMap: (m) => set((s) => ({ state: { ...s.state, statsMap: m } })),
  setCurrentMonthCommitmentPayments: (p) =>
    set((s) => ({ state: { ...s.state, currentMonthCommitmentPayments: p } })),
  setMonthSpendStats: (current, previous) =>
    set((s) => ({
      state: { ...s.state, currentMonthSpend: current, previousMonthSpend: previous },
    })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

Note the rename from `useDashboardStore` → `useDashboardV2Store` to avoid Zustand store collision when both V1 and V2 are loaded during the flag-branch window.

- [ ] **Step 2: Create `screens/dashboard_v2/dashboard.anim.ts` as a verbatim copy of V1**

Run: read `screens/dashboard/dashboard.anim.ts` and write the exact same content to `screens/dashboard_v2/dashboard.anim.ts`. No identifier renames needed — the file exports a hook (`useDashboardAnim`); both V1 and V2 importing the same hook name is fine because they come from different file paths.

- [ ] **Step 3: Create `screens/dashboard_v2/dashboard.state.ts` with the new `selectedSegment` field**

```typescript
import { create } from 'zustand';

export type DashboardSegment = 'overview' | 'accounts';

interface DashboardStateShape {
  isBreakdownVisible: boolean;
  refreshing: boolean;
  selectedSegment: DashboardSegment;
}

interface DashboardState {
  state: DashboardStateShape;
  setBreakdownVisible: (v: boolean) => void;
  setRefreshing: (v: boolean) => void;
  setSelectedSegment: (s: DashboardSegment) => void;
  reset: () => void;
}

const INITIAL_STATE: DashboardStateShape = {
  isBreakdownVisible: false,
  refreshing: false,
  selectedSegment: 'overview',
};

export const useDashboardV2State = create<DashboardState>((set) => ({
  state: INITIAL_STATE,
  setBreakdownVisible: (v) => set((s) => ({ state: { ...s.state, isBreakdownVisible: v } })),
  setRefreshing: (v) => set((s) => ({ state: { ...s.state, refreshing: v } })),
  setSelectedSegment: (s) => set((prev) => ({ state: { ...prev.state, selectedSegment: s } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 4: Run type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add screens/dashboard_v2/dashboard.store.ts screens/dashboard_v2/dashboard.anim.ts screens/dashboard_v2/dashboard.state.ts
git commit -m "feat(§5-T3): scaffold V2 store, anim, and state (with selectedSegment)"
```

---

## Task 4: V2 hook

**Goal:** Stand up `useDashboardV2()` — mirrors V1 plus liquidity / liabilities memos and `selectedSegment` plumbing.

**Files:**
- Create: `screens/dashboard_v2/dashboard.hook.ts`
- Create: `__tests__/screens/dashboard_v2/dashboard_hook.test.ts`

- [ ] **Step 1: Write the failing hook tests**

Create `__tests__/screens/dashboard_v2/dashboard_hook.test.ts`:

```typescript
import { act, renderHook } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { useAccountStore } from '@/store/account.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useCommitmentStore } from '@/store/commitment.store';
import { useDashboardV2 } from '@/screens/dashboard_v2/dashboard.hook';
import { useDashboardV2State } from '@/screens/dashboard_v2/dashboard.state';

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/database/client', () => ({
  getDb: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/database/account_stats', () => ({
  getAccountsStats: jest.fn().mockResolvedValue({}),
}));

jest.mock('@/database/transactions', () => ({
  getMonthExpenseStats: jest
    .fn()
    .mockResolvedValue({ totalEgp: 0, usdNative: 0, count: 0 }),
}));

jest.mock('@/repositories/commitment.repository', () => ({
  commitmentRepository: { getPaymentsForMonth: jest.fn().mockResolvedValue([]) },
}));

function seedAccounts() {
  useAccountStore.setState({
    state: {
      ...useAccountStore.getState().state,
      accounts: [
        {
          id: 'a1',
          name: 'CIB',
          type: AccountType.Bank,
          currency: Currency.EGP,
          current_balance: 27000,
          opening_balance: 27000,
          is_archived: 0,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'a2',
          name: 'Savings',
          type: AccountType.PhysicalSavings,
          currency: Currency.EGP,
          current_balance: 10000,
          opening_balance: 10000,
          is_archived: 0,
          created_at: '',
          updated_at: '',
        },
        {
          id: 'a3',
          name: 'Visa',
          type: AccountType.CreditCard,
          currency: Currency.EGP,
          current_balance: 4080,
          opening_balance: 4080,
          is_archived: 0,
          created_at: '',
          updated_at: '',
        },
      ] as never,
    },
  });
  useCurrencyStore.setState({
    state: { ...useCurrencyStore.getState().state, rate: 48.85, isManualOverride: false },
  });
  useCommitmentStore.setState({
    state: { ...useCommitmentStore.getState().state, commitments: [], payments: [] },
  });
}

beforeEach(() => {
  useDashboardV2State.getState().reset();
  seedAccounts();
});

describe('useDashboardV2', () => {
  it('defaults selectedSegment to overview', () => {
    const { result } = renderHook(() => useDashboardV2());
    expect(result.current.state.selectedSegment).toBe('overview');
  });

  it('setSelectedSegment updates state', () => {
    const { result } = renderHook(() => useDashboardV2());
    act(() => result.current.setSelectedSegment('accounts'));
    expect(result.current.state.selectedSegment).toBe('accounts');
  });

  it('exposes liquidity memo computed from accounts', () => {
    const { result } = renderHook(() => useDashboardV2());
    expect(result.current.state.liquidity.liquidEgp).toBe(27000);
    expect(result.current.state.liquidity.reserveEgp).toBe(10000);
  });

  it('exposes liabilities memo with credit cards only', () => {
    const { result } = renderHook(() => useDashboardV2());
    expect(result.current.state.liabilities).toEqual([
      { id: 'a3', name: 'Visa', balanceEgp: 4080 },
    ]);
  });

  it('useFocusEffect resets segment to overview', () => {
    useDashboardV2State.getState().setSelectedSegment('accounts');
    renderHook(() => useDashboardV2());
    expect(useDashboardV2State.getState().state.selectedSegment).toBe('overview');
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npm test -- __tests__/screens/dashboard_v2/dashboard_hook.test.ts`
Expected: FAIL — `useDashboardV2 is not exported`.

- [ ] **Step 3: Create the hook file**

Create `screens/dashboard_v2/dashboard.hook.ts`. Start from a copy of V1 (`screens/dashboard/dashboard.hook.ts`), then make these specific changes:

1. Rename the exported hook from `useDashboard` to `useDashboardV2`.
2. Replace the `useDashboardStore` import + usage with `useDashboardV2Store` from `./dashboard.store`.
3. Replace the `useDashboardState` import + usage with `useDashboardV2State` from `./dashboard.state`.
4. Import the two new helpers from the shared helpers file.
5. Add `useMemo`-derived `liquidity` and `liabilities` alongside the existing `netWorth` memo.
6. Surface `selectedSegment` and `setSelectedSegment` from `useDashboardV2State`.
7. Inside the existing `useFocusEffect`, also call `setSelectedSegment('overview')`.
8. Add `liquidity`, `liabilities`, and `selectedSegment` to the returned `state` object; add `setSelectedSegment` to the top-level returned actions.

The final file should look like (full code shown — the engineer must reproduce it exactly):

```typescript
import { useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { getDb } from '@/database/client';
import { getAccountsStats } from '@/database/account_stats';
import { getMonthExpenseStats } from '@/database/transactions';
import { useAccountStore } from '@/store/account.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useCommitmentStore } from '@/store/commitment.store';
import { AccountType, CommitmentPaymentStatus } from '@/constants/enums';
import { commitmentRepository } from '@/repositories/commitment.repository';
import { toLocalDateString } from '@/utils/format_date';
import {
  computeLiabilitiesBreakdown,
  computeLiquidityBreakdown,
  computeNetWorth,
  groupAccountsByType,
} from '@/screens/dashboard/dashboard.helpers';
import { useDashboardV2State } from './dashboard.state';
import { useDashboardV2Store } from './dashboard.store';

function getCurrentYearMonth(): string {
  return toLocalDateString(new Date()).slice(0, 7);
}

export function useDashboardV2() {
  const router = useRouter();

  const { state: accountState, loadAccounts } = useAccountStore(
    useShallow((s) => ({ state: s.state, loadAccounts: s.loadAccounts })),
  );
  const { state: currencyState } = useCurrencyStore(useShallow((s) => ({ state: s.state })));
  const { state: commitmentState } = useCommitmentStore(useShallow((s) => ({ state: s.state })));
  const currentYearMonth = useMemo(() => getCurrentYearMonth(), []);
  const {
    state: dashUiState,
    setBreakdownVisible,
    setRefreshing,
    setSelectedSegment,
  } = useDashboardV2State(
    useShallow((s) => ({
      state: s.state,
      setBreakdownVisible: s.setBreakdownVisible,
      setRefreshing: s.setRefreshing,
      setSelectedSegment: s.setSelectedSegment,
    })),
  );
  const {
    state: dashDataState,
    setStatsMap,
    setCurrentMonthCommitmentPayments,
    setMonthSpendStats,
  } = useDashboardV2Store(
    useShallow((s) => ({
      state: s.state,
      setStatsMap: s.setStatsMap,
      setCurrentMonthCommitmentPayments: s.setCurrentMonthCommitmentPayments,
      setMonthSpendStats: s.setMonthSpendStats,
    })),
  );

  const previousYearMonth = useMemo(() => {
    const [y, m] = currentYearMonth.split('-').map(Number);
    const prevM = m === 1 ? 12 : m - 1;
    const prevY = m === 1 ? y - 1 : y;
    return `${prevY}-${String(prevM).padStart(2, '0')}`;
  }, [currentYearMonth]);

  const loadMonthSpend = useCallback(async () => {
    try {
      const db = await getDb();
      const [current, previous] = await Promise.all([
        getMonthExpenseStats(db, currentYearMonth),
        getMonthExpenseStats(db, previousYearMonth),
      ]);
      setMonthSpendStats(current, previous);
    } catch (err) {
      console.error('[dashboard_v2] loadMonthSpend failed:', err);
    }
  }, [currentYearMonth, previousYearMonth, setMonthSpendStats]);

  const loadCurrentMonthCommitmentPayments = useCallback(async () => {
    try {
      const payments = await commitmentRepository.getPaymentsForMonth(currentYearMonth);
      setCurrentMonthCommitmentPayments(payments);
    } catch (err) {
      console.error('[dashboard_v2] loadCurrentMonthCommitmentPayments failed:', err);
    }
  }, [currentYearMonth, setCurrentMonthCommitmentPayments]);

  useEffect(() => {
    loadCurrentMonthCommitmentPayments();
  }, [loadCurrentMonthCommitmentPayments, commitmentState.commitments, commitmentState.payments]);

  useFocusEffect(
    useCallback(() => {
      loadCurrentMonthCommitmentPayments();
      loadMonthSpend();
      setSelectedSegment('overview');
    }, [loadCurrentMonthCommitmentPayments, loadMonthSpend, setSelectedSegment]),
  );

  useEffect(() => {
    loadMonthSpend();
  }, [loadMonthSpend, accountState.accounts]);

  const loadStats = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) {
        setStatsMap({});
        return;
      }
      try {
        const db = await getDb();
        const result = await getAccountsStats(db, ids);
        setStatsMap(result);
      } catch (err) {
        console.error('[dashboard_v2] loadStats failed:', err);
      }
    },
    [setStatsMap],
  );

  useEffect(() => {
    loadStats(accountState.accounts.map((a) => a.id));
  }, [accountState.accounts]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAccounts();
    } finally {
      setRefreshing(false);
    }
  }, [loadAccounts, setRefreshing]);

  const netWorth = useMemo(
    () => computeNetWorth(accountState.accounts, currencyState.rate),
    [accountState.accounts, currencyState.rate],
  );
  const liquidity = useMemo(
    () => computeLiquidityBreakdown(accountState.accounts, currencyState.rate),
    [accountState.accounts, currencyState.rate],
  );
  const liabilities = useMemo(
    () => computeLiabilitiesBreakdown(accountState.accounts, currencyState.rate),
    [accountState.accounts, currencyState.rate],
  );
  const groupedAccounts = useMemo(
    () => groupAccountsByType(accountState.accounts),
    [accountState.accounts],
  );

  const spendDeltaPct = useMemo(() => {
    const prev = dashDataState.previousMonthSpend.totalEgp;
    const curr = dashDataState.currentMonthSpend.totalEgp;
    if (prev <= 0) return null;
    return Math.round(((curr - prev) / prev) * 100);
  }, [dashDataState.currentMonthSpend, dashDataState.previousMonthSpend]);

  const accountCounts = useMemo(() => {
    let assets = 0;
    let liabilitiesCount = 0;
    for (const a of accountState.accounts) {
      if (a.is_archived) continue;
      if (a.type === AccountType.CreditCard) liabilitiesCount++;
      else assets++;
    }
    return { assets, liabilities: liabilitiesCount };
  }, [accountState.accounts]);

  const commitmentCounts = useMemo(() => {
    let paid = 0;
    let overdue = 0;
    let due = 0;
    let upcoming = 0;
    let skipped = 0;
    for (const p of dashDataState.currentMonthCommitmentPayments) {
      switch (p.status) {
        case CommitmentPaymentStatus.Paid: paid++; break;
        case CommitmentPaymentStatus.Overdue: overdue++; break;
        case CommitmentPaymentStatus.Due: due++; break;
        case CommitmentPaymentStatus.Upcoming: upcoming++; break;
        case CommitmentPaymentStatus.Skipped: skipped++; break;
      }
    }
    return { paid, overdue, due, upcoming, skipped, total: paid + overdue + due + upcoming };
  }, [dashDataState.currentMonthCommitmentPayments]);

  const commitmentTotalsByCurrency = useMemo(() => {
    const totals = new Map<string, number>();
    for (const p of dashDataState.currentMonthCommitmentPayments) {
      if (p.status === CommitmentPaymentStatus.Skipped) continue;
      const isPaid = p.status === CommitmentPaymentStatus.Paid;
      const value = isPaid ? (p.amount_paid ?? p.amount_due) : p.amount_due;
      if (value == null) continue;
      totals.set(p.currency, (totals.get(p.currency) ?? 0) + value);
    }
    return totals;
  }, [dashDataState.currentMonthCommitmentPayments]);

  const goToAccount = (id: string) => router.push(`/accounts/${id}`);
  const goToAddAccount = () => router.push('/accounts/add_account');
  const goToSettings = () => router.push('/settings');
  const goToCommitments = useCallback(() => router.push('/(app)/(tabs)/commitments'), [router]);

  return {
    state: {
      accounts: accountState.accounts,
      rate: currencyState.rate,
      isManualOverride: currencyState.isManualOverride,
      netWorth,
      liquidity,
      liabilities,
      groupedAccounts,
      statsMap: dashDataState.statsMap,
      isBreakdownVisible: dashUiState.isBreakdownVisible,
      refreshing: dashUiState.refreshing,
      selectedSegment: dashUiState.selectedSegment,
      monthSpend: {
        currentEgp: dashDataState.currentMonthSpend.totalEgp,
        currentUsdNative: dashDataState.currentMonthSpend.usdNative,
        currentCount: dashDataState.currentMonthSpend.count,
        previousEgp: dashDataState.previousMonthSpend.totalEgp,
        deltaPct: spendDeltaPct,
        yearMonth: currentYearMonth,
      },
      accountCounts,
      commitments: {
        counts: commitmentCounts,
        totalsByCurrency: commitmentTotalsByCurrency,
        yearMonth: currentYearMonth,
      },
    },
    setBreakdownVisible,
    setSelectedSegment,
    refresh,
    goToAccount,
    goToAddAccount,
    goToSettings,
    goToCommitments,
  };
}
```

- [ ] **Step 4: Run the hook tests — they must pass**

Run: `npm test -- __tests__/screens/dashboard_v2/dashboard_hook.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add screens/dashboard_v2/dashboard.hook.ts __tests__/screens/dashboard_v2/dashboard_hook.test.ts
git commit -m "feat(§5-T4): V2 hook with liquidity/liabilities memos + segment plumbing"
```

---

## Task 5: SegmentSwitcher component

**Goal:** Build the 2-option segmented control used at the top of `DashboardScreenV2`.

**Files:**
- Create: `screens/dashboard_v2/components/segment_switcher.tsx`
- Create: `__tests__/screens/dashboard_v2/components/segment_switcher.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { SegmentSwitcher } from '@/screens/dashboard_v2/components/segment_switcher';

describe('SegmentSwitcher', () => {
  it('renders both labels', () => {
    const { getByText } = render(
      <SegmentSwitcher value="overview" onChange={() => {}} />,
    );
    expect(getByText('Overview')).toBeTruthy();
    expect(getByText('Accounts')).toBeTruthy();
  });

  it('marks the active segment with accessibility selected state', () => {
    const { getByText } = render(
      <SegmentSwitcher value="accounts" onChange={() => {}} />,
    );
    const accountsBtn = getByText('Accounts').parent?.parent;
    expect(accountsBtn?.props.accessibilityState?.selected).toBe(true);
  });

  it('fires onChange with the tapped segment value', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SegmentSwitcher value="overview" onChange={onChange} />,
    );
    fireEvent.press(getByText('Accounts'));
    expect(onChange).toHaveBeenCalledWith('accounts');
  });

  it('does not fire onChange when tapping the already-active segment', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <SegmentSwitcher value="overview" onChange={onChange} />,
    );
    fireEvent.press(getByText('Overview'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run — expect failure (component does not exist)**

Run: `npm test -- __tests__/screens/dashboard_v2/components/segment_switcher.test.tsx`
Expected: FAIL on import.

- [ ] **Step 3: Implement the component**

Create `screens/dashboard_v2/components/segment_switcher.tsx`:

```typescript
import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { DashboardSegment } from '@/screens/dashboard_v2/dashboard.state';

interface SegmentSwitcherProps {
  value: DashboardSegment;
  onChange: (segment: DashboardSegment) => void;
}

const SEGMENTS: { key: DashboardSegment; label: string }[] = [
  { key: 'overview', label: Strings.dashboardSegmentOverview },
  { key: 'accounts', label: Strings.dashboardSegmentAccounts },
];

export function SegmentSwitcher({ value, onChange }: SegmentSwitcherProps) {
  return (
    <View
      className="flex-row bg-surface rounded-xl p-1 mx-4 mt-2 mb-2 border border-separator"
      accessibilityRole="tablist"
    >
      {SEGMENTS.map(({ key, label }) => {
        const active = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (!active) onChange(key);
            }}
            className={
              'flex-1 items-center justify-center rounded-lg py-2 ' +
              (active ? 'bg-default' : '')
            }
          >
            <Text
              variant={active ? 'body' : 'hint'}
              className={active ? 'text-foreground font-semibold' : 'text-muted font-medium'}
            >
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 4: Run tests — they must pass**

Run: `npm test -- __tests__/screens/dashboard_v2/components/segment_switcher.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Run type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add screens/dashboard_v2/components/segment_switcher.tsx __tests__/screens/dashboard_v2/components/segment_switcher.test.tsx
git commit -m "feat(§5-T5): SegmentSwitcher component"
```

---

## Task 6: TotalBalanceStrip component

**Goal:** Compact gradient strip at the top of the Accounts segment.

**Files:**
- Create: `screens/dashboard_v2/components/total_balance_strip.tsx`
- Create: `__tests__/screens/dashboard_v2/components/total_balance_strip.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';

import { TotalBalanceStrip } from '@/screens/dashboard_v2/components/total_balance_strip';

describe('TotalBalanceStrip', () => {
  it('renders the formatted EGP balance and account count', () => {
    const { getByText } = render(
      <TotalBalanceStrip assetsEgp={42500} accountsCount={4} />,
    );
    expect(getByText(/42,500/)).toBeTruthy();
    expect(getByText('EGP')).toBeTruthy();
    expect(getByText('4')).toBeTruthy();
    expect(getByText('Total balance')).toBeTruthy();
    expect(getByText('Accounts')).toBeTruthy();
  });

  it('renders zero gracefully', () => {
    const { getByText } = render(
      <TotalBalanceStrip assetsEgp={0} accountsCount={0} />,
    );
    expect(getByText('0')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run — expect failure**

Run: `npm test -- __tests__/screens/dashboard_v2/components/total_balance_strip.test.tsx`
Expected: FAIL on import.

- [ ] **Step 3: Implement the component**

```typescript
import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { formatAmount } from '@/utils/format_amount';

interface TotalBalanceStripProps {
  assetsEgp: number;
  accountsCount: number;
}

export function TotalBalanceStrip({ assetsEgp, accountsCount }: TotalBalanceStripProps) {
  return (
    <View className="mx-4 mt-2 mb-2 rounded-2xl overflow-hidden border border-border">
      <LinearGradient
        colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        className="flex-row items-center justify-between px-4 py-3"
        style={{ flexDirection: 'row' }}
      >
        <View>
          <Text variant="hint" className="text-muted uppercase tracking-wide text-xs">
            {Strings.dashboardTotalBalance}
          </Text>
          <Text className="text-2xl font-bold text-accent mt-1">
            {formatAmount(assetsEgp)} <Text className="text-base text-muted">EGP</Text>
          </Text>
        </View>
        <View className="items-end">
          <Text variant="hint" className="text-muted uppercase tracking-wide text-xs">
            {Strings.dashboardAccountsLabel}
          </Text>
          <Text className="text-base font-semibold text-foreground mt-1">{accountsCount}</Text>
        </View>
      </LinearGradient>
    </View>
  );
}
```

- [ ] **Step 4: Run tests**

Run: `npm test -- __tests__/screens/dashboard_v2/components/total_balance_strip.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add screens/dashboard_v2/components/total_balance_strip.tsx __tests__/screens/dashboard_v2/components/total_balance_strip.test.tsx
git commit -m "feat(§5-T6): TotalBalanceStrip component"
```

---

## Task 7: HeroCard V2 (re-skin)

**Goal:** Port V1's HeroCard to `screens/dashboard_v2/components/hero_card.tsx`, swapping RN primitives for HeroUI Native + Cairo Nights tokens via className.

**Files:**
- Create: `screens/dashboard_v2/components/hero_card.tsx`

- [ ] **Step 1: Read the V1 source**

Run: open `screens/dashboard/components/hero_card.tsx`. Understand the props, the gradient layout, the grid texture SVG, the manual badge, and the meta chip row.

- [ ] **Step 2: Create the V2 file**

```typescript
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Svg, { Defs, Pattern, Path, Rect } from 'react-native-svg';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { formatAmount } from '@/utils/format_amount';

interface HeroCardProps {
  assetsEgp: number;
  assetsUsd: number;
  rate: number;
  isManualOverride: boolean;
  assetsCount: number;
  liabilitiesCount: number;
  onPress: () => void;
}

function GridTexture() {
  return (
    <Svg style={StyleSheet.absoluteFill}>
      <Defs>
        <Pattern id="dash-hero-grid-v2" width="26" height="26" patternUnits="userSpaceOnUse">
          <Path d="M 26 0 L 0 0 0 26" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.03" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#dash-hero-grid-v2)" />
    </Svg>
  );
}

export function HeroCard({
  assetsEgp,
  assetsUsd,
  rate,
  isManualOverride,
  assetsCount,
  liabilitiesCount,
  onPress,
}: HeroCardProps) {
  const totalAccounts = assetsCount + liabilitiesCount;

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mt-4 rounded-2xl border border-border overflow-hidden"
    >
      <LinearGradient
        colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <GridTexture />
      <View
        pointerEvents="none"
        className="absolute"
        style={{
          top: -ms(40),
          right: -ms(40),
          width: ms(160),
          height: ms(160),
          borderRadius: ms(80),
          backgroundColor: Colors.dark.gold,
          opacity: 0.18,
        }}
      />

      <View className="flex-row items-center justify-between px-5 pt-5" style={{ flexDirection: 'row' }}>
        <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(8) }}>
          <View
            className="items-center justify-center rounded-full"
            style={{
              width: ms(24),
              height: ms(24),
              backgroundColor: Colors.shared.cairoGold + '22',
            }}
          >
            <MaterialCommunityIcons name="wallet" size={ms(14)} color={Colors.shared.cairoGold} />
          </View>
          <Text variant="caption" className="text-foreground tracking-wide">
            {Strings.dashAvailableToSpend}
          </Text>
        </View>
        {isManualOverride && (
          <View
            className="flex-row items-center rounded-full"
            style={{
              flexDirection: 'row',
              gap: ms(4),
              paddingHorizontal: ms(8),
              paddingVertical: ms(3),
              backgroundColor: Colors.shared.cairoGold + '22',
              borderWidth: 1,
              borderColor: Colors.shared.cairoGold,
            }}
          >
            <View
              style={{
                width: ms(5),
                height: ms(5),
                borderRadius: ms(3),
                backgroundColor: Colors.shared.cairoGold,
              }}
            />
            <Text className="uppercase text-xs" style={{ color: Colors.shared.cairoGold }}>
              Manual
            </Text>
          </View>
        )}
      </View>

      <Text
        className="px-5 mt-3 mb-2 font-bold"
        style={{ color: Colors.dark.gold, fontSize: ms(32) }}
      >
        {formatAmount(assetsEgp)} <Text style={{ fontSize: ms(16), opacity: 0.8 }}>EGP</Text>
      </Text>

      <View
        className="flex-row flex-wrap px-5 pb-5"
        style={{ flexDirection: 'row', gap: ms(6) }}
      >
        <View
          className="flex-row items-center rounded-full px-2 py-1"
          style={{ flexDirection: 'row', gap: ms(4), backgroundColor: Colors.dark.overlayWhite7 }}
        >
          <MaterialCommunityIcons
            name="approximately-equal"
            size={ms(11)}
            color={Colors.dark.text1}
          />
          <Text className="text-xs text-foreground">{formatAmount(assetsUsd, 0)} USD</Text>
        </View>
        <View
          className="flex-row items-center rounded-full px-2 py-1"
          style={{ flexDirection: 'row', gap: ms(4), backgroundColor: Colors.dark.overlayWhite7 }}
        >
          <MaterialCommunityIcons name="swap-horizontal" size={ms(11)} color={Colors.dark.text1} />
          <Text className="text-xs text-foreground">1 USD = {rate.toFixed(2)} EGP</Text>
        </View>
        <View
          className="flex-row items-center rounded-full px-2 py-1"
          style={{ flexDirection: 'row', gap: ms(4), backgroundColor: Colors.dark.overlayWhite7 }}
        >
          <MaterialCommunityIcons name="bank-outline" size={ms(11)} color={Colors.dark.text1} />
          <Text className="text-xs text-foreground">{totalAccounts} accounts</Text>
        </View>
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add screens/dashboard_v2/components/hero_card.tsx
git commit -m "feat(§5-T7): HeroCard V2 — HeroUI re-skin with Cairo Nights tokens"
```

---

## Task 8: StatCards V2 (re-skin)

**Goal:** Port V1's `StatCards` to V2 with HeroUI primitives and className-based styling. Same 2-up layout (Net Worth + Spent this Month) and same split-bar legend semantics.

**Files:**
- Create: `screens/dashboard_v2/components/stat_cards.tsx`

- [ ] **Step 1: Read V1 source**

Open `screens/dashboard/components/stat_cards.tsx` to confirm props and delta-chip semantics.

- [ ] **Step 2: Create V2 file**

```typescript
import React from 'react';
import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { formatAmount } from '@/utils/format_amount';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'] as const;

interface StatCardsProps {
  netWorthEgp: number;
  assetsEgp: number;
  liabilitiesEgp: number;
  assetsCount: number;
  liabilitiesCount: number;
  monthSpentEgp: number;
  monthSpentUsd: number;
  monthSpendDeltaPct: number | null;
  monthSpendCount: number;
  spendYearMonth: string;
}

export function StatCards({
  netWorthEgp,
  assetsEgp,
  liabilitiesEgp,
  assetsCount,
  liabilitiesCount,
  monthSpentEgp,
  monthSpentUsd,
  monthSpendDeltaPct,
  monthSpendCount,
  spendYearMonth,
}: StatCardsProps) {
  const netNegative = netWorthEgp < 0;
  const netColor = netNegative ? Colors.dark.negative : Colors.dark.positive;
  const total = assetsEgp + Math.abs(liabilitiesEgp);
  const assetsPct = total > 0 ? assetsEgp / total : 1;
  const monthIdx = parseInt(spendYearMonth.split('-')[1], 10) - 1;
  const monthLabel = SHORT_MONTHS[monthIdx] ?? '';
  const prevMonthLabel = SHORT_MONTHS[(monthIdx + 11) % 12] ?? '';
  const deltaPositive = monthSpendDeltaPct != null && monthSpendDeltaPct < 0;
  const deltaNegative = monthSpendDeltaPct != null && monthSpendDeltaPct > 0;
  const deltaColor = deltaPositive ? Colors.dark.positive : deltaNegative ? Colors.dark.negative : Colors.dark.text2;
  const deltaIcon: IconName = deltaPositive ? 'trending-down' : deltaNegative ? 'trending-up' : 'trending-neutral';

  return (
    <View className="flex-row mx-4 mt-2" style={{ flexDirection: 'row', gap: ms(8) }}>
      {/* Net Worth */}
      <View
        className="flex-1 rounded-2xl bg-surface border border-border p-3"
        style={{ flex: 1, gap: ms(6) }}
      >
        <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: ms(20), height: ms(20), backgroundColor: netColor + '22' }}
          >
            <MaterialCommunityIcons name="scale-balance" size={ms(13)} color={netColor} />
          </View>
          <Text variant="hint" className="flex-1 uppercase text-muted text-xs">
            {Strings.dashNetWorthTitle}
          </Text>
        </View>
        <Text className="text-lg font-bold" style={{ color: netColor }} numberOfLines={1}>
          {formatAmount(netWorthEgp)} <Text className="text-xs text-muted font-medium">EGP</Text>
        </Text>
        <View
          className="rounded overflow-hidden bg-default flex-row"
          style={{ flexDirection: 'row', height: ms(4) }}
        >
          <View style={{ flex: assetsPct, backgroundColor: Colors.dark.positive }} />
          <View style={{ flex: 1 - assetsPct, backgroundColor: Colors.dark.negative }} />
        </View>
        <View className="flex-row" style={{ flexDirection: 'row', gap: ms(8) }}>
          <View className="flex-1" style={{ flex: 1 }}>
            <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
              <View style={{ width: ms(6), height: ms(6), borderRadius: ms(3), backgroundColor: Colors.dark.positive }} />
              <Text variant="hint" className="text-muted text-xs">
                {Strings.dashAssetsLabel} ({assetsCount})
              </Text>
            </View>
            <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
              {formatAmount(assetsEgp)}
            </Text>
          </View>
          <View className="flex-1" style={{ flex: 1 }}>
            <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
              <View style={{ width: ms(6), height: ms(6), borderRadius: ms(3), backgroundColor: Colors.dark.negative }} />
              <Text variant="hint" className="text-muted text-xs">
                {Strings.dashLiabilitiesLabel} ({liabilitiesCount})
              </Text>
            </View>
            <Text className="text-xs font-semibold text-foreground" numberOfLines={1}>
              {formatAmount(liabilitiesEgp)}
            </Text>
          </View>
        </View>
      </View>

      {/* Spent This Month */}
      <View
        className="flex-1 rounded-2xl bg-surface border border-border p-3"
        style={{ flex: 1, gap: ms(6) }}
      >
        <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: ms(20), height: ms(20), backgroundColor: Colors.dark.negative + '22' }}
          >
            <MaterialCommunityIcons name="cash-minus" size={ms(13)} color={Colors.dark.negative} />
          </View>
          <Text variant="hint" className="flex-1 uppercase text-muted text-xs">
            {Strings.dashMonthSpentTitle}
          </Text>
          <Text variant="hint" className="text-muted text-xs">{monthLabel}</Text>
        </View>
        <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
          {formatAmount(monthSpentEgp)} <Text className="text-xs text-muted font-medium">EGP</Text>
        </Text>
        <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
          {formatAmount(monthSpentUsd, 0)} <Text className="text-xs text-muted font-medium">USD</Text>
        </Text>
        <View className="flex-row items-center justify-between" style={{ flexDirection: 'row', gap: ms(8) }}>
          <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(5) }}>
            <View
              className="flex-row items-center rounded-full"
              style={{
                flexDirection: 'row',
                gap: ms(3),
                paddingHorizontal: ms(8),
                paddingVertical: ms(2),
                backgroundColor: deltaColor + '22',
              }}
            >
              <MaterialCommunityIcons name={deltaIcon} size={ms(11)} color={deltaColor} />
              <Text className="text-xs font-semibold" style={{ color: deltaColor }}>
                {monthSpendDeltaPct == null ? '—' : `${Math.abs(monthSpendDeltaPct)}%`}
              </Text>
            </View>
            <Text variant="hint" className="text-muted text-xs">vs {prevMonthLabel}</Text>
          </View>
          <Text variant="hint" className="text-muted text-xs">{monthSpendCount} txs</Text>
        </View>
      </View>
    </View>
  );
}
```

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add screens/dashboard_v2/components/stat_cards.tsx
git commit -m "feat(§5-T8): StatCards V2 — HeroUI re-skin"
```

---

## Task 9: CommitmentsCard V2 (re-skin)

**Goal:** Port V1's `CommitmentsCard` with className-based styling.

**Files:**
- Create: `screens/dashboard_v2/components/commitments_card.tsx`

- [ ] **Step 1: Read V1 source** at `screens/dashboard/components/commitments_card.tsx`. Note: it keeps `LinearGradient` for the progress bar fill.

- [ ] **Step 2: Create V2 file**

```typescript
import React from 'react';
import { Pressable, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { formatMonthYear } from '@/utils/format_date';

interface Props {
  counts: {
    paid: number;
    overdue: number;
    due: number;
    upcoming: number;
    skipped: number;
    total: number;
  };
  totalsByCurrency: Map<string, number>;
  yearMonth: string;
  onPress: () => void;
}

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });

export function CommitmentsCard({ counts, totalsByCurrency, yearMonth, onPress }: Props) {
  const monthLabel = formatMonthYear(yearMonth);
  const progress = counts.total === 0 ? 0 : counts.paid / counts.total;
  const progressPct = Math.round(progress * 100);
  const totalEntries = Array.from(totalsByCurrency.entries());
  const totalsLine =
    totalEntries.length === 0
      ? '—'
      : totalEntries.map(([cur, amt]) => `${numberFmt.format(amt)} ${cur}`).join('  ·  ');

  return (
    <Pressable
      onPress={onPress}
      className="mx-4 mt-4 rounded-2xl bg-surface border border-border px-4 py-3"
      style={{ gap: ms(8) }}
    >
      <View className="flex-row justify-between items-center" style={{ flexDirection: 'row' }}>
        <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(8) }}>
          <View
            className="items-center justify-center rounded-full"
            style={{ width: ms(22), height: ms(22), backgroundColor: Colors.shared.cairoGold + '22' }}
          >
            <MaterialCommunityIcons name="calendar-check" size={ms(13)} color={Colors.shared.cairoGold} />
          </View>
          <Text variant="caption" className="text-foreground font-semibold">
            {Strings.dashboardCommitmentsTitle}
          </Text>
        </View>
        <Text variant="caption" className="text-muted">{monthLabel}</Text>
      </View>

      <View className="flex-row items-center justify-between" style={{ flexDirection: 'row', gap: ms(8) }}>
        <View className="flex-1" style={{ flex: 1 }}>
          <Text variant="hint" className="text-muted uppercase text-xs">
            {Strings.commitmentsTotalCommitted}
          </Text>
          <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
            {totalsLine}
          </Text>
        </View>
        <View
          className="rounded-full"
          style={{
            paddingHorizontal: ms(12),
            paddingVertical: ms(3),
            backgroundColor: Colors.shared.cairoGold + '22',
          }}
        >
          <Text className="text-base font-bold" style={{ color: Colors.shared.cairoGold }}>
            {progressPct}%
          </Text>
        </View>
      </View>

      <View
        className="rounded overflow-hidden"
        style={{ height: ms(3), backgroundColor: Colors.dark.surfaceEl }}
      >
        <LinearGradient
          colors={[Colors.shared.cairoGold, Colors.dark.gold]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{ height: ms(3), width: `${progressPct}%`, borderRadius: ms(2) }}
        />
      </View>

      <View className="flex-row items-center justify-between" style={{ flexDirection: 'row' }}>
        <Stat icon="check-circle" color={Colors.dark.positive} value={counts.paid} />
        <Stat icon="alert-circle" color={Colors.dark.negative} value={counts.overdue} />
        <Stat icon="clock-outline" color={Colors.dark.gold} value={counts.due} />
        <Stat icon="calendar-clock" color={Colors.dark.text2} value={counts.upcoming} />
        <Stat icon="minus-circle" color={Colors.dark.text3} value={counts.skipped} />
      </View>
    </Pressable>
  );
}

function Stat({ icon, color, value }: { icon: IconName; color: string; value: number }) {
  return (
    <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(4) }}>
      <MaterialCommunityIcons name={icon} size={ms(13)} color={color} />
      <Text variant="caption" style={{ color }} className="font-semibold">
        {value}
      </Text>
    </View>
  );
}
```

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add screens/dashboard_v2/components/commitments_card.tsx
git commit -m "feat(§5-T9): CommitmentsCard V2 — HeroUI re-skin"
```

---

## Task 10: SectionHeader V2 (re-skin) with count chip

**Files:**
- Create: `screens/dashboard_v2/components/section_header.tsx`

- [ ] **Step 1: Read V1 source** at `screens/dashboard/components/section_header.tsx`.

- [ ] **Step 2: Create V2 file**

```typescript
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface SectionHeaderProps {
  title: string;
  count?: number;
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <View
      className="flex-row items-center justify-between mx-4 mt-4 mb-2"
      style={{ flexDirection: 'row' }}
    >
      <Text variant="hint" className="text-muted uppercase tracking-wide text-xs font-semibold">
        {title}
      </Text>
      {count !== undefined && count > 0 && (
        <View
          className="rounded-full"
          style={{
            paddingHorizontal: ms(8),
            paddingVertical: ms(2),
            backgroundColor: Colors.shared.cairoGold + '22',
          }}
        >
          <Text className="text-xs font-bold" style={{ color: Colors.shared.cairoGold }}>
            {count}
          </Text>
        </View>
      )}
    </View>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add screens/dashboard_v2/components/section_header.tsx
git commit -m "feat(§5-T10): SectionHeader V2 — re-skin with count chip"
```

---

## Task 11: AccountCard V2 (re-skin)

**Files:**
- Create: `screens/dashboard_v2/components/account_card.tsx`

- [ ] **Step 1: Read V1 source** at `screens/dashboard/components/account_card.tsx` end-to-end. Note the Month In/Out stats integration from `statsMap`.

- [ ] **Step 2: Create the V2 file**

The V2 file has the SAME functional content as V1; only the styling system changes. Reproduce the V1 logic 1:1 — same props, same conditional rendering of stats, same routing on press — but rewrite the JSX to use `Text` from `@/components/ui/text` and className-based styling where Cairo Nights tokens apply. Keep all inline `style` values that are computed (e.g. account swatch hex, dynamic sizing via `ms()`).

The full text of the V2 component should mirror V1 with these systematic substitutions:

- `import { Text } from 'react-native'` → `import { Text } from '@/components/ui/text'`
- `StyleSheet.create({ root: { backgroundColor: Colors.dark.surface, ... } })` → `className="bg-surface ..."` on the root `Pressable`
- Border/padding/radius tokens that map cleanly to Tailwind classes (`p-3`, `rounded-2xl`, `border border-border`) → className
- Account swatch color (dynamic hex) → keep as `style={{ backgroundColor: hex }}` per CLAUDE.md
- Month In/Out chip colors (`Colors.dark.positive`, `Colors.dark.negative`) → keep as inline `style` since they're dynamic

No behavioural changes. After porting, verify against V1 visually.

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add screens/dashboard_v2/components/account_card.tsx
git commit -m "feat(§5-T11): AccountCard V2 — HeroUI re-skin"
```

---

## Task 12: AddCard V2 (re-skin)

**Files:**
- Create: `screens/dashboard_v2/components/add_card.tsx`

- [ ] **Step 1: Read V1 source** at `screens/dashboard/components/add_card.tsx`.

- [ ] **Step 2: Create V2 file**

```typescript
import React from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface AddCardProps {
  onPress: () => void;
}

export function AddCard({ onPress }: AddCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="border border-dashed border-separator rounded-2xl items-center justify-center"
      style={{
        width: ms(72),
        height: ms(72),
        marginRight: ms(8),
      }}
      accessibilityRole="button"
      accessibilityLabel={Strings.emptyAccountsCta}
    >
      <View className="items-center justify-center" style={{ gap: ms(2) }}>
        <MaterialCommunityIcons name="plus" size={ms(20)} color={Colors.shared.cairoGold} />
      </View>
    </Pressable>
  );
}
```

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add screens/dashboard_v2/components/add_card.tsx
git commit -m "feat(§5-T12): AddCard V2 — dashed-border re-skin"
```

---

## Task 13: AccountCarousel V2 (re-skin)

**Files:**
- Create: `screens/dashboard_v2/components/account_carousel.tsx`

- [ ] **Step 1: Read V1 source** at `screens/dashboard/components/account_carousel.tsx`.

- [ ] **Step 2: Create V2 file**

```typescript
import React from 'react';
import { ScrollView, View } from 'react-native';

import { AccountType } from '@/constants/enums';
import { ms } from '@/utils/responsive';
import type { AccountStats } from '@/database/account_stats';
import type { Account } from '@/store/account.store';
import { AccountCard } from './account_card';
import { AddCard } from './add_card';

interface AccountCarouselProps {
  type: AccountType;
  accounts: Account[];
  rate: number;
  statsMap: Record<string, AccountStats>;
  onAccountPress: (id: string) => void;
  onAddPress: () => void;
}

export function AccountCarousel({
  type,
  accounts,
  rate,
  statsMap,
  onAccountPress,
  onAddPress,
}: AccountCarouselProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: ms(16), gap: ms(8) }}
    >
      {accounts.map((account) => (
        <AccountCard
          key={account.id}
          account={account}
          rate={rate}
          stats={statsMap[account.id]}
          onPress={() => onAccountPress(account.id)}
        />
      ))}
      <AddCard onPress={onAddPress} />
    </ScrollView>
  );
}
```

If V1 used a different prop shape on `AccountCard` (e.g. flat balance props), adjust this file to match V1 AccountCard's actual signature. Read V1 first; the snippet above assumes `<AccountCard account={...} rate={...} stats={...} onPress={...} />`.

- [ ] **Step 3: Type check + commit**

```bash
npx tsc --noEmit
git add screens/dashboard_v2/components/account_carousel.tsx
git commit -m "feat(§5-T13): AccountCarousel V2 — re-skin with horizontal scroll"
```

---

## Task 14: NetWorthBreakdownSheet V2

**Goal:** Build the redesigned sheet on §3's `Sheet` primitive. Renders Net Worth headline · Assets with Liquid/Reserve split · Liabilities with per-card list.

**Files:**
- Create: `screens/dashboard_v2/components/net_worth_breakdown_sheet.tsx`
- Create: `__tests__/screens/dashboard_v2/components/net_worth_breakdown_sheet.test.tsx`

- [ ] **Step 1: Write failing tests**

```typescript
import React from 'react';
import { render } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { NetWorthBreakdownSheet } from '@/screens/dashboard_v2/components/net_worth_breakdown_sheet';

function renderSheet(props: Partial<React.ComponentProps<typeof NetWorthBreakdownSheet>> = {}) {
  return render(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NetWorthBreakdownSheet
        visible
        onClose={() => {}}
        assetsEgp={42500}
        liabilitiesEgp={4080}
        netWorthEgp={38420}
        netWorthUsd={786}
        liquidity={{ liquidEgp: 32500, liquidCount: 3, reserveEgp: 10000, reserveCount: 1 }}
        liabilities={[{ id: 'a3', name: 'Visa Credit', balanceEgp: 4080 }]}
        {...props}
      />
    </GestureHandlerRootView>,
  );
}

describe('NetWorthBreakdownSheet', () => {
  it('renders net worth headline in EGP and USD', () => {
    const { getByText } = renderSheet();
    expect(getByText(/38,420/)).toBeTruthy();
    expect(getByText(/786/)).toBeTruthy();
  });

  it('renders Liquid and Reserve legend rows when both tiers non-zero', () => {
    const { getByText } = renderSheet();
    expect(getByText('Liquid')).toBeTruthy();
    expect(getByText('Reserve')).toBeTruthy();
    expect(getByText(/32,500/)).toBeTruthy();
    expect(getByText(/10,000/)).toBeTruthy();
  });

  it('hides Reserve legend row when reserveCount is 0', () => {
    const { queryByText } = renderSheet({
      liquidity: { liquidEgp: 32500, liquidCount: 3, reserveEgp: 0, reserveCount: 0 },
    });
    expect(queryByText('Reserve')).toBeNull();
    expect(queryByText('Liquid')).toBeTruthy();
  });

  it('hides Liquid legend row when liquidCount is 0', () => {
    const { queryByText } = renderSheet({
      liquidity: { liquidEgp: 0, liquidCount: 0, reserveEgp: 10000, reserveCount: 1 },
    });
    expect(queryByText('Liquid')).toBeNull();
    expect(queryByText('Reserve')).toBeTruthy();
  });

  it('hides the entire Liabilities section when liabilities array is empty', () => {
    const { queryByText } = renderSheet({ liabilities: [] });
    expect(queryByText('Total debt')).toBeNull();
  });

  it('renders one row per liability, ordered as passed', () => {
    const { getByText } = renderSheet({
      liabilities: [
        { id: '1', name: 'Card A', balanceEgp: 5000 },
        { id: '2', name: 'Card B', balanceEgp: 1000 },
      ],
    });
    expect(getByText('Card A')).toBeTruthy();
    expect(getByText('Card B')).toBeTruthy();
    expect(getByText('Total debt')).toBeTruthy();
    expect(getByText(/6,000/)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- __tests__/screens/dashboard_v2/components/net_worth_breakdown_sheet.test.tsx`
Expected: FAIL on import.

- [ ] **Step 3: Implement the component**

```typescript
import React from 'react';
import { View } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';

import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { formatAmount } from '@/utils/format_amount';
import type {
  LiabilityRow,
  LiquidityBreakdown,
} from '@/screens/dashboard/dashboard.helpers';

interface NetWorthBreakdownSheetProps {
  visible: boolean;
  onClose: () => void;
  assetsEgp: number;
  liabilitiesEgp: number;
  netWorthEgp: number;
  netWorthUsd: number;
  liquidity: LiquidityBreakdown;
  liabilities: LiabilityRow[];
}

const LIQUID_COLOR = Colors.dark.positive;
const RESERVE_COLOR = Colors.dark.gold;

export function NetWorthBreakdownSheet({
  visible,
  onClose,
  assetsEgp,
  liabilitiesEgp,
  netWorthEgp,
  netWorthUsd,
  liquidity,
  liabilities,
}: NetWorthBreakdownSheetProps) {
  const assetsTotal = liquidity.liquidEgp + liquidity.reserveEgp;
  const liquidPct = assetsTotal > 0 ? liquidity.liquidEgp / assetsTotal : 0;
  const reservePct = 1 - liquidPct;
  const showLiquid = liquidity.liquidCount > 0;
  const showReserve = liquidity.reserveCount > 0;
  const showLiabilities = liabilities.length > 0;
  const totalDebt = liabilities.reduce((sum, row) => sum + row.balanceEgp, 0);
  const assetsAccountCount = liquidity.liquidCount + liquidity.reserveCount;

  return (
    <Sheet visible={visible} onClose={onClose} title={Strings.dashboardBreakdownTitle} size="lg">
      <Sheet.Body>
        <BottomSheetScrollView contentContainerStyle={{ paddingBottom: ms(24) }}>
          {/* Net Worth headline */}
          <View className="px-4 pt-2">
            <Text variant="hint" className="text-muted uppercase tracking-wide text-xs">
              {Strings.dashboardBreakdownNetWorthLabel}
            </Text>
            <Text className="font-bold mt-1" style={{ color: Colors.dark.gold, fontSize: ms(28) }}>
              {formatAmount(netWorthEgp)}{' '}
              <Text className="text-base text-muted font-medium">EGP</Text>
            </Text>
            <Text variant="caption" className="text-muted mt-1">
              ≈ {formatAmount(netWorthUsd, 0)} USD
            </Text>
          </View>

          {/* Divider */}
          <View className="h-px bg-separator mx-4 my-4" />

          {/* Assets */}
          <View className="px-4">
            <Text variant="hint" className="text-muted uppercase tracking-wide text-xs mb-2">
              {Strings.dashAssetsLabel} ·{' '}
              {Strings.dashboardBreakdownAssetsHeader(formatAmount(assetsEgp), assetsAccountCount)}
            </Text>
            {assetsTotal > 0 && (
              <View
                className="rounded overflow-hidden mb-2"
                style={{ height: ms(6), flexDirection: 'row' }}
              >
                {showLiquid && (
                  <View style={{ flex: liquidPct, backgroundColor: LIQUID_COLOR }} />
                )}
                {showReserve && (
                  <View style={{ flex: reservePct, backgroundColor: RESERVE_COLOR }} />
                )}
              </View>
            )}
            {showLiquid && (
              <LegendRow
                color={LIQUID_COLOR}
                label={Strings.dashboardBreakdownLiquid}
                caption={Strings.dashboardBreakdownLiquidCaption}
                value={liquidity.liquidEgp}
                count={liquidity.liquidCount}
              />
            )}
            {showReserve && (
              <LegendRow
                color={RESERVE_COLOR}
                label={Strings.dashboardBreakdownReserve}
                caption={Strings.dashboardBreakdownReserveCaption}
                value={liquidity.reserveEgp}
                count={liquidity.reserveCount}
              />
            )}
          </View>

          {showLiabilities && (
            <>
              <View className="h-px bg-separator mx-4 my-4" />
              <View className="px-4">
                <Text variant="hint" className="text-muted uppercase tracking-wide text-xs mb-2">
                  {Strings.dashLiabilitiesLabel} ·{' '}
                  {Strings.dashboardBreakdownLiabilitiesHeader(
                    formatAmount(liabilitiesEgp),
                    liabilities.length,
                  )}
                </Text>
                {liabilities.map((row) => (
                  <View
                    key={row.id}
                    className="flex-row justify-between py-2"
                    style={{ flexDirection: 'row' }}
                  >
                    <Text className="text-foreground">{row.name}</Text>
                    <Text className="font-semibold" style={{ color: Colors.dark.negative }}>
                      −{formatAmount(row.balanceEgp)}
                    </Text>
                  </View>
                ))}
                <View className="h-px bg-separator mt-1 mb-2" />
                <View
                  className="flex-row justify-between"
                  style={{ flexDirection: 'row' }}
                >
                  <Text className="text-muted">{Strings.dashboardBreakdownTotalDebt}</Text>
                  <Text className="font-bold" style={{ color: Colors.dark.gold }}>
                    {formatAmount(totalDebt)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </BottomSheetScrollView>
      </Sheet.Body>
    </Sheet>
  );
}

interface LegendRowProps {
  color: string;
  label: string;
  caption: string;
  value: number;
  count: number;
}

function LegendRow({ color, label, caption, value, count }: LegendRowProps) {
  return (
    <View
      className="flex-row items-center justify-between py-2"
      style={{ flexDirection: 'row' }}
    >
      <View className="flex-row items-center" style={{ flexDirection: 'row', gap: ms(8) }}>
        <View style={{ width: ms(8), height: ms(8), borderRadius: ms(4), backgroundColor: color }} />
        <View>
          <Text className="text-foreground font-semibold">
            {label} <Text className="text-muted font-normal">({count})</Text>
          </Text>
          <Text variant="caption" className="text-muted">{caption}</Text>
        </View>
      </View>
      <Text className="font-semibold text-foreground">{formatAmount(value)}</Text>
    </View>
  );
}
```

- [ ] **Step 4: Run tests — they must pass**

Run: `npm test -- __tests__/screens/dashboard_v2/components/net_worth_breakdown_sheet.test.tsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add screens/dashboard_v2/components/net_worth_breakdown_sheet.tsx __tests__/screens/dashboard_v2/components/net_worth_breakdown_sheet.test.tsx
git commit -m "feat(§5-T14): NetWorthBreakdownSheet V2 — redesign on Sheet primitive"
```

---

## Task 15: DashboardScreenV2 index + screen smoke test

**Goal:** The screen file ties everything together — header, SegmentSwitcher, segmented body, breakdown sheet, empty state.

**Files:**
- Create: `screens/dashboard_v2/index.tsx`
- Create: `__tests__/screens/dashboard_v2/dashboard_screen.test.tsx`

- [ ] **Step 1: Write the failing screen smoke test**

```typescript
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { AccountType, Currency } from '@/constants/enums';
import { useAccountStore } from '@/store/account.store';
import { useCurrencyStore } from '@/store/currency.store';
import DashboardScreenV2 from '@/screens/dashboard_v2';

const pushMock = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: (...args: unknown[]) => pushMock(...args) }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock('@/database/client', () => ({ getDb: jest.fn().mockResolvedValue({}) }));
jest.mock('@/database/account_stats', () => ({ getAccountsStats: jest.fn().mockResolvedValue({}) }));
jest.mock('@/database/transactions', () => ({
  getMonthExpenseStats: jest.fn().mockResolvedValue({ totalEgp: 0, usdNative: 0, count: 0 }),
}));
jest.mock('@/repositories/commitment.repository', () => ({
  commitmentRepository: { getPaymentsForMonth: jest.fn().mockResolvedValue([]) },
}));

function renderScreen() {
  return render(
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DashboardScreenV2 />
    </GestureHandlerRootView>,
  );
}

beforeEach(() => {
  pushMock.mockReset();
});

describe('DashboardScreenV2', () => {
  it('renders the empty state when there are zero accounts', () => {
    useAccountStore.setState({
      state: { ...useAccountStore.getState().state, accounts: [] as never },
    });
    const { getByText, queryByText } = renderScreen();
    expect(getByText(/Add Account/i)).toBeTruthy();
    expect(queryByText('Overview')).toBeNull();
    expect(queryByText('Accounts')).toBeNull();
  });

  it('renders both segments after the user adds an account; Overview is default', () => {
    useAccountStore.setState({
      state: {
        ...useAccountStore.getState().state,
        accounts: [
          {
            id: 'a1',
            name: 'CIB',
            type: AccountType.Bank,
            currency: Currency.EGP,
            current_balance: 1000,
            opening_balance: 1000,
            is_archived: 0,
            created_at: '',
            updated_at: '',
          },
        ] as never,
      },
    });
    useCurrencyStore.setState({
      state: { ...useCurrencyStore.getState().state, rate: 48.85, isManualOverride: false },
    });
    const { getByText } = renderScreen();
    expect(getByText('Overview')).toBeTruthy();
    expect(getByText('Accounts')).toBeTruthy();
    expect(getByText('Available to Spend')).toBeTruthy();
  });

  it('swaps to Accounts segment when the Accounts tab is tapped', () => {
    useAccountStore.setState({
      state: {
        ...useAccountStore.getState().state,
        accounts: [
          {
            id: 'a1',
            name: 'CIB',
            type: AccountType.Bank,
            currency: Currency.EGP,
            current_balance: 1000,
            opening_balance: 1000,
            is_archived: 0,
            created_at: '',
            updated_at: '',
          },
        ] as never,
      },
    });
    const { getByText, queryByText } = renderScreen();
    fireEvent.press(getByText('Accounts'));
    expect(queryByText('Available to Spend')).toBeNull();
    expect(getByText('Total balance')).toBeTruthy();
  });

  it('tapping the settings cog routes to /settings', () => {
    useAccountStore.setState({
      state: { ...useAccountStore.getState().state, accounts: [] as never },
    });
    const { getByLabelText } = renderScreen();
    fireEvent.press(getByLabelText('Settings'));
    expect(pushMock).toHaveBeenCalledWith('/settings');
  });
});
```

- [ ] **Step 2: Run failing test**

Run: `npm test -- __tests__/screens/dashboard_v2/dashboard_screen.test.tsx`
Expected: FAIL on import.

- [ ] **Step 3: Create the screen file**

```typescript
import React, { useEffect } from 'react';
import { Pressable, RefreshControl, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { EmptyState } from '@/components/ui/empty_state';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { ms } from '@/utils/responsive';
import { useDashboardV2 } from './dashboard.hook';
import { useDashboardAnim } from './dashboard.anim';
import { SegmentSwitcher } from './components/segment_switcher';
import { TotalBalanceStrip } from './components/total_balance_strip';
import { HeroCard } from './components/hero_card';
import { StatCards } from './components/stat_cards';
import { CommitmentsCard } from './components/commitments_card';
import { SectionHeader } from './components/section_header';
import { AccountCarousel } from './components/account_carousel';
import { NetWorthBreakdownSheet } from './components/net_worth_breakdown_sheet';

const TYPE_ORDER: AccountType[] = [
  AccountType.Bank,
  AccountType.SmartWallet,
  AccountType.PhysicalWallet,
  AccountType.PhysicalSavings,
  AccountType.CreditCard,
];

const SECTION_TITLES: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank.toUpperCase(),
  [AccountType.SmartWallet]: Strings.typeSmartWallet.toUpperCase(),
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet.toUpperCase(),
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings.toUpperCase(),
  [AccountType.CreditCard]: Strings.typeCreditCard.toUpperCase(),
};

export default function DashboardScreenV2() {
  const {
    state,
    setBreakdownVisible,
    setSelectedSegment,
    refresh,
    goToAccount,
    goToAddAccount,
    goToSettings,
  } = useDashboardV2();
  const { heroStyle, startEntrance, statsEntering, sectionEntering } = useDashboardAnim();

  useEffect(() => {
    startEntrance();
  }, []);

  const hasAccounts = state.accounts.length > 0;
  const visibleTypes = TYPE_ORDER.filter((t) => state.groupedAccounts[t]?.length);
  const segment = state.selectedSegment;

  return (
    <Screen edges={['top']}>
      {/* Header */}
      <View
        className="flex-row items-center justify-between px-4"
        style={{ flexDirection: 'row', height: Size.headerHeight }}
      >
        <Text className="font-bold" style={{ fontFamily: FontFamily.soraBold, fontSize: Type.title }}>
          MoneyApp
        </Text>
        <Pressable
          onPress={goToSettings}
          accessibilityRole="button"
          accessibilityLabel="Settings"
          className="items-center justify-center rounded-lg bg-surface border border-border"
          style={{ width: Size.backBtn, height: Size.backBtn }}
        >
          <MaterialCommunityIcons name="cog" size={Size.iconMd} color={Colors.dark.text2} />
        </Pressable>
      </View>

      {!hasAccounts ? (
        <EmptyState variant="accounts" onAction={goToAddAccount} />
      ) : (
        <>
          <SegmentSwitcher value={segment} onChange={setSelectedSegment} />

          <ScreenScroll
            refreshControl={
              <RefreshControl
                refreshing={state.refreshing}
                onRefresh={refresh}
                tintColor={Colors.shared.cairoGold}
              />
            }
          >
            <Animated.View
              key={segment}
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(150)}
            >
              {segment === 'overview' ? (
                <>
                  <Animated.View style={heroStyle}>
                    <HeroCard
                      assetsEgp={state.netWorth.assetsEgp}
                      assetsUsd={state.netWorth.assetsUsd}
                      rate={state.rate}
                      isManualOverride={state.isManualOverride}
                      assetsCount={state.accountCounts.assets}
                      liabilitiesCount={state.accountCounts.liabilities}
                      onPress={() => setBreakdownVisible(true)}
                    />
                  </Animated.View>

                  <Animated.View entering={statsEntering}>
                    <StatCards
                      netWorthEgp={state.netWorth.netWorthEgp}
                      assetsEgp={state.netWorth.assetsEgp}
                      liabilitiesEgp={state.netWorth.liabilitiesEgp}
                      assetsCount={state.accountCounts.assets}
                      liabilitiesCount={state.accountCounts.liabilities}
                      monthSpentEgp={state.monthSpend.currentEgp}
                      monthSpentUsd={state.monthSpend.currentUsdNative}
                      monthSpendDeltaPct={state.monthSpend.deltaPct}
                      monthSpendCount={state.monthSpend.currentCount}
                      spendYearMonth={state.monthSpend.yearMonth}
                    />
                  </Animated.View>

                  <CommitmentsCard
                    counts={state.commitments.counts}
                    totalsByCurrency={state.commitments.totalsByCurrency}
                    yearMonth={state.commitments.yearMonth}
                    onPress={() => {
                      /* navigation handled in hook if needed */
                    }}
                  />

                  <View style={{ height: Spacing.xxl }} />
                </>
              ) : (
                <>
                  <TotalBalanceStrip
                    assetsEgp={state.netWorth.assetsEgp}
                    accountsCount={state.accountCounts.assets + state.accountCounts.liabilities}
                  />
                  {visibleTypes.map((type, index) => (
                    <Animated.View key={type} entering={sectionEntering(index)}>
                      <SectionHeader
                        title={SECTION_TITLES[type]}
                        count={state.groupedAccounts[type]?.length ?? 0}
                      />
                      <AccountCarousel
                        type={type}
                        accounts={state.groupedAccounts[type] ?? []}
                        rate={state.rate}
                        statsMap={state.statsMap}
                        onAccountPress={goToAccount}
                        onAddPress={goToAddAccount}
                      />
                    </Animated.View>
                  ))}
                  <View style={{ height: Spacing.xxl }} />
                </>
              )}
            </Animated.View>
          </ScreenScroll>
        </>
      )}

      <NetWorthBreakdownSheet
        visible={state.isBreakdownVisible}
        onClose={() => setBreakdownVisible(false)}
        assetsEgp={state.netWorth.assetsEgp}
        liabilitiesEgp={state.netWorth.liabilitiesEgp}
        netWorthEgp={state.netWorth.netWorthEgp}
        netWorthUsd={state.netWorth.netWorthUsd}
        liquidity={state.liquidity}
        liabilities={state.liabilities}
      />
    </Screen>
  );
}
```

Note: the `CommitmentsCard.onPress` is wired to the hook's `goToCommitments` action — pull it from the hook destructure if used. The snippet above leaves it inert for brevity; the engineer should wire it through identically to V1.

- [ ] **Step 4: Run the screen smoke test — must pass**

Run: `npm test -- __tests__/screens/dashboard_v2/dashboard_screen.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Run full test suite + coverage**

Run: `npm run test:coverage`
Expected: PASS. Coverage thresholds (80% lines / 95% functions / 100% branches) hold.

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add screens/dashboard_v2/index.tsx __tests__/screens/dashboard_v2/dashboard_screen.test.tsx
git commit -m "feat(§5-T15): DashboardScreenV2 — Screen + SegmentSwitcher + segmented body + breakdown sheet"
```

---

## Task 16: Route flag-branch (flag still false)

**Goal:** Wire the V2 screen into the route file behind the existing `newDashboard` flag, leaving the flag at `false` so V1 still renders.

**Files:**
- Modify: `app/(app)/(tabs)/dashboard/index.tsx`

- [ ] **Step 1: Read the current route file**

Run: open `app/(app)/(tabs)/dashboard/index.tsx`. Confirm it currently re-exports V1.

- [ ] **Step 2: Replace with flag-branch component**

Overwrite the file with:

```typescript
import React from 'react';

import { FeatureFlags } from '@/constants/feature_flags';
import DashboardScreenV1 from '@/screens/dashboard';
import DashboardScreenV2 from '@/screens/dashboard_v2';

export default function DashboardRoute() {
  return FeatureFlags.newDashboard ? <DashboardScreenV2 /> : <DashboardScreenV1 />;
}
```

- [ ] **Step 3: Run type check + tests**

Run: `npx tsc --noEmit && npm test`
Expected: clean. All tests pass.

- [ ] **Step 4: Commit**

```bash
git add app/\(app\)/\(tabs\)/dashboard/index.tsx
git commit -m "feat(§5-T16): wire DashboardScreenV2 behind newDashboard flag"
```

---

## Task 17: Manual QA window

**Goal:** Verify V2 on device with the flag flipped locally (NOT committed). This is a verification gate, not a code task.

- [ ] **Step 1: Locally flip the flag**

Edit `constants/feature_flags.ts` and set `newDashboard: true`. **Do NOT commit.** This is local-only for QA.

- [ ] **Step 2: Run on Android**

```bash
npx expo prebuild --clean
npx expo run:android
```

- [ ] **Step 3: Smoke-test the golden paths**

Walk through:
- Empty state (delete all accounts, open dashboard) — verify EmptyState renders, no segments, FAB visible from tab layout.
- Add one account — verify segment switcher appears, Overview is default.
- Overview — HeroCard renders gold gradient + amount + chips. Tap HeroCard → breakdown sheet opens with Net Worth + Assets (Liquid/Reserve) + Liabilities. Close sheet by swipe-down, scrim tap, and X button.
- Swap to Accounts — segment slides in (fade). Total balance strip at top. Carousels grouped by type, AddCard at end of each. Tap AccountCard → routes to /accounts/{id}. Tap AddCard → routes to /accounts/add_account.
- Swap back to Overview — content re-fires entering animations.
- Navigate away to Settings tab, come back — segment is reset to Overview.
- Pull-to-refresh in both segments — RefreshControl spins, accounts reload.
- Multiple credit cards (add 2) — breakdown sheet shows both rows ordered by balance descending.

- [ ] **Step 4: Run on iOS**

```bash
npx expo run:ios
```

Repeat the smoke test.

- [ ] **Step 5: Revert the local flag flip**

Edit `constants/feature_flags.ts` and set `newDashboard: false` again. Verify `git diff` shows no changes to feature_flags before continuing.

- [ ] **Step 6: Document any issues found**

If any issue surfaced, file a follow-up task. If clean, proceed to Task 18.

---

## Task 18: Promotion commit — flip flag to true

**Goal:** The one commit that actually exposes V2 to users. Per the `constants/feature_flags.ts` rule, this commit changes ONLY the flag value.

**Files:**
- Modify: `constants/feature_flags.ts`

- [ ] **Step 1: Flip the flag**

Edit `constants/feature_flags.ts`:

```typescript
  newDashboard: true, // §5
```

- [ ] **Step 2: Run the full test suite**

Run: `npm run test:coverage`
Expected: PASS.

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add constants/feature_flags.ts
git commit -m "feat(§5-T18): promote DashboardScreenV2 — flip newDashboard flag to true"
```

---

## Task 19: Cleanup commit — delete V1 tree + restore one-liner

**Goal:** Per `constants/feature_flags.ts` rule, within 5 business days of promotion, delete V1 and remove the flag. This is that commit.

**Files:**
- Delete: `screens/dashboard/` (entire directory)
- Modify: `app/(app)/(tabs)/dashboard/index.tsx`
- Modify: `constants/feature_flags.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Verify nothing else imports V1 paths**

Run: `grep -rn "screens/dashboard'\|screens/dashboard/" --include='*.ts' --include='*.tsx' . | grep -v dashboard_v2 | grep -v __tests__`
Expected: only the route file imports `@/screens/dashboard` (which we'll fix in Step 2). If anything else does, stop and resolve those first.

- [ ] **Step 2: Restore the route to a one-line re-export**

Overwrite `app/(app)/(tabs)/dashboard/index.tsx`:

```typescript
export { default } from '@/screens/dashboard_v2';
```

- [ ] **Step 3: Delete the V1 directory**

```bash
rm -rf screens/dashboard/
```

NOTE: this deletes `screens/dashboard/dashboard.helpers.ts` which is shared. Before this step, MOVE the helpers file to `screens/dashboard_v2/dashboard.helpers.ts` and update both V2 imports and the test imports to point to the new location. Specifically:

1. `git mv screens/dashboard/dashboard.helpers.ts screens/dashboard_v2/dashboard.helpers.ts`
2. Update `screens/dashboard_v2/dashboard.hook.ts` import path from `@/screens/dashboard/dashboard.helpers` to `./dashboard.helpers`.
3. Update `screens/dashboard_v2/components/net_worth_breakdown_sheet.tsx` import path from `@/screens/dashboard/dashboard.helpers` to `../dashboard.helpers`.
4. Update `__tests__/screens/dashboard_v2/dashboard_helpers.test.ts` import path to `@/screens/dashboard_v2/dashboard.helpers`.
5. Now run `rm -rf screens/dashboard/`.

- [ ] **Step 4: Remove the `newDashboard` flag entry**

Edit `constants/feature_flags.ts` and remove the entire line:

```typescript
  newDashboard: true, // §5
```

- [ ] **Step 5: Update CLAUDE.md**

Edit `CLAUDE.md`. In the section listing legacy `react-native-actions-sheet` consumers (currently around "Legacy consumers still in-flight (as of §3): …"), remove this entry:

```
screens/dashboard/components/net_worth_breakdown_sheet.tsx
```

- [ ] **Step 6: Run full test suite + coverage**

Run: `npm run test:coverage`
Expected: PASS.

- [ ] **Step 7: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 8: Commit**

```bash
git add screens/ app/\(app\)/\(tabs\)/dashboard/index.tsx constants/feature_flags.ts CLAUDE.md
git commit -m "$(cat <<'EOF'
chore(§5-T19): cleanup — delete V1 dashboard tree, remove newDashboard flag

- Delete screens/dashboard/ (V1 tree, superseded by V2).
- Move dashboard.helpers.ts to screens/dashboard_v2/ and update imports.
- Restore app/(app)/(tabs)/dashboard/index.tsx to one-line re-export of V2.
- Remove newDashboard from FeatureFlags.
- Remove net_worth_breakdown_sheet.tsx from CLAUDE.md legacy migration list.
EOF
)"
```

---

## Self-Review

Cross-check each spec requirement → task mapping.

| Spec section / requirement | Task |
|---|---|
| §1 — 2-segment IA | Tasks 3 (state), 5 (switcher), 15 (screen) |
| §1 — Overview re-skin | Tasks 7, 8, 9 |
| §1 — Accounts segment | Tasks 6, 10, 11, 12, 13, 15 |
| §1 — Breakdown sheet redesign | Task 14 |
| §1 — Liquidity helpers | Task 1 |
| §1 — Per-card liabilities helper | Task 1 |
| §1 — newDashboard flag retirement | Tasks 16, 18, 19 |
| §1 — Legacy actions-sheet consumer removal | Task 19 (deletion as part of V1 tree removal) |
| §3.1 — Screen anatomy + flag-branch route | Tasks 15, 16, 19 |
| §3.2 — Empty state | Task 15 |
| §3.3 — Segment focus reset | Task 4 |
| §3.3 — Segment swap animation (fade only) | Task 15 (key={segment} on Animated.View) |
| §4.1 — Overview visual fidelity | Tasks 7, 8, 9 |
| §4.2 — TotalBalanceStrip | Task 6 |
| §4.2 — Per-type carousels with count chip | Tasks 10, 13, 15 |
| §4.3 — Breakdown sheet layout | Task 14 |
| §5.1–§5.3 — Layla financial logic + edge cases | Task 1 helpers + Task 14 sheet rendering |
| §5.4 — Layla test cases L-01..L-08 | Task 1 (helper tests) + Task 14 (sheet tests) |
| §6.1 — Helper signatures | Task 1 |
| §6.2 — State/store shape | Task 3 |
| §6.3 — Hook returns | Task 4 |
| §6.4 — File map | Tasks 3–15 (matches new files; cleanup removes V1) |
| §7 — Migration strategy (v1/v2 + promotion + cleanup) | Tasks 16, 17, 18, 19 |
| §8.1 — Helper tests | Task 1 |
| §8.2 — Hook tests | Task 4 |
| §8.3 — Component tests | Tasks 5, 6, 14 |
| §8.4 — Screen smoke test | Task 15 |
| §9 — Strings | Task 2 |
| §11 AC #1 (cleanup state) | Task 19 |
| §11 AC #2 (sheet removal from CLAUDE.md) | Task 19 |
| §11 AC #3 (Overview parity) | Tasks 7, 8, 9, 15 |
| §11 AC #4 (Accounts segment) | Tasks 6, 10, 11, 12, 13, 15 |
| §11 AC #5 (Breakdown sheet) | Task 14 |
| §11 AC #6 (focus reset) | Task 4 |
| §11 AC #7 (tests pass) | Tasks 15, 18, 19 |
| §11 AC #8 (no hex/spacing/strings violations) | All component tasks must use Cairo Nights tokens; verified by code review |
| §11 AC #9 (renders on iPhone SE + Pixel 4) | Task 17 (manual QA) |

**Coverage:** all sections accounted for.

**Placeholder scan:** no TBD/TODO/FIXME outside the (intentional) "TODO(S2)" in `components/ui/fab.tsx` which is unrelated to §5.

**Type consistency:** the `LiquidityBreakdown` and `LiabilityRow` types defined in Task 1 are imported with the same names in Tasks 4, 14, and 15. `DashboardSegment` defined in Task 3 is imported in Tasks 4, 5, 15. No mismatches.

**No-placeholder fix-ups already applied during writing:**
- Task 11 (`AccountCard V2`) does not paste 200 lines of V1 boilerplate. Instead it gives a clear porting rule. This is acceptable per the writing-plans skill's "follow existing patterns" guidance — V1's AccountCard is read in Step 1, and the V2 file is a systematic substitution. The engineer must check their V2 output against V1 visually before committing.
- Task 13 (`AccountCarousel V2`) flags a potential prop-shape mismatch if V1's `AccountCard` uses different props than the canonical assumption; the engineer must reconcile after reading V1.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-16-section-5-dashboard.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Sarah dispatches a fresh `@dev` subagent per task, reviews between tasks, fast iteration. Best for §5's 19-task scope so each task gets a clean context.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints for review.

Which approach?
