# Zustand to Signals Migration Design

## Summary

Migrate MoneyApp from Zustand to Preact Signals for React Native in small, independently testable slices. The target pattern is not a Zustand-shaped compatibility adapter. Each migrated module exposes a custom setup hook that returns signal refs under `state` and actions as flat functions.

The migration will use `@preact/signals-react` and explicit signal hooks. It will not add the Signals Babel transform in the first pass.

This adds a new state dependency, which is a MoneyApp critical trigger. The dependency is still acceptable because it is pure JavaScript, does not add native modules, and can be introduced behind one small helper slice before migrating feature state.

## Goals

- Replace Zustand stores with custom signal-backed hooks.
- Keep every migration slice small enough to review and revert independently.
- Preserve current behavior for persisted data, startup routing, database-backed stores, forms, and sheets.
- Prefer hook-owned `init` functions so setup logic stays beside the signals it initializes.
- Keep app-wide/shared data singleton-backed so multiple screens do not fork copies of accounts, transactions, categories, or onboarding state.
- Remove Zustand only after all runtime imports and tests have moved away from it.

## Non-Goals

- Do not rewrite every store in one PR.
- Do not introduce `@preact/signals-react-transform` during the initial migration.
- Do not redesign UI, navigation, database schemas, repositories, financial formulas, or onboarding behavior.
- Do not convert unrelated React `useState` usages unless they are part of a migrated store/screen state boundary.
- Do not keep a long-term Zustand compatibility adapter as the final architecture.

## Target Store Shape

Migrated stores expose custom hooks named for the setup or store they own. The hook returns signal refs under `state` and actions as top-level functions.

```ts
export function useClustersSetup() {
  const roomTypes = useSignal<RoomTypesSelectOptions[]>([]);
  const clusters = useSignal<HotelClusterFormItem[]>([]);

  const init = useAsync(async () => {
    const [nextRoomTypes, nextClusters] = await Promise.all([
      roomTypeRepository.getOptions(),
      clusterRepository.getAll(),
    ]);

    batch(() => {
      roomTypes.value = nextRoomTypes;
      clusters.value = nextClusters;
    });
  });

  useInit(init);

  return {
    state: {
      roomTypes,
      clusters,
      isLoading: init.isLoading,
      isError: init.isError,
    },
    init,
    addClusterInput,
    setInputField,
    upsertClusters,
    deleteCluster,
    getAvailableRoomTypeOptions,
  };
}
```

Consumers destructure the setup hook directly and read `.value` intentionally.

```tsx
const {
  state,
  init,
  upsertClusters,
  deleteCluster,
  addClusterInput,
  setInputField,
} = useClustersSetup();

if (state.isLoading.value) {
  return <Spinner />;
}

return state.clusters.value.map((cluster) => (
  <ClusterRow key={cluster.id} cluster={cluster} />
));
```

Prefer direct destructuring at the hook call site over holding the whole setup object in a variable. This keeps screen code compact and makes the returned `state`/action contract obvious.

## Signal Lifetime Rules

Use hook-local signals for isolated screen or component workflows:

- sheet visibility
- form drafts
- filters
- date picker visibility
- temporary selections
- one-screen setup flows
- component-local loading and validation

```ts
export function useBudgetSheetSetup() {
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

  return {
    state: { sheetVisible, mode, targetCategoryId },
    openAdd,
    openEdit,
    close,
  };
}
```

Use module-level singleton signals for app-wide/shared data:

- accounts
- categories
- currency settings/rate
- budget data
- transactions
- commitments
- onboarding progress
- startup readiness

```ts
const accounts = signal<Account[]>([]);
const hasLoaded = signal(false);

export function useAccountsSetup() {
  const init = useAsync(async () => {
    const rows = await accountRepository.getAll();

    batch(() => {
      accounts.value = rows;
      hasLoaded.value = true;
    });
  });

  useInit(() => {
    if (!hasLoaded.value) return init();
  });

  return {
    state: {
      accounts,
      hasLoaded,
      isLoading: init.isLoading,
      isError: init.isError,
    },
    init,
    addAccount,
    updateAccount,
    archiveAccount,
    reset,
  };
}
```

Shared data must not be created with `useSignal` inside a hook. Doing that would create separate data copies for each caller.

## Helper Hooks

Add signal helper hooks before migrating stores. These helpers establish the app convention and give tests a small first target.

```ts
import { type Signal, useSignal } from '@preact/signals-react';

export function useAsync<T extends (...args: Parameters<T>) => ReturnType<T>>(
  fn: T,
): T & { isLoading: Signal<boolean>; isError: Signal<boolean> } {
  const isLoading = useSignal(false);
  const isError = useSignal(false);

  // TS cannot unify the augmented intersection with T's generic call signature.
  const asyncFn = (async (...args: Parameters<T>) => {
    isLoading.value = true;
    isError.value = false;

    return Promise.resolve()
      .then(() => fn(...args))
      .catch((e: unknown) => {
        isError.value = true;
        throw e;
      })
      .finally(() => {
        isLoading.value = false;
      });
  }) as T & { isLoading: Signal<boolean>; isError: Signal<boolean> };

  asyncFn.isLoading = isLoading;
  asyncFn.isError = isError;

  return asyncFn;
}
```

