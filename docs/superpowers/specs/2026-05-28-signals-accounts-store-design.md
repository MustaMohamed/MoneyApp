# Signals Accounts Store Design

## Goal

Migrate the canonical accounts data store from Zustand to Preact Signals and update account-data consumers to the shared Signals store API.

## Scope

This slice covers the account data store and consumers that read account data or call account actions:

- `modules/accounts/store/account.store.ts`
- `store/account.store.ts`
- `app/(app)/_layout.tsx`
- `modules/accounts/screens/accounts/add_account/add_account.hook.ts`
- `modules/accounts/screens/accounts/detail/account_detail.hook.ts`
- onboarding hooks that read account data or call account actions
- dashboard, transaction, and commitment hooks that read account data
- tests that directly mock/read the account store API

## Architecture

The module store remains the source of truth. `modules/accounts/store/account.store.ts` exposes a small class-based shared store. The store owns its `signal(...)` refs and repository dependency, and the module exports one singleton through a responsibility-named hook:

```ts
const {
  state: { accounts: accountsSignal },
  init,
  addAccount,
} = useAccountStore();
const accounts = accountsSignal.value;
```

The root `store/account.store.ts` remains a compatibility re-export only. It must not create a second account state instance.

The branch does not keep a Zustand-shaped compatibility adapter. Existing consumers in this PR scope move to the Signals `useAccountStore()` facade directly. The Babel Signals transform handles render tracking, so no empty `useSignals()` calls are needed.

The store does not expose a separate loading or loaded flag. Account data is always a list, initialized to the frozen `EMPTY_ACCOUNTS` array. Consumers that need operation loading state wrap `init()` with `useAsync(...)` at the hook boundary that owns the operation.

## Data Flow

`init()` reads from `AccountRepository.getAll()` and updates `state.accounts.value`.

Mutating actions delegate to the repository and then refresh account signals internally:

- `addAccount(data)` returns the created account
- `updateAccount(id, data)`
- `archiveAccount(id)`
- `adjustBalance(id, newBalance)`

`reset()` restores `accounts = EMPTY_ACCOUNTS`.

## Testing

Store tests should stop using Zustand `.getState()` for the migrated factory and instead exercise the returned Signals store object directly:

```ts
const store = new AccountStore(repo);
await store.init();
expect(store.state.accounts.value).toEqual([mockAccount]);
```

Focused verification:

- `npm test -- --runTestsByPath __tests__/account.store.test.ts __tests__/screens/accounts/add_account.hook.test.ts __tests__/screens/accounts/account_detail.hook.test.ts __tests__/screens/onboarding_add_account.hook.test.ts __tests__/screens/onboarding_more_accounts.hook.test.ts __tests__/screens/onboarding_ready.hook.test.ts --runInBand`
- `npm run typecheck`
- `npm run format:check`
