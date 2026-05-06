# M1.5 Phase 1 — Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create the feature branch, extract the shared add-account schema, add all M1.5 strings, create a shared `formatAmount` utility, extend the data layer with three new SQL operations, extend the repository and account store with those operations (TDD), and create the currency store (TDD). All work here is pure logic — no React Native components.

**Architecture:** TDD for every store and repository method. Currency store follows the DI factory pattern established by `account.store.ts`. `createCurrencyStore(repo)` closes over the injected repo; `useCurrencyStore` is the singleton exported for app use.

**Tech Stack:** TypeScript, Zustand v5, Zod v4, expo-sqlite, better-sqlite3 (tests), Jest

---

### Task 1: Create Feature Branch

**Files:** none

- [ ] **Step 1: Create and switch to branch**

```bash
git checkout -b feat/m1.5-dashboard-account-management
```

Expected: `Switched to a new branch 'feat/m1.5-dashboard-account-management'`

---

### Task 2: Extract Add-Account Schema + Add M1.5 Strings + Format Utility

**Files:**
- Create: `utils/schemas/add_account.schema.ts`
- Modify: `app/(onboarding)/add_account/add_account.hook.ts`
- Modify: `constants/strings.ts`
- Create: `utils/format_amount.ts`

- [ ] **Step 1: Create utils/schemas/add_account.schema.ts**

```typescript
import { z } from 'zod';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/store/account.store';

export function createAddAccountSchema(accounts: Account[]) {
  return z
    .object({
      name: z.string().min(1, Strings.errNameRequired).max(30, Strings.errNameTooLong),
      balance: z.string().refine(
        (v) => {
          const n = parseFloat(v);
          return Number.isFinite(n) && n >= 0;
        },
        { message: Strings.errBalanceInvalid },
      ),
      selected_type: z.nativeEnum(AccountType),
      selected_color: z.string(),
      currency: z.nativeEnum(Currency),
      interest_tracking: z.boolean(),
      credit_limit: z.string().optional(),
      apr: z.string().optional(),
      revolving_balance: z.string().optional(),
      min_payment: z.string().optional(),
      due_day: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (accounts.some((a) => a.name.trim().toLowerCase() === data.name.trim().toLowerCase())) {
        ctx.addIssue({ code: 'custom', path: ['name'], message: Strings.errNameDuplicate });
      }
      if (data.selected_type === AccountType.CreditCard && !data.credit_limit?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['credit_limit'],
          message: Strings.errCreditLimitRequired,
        });
      }
      if (data.interest_tracking && !data.apr?.trim()) {
        ctx.addIssue({ code: 'custom', path: ['apr'], message: Strings.errAprRequired });
      }
    });
}

export type AddAccountFormData = z.infer<ReturnType<typeof createAddAccountSchema>>;
```

- [ ] **Step 2: Update add_account.hook.ts to import from shared schema**

In `app/(onboarding)/add_account/add_account.hook.ts`:

1. Remove the `z` import and the local `createAddAccountSchema` function body (lines 2 and 13–51).
2. Remove the `AddAccountFormData` type declaration (line 51).
3. Add the import below the existing imports:

```typescript
import {
  createAddAccountSchema,
  type AddAccountFormData,
} from '@/utils/schemas/add_account.schema';
```

The final import block at the top of the hook file should be:

```typescript
import { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { backOrReplace } from '@/utils/onboarding_nav';
import { AccountColors } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { AccountType, Currency, OnboardingStep } from '@/constants/enums';
import type { Account } from '@/store/account.store';
import {
  createAddAccountSchema,
  type AddAccountFormData,
} from '@/utils/schemas/add_account.schema';
```

- [ ] **Step 3: Run existing schema tests to confirm pass**

```bash
npm test -- --testPathPattern="add_account.schema|schema.test" --no-coverage
```

Expected: PASS

- [ ] **Step 4: Add M1.5 strings to constants/strings.ts**

Append inside the `Strings` object, before the closing `} as const;`:

