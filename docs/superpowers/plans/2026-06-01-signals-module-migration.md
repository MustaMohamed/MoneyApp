# Signals Module Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish the remaining Zustand to Preact Signals migration module-by-module while preserving behavior and keeping each module independently reviewable.

**Architecture:** Existing migrated code is the contract: shared stores expose a class instance through `useXStore()` with signal refs under `state` and flat actions; hook-local state exposes `state` signal refs from responsibility-named hooks. Runtime code must intentionally read `.value`. No migrated slice keeps a Zustand-shaped `.getState()`, `.setState()`, or `.useState` adapter. Cross-module consumers are updated by the module owner that owns the consuming file; shared store owners publish the final Signals API and update their own module first.

**Tech Stack:** Expo React Native, TypeScript strict, Jest, `@preact/signals-react`, `useAsync`, `useInit`, oxlint/oxfmt.

---

## Baseline

- Branch/worktree: `.worktrees/refactor-signals-modules` on `refactor/signals-modules`.
- Baseline command: `npm test -- --ci --runInBand`.
- Baseline result before migration work: 122 test suites passed, 1160 tests passed.

## Existing Signals Contract

Use these files as the concrete pattern:

- `src/modules/accounts/store/account.store.ts` for repository-backed shared stores.
- `src/modules/onboarding/store/onboarding.store.ts` for persisted shared flow state.
- `src/store/ready.store.ts` for simple app-wide shared state.
- `src/modules/accounts/screens/accounts/detail/account_detail.state.ts` for hook-local screen state.
- `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.state.ts` for hook-local component state.

Shared store example shape:

```ts
export class ExampleStore {
  readonly state = {
    rows: signal<Example[]>([]),
    loaded: signal(false),
  };

  load = async () => {
    const rows = await this.repository.getAll();
    batch(() => {
      this.state.rows.value = rows;
      this.state.loaded.value = true;
    });
  };

  reset = () => {
    batch(() => {
      this.state.rows.value = [];
      this.state.loaded.value = false;
    });
  };
}

const exampleStore = new ExampleStore(exampleRepository);

export function useExampleStore(): ExampleStore {
  return exampleStore;
}
```

Hook-local state example shape:

```ts
export function useExampleScreenState() {
  const visible = useSignal(false);
  const saving = useSignal(false);

  const open = useCallback(() => {
    visible.value = true;
  }, [visible]);

  const reset = useCallback(() => {
    batch(() => {
      visible.value = false;
      saving.value = false;
    });
  }, [saving, visible]);

  return {
    state: { visible, saving },
    open,
    reset,
  };
}
```

## Parallel Workstreams

### Workstream 1: Budget Module

**Owner:** Budget dev agent.

**Files owned:**

- `src/modules/budget/**`
- `__tests__/budget*.test.ts`
- `__tests__/screens/budget/**`
- `__tests__/income_sheet.state.test.ts`

**Tasks:**

- [ ] Migrate `src/modules/budget/store/budget.store.ts` to a class-based Signals store with `state.rows`, `state.spendByMonth`, `state.loaded`, and `state.expectedIncome`.
- [ ] Migrate `budget.state.ts`, `income_sheet.state.ts`, and `set_budget_sheet.state.ts` to hook-local Signals APIs.
- [ ] Update all Budget module consumers to read `.value` and call flat actions.
- [ ] Update Budget tests away from `.getState()`, `.setState()`, `.useState`, and `useShallow`.
- [ ] Run Budget-focused tests and changed-file type/lint checks.
- [ ] Self-review the diff, fix findings, then request a review pass.

### Workstream 2: Categories Module

**Owner:** Categories dev agent.

**Files owned:**

- `src/modules/categories/**`
- `__tests__/category*.test.ts`
- `__tests__/categories*.test.ts`
- `__tests__/add_edit_category_sheet.state.test.ts`
- `__tests__/reassign_category_sheet.state.test.ts`
- `__tests__/screens/settings/categories/**`
- `__tests__/screens/settings_categories.hook.test.ts`

**Tasks:**

- [ ] Migrate `src/modules/categories/store/category.store.ts` to a class-based Signals store with `state.categories` and `state.hasLoaded`.
- [ ] Migrate categories screen state, screen store, add/edit sheet state, and reassign sheet state to Signals.
- [ ] Update Categories module consumers to read `.value` and call flat actions.
- [ ] Update Categories tests away from `.getState()`, `.setState()`, `.useState`, and `useShallow`.
- [ ] Run Categories-focused tests and changed-file type/lint checks.
- [ ] Self-review the diff, fix findings, then request a review pass.

### Workstream 3: Currency Module

**Owner:** Currency dev agent.

**Files owned:**

- `src/modules/currency/**`
- `__tests__/currency.store.test.ts`
- `__tests__/settings_currency.state.test.ts`
- `__tests__/screens/settings_currency.hook.test.ts`

**Tasks:**

- [ ] Migrate `src/modules/currency/store/currency.store.ts` to a class-based Signals store with `state.rate`, `state.lastFetched`, `state.isManualOverride`, and `state.rateUpdatedAt`.
- [ ] Preserve the existing exported type surface and decide whether to keep the database key `RATE_UPDATED_AT_KEY` while normalizing the public property to camelCase.
- [ ] Migrate `currency.state.ts` to hook-local Signals.
- [ ] Update Currency module consumers to read `.value` and call flat actions.
- [ ] Update Currency tests away from `.getState()`, `.setState()`, `.useState`, and `useShallow`.
- [ ] Run Currency-focused tests and changed-file type/lint checks.
- [ ] Self-review the diff, fix findings, then request a review pass.

