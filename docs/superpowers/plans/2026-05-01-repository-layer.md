# Repository Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a `repositories/` layer between stores and `database/` — each repo defines a TypeScript interface and a SQLite implementation class; stores receive the implementation via a factory function for clean dependency injection.

**Architecture:** Two repository files at the project root (`repositories/account.repository.ts`, `repositories/app_settings.repository.ts`). Each co-locates its interface and SQLite class. Both stores become factory functions (`createAccountStore(repo)`, `createOnboardingStore(repo)`); the module-level export binds the SQLite implementation. UUID/timestamp generation and field defaults (`current_balance`, `is_archived`) move from `store/account.store.ts` into `AccountRepository.add`.

**Tech Stack:** expo-sqlite (via existing `database/` query executors), Zustand v5 (`create`), react-native-uuid, TypeScript strict, Jest + better-sqlite3 (tests).

---

## File Map

| Action | Path | Responsibility |
|---|---|---|
| Create | `repositories/account.repository.ts` | `IAccountRepository`, `NewAccountInput`, `AccountRepository` (SQLite) |
| Create | `repositories/app_settings.repository.ts` | `IAppSettingsRepository`, `AppSettingsRepository` (SQLite) |
| Create | `__tests__/account.repository.test.ts` | Integration tests for `AccountRepository` with better-sqlite3 |
| Create | `__tests__/app_settings.repository.test.ts` | Integration tests for `AppSettingsRepository` with better-sqlite3 |
| Rewrite | `__tests__/account.store.test.ts` | Store unit tests using mock repo injection |
| Rewrite | `__tests__/onboarding.store.test.ts` | Store unit tests using mock repo injection |
| Modify | `store/account.store.ts` | Factory pattern; remove uuid/getDb/executor imports; use `repo.*` |
| Modify | `store/onboarding.store.ts` | Factory pattern; remove setSetting/getDb imports; use `repo.set()` |
| Modify | `app/(onboarding)/add_account/add_account.hook.ts` | Remove `is_archived` and `current_balance` from `addAccount(...)` call |
| Modify | `jest.config.js` | Add `repositories/**/*.ts` to `collectCoverageFrom` |

---

### Task 1: Create feature branch

- [ ] **Step 1: Create and switch to branch**

```bash
git checkout -b feat/repository-layer
```

Expected: `Switched to a new branch 'feat/repository-layer'`

---

### Task 2: `repositories/account.repository.ts` (TDD)

**Files:**
- Create: `__tests__/account.repository.test.ts`
- Create: `repositories/account.repository.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/account.repository.test.ts`:

