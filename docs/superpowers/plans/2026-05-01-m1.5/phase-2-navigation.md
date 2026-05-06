# M1.5 Phase 2 — Navigation Scaffold + Dashboard Helpers

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the `(app)` group navigation, create the 5-tab layout, add placeholder screens, fix `ready.helpers.ts` to use `current_balance`, and TDD the pure dashboard helper functions.

**Depends on:** Phase 1 complete.

**Architecture:** Expo Router v3 groups are URL-transparent — `app/(app)/(tabs)/dashboard/index.tsx` maps to `/dashboard`, same as the old `app/dashboard/index.tsx`. The old file must be deleted to avoid a route conflict. The `(app)/_layout.tsx` loads account and currency data once on mount.

**Tech Stack:** Expo Router v3, React Native, Zustand v5, Jest

---

### Task 7: Navigation Scaffold + Fix ready.helpers.ts

**Files:**
- Create: `app/(app)/_layout.tsx`
- Create: `app/(app)/(tabs)/_layout.tsx`
- Create: `app/(app)/(tabs)/dashboard/index.tsx` (stub — replaced in Phase 3)
- Create: `app/(app)/(tabs)/transactions/index.tsx`
- Create: `app/(app)/(tabs)/bills/index.tsx`
- Create: `app/(app)/(tabs)/goals/index.tsx`
- Create: `app/(app)/(tabs)/budget/index.tsx`
- Delete: `app/dashboard/index.tsx`
- Modify: `app/(onboarding)/ready/ready.helpers.ts`

- [ ] **Step 1: Create app/(app)/_layout.tsx**

```tsx
import { useEffect } from 'react';
import { Stack } from 'expo-router';

import { useAccountStore } from '@/store/account.store';
import { useCurrencyStore } from '@/store/currency.store';

export default function AppLayout() {
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const loadRate = useCurrencyStore((s) => s.loadRate);
  const fetchRate = useCurrencyStore((s) => s.fetchRate);

  useEffect(() => {
    loadAccounts();
    loadRate().then(() => fetchRate()).catch(() => {});
  }, []);

  return <Stack screenOptions={{ headerShown: false }} />;
}
```

- [ ] **Step 2: Create app/(app)/(tabs)/_layout.tsx**

```tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Tabs } from 'expo-router';

import { Colors } from '@/constants/theme';

type MCIName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

function tabIcon(name: MCIName, color: string) {
  return <MaterialCommunityIcons name={name} size={24} color={color} />;
}

export default function TabsLayout() {
  return (
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.shared.cairoGold,
        tabBarInactiveTintColor: Colors.dark.text2,
        tabBarStyle: {
          backgroundColor: Colors.dark.surface,
          borderTopColor: Colors.dark.border,
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{ title: 'Home', tabBarIcon: ({ color }) => tabIcon('home', color) }}
      />
      <Tabs.Screen
        name="transactions"
        options={{
          title: 'Transactions',
          tabBarIcon: ({ color }) => tabIcon('swap-horizontal', color),
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{ title: 'Bills', tabBarIcon: ({ color }) => tabIcon('calendar-clock', color) }}
      />
      <Tabs.Screen
        name="goals"
        options={{ title: 'Goals', tabBarIcon: ({ color }) => tabIcon('target', color) }}
      />
      <Tabs.Screen
        name="budget"
        options={{ title: 'Budget', tabBarIcon: ({ color }) => tabIcon('chart-pie', color) }}
      />
    </Tabs>
  );
}
```

- [ ] **Step 3: Create dashboard stub**

Create `app/(app)/(tabs)/dashboard/index.tsx` (temporary — replaced in Phase 3):

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '@/constants/theme';

export default function DashboardScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <Text style={styles.text}>Dashboard coming soon…</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: Colors.dark.text2 },
});
```

- [ ] **Step 4: Create placeholder tab screens**

Create `app/(app)/(tabs)/transactions/index.tsx`:

```tsx
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

export default function TransactionsScreen() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.center}>
        <Text style={styles.text}>Transactions — M2</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  text: { color: Colors.dark.text2 },
});
```

Create `app/(app)/(tabs)/bills/index.tsx` — same structure, text: `'Bills — M3'`.

Create `app/(app)/(tabs)/goals/index.tsx` — same structure, text: `'Goals — M5'`.

Create `app/(app)/(tabs)/budget/index.tsx` — same structure, text: `'Budget — M6'`.

- [ ] **Step 5: Delete old dashboard placeholder**

```bash
git rm app/dashboard/index.tsx
rmdir app/dashboard 2>/dev/null || true
```

- [ ] **Step 6: Fix ready.helpers.ts to use current_balance**

In `app/(onboarding)/ready/ready.helpers.ts`, change:

```typescript
// before
export function computeTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.opening_balance, 0);
}
```

```typescript
// after
export function computeTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.current_balance, 0);
}
```

- [ ] **Step 7: Run ready.helpers test to confirm still passes**

```bash
npm test -- --testPathPattern="ready.helpers" --no-coverage
```

Expected: PASS — test fixtures set `current_balance = opening_balance` so the assertion is invariant to the field name change.

- [ ] **Step 8: Commit**

```bash
git add app/\(app\)/ \
  app/\(onboarding\)/ready/ready.helpers.ts