### Workstream 4: Dashboard Module

**Owner:** Dashboard dev agent.

**Files owned:**

- `src/modules/dashboard/**`
- `__tests__/dashboard.store.test.ts`
- `__tests__/screens/dashboard/**`

**Tasks:**

- [ ] Migrate `dashboard.store.ts` to Signals with `state.statsMap`, `state.currentMonthCommitmentPayments`, `state.currentMonthSpend`, and `state.previousMonthSpend`.
- [ ] Migrate `dashboard.state.ts` to hook-local Signals.
- [ ] Update Dashboard consumers to read `.value` and call flat actions.
- [ ] If Currency store is not yet migrated when this workstream runs, leave the Currency read untouched and record the follow-up. If Currency is migrated, update the Dashboard currency read to `.value`.
- [ ] Update Dashboard tests away from `.getState()`, `.setState()`, `.useState`, and `useShallow`.
- [ ] Run Dashboard-focused tests and changed-file type/lint checks.
- [ ] Self-review the diff, fix findings, then request a review pass.

### Workstream 5: Commitments Module

**Owner:** Commitments dev agent.

**Files owned:**

- `src/modules/commitments/**`
- `__tests__/commitment*.test.ts`
- `__tests__/screens/commitments*.test.ts`
- `__tests__/screens/commitment_status.test.ts`

**Tasks:**

- [ ] Migrate `commitment.store.ts` to a class-based Signals store with shared signals for commitments, payments, selected month, and loaded flags.
- [ ] Preserve request-id behavior for payment loading.
- [ ] Migrate commitments screen/detail/form/pay-sheet state files to Signals.
- [ ] Update Commitments module consumers to read `.value` and call flat actions.
- [ ] If Category or Currency stores are not yet migrated when this workstream runs, leave those external reads untouched and record the follow-up. If migrated, update reads to `.value`.
- [ ] Update Commitments tests away from `.getState()`, `.setState()`, `.useState`, and `useShallow`.
- [ ] Run Commitments-focused tests and changed-file type/lint checks.
- [ ] Self-review the diff, fix findings, then request a review pass.

### Workstream 6: Transactions Module

**Owner:** Transactions dev agent.

**Files owned:**

- `src/modules/transactions/**`
- `src/app/(app)/(tabs)/_layout.tsx` only for `useAddTransactionState` API fallout
- `__tests__/transaction*.test.ts`
- `__tests__/database_get_transactions_filter.test.ts`
- `__tests__/transactions_get_period_totals.test.ts`
- `__tests__/update_transaction.query_executor.test.ts`
- `__tests__/screens/transactions/**`
- `__tests__/add_transaction.store.test.ts`
- `__tests__/edit_transaction.store.test.ts`

**Tasks:**

- [ ] Migrate `transaction.store.ts` to a class-based Signals store with request-id behavior preserved.
- [ ] Migrate transaction list, filter, detail, add form, edit form, and form body state/store files to Signals.
- [ ] Update Transactions module consumers to read `.value` and call flat actions.
- [ ] If Category or Currency stores are not yet migrated when this workstream runs, leave those external reads untouched and record the follow-up. If migrated, update reads to `.value`.
- [ ] Update Transactions tests away from `.getState()`, `.setState()`, `.useState`, and `useShallow`.
- [ ] Run Transactions-focused tests and changed-file type/lint checks.
- [ ] Self-review the diff, fix findings, then request a review pass.

### Workstream 7: Shared Cleanup

**Owner:** Orchestrator after module workstreams report green.

**Files owned:**

- `src/store/sheet_visibility.store.ts`
- `src/components/ui/sheet.tsx`
- `src/utils/zustand_selectors.ts`
- `src/test_helpers/mock_zustand_selectors.ts`
- `__tests__/store/sheet_visibility.store.test.ts`
- `__tests__/zustand_selectors.test.ts`
- `package.json`
- `package-lock.json`

**Tasks:**

- [ ] Migrate `sheet_visibility.store.ts` to a simple Signals shared store.
- [ ] Update `sheet.tsx` and sheet visibility tests.
- [ ] Run `rg "zustand|useShallow|createMoneyAppSelectors|mock_zustand" src __tests__`.
- [ ] Remove `src/utils/zustand_selectors.ts` and Zustand-specific test helpers only when runtime and test imports are clean.
- [ ] Remove `zustand` from `package.json` and regenerate `package-lock.json` only after the `rg` check is clean outside historical docs.
- [ ] Run full local verification.

## Review Gates

Each module agent must do the following after every migration step:

1. Run the focused test file(s) for the step.
2. Inspect `git diff -- <owned files>` for accidental scope creep.
3. Fix self-review findings before moving to the next step.
4. Report changed files, tests run, any unresolved findings, and any external-store follow-ups.

The orchestrator will then run a full review after all module reports are in:

```bash
npm run format:check
npm run lint
npm run typecheck
npm test -- --ci --runInBand
```

Before any push to a PR branch, run the full CI parity chain from `AGENTS.md`.
