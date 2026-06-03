# MobX Stores and Signals Local State Design

## Summary

MoneyApp will replace the current Zustand-to-Signals migration direction with a split state architecture:

- MobX owns shared/domain/application stores.
- Preact Signals owns simple screen and component-local state.
- Zustand is removed after all runtime store consumers and tests have migrated.

This direction supersedes `docs/superpowers/specs/2026-05-27-zustand-to-signals-design.md` for future state migration work. The previous Signals work remains useful where it already converted isolated local state, but shared stores should no longer be migrated into class-wrapped Signals.

## Critical Trigger

Adding MobX is a new dependency and an architecture pivot, which is a MoneyApp critical trigger. The user explicitly approved proceeding on June 3, 2026 after the team identified that the class-based store pattern fits MobX better than class-wrapped Signals.

The implementation must add only pure JavaScript React bindings:

- `mobx`
- `mobx-react-lite`

No native module, Expo config, prebuild plugin, schema migration, secure-store change, or UI dependency is part of this design.

## Problem

The current branch history moved from Zustand toward Preact Signals. The emerging shared-store pattern uses classes that own `signal(...)` refs:

```ts
export class AccountStore {
  readonly state = {
    accounts: signal(INITIAL_ACCOUNTS),
  };

  addAccount = async (data: NewAccountInput) => {
    const account = await this.repository.add(data);
    await this.syncAccounts();
    return account;
  };
}
```

This works, but it combines MobX-shaped domain objects with Signals primitives. Consumers then need to understand both the class method API and Signals-specific `.value` reads, explicit `batch(...)`, `computed(...)`, and signal ref exposure.

For MoneyApp's shared stores, MobX is the better match because shared state is already organized as domain-oriented stores with repository dependencies, computed derived values, async actions, and singleton lifetimes.

## Goals

- Move every shared/domain/application store away from Zustand or class-wrapped Signals to MobX class stores.
- Keep simple screen/component hooks on Preact Signals with `useSignal(...)`.
- Preserve current behavior, route flow, repository contracts, database schema, and financial formulas.
- Keep migration slices small enough to review, test, and revert independently.
- Remove `zustand`, `src/utils/zustand_selectors.ts`, and `src/test_helpers/mock_zustand_selectors.ts` only after all runtime and test imports are gone.
- Keep root `src/store/*` files as compatibility re-exports only.

## Non-Goals

- Do not redesign UI, navigation, onboarding, database schemas, repositories, or financial calculations.
- Do not introduce a MobX-state-tree, MST, Redux, TanStack Query, MMKV, or persistence-layer rewrite.
- Do not create a long-term Zustand-shaped compatibility adapter over MobX.
- Do not convert all local state just because a file is touched. Convert local state when it is part of the active migration slice.
- Do not remove Preact Signals. Signals remain the standard for simple local screen/component state.

## Considered Approaches

### Approach A: Continue Full Signals Migration

Shared stores and local state both use Preact Signals.

Pros:

- Keeps one reactive library.
- Builds on the existing Signals setup and Babel transform.
- Avoids adding MobX.

Cons:

- Shared class stores still expose signal refs and `.value` everywhere.
- Derived values and async domain actions become more manual than necessary.
- The pattern is effectively a hand-rolled MobX store with Signals semantics.

### Approach B: Full MobX Everywhere

Shared stores, screen stores, and component stores all use MobX.

Pros:

- One mental model for all app state.
- Class stores and computed getters are idiomatic.

Cons:

- Overkill for simple sheet visibility, input text, picker visibility, and local loading flags.
- Increases `observer(...)` surface area for state that does not need global observability.
- Moves away from already-working local Signals helpers.

### Approach C: MobX Shared Stores + Signals Local State

Domain/application stores use MobX. Ephemeral screen/component state uses Signals.

Pros:

- Matches each tool to its strongest use case.
- MobX handles long-lived shared objects, actions, computed data, and repository-backed state cleanly.
- Signals keeps lightweight local UI state explicit and cheap.
- Avoids class-wrapped Signals for shared stores.

Cons:

- The app keeps two reactive models.
- Developers must classify state correctly before creating a store.
- Components that read MobX observables must be wrapped with `observer(...)`.

Recommendation: use Approach C.

## State Ownership Rules

Use MobX for state that is shared, long-lived, repository-backed, cross-screen, or application-global:

- accounts
- onboarding progress
- app readiness
- sheet visibility that must be coordinated globally
- categories
- currency rate/settings
- budget rows, spend windows, expected income
- dashboard cached data
- transactions
- commitments