```typescript
  // Dashboard (U2)
  dashAvailableToSpend: 'Available to Spend',
  dashNetWorthTitle: 'Net Worth',
  dashAssetsLabel: 'Assets',
  dashLiabilitiesLabel: 'Liabilities',
  dashMonthSpentTitle: 'Spent This Month',
  dashSeeAll: 'See all',

  // Account Detail (U3)
  accountDetailEdit: 'Edit',
  accountDetailSave: 'Save',
  accountDetailCancel: 'Cancel',
  accountDetailMore: 'More',
  accountDetailBalance: 'Current Balance',
  accountDetailAdjustBalance: 'Adjust Balance',
  accountDetailArchive: 'Archive',
  accountDetailArchiveTitle: 'Archive Account?',
  accountDetailArchiveBody:
    'This account will be hidden from your dashboard and all calculations.',
  accountDetailArchiveCCWarning: 'Outstanding credit card balance will still affect net worth.',
  accountDetailArchiveConfirm: 'Archive',

  // Add Account screen (U4 — main app)
  u4Title: 'Add Account',
  u4Cta: 'Save Account',

  // Adjust Balance sheet
  adjustBalanceTitle: 'Adjust Balance',
  adjustBalanceLabel: 'New Balance',
  adjustBalanceSave: 'Save Balance',
  adjustBalanceCancel: 'Cancel',

  // Settings Main (U23)
  settingsTitle: 'Settings',
  settingsCurrencyRow: 'Currency',
  settingsCurrencyDesc: 'USD / EGP exchange rate',

  // Settings Currency (U26)
  currencyScreenTitle: 'Currency',
  currencyRateLabel: 'Exchange Rate',
  currencyRateSub: 'EGP per 1 USD',
  currencyLastFetched: 'Last updated',
  currencyNeverFetched: 'Never fetched',
  currencyManualLabel: 'Manual Override',
  currencyManualSub: 'Set your own rate',
  currencyFetchCta: 'Refresh Rate',
  currencySaveCta: 'Save Rate',

  // Empty States
  emptyAccountsTitle: 'No accounts yet',
  emptyAccountsSub: 'Add your first account to get started.',
  emptyTransactionsTitle: 'No transactions yet',
  emptyTransactionsSub: 'Transactions will appear here.',
  emptyBillsTitle: 'No bills yet',
  emptyBillsSub: 'Bills will appear here.',
  emptyGoalsTitle: 'No goals set',
  emptyGoalsSub: 'Goals will appear here.',
  emptyBudgetTitle: 'No budget set',
  emptyBudgetSub: 'Your budget will appear here.',
```

- [ ] **Step 5: Create utils/format_amount.ts**

```typescript
export function formatAmount(value: number, decimals = 0): string {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
```

- [ ] **Step 6: Commit**

```bash
git add utils/schemas/add_account.schema.ts utils/format_amount.ts \
  app/\(onboarding\)/add_account/add_account.hook.ts \
  constants/strings.ts
git commit -m "refactor: extract add_account schema to utils/schemas; add M1.5 strings + format_amount"
```

---

### Task 3: Extend database/accounts.ts

**Files:**
- Modify: `database/accounts.ts`

- [ ] **Step 1: Append three new SQL functions to database/accounts.ts**

```typescript
export async function updateAccount(
  db: SQLiteDatabase,
  id: string,
  data: { name: string; color: string | null; updated_at: string },
): Promise<void> {
  await db.runAsync(
    'UPDATE accounts SET name = ?, color = ?, updated_at = ? WHERE id = ?',
    [data.name, data.color, data.updated_at, id],
  );
}

export async function archiveAccount(
  db: SQLiteDatabase,
  id: string,
  updated_at: string,
): Promise<void> {
  await db.runAsync(
    'UPDATE accounts SET is_archived = 1, updated_at = ? WHERE id = ?',
    [updated_at, id],
  );
}

export async function setAccountBalance(
  db: SQLiteDatabase,
  id: string,
  newBalance: number,
  updated_at: string,
): Promise<void> {
  await db.runAsync(
    'UPDATE accounts SET current_balance = ?, updated_at = ? WHERE id = ?',
    [newBalance, updated_at, id],
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add database/accounts.ts
git commit -m "feat: add updateAccount, archiveAccount, setAccountBalance SQL functions"
```

---

### Task 4: Extend Repository Layer (TDD)

**Files:**
- Modify: `repositories/account.repository.ts`
- Modify: `__tests__/account.repository.test.ts`

- [ ] **Step 1: Write failing tests**

Append to `__tests__/account.repository.test.ts` (after all existing describe blocks):