git commit -m "feat: (app) group nav scaffold — AppLayout, TabsLayout, placeholder tabs; fix computeTotalBalance to use current_balance"
```

---

### Task 8: Dashboard Helpers (TDD)

**Files:**
- Create: `app/(app)/(tabs)/dashboard/dashboard.helpers.ts`
- Create: `__tests__/dashboard.helpers.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/dashboard.helpers.test.ts`:

```typescript
import {
  computeNetWorth,
  formatAmount,
  groupAccountsByType,
} from '@/app/(app)/(tabs)/dashboard/dashboard.helpers';
import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/store/account.store';

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 'acc-1',
  name: 'Test',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 0,
  current_balance: 0,
  color: null,
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  is_archived: 0,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('computeNetWorth', () => {
  it('returns all zeros for empty accounts', () => {
    expect(computeNetWorth([], 50)).toEqual({
      assetsEgp: 0,
      liabilitiesEgp: 0,
      netWorthEgp: 0,
      netWorthUsd: 0,
    });
  });

  it('adds EGP non-CC account balance to assets', () => {
    const result = computeNetWorth([makeAccount({ current_balance: 10000 })], 50);
    expect(result.assetsEgp).toBe(10000);
    expect(result.liabilitiesEgp).toBe(0);
    expect(result.netWorthEgp).toBe(10000);
  });

  it('converts USD account to EGP using rate', () => {
    const result = computeNetWorth(
      [makeAccount({ current_balance: 100, currency: Currency.USD })],
      50,
    );
    expect(result.assetsEgp).toBe(5000);
  });

  it('adds credit card balance to liabilities, not assets', () => {
    const result = computeNetWorth(
      [makeAccount({ type: AccountType.CreditCard, current_balance: 2000 })],
      50,
    );
    expect(result.liabilitiesEgp).toBe(2000);
    expect(result.assetsEgp).toBe(0);
    expect(result.netWorthEgp).toBe(-2000);
  });

  it('computes net worth = assets − liabilities across mixed accounts', () => {
    const accounts = [
      makeAccount({ id: 'a1', current_balance: 10000 }),
      makeAccount({ id: 'a2', type: AccountType.CreditCard, current_balance: 3000 }),
    ];
    const result = computeNetWorth(accounts, 50);
    expect(result.netWorthEgp).toBe(7000);
    expect(result.netWorthUsd).toBeCloseTo(140, 1);
  });

  it('returns netWorthUsd=0 when rate=0 to avoid division by zero', () => {
    const result = computeNetWorth([makeAccount({ current_balance: 5000 })], 0);
    expect(result.netWorthUsd).toBe(0);
  });
});

describe('groupAccountsByType', () => {
  it('returns empty object for empty accounts', () => {
    expect(groupAccountsByType([])).toEqual({});
  });

  it('groups accounts by type', () => {
    const accounts = [
      makeAccount({ id: 'a1', type: AccountType.Bank }),
      makeAccount({ id: 'a2', type: AccountType.Bank }),
      makeAccount({ id: 'a3', type: AccountType.CreditCard }),
    ];
    const groups = groupAccountsByType(accounts);
    expect(groups[AccountType.Bank]).toHaveLength(2);
    expect(groups[AccountType.CreditCard]).toHaveLength(1);
    expect(groups[AccountType.SmartWallet]).toBeUndefined();
  });

  it('preserves order within each group', () => {
    const a1 = makeAccount({ id: 'a1', name: 'First', type: AccountType.Bank });
    const a2 = makeAccount({ id: 'a2', name: 'Second', type: AccountType.Bank });
    const groups = groupAccountsByType([a1, a2]);
    expect(groups[AccountType.Bank]![0].name).toBe('First');
    expect(groups[AccountType.Bank]![1].name).toBe('Second');
  });
});

describe('formatAmount', () => {
  it('formats integer with comma separator', () => {
    expect(formatAmount(10500)).toBe('10,500');
  });

  it('formats with decimals when specified', () => {
    expect(formatAmount(10500.5, 1)).toBe('10,500.5');
  });

  it('returns "0" for zero', () => {
    expect(formatAmount(0)).toBe('0');
  });

  it('formats negative amounts', () => {
    expect(formatAmount(-5000)).toBe('-5,000');
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --testPathPattern="dashboard.helpers" --no-coverage
```

Expected: FAIL — `Cannot find module '@/app/(app)/(tabs)/dashboard/dashboard.helpers'`

- [ ] **Step 3: Create app/(app)/(tabs)/dashboard/dashboard.helpers.ts**

```typescript
import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/store/account.store';

export interface NetWorthResult {
  assetsEgp: number;
  liabilitiesEgp: number;
  netWorthEgp: number;
  netWorthUsd: number;
}

export function computeNetWorth(accounts: Account[], rate: number): NetWorthResult {
  let assetsEgp = 0;
  let liabilitiesEgp = 0;

  for (const a of accounts) {
    const balanceEgp =
      a.currency === Currency.USD ? a.current_balance * rate : a.current_balance;
    if (a.type === AccountType.CreditCard) {
      liabilitiesEgp += balanceEgp;
    } else {
      assetsEgp += balanceEgp;
    }
  }

  const netWorthEgp = assetsEgp - liabilitiesEgp;
  const netWorthUsd = rate > 0 ? netWorthEgp / rate : 0;
  return { assetsEgp, liabilitiesEgp, netWorthEgp, netWorthUsd };
}

export function groupAccountsByType(
  accounts: Account[],
): Partial<Record<AccountType, Account[]>> {
  const groups: Partial<Record<AccountType, Account[]>> = {};
  for (const a of accounts) {
    if (!groups[a.type]) groups[a.type] = [];
    groups[a.type]!.push(a);
  }
  return groups;
}

export function formatAmount(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- --testPathPattern="dashboard.helpers" --no-coverage
```

Expected: PASS (all tests)

- [ ] **Step 5: Run full suite to confirm no regressions**

```bash
npm test -- --no-coverage
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/\(tabs\)/dashboard/dashboard.helpers.ts \
  __tests__/dashboard.helpers.test.ts
git commit -m "feat: dashboard.helpers — computeNetWorth, groupAccountsByType, formatAmount (TDD)"
```