Use Signals for state that is local, ephemeral, and owned by one screen/component workflow:

- sheet open/closed flags local to one screen
- form draft fields
- picker visibility
- selected tabs or segments
- temporary filter drafts
- local loading/error flags
- local validation messages
- selected category/account IDs in a single form

If state must survive unmounts, coordinate between screens, or be reused by multiple modules, it belongs in MobX. If state is reset naturally when the screen/component unmounts, it belongs in a Signals hook.

## MobX Store Shape

MobX shared stores are small classes named for the domain. They own repository dependencies, observable fields, computed getters, and async actions.

```ts
import { makeAutoObservable, runInAction } from 'mobx';

export class AccountStore {
  accounts: Account[] = [];
  private loadRequestId = 0;

  constructor(private readonly repository: IAccountRepository = accountRepository) {
    makeAutoObservable(this, {}, { autoBind: true });
  }

  get activeAccounts() {
    return this.accounts.filter((account) => !account.isArchived);
  }

  async init() {
    await this.syncAccounts();
  }

  private async syncAccounts() {
    const requestId = ++this.loadRequestId;
    const accounts = await this.repository.getAll();

    runInAction(() => {
      if (requestId === this.loadRequestId) {
        this.accounts = accounts;
      }
    });
  }

  async addAccount(data: NewAccountInput) {
    const account = await this.repository.add(data);
    await this.syncAccounts();
    return account;
  }

  reset() {
    this.loadRequestId += 1;
    this.accounts = [];
  }
}

export const accountStore = new AccountStore(accountRepository);

export function useAccountStore() {
  return accountStore;
}
```

Store fields are read directly in MobX-aware React components and hooks:

```tsx
import { observer } from 'mobx-react-lite';

export const AccountsScreen = observer(function AccountsScreen() {
  const accountStore = useAccountStore();

  return accountStore.accounts.map((account) => (
    <AccountRow key={account.id} account={account} />
  ));
});
```

For test factories, export the class and allow repository injection:

```ts
const store = new AccountStore(repo);
await store.init();
expect(store.accounts).toEqual([mockAccount]);
```

## Signals Local State Shape

Signals local state lives in `*.state.ts` files or hook-local setup functions. It returns refs under `state` and flat actions.

```ts
import { batch, useSignal } from '@preact/signals-react';

export function useBudgetScreenState() {
  const sheetVisible = useSignal(false);
  const mode = useSignal<'add' | 'edit'>('add');
  const targetCategoryId = useSignal<string | undefined>(undefined);

  function openAdd() {
    batch(() => {
      sheetVisible.value = true;
      mode.value = 'add';
      targetCategoryId.value = undefined;
    });
  }

  function closeSheet() {
    sheetVisible.value = false;
  }

  return {
    state: {
      sheetVisible,
      mode,
      targetCategoryId,
    },
    openAdd,
    closeSheet,
  };
}
```

Consumers read signal refs intentionally with `.value`. The Babel Signals transform is already installed, so do not add empty `useSignals()` calls for render tracking.

## React Integration Rules

MobX consumers:

- Wrap React components that read observable fields during render with `observer(...)`.
- Hooks may return MobX stores directly, but the component doing the render read must be an observer.
- Do not destructure observable fields outside render if it breaks tracking.
- Prefer direct store methods over action objects or selector helpers.

Signals consumers:

- Keep writable signal refs inside the hook/state boundary.
- Return signal refs under `state`.
- Return flat action functions beside `state`.
- Use `useAsync(...)` and `useInit(...)` for local async operation state.

Mixed consumers:

- A screen may use a MobX domain store and a Signals local state hook together.
- The screen component must be `observer(...)` if it reads MobX observable fields in render.
- Local signal reads still use `.value`.

## Migration Inventory

Shared/domain/application stores to migrate to MobX:

- `src/modules/accounts/store/account.store.ts`
- `src/modules/onboarding/store/onboarding.store.ts`
- `src/store/ready.store.ts`
- `src/store/sheet_visibility.store.ts`
- `src/modules/categories/store/category.store.ts`
- `src/modules/currency/store/currency.store.ts`
- `src/modules/budget/store/budget.store.ts`
- `src/modules/dashboard/screens/dashboard/dashboard.store.ts`
- `src/modules/transactions/store/transaction.store.ts`
- `src/modules/commitments/store/commitment.store.ts`

Local screen/component state to migrate to Signals:

- `src/modules/budget/screens/budget/budget.state.ts`
- `src/modules/budget/screens/budget/components/income_sheet.state.ts`
- `src/modules/budget/screens/budget/components/set_budget_sheet.state.ts`
- `src/modules/categories/screens/settings/categories/categories.state.ts`
- `src/modules/categories/screens/settings/categories/categories.store.ts`
- `src/modules/categories/screens/settings/categories/components/add_edit_category_sheet.state.ts`
- `src/modules/categories/screens/settings/categories/components/reassign_category_sheet.state.ts`
- `src/modules/commitments/screens/commitments/add_commitment/add_commitment.state.ts`
- `src/modules/commitments/screens/commitments/commitments.state.ts`
- `src/modules/commitments/screens/commitments/components/commitment_form_body.state.ts`
- `src/modules/commitments/screens/commitments/components/decimal_amount_input.state.ts`
- `src/modules/commitments/screens/commitments/detail/components/pay_sheet.state.ts`
- `src/modules/commitments/screens/commitments/detail/detail.state.ts`
- `src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.state.ts`
- `src/modules/currency/screens/currency/currency.state.ts`
- `src/modules/dashboard/screens/dashboard/dashboard.state.ts`
- `src/modules/transactions/screens/transactions/transactions.state.ts`
- `src/modules/transactions/screens/transactions/transactions.store.ts`
- `src/modules/transactions/screens/transactions/filter/filter.state.ts`
- `src/modules/transactions/screens/transactions/filter/filter.store.ts`
- `src/modules/transactions/screens/transactions/detail/detail.state.ts`
- `src/modules/transactions/screens/transactions/detail/detail.store.ts`
- `src/modules/transactions/screens/transactions/transaction_form/add_transaction.state.ts`
- `src/modules/transactions/screens/transactions/transaction_form/add_transaction.store.ts`
- `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.state.ts`
- `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.store.ts`
- `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.state.ts`

Already-Signals local state should be preserved unless a bug requires changes:

- `src/modules/accounts/screens/accounts/detail/account_detail.state.ts`
- `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.state.ts`

Root compatibility re-exports to keep thin:

- `src/store/account.store.ts`
- `src/store/budget.store.ts`
- `src/store/category.store.ts`
- `src/store/commitment.store.ts`
- `src/store/currency.store.ts`
- `src/store/onboarding.store.ts`
- `src/store/transaction.store.ts`

## Migration Sequence

1. Add `mobx` and `mobx-react-lite`. Verify install, typecheck, unit tests, and Expo doctor compatibility.
2. Migrate app-flow stores first: readiness, onboarding, sheet visibility. These establish conventions and reduce boot-flow risk before larger domain stores.
3. Migrate accounts to MobX from the current class-wrapped Signals implementation.
4. Migrate categories and currency.
5. Migrate budget and dashboard.
6. Migrate transactions.
7. Migrate commitments.
8. Convert remaining local Zustand `*.state.ts` and screen-only `*.store.ts` files to Signals.
9. Remove Zustand selectors, Zustand test helpers, and the `zustand` dependency after `rg "zustand|getState\\(|\\.useState" src __tests__` returns no runtime migration targets.

Each step must keep the app compiling and the focused tests for that slice passing before moving on.

## Testing Strategy

For each MobX store slice:

- Rewrite store unit tests to instantiate the MobX class directly.
- Test initial state, async loading, mutation actions, reset behavior, and stale-request behavior where the current store has it.
- Update hook tests only for consumers touched by the slice.

For each Signals local-state slice:

- Rewrite state tests to use `renderHook(...)` where the hook uses `useSignal(...)`.
- Assert signal values through `.value`.
- Preserve existing action behavior exactly.

Required verification after each slice:

```bash
npm run typecheck
npm test -- --runTestsByPath <focused-test-files> --runInBand
npm run format:check
```

Required verification before push:

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

## Acceptance Criteria

- `mobx` and `mobx-react-lite` are installed and used for shared/domain/application stores.
- Shared/domain stores are class-based MobX stores with repository injection for tests.
- Components that read MobX observables during render are wrapped with `observer(...)`.
- Simple screen/component-local state uses Preact Signals hooks.
- No runtime Zustand usage remains.
- `zustand` is removed from `package.json` and `package-lock.json`.
- Existing behavior and tests are preserved.
- CI parity passes locally before any PR push.

## Open Constraints

The implementation plan must be sliced. A single PR that migrates every store at once is too large to review safely. If the branch remains one PR, commits must still be organized by independently verifiable slices.