```typescript
describe('AccountRepository.update — TC-M15-01', () => {
  it('updates name and color', async () => {
    await repo.add({ ...baseInput, name: 'Before' });
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;

    await repo.update(id, { name: 'After', color: '#3D7A5F' });

    const row = realDb
      .prepare('SELECT name, color FROM accounts WHERE id = ?')
      .get(id) as { name: string; color: string };
    expect(row.name).toBe('After');
    expect(row.color).toBe('#3D7A5F');
  });

  it('updates updated_at timestamp', async () => {
    await repo.add(baseInput);
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;
    const before = (
      realDb.prepare('SELECT updated_at FROM accounts WHERE id = ?').get(id) as {
        updated_at: string;
      }
    ).updated_at;

    await new Promise((r) => setTimeout(r, 10));
    await repo.update(id, { name: 'X', color: null });

    const after = (
      realDb.prepare('SELECT updated_at FROM accounts WHERE id = ?').get(id) as {
        updated_at: string;
      }
    ).updated_at;
    expect(after).not.toBe(before);
  });
});

describe('AccountRepository.archive — TC-M15-02', () => {
  it('sets is_archived = 1', async () => {
    await repo.add(baseInput);
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;

    await repo.archive(id);

    const row = realDb
      .prepare('SELECT is_archived FROM accounts WHERE id = ?')
      .get(id) as { is_archived: number };
    expect(row.is_archived).toBe(1);
  });

  it('does not delete the row', async () => {
    await repo.add(baseInput);
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;
    await repo.archive(id);
    expect(realDb.prepare('SELECT id FROM accounts WHERE id = ?').get(id)).toBeDefined();
  });

  it('getAll no longer returns archived account', async () => {
    await repo.add(baseInput);
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;
    await repo.archive(id);
    const all = await repo.getAll();
    expect(all.find((a) => a.id === id)).toBeUndefined();
  });
});

describe('AccountRepository.adjustBalance — TC-M15-03', () => {
  it('updates current_balance to the new value', async () => {
    await repo.add({ ...baseInput, opening_balance: 1000 });
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;

    await repo.adjustBalance(id, 9999);

    const row = realDb
      .prepare('SELECT current_balance FROM accounts WHERE id = ?')
      .get(id) as { current_balance: number };
    expect(row.current_balance).toBe(9999);
  });

  it('does not change opening_balance', async () => {
    await repo.add({ ...baseInput, opening_balance: 1000 });
    const id = (realDb.prepare('SELECT id FROM accounts').get() as { id: string }).id;
    await repo.adjustBalance(id, 500);
    const row = realDb
      .prepare('SELECT opening_balance FROM accounts WHERE id = ?')
      .get(id) as { opening_balance: number };
    expect(row.opening_balance).toBe(1000);
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --testPathPattern="account.repository" --no-coverage
```

Expected: FAIL — `TypeError: repo.update is not a function`

- [ ] **Step 3: Update repositories/account.repository.ts**

Replace the file entirely:

```typescript
import uuid from 'react-native-uuid';

import {
  addAccount,
  archiveAccount,
  getAccounts,
  setAccountBalance,
  updateAccount,
} from '@/database/accounts';
import { getDb } from '@/database/client';
import type { Account } from '@/database/entities/account.entity';

export type NewAccountInput = Omit<
  Account,
  'id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived'
>;

export type UpdateAccountInput = {
  name: string;
  color: string | null;
};

export interface IAccountRepository {
  getAll(): Promise<Account[]>;
  add(data: NewAccountInput): Promise<Account>;
  update(id: string, data: UpdateAccountInput): Promise<void>;
  archive(id: string): Promise<void>;
  adjustBalance(id: string, newBalance: number): Promise<void>;
}

export class AccountRepository implements IAccountRepository {
  async getAll(): Promise<Account[]> {
    const db = await getDb();
    return getAccounts(db);
  }

  async add(data: NewAccountInput): Promise<Account> {
    const db = await getDb();
    const id = String(uuid.v4());
    const now = new Date().toISOString();
    const account: Account = {
      ...data,
      id,
      current_balance: data.opening_balance,
      is_archived: 0,
      created_at: now,
      updated_at: now,
    };
    await addAccount(db, account);
    return account;
  }

  async update(id: string, data: UpdateAccountInput): Promise<void> {
    const db = await getDb();
    await updateAccount(db, id, { ...data, updated_at: new Date().toISOString() });
  }

  async archive(id: string): Promise<void> {
    const db = await getDb();
    await archiveAccount(db, id, new Date().toISOString());
  }

  async adjustBalance(id: string, newBalance: number): Promise<void> {
    const db = await getDb();
    await setAccountBalance(db, id, newBalance, new Date().toISOString());
  }
}
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- --testPathPattern="account.repository" --no-coverage
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add repositories/account.repository.ts __tests__/account.repository.test.ts
git commit -m "feat: extend AccountRepository with update, archive, adjustBalance (TDD)"
```