```typescript
// TC-09 / TC-10 / TC-11 / TC-12 — AccountRepository owns UUID generation,
// timestamp stamping, field defaults, and query delegation.

import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { AccountRepository } from '@/repositories/account.repository';
import type { NewAccountInput } from '@/repositories/account.repository';
import { AccountType, Currency } from '@/constants/enums';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        runAsync: jest.Mock;
        getAllAsync: jest.Mock;
        execAsync: jest.Mock;
      };
    }
  ).__fakeDb;

  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    realDb.prepare(sql).run(...(params as never[]));
    return { changes: 1, lastInsertRowId: 1 };
  });

  mocked.getAllAsync.mockImplementation(async (sql: string) => {
    return realDb.prepare(sql).all();
  });

  mocked.execAsync.mockImplementation(async (sql: string) => {
    realDb.exec(sql);
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM accounts');
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const baseInput: NewAccountInput = {
  name: 'CIB Savings',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 12500,
  color: '#1B2B4B',
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  sort_order: 0,
};

const repo = new AccountRepository();

describe('AccountRepository.add — TC-09', () => {
  it('sets current_balance = opening_balance', async () => {
    await repo.add({ ...baseInput, opening_balance: 5000 });
    const row = realDb.prepare('SELECT * FROM accounts').get() as Record<string, unknown>;
    expect(row.current_balance).toBe(5000);
    expect(row.opening_balance).toBe(5000);
  });

  it('forces is_archived to 0', async () => {
    await repo.add(baseInput);
    const row = realDb.prepare('SELECT is_archived FROM accounts').get() as {
      is_archived: number;
    };
    expect(row.is_archived).toBe(0);
  });

  it('writes a UUID-shaped id', async () => {
    await repo.add(baseInput);
    const row = realDb.prepare('SELECT id FROM accounts').get() as { id: string };
    expect(row.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('writes ISO 8601 created_at / updated_at timestamps', async () => {
    await repo.add(baseInput);
    const row = realDb.prepare('SELECT created_at, updated_at FROM accounts').get() as {
      created_at: string;
      updated_at: string;
    };
    expect(row.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(row.updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('returns the persisted Account with generated fields', async () => {
    const account = await repo.add(baseInput);
    expect(account.name).toBe('CIB Savings');
    expect(account.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(account.current_balance).toBe(12500);
    expect(account.is_archived).toBe(0);
    expect(account.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it.each([
    AccountType.Bank,
    AccountType.SmartWallet,
    AccountType.PhysicalWallet,
    AccountType.PhysicalSavings,
    AccountType.CreditCard,
  ])('persists type %s exactly — TC-09', async (type) => {
    realDb.exec('DELETE FROM accounts');
    await repo.add({
      ...baseInput,
      name: `acct-${type}`,
      type,
      credit_limit: type === AccountType.CreditCard ? 5000 : null,
    });
    const row = realDb.prepare('SELECT type FROM accounts').get() as { type: string };
    expect(row.type).toBe(type);
  });
});

describe('AccountRepository.add credit-card fields — TC-10', () => {
  it('writes CC fields with interest tracking OFF (apr stays NULL)', async () => {
    await repo.add({
      ...baseInput,
      name: 'Visa Card',
      type: AccountType.CreditCard,
      revolving_balance: 5000,
      credit_limit: 20000,
      minimum_payment: null,
      statement_due_day: null,
      interest_tracking: 0,
      apr: null,
    });
    const row = realDb.prepare('SELECT * FROM accounts').get() as Record<string, unknown>;
    expect(row.type).toBe(AccountType.CreditCard);
    expect(row.interest_tracking).toBe(0);
    expect(row.apr).toBeNull();
    expect(row.revolving_balance).toBe(5000);
    expect(row.credit_limit).toBe(20000);
  });

  it('writes apr when interest tracking is ON', async () => {
    await repo.add({
      ...baseInput,
      name: 'Visa Plus',
      type: AccountType.CreditCard,
      revolving_balance: 0,
      credit_limit: 30000,
      minimum_payment: 500,
      statement_due_day: 15,
      interest_tracking: 1,
      apr: 24.99,
    });
    const row = realDb.prepare('SELECT * FROM accounts').get() as Record<string, unknown>;
    expect(row.interest_tracking).toBe(1);
    expect(row.apr).toBe(24.99);
    expect(row.minimum_payment).toBe(500);
    expect(row.statement_due_day).toBe(15);
  });
});

describe('AccountRepository.add color — TC-11', () => {
  it('persists the selected color hex string', async () => {
    await repo.add({ ...baseInput, color: '#3D7A5F' });
    const row = realDb.prepare('SELECT color FROM accounts').get() as { color: string };
    expect(row.color).toBe('#3D7A5F');
  });
});

describe('AccountRepository.getAll ordering — TC-12', () => {
  it('returns non-archived rows ordered by sort_order asc, created_at asc', async () => {
    const insert = realDb.prepare(`
      INSERT INTO accounts (
        id, name, type, currency, opening_balance, current_balance,
        color, credit_limit, revolving_balance, minimum_payment,
        statement_due_day, interest_tracking, apr,
        is_archived, sort_order, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run('a','Third', AccountType.Bank, Currency.EGP, 0,0,null,null,null,null,null,0,null,0,2,'2026-04-29T01:00:00Z','2026-04-29T01:00:00Z');
    insert.run('b','First', AccountType.Bank, Currency.EGP, 0,0,null,null,null,null,null,0,null,0,0,'2026-04-29T00:00:00Z','2026-04-29T00:00:00Z');
    insert.run('c','Second',AccountType.Bank, Currency.EGP, 0,0,null,null,null,null,null,0,null,0,1,'2026-04-29T00:30:00Z','2026-04-29T00:30:00Z');
    insert.run('d','Hidden',AccountType.Bank, Currency.EGP, 0,0,null,null,null,null,null,0,null,1,0,'2026-04-29T00:00:00Z','2026-04-29T00:00:00Z');

    const accounts = await repo.getAll();
    expect(accounts.map((a) => a.name)).toEqual(['First', 'Second', 'Third']);
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest __tests__/account.repository.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/repositories/account.repository'`

- [ ] **Step 3: Create `repositories/account.repository.ts`**

```typescript
import uuid from 'react-native-uuid';

import { addAccount, getAccounts } from '@/database/accounts';
import { getDb } from '@/database/client';
import type { Account } from '@/database/entities/account.entity';

export type NewAccountInput = Omit<
  Account,
  'id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived'
>;

export interface IAccountRepository {
  getAll(): Promise<Account[]>;
  add(data: NewAccountInput): Promise<Account>;
}

export class AccountRepository implements IAccountRepository {
  async getAll(): Promise<Account[]> {
    const db = await getDb();
    return getAccounts(db);
  }

  async add(data: NewAccountInput): Promise<Account> {
    const db = await getDb();
    const id = uuid.v4() as string;
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
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx jest __tests__/account.repository.test.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add repositories/account.repository.ts __tests__/account.repository.test.ts
git commit -m "feat: add AccountRepository with IAccountRepository interface"
```

---

### Task 3: `repositories/app_settings.repository.ts` (TDD)

**Files:**
- Create: `__tests__/app_settings.repository.test.ts`
- Create: `repositories/app_settings.repository.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/app_settings.repository.test.ts`:

```typescript
import Database from 'better-sqlite3';
import * as SQLite from 'expo-sqlite';

import { MIGRATIONS } from '@/database/migrations';
import { AppSettingsRepository } from '@/repositories/app_settings.repository';

const sqlite = SQLite as unknown as { __reset: () => void };
let realDb: ReturnType<typeof Database>;

beforeAll(() => {
  realDb = new Database(':memory:');
  realDb.exec(MIGRATIONS.map((m) => m.up).join('\n'));

  const mocked = (
    SQLite as unknown as {
      __fakeDb: {
        runAsync: jest.Mock;
        getFirstAsync: jest.Mock;
      };
    }
  ).__fakeDb;

  mocked.runAsync.mockImplementation(async (sql: string, ...rest: unknown[]) => {
    const params = (Array.isArray(rest[0]) ? rest[0] : rest) as unknown[];
    realDb.prepare(sql).run(...(params as never[]));
    return { changes: 1, lastInsertRowId: 0 };
  });

  mocked.getFirstAsync.mockImplementation(async (sql: string, ...params: unknown[]) => {
    return (realDb.prepare(sql).get(...(params as never[])) as unknown) ?? null;
  });
});

beforeEach(() => {
  realDb.exec('DELETE FROM app_settings');
});

afterAll(() => {
  realDb.close();
  sqlite.__reset();
});

const repo = new AppSettingsRepository();

describe('AppSettingsRepository.get', () => {
  it('returns null when key does not exist', async () => {
    expect(await repo.get('missing_key')).toBeNull();
  });

  it('returns value when key exists', async () => {
    await repo.set('base_currency', 'EGP');
    expect(await repo.get('base_currency')).toBe('EGP');
  });
});

describe('AppSettingsRepository.set', () => {
  it('inserts a new key-value pair', async () => {
    await repo.set('onboarding_complete', 'true');
    expect(await repo.get('onboarding_complete')).toBe('true');
  });

  it('replaces an existing value (upsert)', async () => {
    await repo.set('base_currency', 'USD');
    await repo.set('base_currency', 'EGP');
    expect(await repo.get('base_currency')).toBe('EGP');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest __tests__/app_settings.repository.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/repositories/app_settings.repository'`

- [ ] **Step 3: Create `repositories/app_settings.repository.ts`**

```typescript
import { getSetting, setSetting } from '@/database/app_settings';
import { getDb } from '@/database/client';

export interface IAppSettingsRepository {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
}

export class AppSettingsRepository implements IAppSettingsRepository {
  async get(key: string): Promise<string | null> {
    const db = await getDb();
    return getSetting(db, key);
  }

  async set(key: string, value: string): Promise<void> {
    const db = await getDb();
    await setSetting(db, key, value);
  }
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx jest __tests__/app_settings.repository.test.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add repositories/app_settings.repository.ts __tests__/app_settings.repository.test.ts
git commit -m "feat: add AppSettingsRepository with IAppSettingsRepository interface"
```

---

### Task 4: Refactor `store/account.store.ts` to factory pattern (TDD)

**Files:**
- Rewrite: `__tests__/account.store.test.ts`
- Modify: `store/account.store.ts`

- [ ] **Step 1: Rewrite `__tests__/account.store.test.ts`**

Replace the entire file contents:

```typescript
import { createAccountStore } from '@/store/account.store';
import type { IAccountRepository, NewAccountInput } from '@/repositories/account.repository';
import type { Account } from '@/database/entities/account.entity';
import { AccountType, Currency } from '@/constants/enums';

const mockAccount: Account = {
  id: 'test-id',
  name: 'CIB Savings',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 5000,
  current_balance: 5000,
  color: '#1B2B4B',
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
};

const baseInput: NewAccountInput = {
  name: 'CIB Savings',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 5000,
  color: '#1B2B4B',
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  sort_order: 0,
};

function makeRepo(overrides: Partial<IAccountRepository> = {}): IAccountRepository {
  return {
    getAll: jest.fn().mockResolvedValue([]),
    add: jest.fn().mockResolvedValue(mockAccount),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('accountStore.loadAccounts', () => {
  it('calls repo.getAll and sets accounts in state', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = createAccountStore(repo);
    await store.getState().loadAccounts();
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.getState().accounts).toEqual([mockAccount]);
  });

  it('propagates errors thrown by repo.getAll', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(new Error('db error')) });
    const store = createAccountStore(repo);
    await expect(store.getState().loadAccounts()).rejects.toThrow('db error');
  });
});

describe('accountStore.addAccount', () => {
  it('delegates to repo.add with the provided input', async () => {
    const repo = makeRepo();
    const store = createAccountStore(repo);
    const result = await store.getState().addAccount(baseInput);
    expect(repo.add).toHaveBeenCalledWith(baseInput);
    expect(result).toEqual(mockAccount);
  });

  it('reloads accounts state after adding', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = createAccountStore(repo);
    await store.getState().addAccount(baseInput);
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.getState().accounts).toEqual([mockAccount]);
  });

  it('propagates errors thrown by repo.add', async () => {
    const repo = makeRepo({ add: jest.fn().mockRejectedValue(new Error('insert failed')) });
    const store = createAccountStore(repo);
    await expect(store.getState().addAccount(baseInput)).rejects.toThrow('insert failed');
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest __tests__/account.store.test.ts --no-coverage
```

Expected: FAIL — `createAccountStore is not a function` (export doesn't exist yet).

- [ ] **Step 3: Replace `store/account.store.ts`**

```typescript
import { create } from 'zustand';

import type { Account } from '@/database/entities/account.entity';
import {
  AccountRepository,
  type IAccountRepository,
  type NewAccountInput,
} from '@/repositories/account.repository';

export type { Account, NewAccountInput };

interface AccountState {
  accounts: Account[];
  loadAccounts: () => Promise<void>;
  addAccount: (data: NewAccountInput) => Promise<Account>;
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

    addAccount: async (data: NewAccountInput) => {
      try {
        const account = await repo.add(data);
        await get().loadAccounts();
        return account;
      } catch (err) {
        console.error('[accountStore] addAccount failed:', err);
        throw err;
      }
    },
  }));
}

export const useAccountStore = createAccountStore(new AccountRepository());
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx jest __tests__/account.store.test.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add store/account.store.ts __tests__/account.store.test.ts
git commit -m "refactor: account store — factory pattern with IAccountRepository injection"
```

---

### Task 5: Refactor `store/onboarding.store.ts` to factory pattern (TDD)

**Files:**
- Rewrite: `__tests__/onboarding.store.test.ts`
- Modify: `store/onboarding.store.ts`

- [ ] **Step 1: Rewrite `__tests__/onboarding.store.test.ts`**

Replace the entire file contents:

```typescript
// TC-03 / TC-05 / TC-06 / TC-13 — onboarding store writes to SecureStore
// (and repo for DB-backed settings). loadOnboardingState rehydrates from SecureStore.

import * as SecureStore from 'expo-secure-store';

import {
  createOnboardingStore,
  loadOnboardingState,
  useOnboardingStore,
} from '@/store/onboarding.store';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';
import { Currency, OnboardingStep, SecurityChoice } from '@/constants/enums';

const secure = SecureStore as unknown as {
  setItemAsync: jest.Mock;
  getItemAsync: jest.Mock;
  __reset: () => void;
};

function makeRepo(): IAppSettingsRepository {
  return {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  };
}

beforeEach(() => {
  secure.__reset();
  jest.clearAllMocks();
  useOnboardingStore.setState({
    complete: false,
    currentStep: OnboardingStep.O1,
    baseCurrency: Currency.EGP,
    securityChoice: undefined,
  });
});

describe('onboardingStore.setStep — TC-03', () => {
  it('writes onboarding_step to SecureStore then updates state', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().setStep(OnboardingStep.O3);
    expect(secure.setItemAsync).toHaveBeenCalledWith('onboarding_step', 'O3');
    expect(store.getState().currentStep).toBe(OnboardingStep.O3);
  });
});

describe('onboardingStore.setBaseCurrency — TC-05', () => {
  it('writes SecureStore and repo.set before updating state', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().setBaseCurrency(Currency.USD);
    expect(secure.setItemAsync).toHaveBeenCalledWith('base_currency', 'USD');
    expect(repo.set).toHaveBeenCalledWith('base_currency', 'USD');
    expect(store.getState().baseCurrency).toBe(Currency.USD);
  });

  it('persists EGP on the same path', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().setBaseCurrency(Currency.EGP);
    expect(secure.setItemAsync).toHaveBeenCalledWith('base_currency', 'EGP');
    expect(repo.set).toHaveBeenCalledWith('base_currency', 'EGP');
  });
});

describe('onboardingStore.setSecurityChoice — TC-06', () => {
  it('PIN choice → security_setup_skipped is "false"', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().setSecurityChoice(SecurityChoice.Pin);
    expect(secure.setItemAsync).toHaveBeenCalledWith('security_choice', 'pin');
    expect(secure.setItemAsync).toHaveBeenCalledWith('security_setup_skipped', 'false');
    expect(store.getState().securityChoice).toBe(SecurityChoice.Pin);
  });

  it('biometric choice → security_setup_skipped is "false"', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().setSecurityChoice(SecurityChoice.Biometric);
    expect(secure.setItemAsync).toHaveBeenCalledWith('security_setup_skipped', 'false');
  });

  it('skip choice → security_setup_skipped is "true"', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().setSecurityChoice(SecurityChoice.Skip);
    expect(secure.setItemAsync).toHaveBeenCalledWith('security_setup_skipped', 'true');
    expect(store.getState().securityChoice).toBe(SecurityChoice.Skip);
  });
});

describe('onboardingStore.completeOnboarding — TC-13', () => {
  it('writes SecureStore + repo.set then sets complete=true', async () => {
    const repo = makeRepo();
    const store = createOnboardingStore(repo);
    await store.getState().completeOnboarding();
    expect(secure.setItemAsync).toHaveBeenCalledWith('onboarding_complete', 'true');
    expect(repo.set).toHaveBeenCalledWith('onboarding_complete', 'true');
    expect(store.getState().complete).toBe(true);
  });
});

describe('loadOnboardingState — TC-02 / TC-03 resume', () => {
  it('returns defaults when SecureStore is empty (fresh install)', async () => {
    const result = await loadOnboardingState();
    expect(result).toEqual({ complete: false, step: OnboardingStep.O1 });
    expect(useOnboardingStore.getState()).toMatchObject({
      complete: false,
      currentStep: OnboardingStep.O1,
      baseCurrency: Currency.EGP,
      securityChoice: undefined,
    });
  });

  it('rehydrates state when SecureStore has values', async () => {
    await secure.setItemAsync('onboarding_step', 'O4');
    await secure.setItemAsync('base_currency', 'USD');
    await secure.setItemAsync('security_choice', 'biometric');

    const result = await loadOnboardingState();
    expect(result).toEqual({ complete: false, step: OnboardingStep.O4 });
    expect(useOnboardingStore.getState()).toMatchObject({
      complete: false,
      currentStep: OnboardingStep.O4,
      baseCurrency: Currency.USD,
      securityChoice: SecurityChoice.Biometric,
    });
  });

  it('returns complete:true when onboarding_complete=true', async () => {
    await secure.setItemAsync('onboarding_complete', 'true');
    await secure.setItemAsync('onboarding_step', 'O6');
    const result = await loadOnboardingState();
    expect(result.complete).toBe(true);
  });

  it('rejects invalid SecureStore values and falls back to defaults', async () => {
    await secure.setItemAsync('onboarding_step', 'O99');
    await secure.setItemAsync('base_currency', 'GBP');
    await secure.setItemAsync('security_choice', 'face_id');

    const result = await loadOnboardingState();
    expect(result.step).toBe(OnboardingStep.O1);
    expect(useOnboardingStore.getState()).toMatchObject({
      currentStep: OnboardingStep.O1,
      baseCurrency: Currency.EGP,
      securityChoice: undefined,
    });
  });
});
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx jest __tests__/onboarding.store.test.ts --no-coverage
```

Expected: FAIL — `createOnboardingStore is not a function`.

- [ ] **Step 3: Replace `store/onboarding.store.ts`**

```typescript
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { Currency, OnboardingStep, SecurityChoice } from '@/constants/enums';
import { SecureStoreKeys } from '@/constants/secure_store_keys';
import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';

interface OnboardingState {
  complete: boolean;
  currentStep: OnboardingStep;
  baseCurrency: Currency;
  securityChoice: SecurityChoice | undefined;
  setStep: (step: OnboardingStep) => Promise<void>;
  setBaseCurrency: (currency: Currency) => Promise<void>;
  setSecurityChoice: (choice: SecurityChoice) => Promise<void>;
  completeOnboarding: () => Promise<void>;
}

export function createOnboardingStore(repo: IAppSettingsRepository) {
  return create<OnboardingState>((set) => ({
    complete: false,
    currentStep: OnboardingStep.O1,
    baseCurrency: Currency.EGP,
    securityChoice: undefined,

    setStep: async (step) => {
      try {
        await SecureStore.setItemAsync(SecureStoreKeys.OnboardingStep, step);
        set({ currentStep: step });
      } catch (err) {
        console.error('[onboardingStore] setStep failed:', err);
        throw err;
      }
    },

    setBaseCurrency: async (currency) => {
      try {
        await SecureStore.setItemAsync(SecureStoreKeys.BaseCurrency, currency);
        await repo.set('base_currency', currency);
        set({ baseCurrency: currency });
      } catch (err) {
        console.error('[onboardingStore] setBaseCurrency failed:', err);
        throw err;
      }
    },

    setSecurityChoice: async (choice) => {
      try {
        await SecureStore.setItemAsync(SecureStoreKeys.SecurityChoice, choice);
        await SecureStore.setItemAsync(
          SecureStoreKeys.SecuritySetupSkipped,
          String(choice === SecurityChoice.Skip),
        );
        set({ securityChoice: choice });
      } catch (err) {
        console.error('[onboardingStore] setSecurityChoice failed:', err);
        throw err;
      }
    },

    completeOnboarding: async () => {
      try {
        await SecureStore.setItemAsync(SecureStoreKeys.OnboardingComplete, 'true');
        await repo.set('onboarding_complete', 'true');
        set({ complete: true });
      } catch (err) {
        console.error('[onboardingStore] completeOnboarding failed:', err);
        throw err;
      }
    },
  }));
}

export const useOnboardingStore = createOnboardingStore(new AppSettingsRepository());

export async function loadOnboardingState(): Promise<{
  complete: boolean;
  step: OnboardingStep;
}> {
  const [completeRaw, stepRaw, currencyRaw, securityRaw] = await Promise.all([
    SecureStore.getItemAsync(SecureStoreKeys.OnboardingComplete),
    SecureStore.getItemAsync(SecureStoreKeys.OnboardingStep),
    SecureStore.getItemAsync(SecureStoreKeys.BaseCurrency),
    SecureStore.getItemAsync(SecureStoreKeys.SecurityChoice),
  ]);

  const complete = completeRaw === 'true';
  const step: OnboardingStep = isOnboardingStep(stepRaw) ? stepRaw : OnboardingStep.O1;
  const baseCurrency: Currency = isCurrency(currencyRaw) ? currencyRaw : Currency.EGP;
  const securityChoice: SecurityChoice | undefined = isSecurityChoice(securityRaw)
    ? securityRaw
    : undefined;

  useOnboardingStore.setState({
    complete,
    currentStep: step,
    baseCurrency,
    securityChoice,
  });

  return { complete, step };
}

function isOnboardingStep(v: string | null): v is OnboardingStep {
  return Object.values(OnboardingStep).includes(v as OnboardingStep);
}

function isCurrency(v: string | null): v is Currency {
  return Object.values(Currency).includes(v as Currency);
}

function isSecurityChoice(v: string | null): v is SecurityChoice {
  return Object.values(SecurityChoice).includes(v as SecurityChoice);
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
npx jest __tests__/onboarding.store.test.ts --no-coverage
```

Expected: All tests PASS.

- [ ] **Step 5: Commit**

```bash
git add store/onboarding.store.ts __tests__/onboarding.store.test.ts
git commit -m "refactor: onboarding store — factory pattern with IAppSettingsRepository injection"
```

---

### Task 6: Update hook and coverage config

**Files:**
- Modify: `app/(onboarding)/add_account/add_account.hook.ts`
- Modify: `jest.config.js`

- [ ] **Step 1: Update `add_account.hook.ts` — remove fields now owned by the repository**

In `app/(onboarding)/add_account/add_account.hook.ts`, find the `onSubmit` function and replace the `addAccount(...)` call:

Old:
```typescript
await addAccount({
  name: data.name.trim(),
  type: data.selected_type,
  currency: data.currency,
  opening_balance: parseFloat(data.balance),
  current_balance: parseFloat(data.balance),
  color: data.selected_color,
  interest_tracking: (data.interest_tracking ? 1 : 0) as 0 | 1,
  is_archived: 0 as const,
  sort_order: accounts.length,
  credit_limit: isCC && data.credit_limit?.trim() ? parseFloat(data.credit_limit) : null,
  revolving_balance:
    isCC && data.revolving_balance?.trim() ? parseFloat(data.revolving_balance) || 0 : null,
  minimum_payment: isCC && data.min_payment?.trim() ? parseFloat(data.min_payment) : null,
  statement_due_day: isCC && data.due_day?.trim() ? parseInt(data.due_day, 10) : null,
  apr: isCC && data.interest_tracking && data.apr?.trim() ? parseFloat(data.apr) : null,
});
```

New:
```typescript
await addAccount({
  name: data.name.trim(),
  type: data.selected_type,
  currency: data.currency,
  opening_balance: parseFloat(data.balance),
  color: data.selected_color,
  interest_tracking: (data.interest_tracking ? 1 : 0) as 0 | 1,
  sort_order: accounts.length,
  credit_limit: isCC && data.credit_limit?.trim() ? parseFloat(data.credit_limit) : null,
  revolving_balance:
    isCC && data.revolving_balance?.trim() ? parseFloat(data.revolving_balance) || 0 : null,
  minimum_payment: isCC && data.min_payment?.trim() ? parseFloat(data.min_payment) : null,
  statement_due_day: isCC && data.due_day?.trim() ? parseInt(data.due_day, 10) : null,
  apr: isCC && data.interest_tracking && data.apr?.trim() ? parseFloat(data.apr) : null,
});
```

Also update the import at line 11 — `Account` type is no longer needed from the store since the hook only uses `addAccount` (the function) and `accounts` (the array). The `createAddAccountSchema` function uses `Account[]` as its parameter type. Keep the import:

```typescript
import type { Account } from '@/store/account.store';
```

This still works — `account.store.ts` re-exports `Account` via `export type { Account, NewAccountInput }`.

- [ ] **Step 2: Update `jest.config.js` — add `repositories/` to coverage**

In `jest.config.js`, find the `collectCoverageFrom` array and add `repositories/**/*.ts`:

Old:
```javascript
collectCoverageFrom: [
  'store/**/*.ts',
  'database/**/*.ts',
  'utils/responsive.ts',
  'app/**/*.helpers.ts',
  '!**/__mocks__/**',
  '!database/entities/**',
  '!database/client.ts',
],
```

New:
```javascript
collectCoverageFrom: [
  'store/**/*.ts',
  'database/**/*.ts',
  'repositories/**/*.ts',
  'utils/responsive.ts',
  'app/**/*.helpers.ts',
  '!**/__mocks__/**',
  '!database/entities/**',
  '!database/client.ts',
],
```

- [ ] **Step 3: Run the full test suite**

```bash
npx jest --no-coverage
```

Expected: All test suites PASS. If any suite fails, the most likely cause is a stale import — grep for `from '@/store/account.store'` in test files and confirm `Account` is still exported from there.

- [ ] **Step 4: TypeScript compile check**

```bash
npx tsc --noEmit
```

Expected: No errors. If you see excess property errors on `is_archived` or `current_balance`, confirm Step 1 of this task was applied to the hook.

- [ ] **Step 5: Run tests with coverage to verify thresholds**

```bash
npm run test:coverage
```

Expected: All thresholds pass (80% lines / 95% functions / 100% branches on the logic layer).

- [ ] **Step 6: Commit**

```bash
git add app/(onboarding)/add_account/add_account.hook.ts jest.config.js
git commit -m "refactor: remove repo-owned fields from hook; add repositories/ to coverage"
```

---

### Task 7: Final verification and PR

- [ ] **Step 1: Run the full test suite one final time**

```bash
npx jest --no-coverage
```

Expected: All test suites PASS.

- [ ] **Step 2: TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Verify new files exist**

```bash
find repositories __tests__ -name "*.repository*" | sort
```

Expected output:
```
__tests__/account.repository.test.ts
__tests__/app_settings.repository.test.ts
repositories/account.repository.ts
repositories/app_settings.repository.ts
```
