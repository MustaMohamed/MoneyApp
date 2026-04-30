# Repository Layer — Design Spec

**Date:** 2026-05-01
**Status:** Approved

---

## Overview

Introduce a `repositories/` layer between the store layer and the `database/` infrastructure layer. Each repository defines a TypeScript interface (the abstraction) and a SQLite implementation (the concrete class). Stores depend on the interface and receive the implementation via a factory function — enabling future backend swaps (e.g. REST API) without touching store or hook code.

---

## Motivation

- **Single Responsibility:** stores manage UI state; repositories own data access and record-creation logic.
- **Dependency Inversion:** stores depend on interfaces, not SQLite directly.
- **Replaceability:** swapping to an API backend means writing a new implementation class and changing one binding line per store.
- **Testability:** store tests inject a mock repository object — no module mocking required.

---

## Folder Structure

```
repositories/                          ← top-level, peer to store/ and database/
  account.repository.ts                ← IAccountRepository + AccountRepository (SQLite)
  app_settings.repository.ts           ← IAppSettingsRepository + AppSettingsRepository (SQLite)
```

`database/` remains pure infrastructure (query executors, client, migrations, entities). Repositories delegate SQL operations to the existing query executors.

---

## Verb Convention

Consistent across all current and future repositories:

| Verb | Operation |
|---|---|
| `getAll` / `get*` | SELECT |
| `add` | INSERT |
| `update` | UPDATE |
| `delete` | DELETE |
| `set` | INSERT OR REPLACE |

---

## Interface & Implementation Design

### `repositories/account.repository.ts`

```typescript
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

`AccountRepository.add` is responsible for: UUID v4 generation, ISO timestamp stamping, `current_balance = opening_balance`, `is_archived = 0`. Callers never provide these fields.

---

### `repositories/app_settings.repository.ts`

```typescript
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

---

## Store Factory Pattern

Both stores become factory functions that accept a repository interface. The module-level export binds the SQLite implementation. Tests inject a mock.

### `store/account.store.ts`

```typescript
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

### `store/onboarding.store.ts`

```typescript
export function createOnboardingStore(repo: IAppSettingsRepository) {
  return create<OnboardingState>((set) => ({
    // ...
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
    // setStep and setSecurityChoice unchanged — SecureStore only, no repo needed
  }));
}

export const useOnboardingStore = createOnboardingStore(new AppSettingsRepository());
```

`loadOnboardingState` remains a standalone function. It reads exclusively from SecureStore — no repository interaction required.

---

## Affected Files

| File | Change |
|---|---|
| `repositories/account.repository.ts` | **New** — `IAccountRepository`, `NewAccountInput`, `AccountRepository` |
| `repositories/app_settings.repository.ts` | **New** — `IAppSettingsRepository`, `AppSettingsRepository` |
| `store/account.store.ts` | Wrap in factory; update `AccountState.addAccount` param from `Omit<Account, 'id' \| 'created_at' \| 'updated_at'>` to `NewAccountInput`; remove `uuid`, `getDb`, `getAccounts`, `addAccount` imports; use `repo.getAll()` / `repo.add()` |
| `store/onboarding.store.ts` | Wrap in factory; remove `setSetting`, `getDb` imports; use `repo.set()` |
| `app/(onboarding)/add_account/add_account.hook.ts` | Remove `is_archived` and `current_balance` from `addAccount(...)` call — now the repository's responsibility |

**Unchanged:** `database/` (all files), all other hooks, screens, components, migrations, entities.

---

## Testing

**Store tests** — inject a mock directly into the factory:
```typescript
const mockRepo: IAccountRepository = { getAll: jest.fn(), add: jest.fn() };
const store = createAccountStore(mockRepo).getState();
```
No module mocking required. Existing store test structure carries forward.

**Repository tests** — `AccountRepository` and `AppSettingsRepository` are plain classes testable with `better-sqlite3`, following the same pattern as `schema.test.ts`.

---

## Out of Scope

- Future repository methods (`getById`, `update`, `delete`) — add when a feature needs them
- API implementation classes — add when backend integration begins
- `loadOnboardingState` repository refactor — reads SecureStore only, no DB dependency