---

### Task 5: Extend Account Store (TDD)

**Files:**
- Modify: `store/account.store.ts`
- Modify: `__tests__/account.store.test.ts`

- [ ] **Step 1: Update makeRepo factory in the test file**

In `__tests__/account.store.test.ts`, replace the `makeRepo` function:

```typescript
function makeRepo(overrides: Partial<IAccountRepository> = {}): IAccountRepository {
  return {
    getAll: jest.fn().mockResolvedValue([]),
    add: jest.fn().mockResolvedValue(mockAccount),
    update: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn().mockResolvedValue(undefined),
    adjustBalance: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}
```

- [ ] **Step 2: Append failing tests**

Append to `__tests__/account.store.test.ts`:

```typescript
describe('accountStore.updateAccount', () => {
  it('delegates to repo.update with id and data', async () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);
    await store.getState().updateAccount('test-id', { name: 'New Name', color: '#C9973A' });
    expect(repo.update).toHaveBeenCalledWith('test-id', { name: 'New Name', color: '#C9973A' });
  });

  it('reloads accounts after updating', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = createAccountStore(repo);
    await store.getState().updateAccount('test-id', { name: 'New Name', color: null });
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.getState().accounts).toEqual([mockAccount]);
  });

  it('propagates errors from repo.update', async () => {
    const repo = makeRepo({ update: jest.fn().mockRejectedValue(new Error('update failed')) });
    const store = createAccountStore(repo);
    await expect(
      store.getState().updateAccount('test-id', { name: 'x', color: null }),
    ).rejects.toThrow('update failed');
  });
});

describe('accountStore.archiveAccount', () => {
  it('delegates to repo.archive with the account id', async () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);
    await store.getState().archiveAccount('test-id');
    expect(repo.archive).toHaveBeenCalledWith('test-id');
  });

  it('reloads accounts after archiving', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([]) });
    const store = createAccountStore(repo);
    await store.getState().archiveAccount('test-id');
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from repo.archive', async () => {
    const repo = makeRepo({ archive: jest.fn().mockRejectedValue(new Error('archive failed')) });
    const store = createAccountStore(repo);
    await expect(store.getState().archiveAccount('test-id')).rejects.toThrow('archive failed');
  });
});

describe('accountStore.adjustBalance', () => {
  it('delegates to repo.adjustBalance with id and balance', async () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);
    await store.getState().adjustBalance('test-id', 9999);
    expect(repo.adjustBalance).toHaveBeenCalledWith('test-id', 9999);
  });

  it('reloads accounts after adjusting', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = createAccountStore(repo);
    await store.getState().adjustBalance('test-id', 9999);
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from repo.adjustBalance', async () => {
    const repo = makeRepo({
      adjustBalance: jest.fn().mockRejectedValue(new Error('db error')),
    });
    const store = createAccountStore(repo);
    await expect(store.getState().adjustBalance('test-id', 0)).rejects.toThrow('db error');
  });
});
```

- [ ] **Step 3: Run to confirm failure**

```bash
npm test -- --testPathPattern="account.store" --no-coverage
```

Expected: FAIL — `store.getState().updateAccount is not a function`

- [ ] **Step 4: Replace store/account.store.ts**