Use `Promise.resolve().then(...)` instead of `Promise.try(...)` until Hermes support is verified for the project's target Expo/React Native runtime. `Promise.try()` is a new JavaScript feature and should not be assumed on-device.

```ts
import { untracked, useSignalEffect } from '@preact/signals-react';

export function useInit(fn: () => unknown) {
  useSignalEffect(() => {
    const result = untracked(fn);

    if (result instanceof Promise) {
      result.catch((e: unknown) => {
        console.error(e);
      });
    }
  });
}
```

`useInit` keeps component initialization inside the setup hook, next to the `init` action. `untracked` prevents signals read during initialization from becoming effect dependencies.

## Migration Sequence

### Slice 1: Dependency and Helpers

Add `@preact/signals-react`, `utils/use_async.hook.ts`, and `utils/use_init.hook.ts`. Add tests for loading/error transitions, sync throw handling, async rejection handling, and one-shot init behavior.

No existing store changes in this slice.

### Slice 2: One Leaf UI State Store

Migrate one low-risk `.state.ts` file with no repository access and no cross-screen sharing. Good candidates:

- `modules/budget/screens/budget/components/income_sheet.state.ts`
- `modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.state.ts`
- `modules/commitments/screens/commitments/components/decimal_amount_input.state.ts`

Update only that store, its direct consumers, and its tests.

### Slice 3: A Small Screen State Store

Migrate one screen-level `.state.ts` file after the leaf pattern is green. Good candidates:

- `modules/budget/screens/budget/budget.state.ts`
- `modules/categories/screens/settings/categories/categories.state.ts`
- `modules/dashboard/screens/dashboard/dashboard.state.ts`

Keep the slice limited to one screen state module and its direct tests.

### Slice 4: One Shared Domain Store

Migrate one simple app-wide/shared store using module-level signals. Good candidates:

- `store/ready.store.ts`
- `store/sheet_visibility.store.ts`
- `modules/currency/store/currency.store.ts`

This validates singleton signal lifetime before moving repository-heavy stores.

### Slice 5: Repository-Backed Stores

Migrate repository-backed stores one domain at a time:

1. accounts
2. categories
3. budget
4. transactions
5. commitments

Transactions and commitments migrate later because they have more async flows, pagination, month logic, and cross-screen refresh behavior.

### Slice 6: Startup and Onboarding

Migrate onboarding and startup readiness late:

- `modules/onboarding/store/onboarding.store.ts`
- `store/ready.store.ts` if not already migrated
- `utils/use_layout_init.hook.ts`
- `app/index.tsx`

This area touches SecureStore-adjacent startup routing and must be reviewed more carefully.

### Slice 7: Cleanup

After runtime code no longer imports Zustand:

- remove `zustand` from `package.json`
- delete `utils/zustand_selectors.ts`
- delete or rewrite Zustand-specific test helpers
- run `rg "zustand|useShallow|createMoneyAppSelectors"` and clean remaining references outside historical docs

## Testing Strategy

Every slice must include focused tests and run the relevant existing tests before broad verification.

Helper tests:

- `useAsync` sets `isLoading.value = true` while the wrapped promise is pending.
- `useAsync` resets `isLoading.value = false` after success.
- `useAsync` sets `isError.value = true` after rejection and rethrows.
- `useAsync` handles synchronous throws.
- `useInit` invokes its callback through `useSignalEffect`.
- `useInit` catches async rejection and logs it.

Store migration tests:

- existing action behavior remains unchanged
- reset restores initial values
- async actions update data and loading/error signals correctly
- shared stores keep data shared across hook callers
- hook-local stores do not leak state between independent hook callers

Verification per slice:

```bash
npm test -- --ci <focused-test-file>
npm run typecheck
```

Before pushing a PR branch, run full local CI parity:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "CI parity green - safe to push"
```

## Risks and Mitigations

Risk: shared app data accidentally becomes hook-local.

Mitigation: app-wide stores must define data signals at module scope. Tests must render two hook callers and confirm both observe the same signal.

Risk: `.value` reads do not trigger React updates.

Mitigation: use `@preact/signals-react` hooks consistently and verify migrated components with React Native Testing Library. Avoid the Babel transform until explicit manual device QA proves it is needed and safe.

Risk: `Promise.try()` works in Node but not on device.

Mitigation: use `Promise.resolve().then(...)` in `useAsync` unless Hermes support is verified for the target runtime.

Risk: migration grows into a broad refactor.

Mitigation: each implementation task migrates one helper or one store family only. No batch changes across unrelated modules.

Risk: tests rely on Zustand-specific monkeypatching.

Mitigation: update tests slice-by-slice to use the new setup hook state/actions directly. Do not preserve `.setState` just for old tests.

## Acceptance Criteria

- The project has `@preact/signals-react` installed and helper hooks tested.
- At least one hook-local store is migrated to the new custom setup hook pattern.
- At least one shared store is migrated with module-level signals before any large domain store migration begins.
- No slice changes unrelated UI, repository behavior, database schema, or financial calculations.
- Zustand remains installed until all runtime usage is migrated.
- Final cleanup removes Zustand only after `rg "zustand|useShallow|createMoneyAppSelectors"` is clean outside docs.
