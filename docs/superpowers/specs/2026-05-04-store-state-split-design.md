# Store / State Split Refactor — Design

**Date:** 2026-05-04
**Branch:** `refactor/store-state-split`

## Problem

Today, screen state lives in three inconsistent places:

1. `<screen>.store.ts` files mix data (form drafts, selections, fetched results) with UI state (visibility, loading flags, errors).
2. `<screen>.hook.ts` files use `useState` for UI flags that should be in a store.
3. Child components inside `screens/**/components/` use `useState` for their own UI flags, scattering state across the tree.

The result: state is hard to inspect, hard to test, and the rule "no `useState` in screens" only applies to `index.tsx` while hooks and child components escape it.

## Goal

Establish a clear, two-bucket separation:

- **`.store.ts`** — data only (form drafts, selections, fetched results, search input).
- **`.state.ts`** — UI state only (visibility, loading/saving, errors, tab selection, render-toggle flags).

Eliminate `useState` everywhere except where the React API itself requires it (refs, third-party hooks).

## File Layout

```
screens/<screen>/
├── <screen>.store.ts        ← data only (omit if no data)
├── <screen>.state.ts        ← UI state only (omit if no UI flags)
├── <screen>.hook.ts         ← orchestration, no useState
├── <screen>.anim.ts
├── index.tsx                ← UI, no useState/useSharedValue
└── components/
    ├── foo.tsx              ← UI only, no useState
    └── foo.state.ts         ← when foo had its own useState
```

Rules:

- `.state.ts` always sits **next to** what it serves (screen file or component file).
- A `.store.ts` is omitted when there is no data (e.g. `accounts/detail/`).
- A `.state.ts` is omitted when there are no UI flags (e.g. `onboarding/security/`).
- Hook export naming: `useXxxStore` (data), `useXxxState` (UI). Both names point to Zustand stores under the hood — the suffix encodes the bucket, not the implementation.

## Data vs. UI Classification

| `.store.ts` (data) | `.state.ts` (UI) |
|---|---|
| Form draft values (`amountStr`, `type`) | Visibility flags (`showAccountPicker`, `visible`) |
| Selected/editing entities (`editingCategory`, `categoryToDelete`) | Loading/saving flags (`saving`, `isFetching`, `deleting`) |
| Filter draft (`accountIds`, `datePreset`, `amountMin`) | Inline error strings (`iconError`) |
| Fetched cache (`statsMap`, `tx`) | Tab selection (`activeTab`) |
| Search query input (`searchQuery`) | Render-toggle flags (`rateOverride`, `reloadKey`) |

Edge classifications (locked in):

- `activeTab` → **UI**. It's UI navigation, not persisted data.
- `rateOverride` → **UI**. It's a "show this input" toggle.
- `tx`, `statsMap` → **data**. They're fetched results, even if regenerated on remount.
- `searchQuery` → **data**. It's a value the user typed.
- `reloadKey` → **UI**. It's a render-trigger counter, not a value.
- `from`/`to`/`minStr`/`maxStr` in filter pickers → **UI**. They are local picker drafts that flow into the filter `.store.ts` only on commit.

## Concrete Per-File Changes

### Renames (single-bucket files)

| Current file | New file | Notes |
|---|---|---|
| `screens/accounts/detail/account_detail.store.ts` | `screens/accounts/detail/account_detail.state.ts` | All flags. Absorb `isSaving`/`isAdjusting`/`isArchiving` from `account_detail.hook.ts`. |
| `screens/settings/currency/currency.store.ts` | `screens/settings/currency/currency.state.ts` | Absorb `isFetching`/`isSaving` from hook. |
| `screens/onboarding/ready/ready.store.ts` | `screens/onboarding/ready/ready.state.ts` | The `completing` flag. |

### Unchanged

- `screens/transactions/transactions.store.ts` (all data)
- `screens/onboarding/security/security.store.ts` (all data)
- `screens/onboarding/currency/currency.store.ts` (all data)

### Splits (mixed files)

#### `transactions/filter/filter.store.ts`

- Keeps in `filter.store.ts`: `draft` and draft mutators (`toggleAccountId`, `toggleCategoryId`, `setDatePreset`, `setCustomDateRange`, `setAmountMin`, `setAmountMax`, `setAmountCurrency`, `resetDraft`).
- New `filter.state.ts`: `visible`, `accountPickerVisible`, `categoryPickerVisible`, `customDatePickerVisible`, plus their setters and a plain `open()`/`close()` for visibility only.
- The current `open(initial: AdvancedFilters)` becomes a hook orchestration: `state.open()` then `store.setDraft(initial)`. (The store gains a `setDraft(initial)` action.)

#### `transactions/transaction_form/add_transaction.store.ts`

- Keeps in `add_transaction.store.ts`: `type`, `amountStr`, `setType`, `handleNumpad`, plus a `reset()` that returns to initial form values.
- New `add_transaction.state.ts`: `visible`, `saving`, `showAccountPicker`, `showToPicker`, `showCategoryPicker`, `rateOverride`, plus setters, `open()`, and `close()`.
- `close()` resets both — orchestrated in the hook.

#### `transactions/transaction_form/edit_transaction.store.ts`

- Keeps in `edit_transaction.store.ts`: `editingTx`, `amountStr`, `handleNumpad`, plus a `reset()`.
- New `edit_transaction.state.ts`: `visible`, `saving`, `showCategoryPicker`, `rateOverride`, plus setters, `open(tx)`, `close()`.
- `open(tx)` becomes a hook orchestration: state opens + sets `rateOverride` from `tx.exchange_rate !== null`; store stores `editingTx` and computes `amountStr`.