```typescript
import { create } from 'zustand';

import type { Account } from '@/database/entities/account.entity';
import {
  AccountRepository,
  type IAccountRepository,
  type NewAccountInput,
  type UpdateAccountInput,
} from '@/repositories/account.repository';

export type { Account, NewAccountInput, UpdateAccountInput };

interface AccountState {
  accounts: Account[];
  loadAccounts: () => Promise<void>;
  addAccount: (data: NewAccountInput) => Promise<Account>;
  updateAccount: (id: string, data: UpdateAccountInput) => Promise<void>;
  archiveAccount: (id: string) => Promise<void>;
  adjustBalance: (id: string, newBalance: number) => Promise<void>;
}

export function createAccountStore(repo: IAccountRepository) {
  return create<AccountState>((set, get) => ({
    accounts: [],

    loadAccounts: async () => {
      try {
        const accounts = await repo.getAll();
        set({ accounts });
      } catch (err) {
        console.error('[accountStore] loadAccounts failed:', err);
        throw err;
      }
    },

    addAccount: async (data) => {
      try {
        const account = await repo.add(data);
        await get().loadAccounts();
        return account;
      } catch (err) {
        console.error('[accountStore] addAccount failed:', err);
        throw err;
      }
    },

    updateAccount: async (id, data) => {
      try {
        await repo.update(id, data);
        await get().loadAccounts();
      } catch (err) {
        console.error('[accountStore] updateAccount failed:', err);
        throw err;
      }
    },

    archiveAccount: async (id) => {
      try {
        await repo.archive(id);
        await get().loadAccounts();
      } catch (err) {
        console.error('[accountStore] archiveAccount failed:', err);
        throw err;
      }
    },

    adjustBalance: async (id, newBalance) => {
      try {
        await repo.adjustBalance(id, newBalance);
        await get().loadAccounts();
      } catch (err) {
        console.error('[accountStore] adjustBalance failed:', err);
        throw err;
      }
    },
  }));
}

export const useAccountStore = createAccountStore(new AccountRepository());
```

- [ ] **Step 5: Run tests to confirm pass**

```bash
npm test -- --testPathPattern="account.store" --no-coverage
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add store/account.store.ts __tests__/account.store.test.ts
git commit -m "feat: extend accountStore with updateAccount, archiveAccount, adjustBalance (TDD)"
```

---

### Task 6: Create Currency Store (TDD)

**Files:**
- Create: `store/currency.store.ts`
- Create: `__tests__/currency.store.test.ts`

- [ ] **Step 1: Write failing tests**

Create `__tests__/currency.store.test.ts`:

```typescript
import { createCurrencyStore } from '@/store/currency.store';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';

function makeRepo(seed: Record<string, string> = {}): IAppSettingsRepository {
  const db: Record<string, string> = { ...seed };
  return {
    get: jest.fn(async (key: string) => db[key] ?? null),
    set: jest.fn(async (key: string, value: string) => {
      db[key] = value;
    }),
  };
}

describe('currencyStore initial state', () => {
  it('starts with rate=50, lastFetched=null, isManualOverride=false', () => {
    const store = createCurrencyStore(makeRepo());
    expect(store.getState().rate).toBe(50);
    expect(store.getState().lastFetched).toBeNull();
    expect(store.getState().isManualOverride).toBe(false);
  });
});

describe('currencyStore.loadRate', () => {
  it('leaves default state when no persisted value exists', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().loadRate();
    expect(store.getState().rate).toBe(50);
    expect(store.getState().lastFetched).toBeNull();
  });

  it('reads and applies persisted rate and metadata', async () => {
    const store = createCurrencyStore(
      makeRepo({
        usd_rate: '57.5',
        usd_rate_fetched_at: '2026-05-01T10:00:00.000Z',
        usd_rate_manual_override: 'false',
      }),
    );
    await store.getState().loadRate();
    expect(store.getState().rate).toBe(57.5);
    expect(store.getState().lastFetched).toBe('2026-05-01T10:00:00.000Z');
    expect(store.getState().isManualOverride).toBe(false);
  });

  it('sets isManualOverride=true when stored as "true"', async () => {
    const store = createCurrencyStore(
      makeRepo({ usd_rate: '48', usd_rate_manual_override: 'true' }),
    );
    await store.getState().loadRate();
    expect(store.getState().isManualOverride).toBe(true);
  });

  it('propagates repo errors', async () => {
    const repo = makeRepo();
    (repo.get as jest.Mock).mockRejectedValue(new Error('db error'));
    const store = createCurrencyStore(repo);
    await expect(store.getState().loadRate()).rejects.toThrow('db error');
  });
});

describe('currencyStore.fetchRate', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ rates: { EGP: 55.25 } }),
    } as unknown as Response);
  });

  afterEach(() => jest.restoreAllMocks());

  it('updates state with fetched EGP rate', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().fetchRate();
    expect(store.getState().rate).toBe(55.25);
    expect(store.getState().isManualOverride).toBe(false);
    expect(store.getState().lastFetched).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('persists rate, timestamp, and manual flag to repo', async () => {
    const repo = makeRepo();
    const store = createCurrencyStore(repo);
    await store.getState().fetchRate();
    expect(repo.set).toHaveBeenCalledWith('usd_rate', '55.25');
    expect(repo.set).toHaveBeenCalledWith('usd_rate_manual_override', 'false');
    expect(repo.set).toHaveBeenCalledWith(
      'usd_rate_fetched_at',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
  });

  it('throws when EGP is missing from response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ rates: {} }),
    } as unknown as Response);
    const store = createCurrencyStore(makeRepo());
    await expect(store.getState().fetchRate()).rejects.toThrow();
  });
});

describe('currencyStore.setManualRate', () => {
  it('sets rate in state and marks isManualOverride=true', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().setManualRate(48.5);
    expect(store.getState().rate).toBe(48.5);
    expect(store.getState().isManualOverride).toBe(true);
  });

  it('persists rate and manual flag to repo', async () => {
    const repo = makeRepo();
    const store = createCurrencyStore(repo);
    await store.getState().setManualRate(48.5);
    expect(repo.set).toHaveBeenCalledWith('usd_rate', '48.5');
    expect(repo.set).toHaveBeenCalledWith('usd_rate_manual_override', 'true');
  });

  it('does not update lastFetched', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().setManualRate(48.5);
    expect(store.getState().lastFetched).toBeNull();
  });
});
```

