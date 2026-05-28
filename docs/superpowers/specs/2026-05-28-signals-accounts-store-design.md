# Signals Accounts Store Design

## Goal

Migrate the canonical accounts data store from Zustand to Preact Signals without pulling dashboard, transactions, commitments, categories, or currency into this branch.

## Scope

This slice covers the account data store and only the consumers that must change for app boot, accounts screens, and onboarding screens:

- `modules/accounts/store/account.store.ts`
- `store/account.store.ts`
- `app/(app)/_layout.tsx`
- `modules/accounts/screens/accounts/add_account/add_account.hook.ts`
- `modules/accounts/screens/accounts/detail/account_detail.hook.ts`
- onboarding hooks that read account data or call account actions
- account and onboarding tests that directly mock/read the account store API

Dashboard, transactions, commitments, and other downstream account consumers stay on their existing API through temporary compatibility exports. They are migrated in later stacked branches.

## Architecture

The module store remains the source of truth. `modules/accounts/store/account.store.ts` owns module-level `signal(...)` singletons for shared account data and exposes a responsibility-named hook:

```ts
const { state, loadAccounts, addAccount } = useAccounts();
const accounts = state.accounts.value;
```

The root `store/account.store.ts` remains a compatibility re-export only. It must not create a second account state instance.

During this branch, `useAccountStore` may remain as a temporary compatibility alias for consumers outside the slice. The preferred API for migrated consumers is `useAccounts()`.

## Data Flow

`loadAccounts()` reads from `AccountRepository.getAll()` and updates `state.accounts.value` plus `state.hasLoaded.value`.

Mutating actions delegate to the repository and then call `loadAccounts()`:

- `addAccount(data)` returns the created account
- `updateAccount(id, data)`
- `archiveAccount(id)`
- `adjustBalance(id, newBalance)`

`reset()` restores `accounts = []` and `hasLoaded = false`.

## Testing

Store tests should stop using Zustand `.getState()` for the migrated factory and instead exercise the returned Signals store object directly:

```ts
const store = createAccountStore(repo);
await store.loadAccounts();
expect(store.state.accounts.value).toEqual([mockAccount]);
```

Focused verification:

- `npm test -- --runTestsByPath __tests__/account.store.test.ts __tests__/screens/accounts/add_account.hook.test.ts __tests__/screens/accounts/account_detail.hook.test.ts __tests__/screens/onboarding_add_account.hook.test.ts __tests__/screens/onboarding_more_accounts.hook.test.ts __tests__/screens/onboarding_ready.hook.test.ts --runInBand`
- `npm run typecheck`
- `npm run format:check`