#### `settings/categories/categories.store.ts`

- Keeps in `categories.store.ts`: `editingCategory`, `categoryToDelete`, plus pure setters (`setEditingCategory`, `clearEditingCategory`, `setCategoryToDelete`, `clearCategoryToDelete`).
- New `categories.state.ts`: `activeTab`, `showAddSheet`, `showDeleteConfirm`, `showReassignSheet`, plus their setters.
- Composite actions (`openAddSheet`, `openEditSheet`, `closeSheet`, `openDeleteConfirm`, `openReassignSheet`, `closeDeleteFlow`) move into `categories.hook.ts`, where they call both stores.

### New `.state.ts` files (replacing `useState`)

| Component / Hook | New file | Captures |
|---|---|---|
| `screens/dashboard/dashboard.hook.ts` | `dashboard.state.ts` | `isBreakdownVisible`, `refreshing` |
| `screens/dashboard/dashboard.hook.ts` | `dashboard.store.ts` | `statsMap` (fetched data) |
| `screens/transactions/detail/detail.hook.ts` | `detail.state.ts` | `confirmVisible`, `deleting`, `reloadKey` |
| `screens/transactions/detail/detail.hook.ts` | `detail.store.ts` | `tx` |
| `screens/transactions/transaction_form/transaction_form_body.tsx` | `transaction_form_body.state.ts` | `showIosDatePicker`, `showIosTimePicker` |
| `screens/transactions/filter/components/filter_date_custom_picker.tsx` | `filter_date_custom_picker.state.ts` | `from`, `to`, `showFromPicker`, `showToPicker` |
| `screens/transactions/filter/components/filter_amount_section.tsx` | `filter_amount_section.state.ts` | `minStr`, `maxStr` |
| `screens/settings/categories/components/add_edit_category_sheet.tsx` | `add_edit_category_sheet.state.ts` | `type`, `selectedIcon`, `selectedColor`, `iconError`, `isLoading` |
| `screens/settings/categories/components/reassign_category_sheet.tsx` | `reassign_category_sheet.state.ts` | `selectedId`, `isLoading` |
| `screens/accounts/detail/components/adjust_balance_sheet.tsx` | `adjust_balance_sheet.state.ts` | `input`, `error` |

Note: `add_edit_category_sheet.state.ts` straddles the rule — `type`, `selectedIcon`, `selectedColor` are technically form draft data. They live in `.state.ts` because the sheet is component-local and resets on each open; promoting them to a `.store.ts` would imply persistence across mounts, which is not the intended behaviour. The state file represents the sheet's mounted form draft. (`isLoading` and `iconError` are unambiguously UI.)

The same logic applies to `reassign_category_sheet.state.ts` (`selectedId`) and `adjust_balance_sheet.state.ts` (`input`).

## Per-Instance Reset

Zustand stores are global. Modals/sheets must reset their state explicitly on close. Convention:

- Every `.state.ts` (and `.store.ts` that holds modal-scoped data) exports a `reset()` action.
- The parent hook (or component effect) calls `reset()` on close, and on open it sets initial values.
- For sheets that derive initial values from props (e.g. `adjust_balance_sheet` initialising `input` from `currentBalance`), the parent calls a `setInitial(value)` action when the sheet opens, instead of computing initials inside the store factory.

## Cross-Store Coordination

Where actions previously touched both data and UI in one Zustand action (e.g. `openAddSheet` setting `showAddSheet: true` AND clearing `editingCategory`), the orchestration moves to the hook:

```ts
// categories.hook.ts (sketch)
const openAddSheet = useCallback(() => {
  useCategoriesScreenStore.getState().clearEditingCategory();
  useCategoriesScreenState.getState().showAddSheet();
}, []);
```

Hooks become the orchestration layer; stores expose only pure setters.

## Tests

`__tests__/` covers logic only (per `CLAUDE.md`). Refactor scope for tests:

- Update any test that imports a renamed module path (e.g. `account_detail.store.ts` → `account_detail.state.ts`).
- Update any test that imports a split store and references a state property that has moved to the new state store.
- Do not write new tests for state moves — they are mechanical.
- Existing coverage thresholds (80% lines / 95% functions / 100% branches) must continue to pass.

## CLAUDE.md Update

Update the `screens/` anatomy section:

> Each folder: `index.tsx` (UI, no useState/useSharedValue) · `<name>.hook.ts` (logic, RHF/Zod, nav, no useState) · `<name>.store.ts` (data: form drafts, selections, fetched results — omit if none) · `<name>.state.ts` (UI state: visibility, loading, errors, tab selection — omit if none) · `<name>.anim.ts` (Reanimated only) · `components/` (per-component `.state.ts` lives next to its `.tsx` when the component had local state)

## Out of Scope

- Global stores under `/store/*.store.ts` (account, category, currency, onboarding, ready, transaction). They are domain data stores, already correctly named, and not subject to this split.
- Anim files (`.anim.ts`) — `useSharedValue` is a Reanimated requirement and stays.
- New features. This is a pure refactor; behaviour is preserved.

## Acceptance Criteria

1. No file under `screens/**` outside of `.anim.ts` calls `useState`.
2. Every `.store.ts` under `screens/**` contains only data per the classification table.
3. Every `.state.ts` under `screens/**` contains only UI state per the classification table.
4. All existing screens/flows behave identically — manual smoke test of: onboarding (O1–O6), dashboard, accounts (list/detail/adjust/archive), transactions (list/filter/add/edit/detail), settings (categories CRUD, currency).
5. `npm run test:coverage` passes thresholds.
6. `CLAUDE.md` updated.