- [ ] **Step 2: Run to confirm failure**

```bash
npm test -- --testPathPattern="currency.store" --no-coverage
```

Expected: FAIL — `Cannot find module '@/store/currency.store'`

- [ ] **Step 3: Create store/currency.store.ts**

```typescript
import { create } from 'zustand';

import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';

const RATE_KEY = 'usd_rate';
const FETCHED_AT_KEY = 'usd_rate_fetched_at';
const MANUAL_KEY = 'usd_rate_manual_override';
const EXCHANGE_API_URL = 'https://open.er-api.com/v6/latest/USD';

interface CurrencyState {
  rate: number;
  lastFetched: string | null;
  isManualOverride: boolean;
  loadRate: () => Promise<void>;
  fetchRate: () => Promise<void>;
  setManualRate: (rate: number) => Promise<void>;
}

export function createCurrencyStore(repo: IAppSettingsRepository) {
  return create<CurrencyState>((set) => ({
    rate: 50,
    lastFetched: null,
    isManualOverride: false,

    loadRate: async () => {
      try {
        const [rateStr, fetchedAt, manualStr] = await Promise.all([
          repo.get(RATE_KEY),
          repo.get(FETCHED_AT_KEY),
          repo.get(MANUAL_KEY),
        ]);
        if (rateStr !== null) {
          set({
            rate: parseFloat(rateStr),
            lastFetched: fetchedAt,
            isManualOverride: manualStr === 'true',
          });
        }
      } catch (err) {
        console.error('[currencyStore] loadRate failed:', err);
        throw err;
      }
    },

    fetchRate: async () => {
      try {
        const res = await fetch(EXCHANGE_API_URL);
        const json = (await res.json()) as { rates: Record<string, number> };
        const rate = json.rates['EGP'];
        if (!rate) throw new Error('[currencyStore] EGP not in API response');
        const now = new Date().toISOString();
        await Promise.all([
          repo.set(RATE_KEY, String(rate)),
          repo.set(FETCHED_AT_KEY, now),
          repo.set(MANUAL_KEY, 'false'),
        ]);
        set({ rate, lastFetched: now, isManualOverride: false });
      } catch (err) {
        console.error('[currencyStore] fetchRate failed:', err);
        throw err;
      }
    },

    setManualRate: async (rate: number) => {
      try {
        await Promise.all([
          repo.set(RATE_KEY, String(rate)),
          repo.set(MANUAL_KEY, 'true'),
        ]);
        set({ rate, isManualOverride: true });
      } catch (err) {
        console.error('[currencyStore] setManualRate failed:', err);
        throw err;
      }
    },
  }));
}

export const useCurrencyStore = createCurrencyStore(new AppSettingsRepository());
```

- [ ] **Step 4: Run tests to confirm pass**

```bash
npm test -- --testPathPattern="currency.store" --no-coverage
```

Expected: PASS (all tests)

- [ ] **Step 5: Run full suite to confirm no regressions**

```bash
npm test -- --no-coverage
```

Expected: PASS (all existing tests)

- [ ] **Step 6: Commit**

```bash
git add store/currency.store.ts __tests__/currency.store.test.ts
git commit -m "feat: currency.store with loadRate, fetchRate, setManualRate (TDD)"
```
