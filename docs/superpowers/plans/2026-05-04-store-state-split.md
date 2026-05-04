# Store / State Split Refactor — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split every screen-level Zustand store into two buckets — `.store.ts` (data) and `.state.ts` (UI state) — and replace every remaining `useState` under `screens/**` (excluding `.anim.ts`) with a `.state.ts` store next to the consuming file.

**Architecture:** Existing pattern stays — Zustand stores created with `create<T>()` (or factory `createXxxStore()` where currently used). Screens that own only data keep a single `.store.ts`. Screens that own only UI flags get a single `.state.ts`. Mixed screens get both. Composite "open the sheet AND clear the editing entity" actions move from store actions into the hook (orchestration layer).

**Tech Stack:** TypeScript, Zustand v5, Jest (`ts-jest`), Expo Router, RHF v7 + Zod v4.

**Spec:** `docs/superpowers/specs/2026-05-04-store-state-split-design.md`

**Branch:** `refactor/store-state-split` (already created; spec already committed).

---

## Naming and File Conventions

- Hooks for data stores: `useXxxStore`. Hooks for UI state stores: `useXxxState`. (Exception: keep current names `useTransactionsScreenStore`, `useCategoriesScreenStore`, `useFilterDrawerStore` etc. — pair them with `useXxxScreenState` / `useXxxDrawerState`.)
- State/store files always sit next to the file they serve (screen folder root for screen-level, component folder for component-level).
- For Zustand factory pattern: only `account_detail` and `settings/currency` currently use `createXxxStore()` — preserve that pattern in their renamed `.state.ts`. Everything else uses the plain `create<T>()` singleton style.
- File names: `snake_case`. Keep TS identifiers in `camelCase`.

---

## Test Strategy

This is a pure refactor — no behaviour change. For each step:

1. **Existing test stays green** by either updating its imports/setup to point at the new module, or by splitting it into two test files when its store splits.
2. **New `.state.ts` and `.store.ts` files added by this refactor** require their own tiny store tests (initial state + each setter + reset) to keep coverage thresholds satisfied (80% lines / 95% functions / 100% branches).
3. **Hooks and components** are not unit tested in this codebase except where they already are (`add_transaction_rate_override.test.ts`). Don't add hook tests as part of this refactor.

Verification command, run after each task: `npm run test:coverage`. Use `npx jest <pathPattern>` for fast loops while iterating.

---

## Return Shape Convention (applies to EVERY task)

All Zustand stores in this refactor (`.store.ts` and `.state.ts`) and all screen hooks follow a strict convention: **values live under a single `state` object; actions stay flat.** This applies even where the literal code blocks below show a flat shape — **the convention overrides individual code blocks**. Task 1 is shown fully converted as the canonical example; apply the same transformation everywhere.

### Store / state file shape

Interface:

```ts
interface XStore {
  state: {
    field1: T1;
    field2: T2;
  };
  setField1: (v: T1) => void;
  setField2: (v: T2) => void;
  reset: () => void;
}
```

Implementation:

```ts
const INITIAL_STATE = {
  field1: defaultValue1,
  field2: defaultValue2,
};

export const useXStore = create<XStore>((set) => ({
  state: INITIAL_STATE,
  setField1: (v) => set((s) => ({ state: { ...s.state, field1: v } })),
  setField2: (v) => set((s) => ({ state: { ...s.state, field2: v } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

Compound actions update multiple fields with `set((s) => ({ state: { ...s.state, a, b } }))`. Factory functions (`createXxxState()` for `account_detail` and `settings/currency`) apply the same shape inside the factory.

### Test access patterns

Reads:

```ts
expect(useXStore.getState().state.field1).toBe(defaultValue1);
```

Seeding multiple fields for a test fixture — call the actions, or replace the state object explicitly:

```ts
useXStore.setState({ state: { ...useXStore.getState().state, field1: a, field2: b } });
```

Never write `useXStore.setState({ field1: a })` — that breaks the wrap.

### Hook selectors

Replace `useXStore((s) => s.field)` with `useXStore((s) => s.state.field)`. Actions stay flat: `useXStore((s) => s.setField)`.

### Hook return shape

```ts
return {
  state: {
    /* every reactive value (from stores + derived) */
  },
  /* every action / handler / navigator, flat */
};
```

Consumers destructure as `const { state, action1, action2 } = useXxx();` and access values via `state.field`.

### What this convention does NOT touch

- Global stores under `/store/*.store.ts` (account, category, currency, transaction, onboarding, ready) keep their existing flat shape — out of scope per spec.
- Action signatures (parameter lists) are unchanged.
- File names, the data/UI bucket split, and import paths are exactly as the spec describes.

---

## File Inventory

| Phase | File(s) Touched | Action |
|---|---|---|
| 1 | `screens/accounts/detail/account_detail.{store,hook}.ts`, `__tests__/account_detail.store.test.ts` | Rename store→state, absorb 3 hook flags |
| 2 | `screens/settings/currency/currency.{store,hook}.ts` | Rename store→state, absorb 2 hook flags |
| 3 | `screens/onboarding/ready/ready.{store,hook}.ts` | Rename store→state |
| 4 | `screens/transactions/filter/filter.{store,hook}.ts`, `__tests__/filter_store.test.ts` | Split mixed store → store + state |
| 5 | `screens/transactions/transaction_form/add_transaction.{store,hook}.ts`, `__tests__/add_transaction.store.test.ts` | Split mixed store |
| 6 | `screens/transactions/transaction_form/edit_transaction.{store,hook}.ts`, `__tests__/edit_transaction.store.test.ts` | Split mixed store |
| 7 | `screens/settings/categories/categories.{store,hook}.ts` | Split mixed store, move composite actions to hook |
| 8 | `screens/dashboard/dashboard.{hook}.ts` (+ new `dashboard.state.ts` + `dashboard.store.ts`) | Replace `useState` |
| 9 | `screens/transactions/detail/detail.{hook}.ts` (+ new state + store) | Replace `useState` |
| 10 | `screens/transactions/transaction_form/transaction_form_body.tsx` (+ new `.state.ts`) | Replace `useState` |
| 11 | `screens/transactions/filter/components/filter_date_custom_picker.tsx` (+ new `.state.ts`) | Replace `useState` |
| 12 | `screens/transactions/filter/components/filter_amount_section.tsx` (+ new `.state.ts`) | Replace `useState` |
| 13 | `screens/settings/categories/components/add_edit_category_sheet.tsx` (+ new `.state.ts`) | Replace `useState` |
| 14 | `screens/settings/categories/components/reassign_category_sheet.tsx` (+ new `.state.ts`) | Replace `useState` |
| 15 | `screens/accounts/detail/components/adjust_balance_sheet.tsx` (+ new `.state.ts`) | Replace `useState` |
| 16 | `CLAUDE.md` | Document the convention |
| 17 | All | Final verification: full test run, manual smoke test |

---

## Phase 1: Pure Renames

### Task 1: `account_detail.store.ts` → `account_detail.state.ts` (absorb 3 hook flags)

**Files:**
- Rename: `screens/accounts/detail/account_detail.store.ts` → `screens/accounts/detail/account_detail.state.ts`
- Modify: `screens/accounts/detail/account_detail.hook.ts`
- Modify: `__tests__/account_detail.store.test.ts` → `__tests__/account_detail.state.test.ts`

- [ ] **Step 1: Move and rewrite the file**

`git mv` the file and replace contents:

```bash
git mv screens/accounts/detail/account_detail.store.ts screens/accounts/detail/account_detail.state.ts
```

Then write `screens/accounts/detail/account_detail.state.ts`:

```ts
import { create } from 'zustand';

interface AccountDetailStateShape {
  isEditing: boolean;
  isAdjustVisible: boolean;
  isArchiveVisible: boolean;
  isSaving: boolean;
  isAdjusting: boolean;
  isArchiving: boolean;
}

interface AccountDetailState {
  state: AccountDetailStateShape;
  setEditing: (v: boolean) => void;
  setAdjustVisible: (v: boolean) => void;
  setArchiveVisible: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  setAdjusting: (v: boolean) => void;
  setArchiving: (v: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: AccountDetailStateShape = {
  isEditing: false,
  isAdjustVisible: false,
  isArchiveVisible: false,
  isSaving: false,
  isAdjusting: false,
  isArchiving: false,
};

export function createAccountDetailState() {
  return create<AccountDetailState>((set) => ({
    state: INITIAL_STATE,
    setEditing: (v) => set((s) => ({ state: { ...s.state, isEditing: v } })),
    setAdjustVisible: (v) => set((s) => ({ state: { ...s.state, isAdjustVisible: v } })),
    setArchiveVisible: (v) => set((s) => ({ state: { ...s.state, isArchiveVisible: v } })),
    setSaving: (v) => set((s) => ({ state: { ...s.state, isSaving: v } })),
    setAdjusting: (v) => set((s) => ({ state: { ...s.state, isAdjusting: v } })),
    setArchiving: (v) => set((s) => ({ state: { ...s.state, isArchiving: v } })),
    reset: () => set({ state: INITIAL_STATE }),
  }));
}

export const useAccountDetailState = createAccountDetailState();
```

- [ ] **Step 2: Update the hook**

Rewrite `screens/accounts/detail/account_detail.hook.ts`:

```ts
import { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { z } from 'zod';

import { AccountColors } from '@/constants/theme';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { useAccountDetailState } from './account_detail.state';

export function useAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const accounts = useAccountStore((s) => s.accounts);
  const updateAccount = useAccountStore((s) => s.updateAccount);
  const archiveAccount = useAccountStore((s) => s.archiveAccount);
  const adjustBalance = useAccountStore((s) => s.adjustBalance);

  const detailState = useAccountDetailState((s) => s.state);
  const setEditing = useAccountDetailState((s) => s.setEditing);
  const setAdjustVisible = useAccountDetailState((s) => s.setAdjustVisible);
  const setArchiveVisible = useAccountDetailState((s) => s.setArchiveVisible);
  const setSaving = useAccountDetailState((s) => s.setSaving);
  const setAdjusting = useAccountDetailState((s) => s.setAdjusting);
  const setArchiving = useAccountDetailState((s) => s.setArchiving);
  const reset = useAccountDetailState((s) => s.reset);

  useEffect(() => () => reset(), []);

  const account = accounts.find((a) => a.id === id);

  const editSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, Strings.errNameRequired)
          .max(30, Strings.errNameTooLong)
          .refine(
            (n) =>
              !accounts.some(
                (a) => a.id !== id && a.name.trim().toLowerCase() === n.trim().toLowerCase(),
              ),
            { message: Strings.errNameDuplicate },
          ),
        color: z.string(),
      }),
    [accounts, id],
  );

  const form = useZodForm(editSchema, {
    defaultValues: {
      name: account?.name ?? '',
      color: account?.color ?? AccountColors[0],
    },
  });

  useEffect(() => {
    if (account) {
      form.reset({ name: account.name, color: account.color ?? AccountColors[0] });
    }
  }, [account, form]);

  const handleSave = form.handleSubmit(async (data) => {
    if (!id) return;
    setSaving(true);
    try {
      await updateAccount(id, { name: data.name.trim(), color: data.color });
      setEditing(false);
    } finally {
      setSaving(false);
    }
  });

  const handleAdjustBalance = async (newBalance: number) => {
    if (!id) return;
    setAdjusting(true);
    try {
      await adjustBalance(id, newBalance);
      setAdjustVisible(false);
    } finally {
      setAdjusting(false);
    }
  };

  const handleArchive = async () => {
    if (!id) return;
    setArchiving(true);
    try {
      await archiveAccount(id);
      setArchiveVisible(false);
      router.back();
    } finally {
      setArchiving(false);
    }
  };

  const onBack = () => router.back();

  return {
    state: {
      account,
      isEditing: detailState.isEditing,
      isAdjustVisible: detailState.isAdjustVisible,
      isArchiveVisible: detailState.isArchiveVisible,
      isSaving: detailState.isSaving,
      isAdjusting: detailState.isAdjusting,
      isArchiving: detailState.isArchiving,
    },
    form,
    setEditing,
    handleSave,
    setAdjustVisible,
    handleAdjustBalance,
    setArchiveVisible,
    handleArchive,
    onBack,
  };
}
```

Consumers of this hook (e.g. `screens/accounts/detail/index.tsx`) currently destructure `account, isEditing, ...` flat. Update each one to destructure `state` and read fields off it: `const { state, setEditing, handleSave, ... } = useAccountDetail();` then `state.account`, `state.isEditing`, etc. Run `grep -rn "useAccountDetail" screens app` to find every call site.

- [ ] **Step 3: Update and rename the test file**

```bash
git mv __tests__/account_detail.store.test.ts __tests__/account_detail.state.test.ts
```

Replace contents of `__tests__/account_detail.state.test.ts`:

```ts
import { createAccountDetailState } from '@/screens/accounts/detail/account_detail.state';

jest.mock('zustand', () => ({ create: jest.requireActual('zustand').create }));

describe('accountDetailState initial state', () => {
  it('starts with all booleans false', () => {
    const store = createAccountDetailState();
    const s = store.getState().state;
    expect(s.isEditing).toBe(false);
    expect(s.isAdjustVisible).toBe(false);
    expect(s.isArchiveVisible).toBe(false);
    expect(s.isSaving).toBe(false);
    expect(s.isAdjusting).toBe(false);
    expect(s.isArchiving).toBe(false);
  });
});

describe('accountDetailState setters', () => {
  it('setEditing toggles', () => {
    const store = createAccountDetailState();
    store.getState().setEditing(true);
    expect(store.getState().state.isEditing).toBe(true);
    store.getState().setEditing(false);
    expect(store.getState().state.isEditing).toBe(false);
  });

  it('setAdjustVisible toggles', () => {
    const store = createAccountDetailState();
    store.getState().setAdjustVisible(true);
    expect(store.getState().state.isAdjustVisible).toBe(true);
    store.getState().setAdjustVisible(false);
    expect(store.getState().state.isAdjustVisible).toBe(false);
  });

  it('setArchiveVisible toggles', () => {
    const store = createAccountDetailState();
    store.getState().setArchiveVisible(true);
    expect(store.getState().state.isArchiveVisible).toBe(true);
  });

  it('setSaving toggles', () => {
    const store = createAccountDetailState();
    store.getState().setSaving(true);
    expect(store.getState().state.isSaving).toBe(true);
    store.getState().setSaving(false);
    expect(store.getState().state.isSaving).toBe(false);
  });

  it('setAdjusting toggles', () => {
    const store = createAccountDetailState();
    store.getState().setAdjusting(true);
    expect(store.getState().state.isAdjusting).toBe(true);
    store.getState().setAdjusting(false);
    expect(store.getState().state.isAdjusting).toBe(false);
  });

  it('setArchiving toggles', () => {
    const store = createAccountDetailState();
    store.getState().setArchiving(true);
    expect(store.getState().state.isArchiving).toBe(true);
    store.getState().setArchiving(false);
    expect(store.getState().state.isArchiving).toBe(false);
  });
});

describe('accountDetailState reset', () => {
  it('resets every flag to false', () => {
    const store = createAccountDetailState();
    store.getState().setEditing(true);
    store.getState().setAdjustVisible(true);
    store.getState().setArchiveVisible(true);
    store.getState().setSaving(true);
    store.getState().setAdjusting(true);
    store.getState().setArchiving(true);
    store.getState().reset();
    const s = store.getState().state;
    expect(s.isEditing).toBe(false);
    expect(s.isAdjustVisible).toBe(false);
    expect(s.isArchiveVisible).toBe(false);
    expect(s.isSaving).toBe(false);
    expect(s.isAdjusting).toBe(false);
    expect(s.isArchiving).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/account_detail.state.test.ts -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add screens/accounts/detail/account_detail.state.ts screens/accounts/detail/account_detail.hook.ts __tests__/account_detail.state.test.ts
git commit -m "refactor(account_detail): rename store to state, absorb hook useState flags"
```

---

### Task 2: `settings/currency/currency.store.ts` → `currency.state.ts` (absorb 2 hook flags)

**Files:**
- Rename: `screens/settings/currency/currency.store.ts` → `screens/settings/currency/currency.state.ts`
- Modify: `screens/settings/currency/currency.hook.ts`
- Create: `__tests__/settings_currency.state.test.ts`

- [ ] **Step 1: Move and rewrite the file**

```bash
git mv screens/settings/currency/currency.store.ts screens/settings/currency/currency.state.ts
```

Write `screens/settings/currency/currency.state.ts`:

```ts
import { create } from 'zustand';

interface CurrencyScreenState {
  isManualPanelOpen: boolean;
  isFetching: boolean;
  isSaving: boolean;
  setManualPanelOpen: (v: boolean) => void;
  setFetching: (v: boolean) => void;
  setSaving: (v: boolean) => void;
  reset: () => void;
}

const INITIAL = {
  isManualPanelOpen: false,
  isFetching: false,
  isSaving: false,
};

export function createCurrencyScreenState() {
  return create<CurrencyScreenState>((set) => ({
    ...INITIAL,
    setManualPanelOpen: (v) => set({ isManualPanelOpen: v }),
    setFetching: (v) => set({ isFetching: v }),
    setSaving: (v) => set({ isSaving: v }),
    reset: () => set(INITIAL),
  }));
}

export const useCurrencyScreenState = createCurrencyScreenState();
```

- [ ] **Step 2: Update the hook**

Rewrite `screens/settings/currency/currency.hook.ts`:

```ts
import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { z } from 'zod';

import { Strings } from '@/constants/strings';
import { useCurrencyStore } from '@/store/currency.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { useCurrencyScreenState } from './currency.state';

export function useCurrencyScreen() {
  const router = useRouter();
  const rate = useCurrencyStore((s) => s.rate);
  const lastFetched = useCurrencyStore((s) => s.lastFetched);
  const isManualOverride = useCurrencyStore((s) => s.isManualOverride);
  const fetchRate = useCurrencyStore((s) => s.fetchRate);
  const setManualRate = useCurrencyStore((s) => s.setManualRate);

  const isManualPanelOpen = useCurrencyScreenState((s) => s.isManualPanelOpen);
  const setManualPanelOpen = useCurrencyScreenState((s) => s.setManualPanelOpen);
  const isFetching = useCurrencyScreenState((s) => s.isFetching);
  const setFetching = useCurrencyScreenState((s) => s.setFetching);
  const isSaving = useCurrencyScreenState((s) => s.isSaving);
  const setSaving = useCurrencyScreenState((s) => s.setSaving);
  const resetState = useCurrencyScreenState((s) => s.reset);

  useEffect(() => () => resetState(), []);

  const manualSchema = z.object({
    rate: z.string().refine(
      (v) => {
        const n = parseFloat(v);
        return Number.isFinite(n) && n > 0;
      },
      { message: Strings.errBalanceInvalid },
    ),
  });

  const form = useZodForm(manualSchema, {
    defaultValues: { rate: String(rate) },
  });

  const handleFetchRate = async () => {
    setFetching(true);
    try {
      await fetchRate();
    } finally {
      setFetching(false);
    }
  };

  const handleSaveManualRate = form.handleSubmit(async (data) => {
    setSaving(true);
    try {
      await setManualRate(parseFloat(data.rate));
      setManualPanelOpen(false);
    } finally {
      setSaving(false);
    }
  });

  const goBack = () => router.back();

  return {
    rate,
    lastFetched,
    isManualOverride,
    isManualPanelOpen,
    setManualPanelOpen,
    form,
    handleFetchRate,
    isFetching,
    handleSaveManualRate,
    isSaving,
    goBack,
  };
}
```

- [ ] **Step 3: Create the test file**

Create `__tests__/settings_currency.state.test.ts`:

```ts
import { createCurrencyScreenState } from '@/screens/settings/currency/currency.state';

jest.mock('zustand', () => ({ create: jest.requireActual('zustand').create }));

describe('currencyScreenState initial state', () => {
  it('starts with all flags false', () => {
    const store = createCurrencyScreenState();
    const s = store.getState();
    expect(s.isManualPanelOpen).toBe(false);
    expect(s.isFetching).toBe(false);
    expect(s.isSaving).toBe(false);
  });
});

describe('currencyScreenState setters', () => {
  it('setManualPanelOpen toggles', () => {
    const store = createCurrencyScreenState();
    store.getState().setManualPanelOpen(true);
    expect(store.getState().isManualPanelOpen).toBe(true);
    store.getState().setManualPanelOpen(false);
    expect(store.getState().isManualPanelOpen).toBe(false);
  });

  it('setFetching toggles', () => {
    const store = createCurrencyScreenState();
    store.getState().setFetching(true);
    expect(store.getState().isFetching).toBe(true);
    store.getState().setFetching(false);
    expect(store.getState().isFetching).toBe(false);
  });

  it('setSaving toggles', () => {
    const store = createCurrencyScreenState();
    store.getState().setSaving(true);
    expect(store.getState().isSaving).toBe(true);
    store.getState().setSaving(false);
    expect(store.getState().isSaving).toBe(false);
  });
});

describe('currencyScreenState reset', () => {
  it('clears every flag', () => {
    const store = createCurrencyScreenState();
    store.getState().setManualPanelOpen(true);
    store.getState().setFetching(true);
    store.getState().setSaving(true);
    store.getState().reset();
    const s = store.getState();
    expect(s.isManualPanelOpen).toBe(false);
    expect(s.isFetching).toBe(false);
    expect(s.isSaving).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/settings_currency.state.test.ts -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add screens/settings/currency/currency.state.ts screens/settings/currency/currency.hook.ts __tests__/settings_currency.state.test.ts
git commit -m "refactor(settings/currency): rename store to state, absorb hook useState flags"
```

---

### Task 3: `onboarding/ready/ready.store.ts` → `ready.state.ts`

**Files:**
- Rename: `screens/onboarding/ready/ready.store.ts` → `screens/onboarding/ready/ready.state.ts`
- Modify: `screens/onboarding/ready/ready.hook.ts`
- Create: `__tests__/ready.state.test.ts`

- [ ] **Step 1: Move and rewrite the file**

```bash
git mv screens/onboarding/ready/ready.store.ts screens/onboarding/ready/ready.state.ts
```

Write `screens/onboarding/ready/ready.state.ts`:

```ts
import { create } from 'zustand';

interface ReadyState {
  completing: boolean;
  setCompleting: (completing: boolean) => void;
  reset: () => void;
}

export const useReadyState = create<ReadyState>((set) => ({
  completing: false,
  setCompleting: (completing) => set({ completing }),
  reset: () => set({ completing: false }),
}));
```

- [ ] **Step 2: Update the hook**

In `screens/onboarding/ready/ready.hook.ts` change:

```ts
import { useReadyStore } from './ready.store';
```

to:

```ts
import { useReadyState } from './ready.state';
```

Then replace the two usages of `useReadyStore` with `useReadyState`:

```ts
const completing = useReadyState((s) => s.completing);
const setCompleting = useReadyState((s) => s.setCompleting);
```

- [ ] **Step 3: Create the test file**

Create `__tests__/ready.state.test.ts`:

```ts
import { useReadyState } from '@/screens/onboarding/ready/ready.state';

beforeEach(() => useReadyState.getState().reset());

describe('readyState', () => {
  it('starts with completing=false', () => {
    expect(useReadyState.getState().completing).toBe(false);
  });

  it('setCompleting toggles', () => {
    useReadyState.getState().setCompleting(true);
    expect(useReadyState.getState().completing).toBe(true);
    useReadyState.getState().setCompleting(false);
    expect(useReadyState.getState().completing).toBe(false);
  });

  it('reset clears completing', () => {
    useReadyState.getState().setCompleting(true);
    useReadyState.getState().reset();
    expect(useReadyState.getState().completing).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/ready.state.test.ts -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add screens/onboarding/ready/ready.state.ts screens/onboarding/ready/ready.hook.ts __tests__/ready.state.test.ts
git commit -m "refactor(onboarding/ready): rename store to state"
```

---

## Phase 2: Mixed-Store Splits

### Task 4: Split `transactions/filter/filter.store.ts`

**Files:**
- Modify: `screens/transactions/filter/filter.store.ts` (keep data only)
- Create: `screens/transactions/filter/filter.state.ts` (UI only)
- Modify: `screens/transactions/filter/filter.hook.ts`
- Modify: `screens/transactions/transactions.hook.ts`
- Modify: `__tests__/filter_store.test.ts` (keep data tests)
- Create: `__tests__/filter_drawer.state.test.ts` (UI tests)

- [ ] **Step 1: Rewrite `filter.store.ts` to data only**

```ts
import { create } from 'zustand';

import { Currency, DatePreset } from '@/constants/enums';

export interface AdvancedFilters {
  accountIds: string[];
  categoryIds: string[];
  datePreset: DatePreset;
  customDateFrom?: string;
  customDateTo?: string;
  amountCurrency: Currency;
  amountMin?: number;
  amountMax?: number;
}

export const EMPTY_FILTERS: AdvancedFilters = {
  accountIds: [],
  categoryIds: [],
  datePreset: DatePreset.AllTime,
  amountCurrency: Currency.EGP,
};

interface FilterDrawerStore {
  draft: AdvancedFilters;
  setDraft: (next: AdvancedFilters) => void;
  resetDraft: () => void;
  toggleAccountId: (id: string) => void;
  toggleCategoryId: (id: string) => void;
  setDatePreset: (p: DatePreset) => void;
  setCustomDateRange: (from?: string, to?: string) => void;
  setAmountMin: (v?: number) => void;
  setAmountMax: (v?: number) => void;
  setAmountCurrency: (c: Currency) => void;
}

export const useFilterDrawerStore = create<FilterDrawerStore>((set) => ({
  draft: EMPTY_FILTERS,

  setDraft: (next) => set({ draft: next }),
  resetDraft: () => set({ draft: EMPTY_FILTERS }),

  toggleAccountId: (id) =>
    set((s) => ({
      draft: {
        ...s.draft,
        accountIds: s.draft.accountIds.includes(id)
          ? s.draft.accountIds.filter((x) => x !== id)
          : [...s.draft.accountIds, id],
      },
    })),

  toggleCategoryId: (id) =>
    set((s) => ({
      draft: {
        ...s.draft,
        categoryIds: s.draft.categoryIds.includes(id)
          ? s.draft.categoryIds.filter((x) => x !== id)
          : [...s.draft.categoryIds, id],
      },
    })),

  setDatePreset: (p) => set((s) => ({ draft: { ...s.draft, datePreset: p } })),

  setCustomDateRange: (from, to) =>
    set((s) => ({
      draft: {
        ...s.draft,
        customDateFrom: from,
        customDateTo: to,
        datePreset: DatePreset.Custom,
      },
    })),

  setAmountMin: (v) => set((s) => ({ draft: { ...s.draft, amountMin: v } })),
  setAmountMax: (v) => set((s) => ({ draft: { ...s.draft, amountMax: v } })),
  setAmountCurrency: (c) => set((s) => ({ draft: { ...s.draft, amountCurrency: c } })),
}));
```

- [ ] **Step 2: Create `filter.state.ts`**

Create `screens/transactions/filter/filter.state.ts`:

```ts
import { create } from 'zustand';

interface FilterDrawerState {
  visible: boolean;
  accountPickerVisible: boolean;
  categoryPickerVisible: boolean;
  customDatePickerVisible: boolean;
  open: () => void;
  close: () => void;
  setAccountPickerVisible: (v: boolean) => void;
  setCategoryPickerVisible: (v: boolean) => void;
  setCustomDatePickerVisible: (v: boolean) => void;
  reset: () => void;
}

const INITIAL = {
  visible: false,
  accountPickerVisible: false,
  categoryPickerVisible: false,
  customDatePickerVisible: false,
};

export const useFilterDrawerState = create<FilterDrawerState>((set) => ({
  ...INITIAL,
  open: () => set({ visible: true }),
  close: () => set(INITIAL),
  setAccountPickerVisible: (v) => set({ accountPickerVisible: v }),
  setCategoryPickerVisible: (v) => set({ categoryPickerVisible: v }),
  setCustomDatePickerVisible: (v) => set({ customDatePickerVisible: v }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 3: Update `filter.hook.ts`**

Rewrite `screens/transactions/filter/filter.hook.ts`:

```ts
import { useMemo } from 'react';

import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionsScreenStore } from '../transactions.store';
import { countActiveFilters, formatSelectionSummary } from './filter.helpers';
import { useFilterDrawerStore } from './filter.store';
import { useFilterDrawerState } from './filter.state';

/**
 * Orchestrates the filter drawer. Visibility lives in `useFilterDrawerState`
 * (UI), draft data in `useFilterDrawerStore` (data). The hook composes the two.
 */
export function useFilterDrawer() {
  // UI state
  const visible = useFilterDrawerState((s) => s.visible);
  const accountPickerVisible = useFilterDrawerState((s) => s.accountPickerVisible);
  const categoryPickerVisible = useFilterDrawerState((s) => s.categoryPickerVisible);
  const customDatePickerVisible = useFilterDrawerState((s) => s.customDatePickerVisible);
  const closeUi = useFilterDrawerState((s) => s.close);
  const setAccountPickerVisible = useFilterDrawerState((s) => s.setAccountPickerVisible);
  const setCategoryPickerVisible = useFilterDrawerState((s) => s.setCategoryPickerVisible);
  const setCustomDatePickerVisible = useFilterDrawerState((s) => s.setCustomDatePickerVisible);

  // Data
  const draft = useFilterDrawerStore((s) => s.draft);
  const resetDraft = useFilterDrawerStore((s) => s.resetDraft);
  const toggleAccountId = useFilterDrawerStore((s) => s.toggleAccountId);
  const toggleCategoryId = useFilterDrawerStore((s) => s.toggleCategoryId);
  const setDatePreset = useFilterDrawerStore((s) => s.setDatePreset);
  const setCustomDateRange = useFilterDrawerStore((s) => s.setCustomDateRange);
  const setAmountMin = useFilterDrawerStore((s) => s.setAmountMin);
  const setAmountMax = useFilterDrawerStore((s) => s.setAmountMax);
  const setAmountCurrency = useFilterDrawerStore((s) => s.setAmountCurrency);

  const allAccounts = useAccountStore((s) => s.accounts);
  const allCategories = useCategoryStore((s) => s.categories);

  const pickerAccounts = useMemo(
    () => allAccounts.filter((a) => a.is_archived === 0),
    [allAccounts],
  );
  const pickerCategories = allCategories;

  const setAppliedFilters = useTransactionsScreenStore((s) => s.setAppliedFilters);

  function applyDraft() {
    setAppliedFilters(draft);
    closeUi();
  }

  function close() {
    closeUi();
  }

  const selectedAccountSummary = useMemo(() => {
    const names = draft.accountIds
      .map((id) => allAccounts.find((a) => a.id === id)?.name)
      .filter((n): n is string => !!n);
    return formatSelectionSummary(names, Strings.filterAllAccounts);
  }, [draft.accountIds, allAccounts]);

  const selectedCategorySummary = useMemo(() => {
    const names = draft.categoryIds
      .map((id) => allCategories.find((c) => c.id === id)?.name)
      .filter((n): n is string => !!n);
    return formatSelectionSummary(names, Strings.filterAllCategories);
  }, [draft.categoryIds, allCategories]);

  const draftActiveCount = useMemo(() => countActiveFilters(draft), [draft]);

  return {
    visible,
    accountPickerVisible,
    categoryPickerVisible,
    customDatePickerVisible,

    draft,
    toggleAccountId,
    toggleCategoryId,
    setDatePreset,
    setCustomDateRange,
    setAmountMin,
    setAmountMax,
    setAmountCurrency,
    setAccountPickerVisible,
    setCategoryPickerVisible,
    setCustomDatePickerVisible,

    close,
    resetDraft,
    applyDraft,

    pickerAccounts,
    pickerCategories,

    selectedAccountSummary,
    selectedCategorySummary,
    draftActiveCount,
  };
}
```

- [ ] **Step 4: Update `transactions.hook.ts` to compose open**

In `screens/transactions/transactions.hook.ts`, replace:

```ts
import { useFilterDrawerStore } from './filter/filter.store';
```

with:

```ts
import { useFilterDrawerStore } from './filter/filter.store';
import { useFilterDrawerState } from './filter/filter.state';
```

Replace:

```ts
const openDrawer = useFilterDrawerStore((s) => s.open);
```

with:

```ts
const openDrawerUi = useFilterDrawerState((s) => s.open);
const setDraft = useFilterDrawerStore((s) => s.setDraft);
```

Replace `openFilter`:

```ts
function openFilter() {
  setDraft(appliedFilters);
  openDrawerUi();
}
```

- [ ] **Step 5: Update `filter_store.test.ts` (data tests only)**

Replace `__tests__/filter_store.test.ts` with:

```ts
import { Currency, DatePreset } from '@/constants/enums';
import { EMPTY_FILTERS, useFilterDrawerStore } from '@/screens/transactions/filter/filter.store';

beforeEach(() => {
  useFilterDrawerStore.setState({ draft: EMPTY_FILTERS });
});

describe('useFilterDrawerStore — initial state', () => {
  it('initial draft is EMPTY_FILTERS', () => {
    expect(useFilterDrawerStore.getState().draft).toEqual(EMPTY_FILTERS);
  });
});

describe('useFilterDrawerStore — draft setters', () => {
  it('setDraft replaces the draft', () => {
    const next = { ...EMPTY_FILTERS, accountIds: ['a', 'b'] };
    useFilterDrawerStore.getState().setDraft(next);
    expect(useFilterDrawerStore.getState().draft).toEqual(next);
  });

  it('resetDraft clears draft to EMPTY_FILTERS', () => {
    useFilterDrawerStore.setState({
      draft: { ...EMPTY_FILTERS, accountIds: ['x'], amountMin: 100 },
    });
    useFilterDrawerStore.getState().resetDraft();
    expect(useFilterDrawerStore.getState().draft).toEqual(EMPTY_FILTERS);
  });

  it('toggleAccountId adds when missing', () => {
    useFilterDrawerStore.getState().toggleAccountId('a');
    expect(useFilterDrawerStore.getState().draft.accountIds).toEqual(['a']);
  });

  it('toggleAccountId removes when present', () => {
    useFilterDrawerStore.setState({
      draft: { ...EMPTY_FILTERS, accountIds: ['a', 'b'] },
    });
    useFilterDrawerStore.getState().toggleAccountId('a');
    expect(useFilterDrawerStore.getState().draft.accountIds).toEqual(['b']);
  });

  it('toggleCategoryId adds and removes', () => {
    useFilterDrawerStore.getState().toggleCategoryId('c');
    expect(useFilterDrawerStore.getState().draft.categoryIds).toEqual(['c']);
    useFilterDrawerStore.getState().toggleCategoryId('c');
    expect(useFilterDrawerStore.getState().draft.categoryIds).toEqual([]);
  });

  it('setDatePreset updates only the preset, preserving custom dates', () => {
    useFilterDrawerStore.setState({
      draft: {
        ...EMPTY_FILTERS,
        datePreset: DatePreset.Custom,
        customDateFrom: '2026-01-01',
        customDateTo: '2026-01-31',
      },
    });
    useFilterDrawerStore.getState().setDatePreset(DatePreset.ThisMonth);
    const d = useFilterDrawerStore.getState().draft;
    expect(d.datePreset).toBe(DatePreset.ThisMonth);
    expect(d.customDateFrom).toBe('2026-01-01');
    expect(d.customDateTo).toBe('2026-01-31');
  });

  it('setCustomDateRange writes both dates and forces preset to Custom', () => {
    useFilterDrawerStore.getState().setCustomDateRange('2026-02-01', '2026-02-28');
    const d = useFilterDrawerStore.getState().draft;
    expect(d.customDateFrom).toBe('2026-02-01');
    expect(d.customDateTo).toBe('2026-02-28');
    expect(d.datePreset).toBe(DatePreset.Custom);
  });

  it('setAmountMin and setAmountMax independently update', () => {
    useFilterDrawerStore.getState().setAmountMin(10);
    expect(useFilterDrawerStore.getState().draft.amountMin).toBe(10);
    useFilterDrawerStore.getState().setAmountMax(50);
    expect(useFilterDrawerStore.getState().draft.amountMax).toBe(50);
  });

  it('setAmountMin(undefined) clears the value', () => {
    useFilterDrawerStore.setState({ draft: { ...EMPTY_FILTERS, amountMin: 100 } });
    useFilterDrawerStore.getState().setAmountMin(undefined);
    expect(useFilterDrawerStore.getState().draft.amountMin).toBeUndefined();
  });

  it('setAmountCurrency switches the currency', () => {
    useFilterDrawerStore.getState().setAmountCurrency(Currency.USD);
    expect(useFilterDrawerStore.getState().draft.amountCurrency).toBe(Currency.USD);
  });
});
```

- [ ] **Step 6: Create `filter_drawer.state.test.ts`**

Create `__tests__/filter_drawer.state.test.ts`:

```ts
import { useFilterDrawerState } from '@/screens/transactions/filter/filter.state';

beforeEach(() => useFilterDrawerState.getState().reset());

describe('useFilterDrawerState — initial state', () => {
  it('starts invisible with all sub-pickers closed', () => {
    const s = useFilterDrawerState.getState();
    expect(s.visible).toBe(false);
    expect(s.accountPickerVisible).toBe(false);
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.customDatePickerVisible).toBe(false);
  });
});

describe('useFilterDrawerState — open / close', () => {
  it('open flips visible to true', () => {
    useFilterDrawerState.getState().open();
    expect(useFilterDrawerState.getState().visible).toBe(true);
  });

  it('close resets every flag', () => {
    useFilterDrawerState.setState({
      visible: true,
      accountPickerVisible: true,
      categoryPickerVisible: true,
      customDatePickerVisible: true,
    });
    useFilterDrawerState.getState().close();
    const s = useFilterDrawerState.getState();
    expect(s.visible).toBe(false);
    expect(s.accountPickerVisible).toBe(false);
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.customDatePickerVisible).toBe(false);
  });
});

describe('useFilterDrawerState — sub-picker setters', () => {
  it('setAccountPickerVisible toggles only that flag', () => {
    useFilterDrawerState.getState().setAccountPickerVisible(true);
    const s = useFilterDrawerState.getState();
    expect(s.accountPickerVisible).toBe(true);
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.customDatePickerVisible).toBe(false);
  });

  it('setCategoryPickerVisible and setCustomDatePickerVisible work independently', () => {
    useFilterDrawerState.getState().setCategoryPickerVisible(true);
    expect(useFilterDrawerState.getState().categoryPickerVisible).toBe(true);
    useFilterDrawerState.getState().setCustomDatePickerVisible(true);
    expect(useFilterDrawerState.getState().customDatePickerVisible).toBe(true);
  });
});

describe('useFilterDrawerState — reset', () => {
  it('resets every flag', () => {
    useFilterDrawerState.setState({
      visible: true,
      accountPickerVisible: true,
      categoryPickerVisible: true,
      customDatePickerVisible: true,
    });
    useFilterDrawerState.getState().reset();
    const s = useFilterDrawerState.getState();
    expect(s.visible).toBe(false);
    expect(s.accountPickerVisible).toBe(false);
    expect(s.categoryPickerVisible).toBe(false);
    expect(s.customDatePickerVisible).toBe(false);
  });
});
```

- [ ] **Step 7: Run tests**

Run: `npx jest __tests__/filter_store.test.ts __tests__/filter_drawer.state.test.ts -v`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add screens/transactions/filter/filter.store.ts screens/transactions/filter/filter.state.ts screens/transactions/filter/filter.hook.ts screens/transactions/transactions.hook.ts __tests__/filter_store.test.ts __tests__/filter_drawer.state.test.ts
git commit -m "refactor(filter): split mixed store into data store + UI state"
```

---

### Task 5: Split `add_transaction.store.ts`

**Files:**
- Modify: `screens/transactions/transaction_form/add_transaction.store.ts` (data only)
- Create: `screens/transactions/transaction_form/add_transaction.state.ts` (UI only)
- Modify: `screens/transactions/transaction_form/add_transaction.hook.ts`
- Modify: `__tests__/add_transaction.store.test.ts` (keep numpad/data tests; remove visibility tests covered by state)
- Create: `__tests__/add_transaction.state.test.ts`
- Modify: `__tests__/add_transaction_rate_override.test.ts` (use state for `open`/`close`)

- [ ] **Step 1: Rewrite `add_transaction.store.ts` to data only**

```ts
import { create } from 'zustand';

import { TransactionType } from '@/constants/enums';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface AddTransactionStore {
  type: TransactionType;
  amountStr: string;
  setType: (type: TransactionType) => void;
  handleNumpad: (action: NumpadAction, value?: string) => void;
  reset: () => void;
}

const INITIAL = {
  type: TransactionType.Expense,
  amountStr: '0',
};

export const useAddTransactionStore = create<AddTransactionStore>((set) => ({
  ...INITIAL,
  setType: (type) => set({ type, amountStr: '0' }),
  handleNumpad: (action, value) =>
    set((s) => {
      const prev = s.amountStr;
      if (action === 'backspace') return { amountStr: prev.length <= 1 ? '0' : prev.slice(0, -1) };
      if (action === 'decimal') return { amountStr: prev.includes('.') ? prev : prev + '.' };
      const digit = value ?? '';
      if (prev === '0') return { amountStr: digit === '0' ? '0' : digit };
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1].length >= 2) return {};
      }
      return { amountStr: prev + digit };
    }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 2: Create `add_transaction.state.ts`**

```ts
import { create } from 'zustand';

interface AddTransactionState {
  visible: boolean;
  saving: boolean;
  showAccountPicker: boolean;
  showToPicker: boolean;
  showCategoryPicker: boolean;
  rateOverride: boolean;
  open: () => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  setShowAccountPicker: (v: boolean) => void;
  setShowToPicker: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
}

const INITIAL = {
  visible: false,
  saving: false,
  showAccountPicker: false,
  showToPicker: false,
  showCategoryPicker: false,
  rateOverride: false,
};

export const useAddTransactionState = create<AddTransactionState>((set) => ({
  ...INITIAL,
  open: () => set({ visible: true }),
  close: () => set(INITIAL),
  setSaving: (saving) => set({ saving }),
  setShowAccountPicker: (v) => set({ showAccountPicker: v }),
  setShowToPicker: (v) => set({ showToPicker: v }),
  setShowCategoryPicker: (v) => set({ showCategoryPicker: v }),
  setRateOverride: (v) => set({ rateOverride: v }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 3: Update `add_transaction.hook.ts`**

In `screens/transactions/transaction_form/add_transaction.hook.ts`:

Replace:

```ts
import { useAddTransactionStore } from './add_transaction.store';
```

with:

```ts
import { useAddTransactionStore } from './add_transaction.store';
import { useAddTransactionState } from './add_transaction.state';
```

Replace the destructuring block:

```ts
const {
  type,
  amountStr,
  visible,
  saving,
  setSaving,
  showAccountPicker,
  setShowAccountPicker,
  showToPicker,
  setShowToPicker,
  showCategoryPicker,
  setShowCategoryPicker,
  setType,
  handleNumpad,
  rateOverride,
  setRateOverride,
} = useAddTransactionStore();
```

with:

```ts
const type = useAddTransactionStore((s) => s.type);
const amountStr = useAddTransactionStore((s) => s.amountStr);
const setType = useAddTransactionStore((s) => s.setType);
const handleNumpad = useAddTransactionStore((s) => s.handleNumpad);

const visible = useAddTransactionState((s) => s.visible);
const saving = useAddTransactionState((s) => s.saving);
const setSaving = useAddTransactionState((s) => s.setSaving);
const showAccountPicker = useAddTransactionState((s) => s.showAccountPicker);
const setShowAccountPicker = useAddTransactionState((s) => s.setShowAccountPicker);
const showToPicker = useAddTransactionState((s) => s.showToPicker);
const setShowToPicker = useAddTransactionState((s) => s.setShowToPicker);
const showCategoryPicker = useAddTransactionState((s) => s.showCategoryPicker);
const setShowCategoryPicker = useAddTransactionState((s) => s.setShowCategoryPicker);
const rateOverride = useAddTransactionState((s) => s.rateOverride);
const setRateOverride = useAddTransactionState((s) => s.setRateOverride);
```

- [ ] **Step 4: Find and update sheet open/close call sites**

Run: `grep -rn "useAddTransactionStore" screens app __tests__ 2>/dev/null`

For each occurrence calling `open()` or `close()`, change the import to use `useAddTransactionState` for those calls. Inside the codebase the call sites are:

- `screens/transactions/index.tsx` (or wherever the `+` button lives — confirm with grep)
- `screens/transactions/transaction_form/index.tsx` (sheet wrapper, if present)

Open + close currently lived on the data store. They now live on the state store. After this step, no file imports `open` / `close` / `visible` / `setSaving` / `setShow*Picker` from `useAddTransactionStore`.

For each file printed by the grep, update imports and call sites accordingly. Example for a fab/button that opens the sheet:

Replace:

```ts
import { useAddTransactionStore } from '@/screens/transactions/transaction_form/add_transaction.store';
// ...
const open = useAddTransactionStore((s) => s.open);
```

with:

```ts
import { useAddTransactionState } from '@/screens/transactions/transaction_form/add_transaction.state';
// ...
const open = useAddTransactionState((s) => s.open);
```

- [ ] **Step 5: Rewrite `add_transaction.store.test.ts` (data tests only)**

```ts
import { TransactionType } from '@/constants/enums';
import { useAddTransactionStore } from '@/screens/transactions/transaction_form/add_transaction.store';

beforeEach(() => useAddTransactionStore.getState().reset());

describe('useAddTransactionStore initial state', () => {
  it('starts with type=Expense and amountStr="0"', () => {
    const s = useAddTransactionStore.getState();
    expect(s.type).toBe(TransactionType.Expense);
    expect(s.amountStr).toBe('0');
  });
});

describe('useAddTransactionStore.setType', () => {
  it('sets the transaction type and resets amountStr to "0"', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().setType(TransactionType.Income);
    const s = useAddTransactionStore.getState();
    expect(s.type).toBe(TransactionType.Income);
    expect(s.amountStr).toBe('0');
  });
});

describe('useAddTransactionStore.handleNumpad', () => {
  it('digit replaces "0" with the digit (leading-zero guard)', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    expect(useAddTransactionStore.getState().amountStr).toBe('5');
  });

  it('pressing "0" when amountStr is "0" keeps it "0"', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '0');
    expect(useAddTransactionStore.getState().amountStr).toBe('0');
  });

  it('digit appends to a non-zero string', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('digit', '3');
    expect(useAddTransactionStore.getState().amountStr).toBe('53');
  });

  it('decimal appends "." when not already present', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('decimal');
    expect(useAddTransactionStore.getState().amountStr).toBe('5.');
  });

  it('decimal is a no-op when "." is already present', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('decimal');
    useAddTransactionStore.getState().handleNumpad('decimal');
    expect(useAddTransactionStore.getState().amountStr).toBe('5.');
  });

  it('backspace removes the last character', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('digit', '3');
    useAddTransactionStore.getState().handleNumpad('backspace');
    expect(useAddTransactionStore.getState().amountStr).toBe('5');
  });

  it('backspace on a single character resets to "0"', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('backspace');
    expect(useAddTransactionStore.getState().amountStr).toBe('0');
  });

  it('limits decimal digits to 2', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('decimal');
    useAddTransactionStore.getState().handleNumpad('digit', '1');
    useAddTransactionStore.getState().handleNumpad('digit', '2');
    useAddTransactionStore.getState().handleNumpad('digit', '3');
    expect(useAddTransactionStore.getState().amountStr).toBe('5.12');
  });

  it('digit action without value argument defaults to empty string', () => {
    useAddTransactionStore.getState().handleNumpad('digit', '5');
    useAddTransactionStore.getState().handleNumpad('digit');
    expect(useAddTransactionStore.getState().amountStr).toBe('5');
  });
});

describe('useAddTransactionStore.reset', () => {
  it('resets type and amountStr', () => {
    useAddTransactionStore.getState().setType(TransactionType.Transfer);
    useAddTransactionStore.getState().handleNumpad('digit', '7');
    useAddTransactionStore.getState().reset();
    const s = useAddTransactionStore.getState();
    expect(s.type).toBe(TransactionType.Expense);
    expect(s.amountStr).toBe('0');
  });
});
```

- [ ] **Step 6: Create `add_transaction.state.test.ts`**

```ts
import { useAddTransactionState } from '@/screens/transactions/transaction_form/add_transaction.state';

beforeEach(() => useAddTransactionState.getState().reset());

describe('useAddTransactionState initial state', () => {
  it('every flag starts false', () => {
    const s = useAddTransactionState.getState();
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.showAccountPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
    expect(s.rateOverride).toBe(false);
  });
});

describe('useAddTransactionState.open / close', () => {
  it('open sets visible=true', () => {
    useAddTransactionState.getState().open();
    expect(useAddTransactionState.getState().visible).toBe(true);
  });

  it('close resets every flag', () => {
    useAddTransactionState.setState({
      visible: true,
      saving: true,
      showAccountPicker: true,
      showToPicker: true,
      showCategoryPicker: true,
      rateOverride: true,
    });
    useAddTransactionState.getState().close();
    const s = useAddTransactionState.getState();
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.showAccountPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
    expect(s.rateOverride).toBe(false);
  });
});

describe('useAddTransactionState setters', () => {
  it('setSaving toggles saving', () => {
    useAddTransactionState.getState().setSaving(true);
    expect(useAddTransactionState.getState().saving).toBe(true);
    useAddTransactionState.getState().setSaving(false);
    expect(useAddTransactionState.getState().saving).toBe(false);
  });

  it('setShowAccountPicker toggles', () => {
    useAddTransactionState.getState().setShowAccountPicker(true);
    expect(useAddTransactionState.getState().showAccountPicker).toBe(true);
    useAddTransactionState.getState().setShowAccountPicker(false);
    expect(useAddTransactionState.getState().showAccountPicker).toBe(false);
  });

  it('setShowToPicker toggles', () => {
    useAddTransactionState.getState().setShowToPicker(true);
    expect(useAddTransactionState.getState().showToPicker).toBe(true);
    useAddTransactionState.getState().setShowToPicker(false);
    expect(useAddTransactionState.getState().showToPicker).toBe(false);
  });

  it('setShowCategoryPicker toggles', () => {
    useAddTransactionState.getState().setShowCategoryPicker(true);
    expect(useAddTransactionState.getState().showCategoryPicker).toBe(true);
    useAddTransactionState.getState().setShowCategoryPicker(false);
    expect(useAddTransactionState.getState().showCategoryPicker).toBe(false);
  });

  it('setRateOverride toggles', () => {
    useAddTransactionState.getState().setRateOverride(true);
    expect(useAddTransactionState.getState().rateOverride).toBe(true);
    useAddTransactionState.getState().setRateOverride(false);
    expect(useAddTransactionState.getState().rateOverride).toBe(false);
  });
});

describe('useAddTransactionState.reset', () => {
  it('clears every flag', () => {
    useAddTransactionState.setState({
      visible: true,
      saving: true,
      showAccountPicker: true,
      showToPicker: true,
      showCategoryPicker: true,
      rateOverride: true,
    });
    useAddTransactionState.getState().reset();
    const s = useAddTransactionState.getState();
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.showAccountPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
    expect(s.rateOverride).toBe(false);
  });
});
```

- [ ] **Step 7: Update `add_transaction_rate_override.test.ts`**

In `__tests__/add_transaction_rate_override.test.ts`:

Replace the import line:

```ts
import { useAddTransactionStore } from '@/screens/transactions/transaction_form/add_transaction.store';
```

with:

```ts
import { useAddTransactionStore } from '@/screens/transactions/transaction_form/add_transaction.store';
import { useAddTransactionState } from '@/screens/transactions/transaction_form/add_transaction.state';
```

Replace the `beforeEach` and `afterEach`:

```ts
beforeEach(() => {
  useCurrencyStore.setState({ rate: GLOBAL_RATE });
  useAccountStore.setState({ accounts: [] });
  useCategoryStore.setState({ categories: [] });

  useAddTransactionStore.getState().reset();
  useAddTransactionState.getState().reset();
  useAddTransactionState.getState().open();
});

afterEach(() => {
  useAddTransactionState.getState().close();
});
```

Replace every `useAddTransactionStore.getState().close()` and `useAddTransactionStore.getState().open()` inside test bodies with `useAddTransactionState.getState().close()` and `useAddTransactionState.getState().open()` respectively. (There is one such call inside each of the two "sheet close" tests.)

- [ ] **Step 8: Run tests**

Run: `npx jest __tests__/add_transaction.store.test.ts __tests__/add_transaction.state.test.ts __tests__/add_transaction_rate_override.test.ts -v`
Expected: all PASS.

- [ ] **Step 9: Commit**

```bash
git add screens/transactions/transaction_form/add_transaction.store.ts screens/transactions/transaction_form/add_transaction.state.ts screens/transactions/transaction_form/add_transaction.hook.ts __tests__/add_transaction.store.test.ts __tests__/add_transaction.state.test.ts __tests__/add_transaction_rate_override.test.ts
# also any sheet-open call sites updated in step 4
git add -u
git commit -m "refactor(add_transaction): split mixed store into data store + UI state"
```

---

### Task 6: Split `edit_transaction.store.ts`

**Files:**
- Modify: `screens/transactions/transaction_form/edit_transaction.store.ts` (data only)
- Create: `screens/transactions/transaction_form/edit_transaction.state.ts` (UI only)
- Modify: `screens/transactions/transaction_form/edit_transaction.hook.ts`
- Modify: `__tests__/edit_transaction.store.test.ts`
- Create: `__tests__/edit_transaction.state.test.ts`

- [ ] **Step 1: Rewrite `edit_transaction.store.ts` to data only**

```ts
import { create } from 'zustand';

import type { Transaction } from '@/database/entities/transaction.entity';

type NumpadAction = 'digit' | 'decimal' | 'backspace';

interface EditTransactionStore {
  editingTx: Transaction | null;
  amountStr: string;
  loadFromTx: (tx: Transaction) => void;
  handleNumpad: (action: NumpadAction, value?: string) => void;
  reset: () => void;
}

const INITIAL = {
  editingTx: null as Transaction | null,
  amountStr: '0',
};

export const useEditTransactionStore = create<EditTransactionStore>((set) => ({
  ...INITIAL,

  loadFromTx: (tx) =>
    set({
      editingTx: tx,
      amountStr: tx.amount % 1 === 0 ? String(Math.floor(tx.amount)) : String(tx.amount),
    }),

  handleNumpad: (action, value) =>
    set((s) => {
      const prev = s.amountStr;
      if (action === 'backspace') return { amountStr: prev.length <= 1 ? '0' : prev.slice(0, -1) };
      if (action === 'decimal') return { amountStr: prev.includes('.') ? prev : prev + '.' };
      const digit = value ?? '';
      if (prev === '0') return { amountStr: digit === '0' ? '0' : digit };
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1].length >= 2) return {};
      }
      return { amountStr: prev + digit };
    }),

  reset: () => set(INITIAL),
}));
```

- [ ] **Step 2: Create `edit_transaction.state.ts`**

```ts
import { create } from 'zustand';

import type { Transaction } from '@/database/entities/transaction.entity';

interface EditTransactionState {
  visible: boolean;
  saving: boolean;
  showCategoryPicker: boolean;
  rateOverride: boolean;
  open: (tx: Transaction) => void;
  close: () => void;
  setSaving: (v: boolean) => void;
  setShowCategoryPicker: (v: boolean) => void;
  setRateOverride: (v: boolean) => void;
  reset: () => void;
}

const INITIAL = {
  visible: false,
  saving: false,
  showCategoryPicker: false,
  rateOverride: false,
};

export const useEditTransactionState = create<EditTransactionState>((set) => ({
  ...INITIAL,

  open: (tx) =>
    set({
      visible: true,
      saving: false,
      showCategoryPicker: false,
      rateOverride: tx.exchange_rate !== null,
    }),

  close: () => set(INITIAL),

  setSaving: (saving) => set({ saving }),
  setShowCategoryPicker: (v) => set({ showCategoryPicker: v }),
  setRateOverride: (v) => set({ rateOverride: v }),

  reset: () => set(INITIAL),
}));
```

- [ ] **Step 3: Update `edit_transaction.hook.ts`**

Replace the import and destructuring:

```ts
import { useEditTransactionStore } from './edit_transaction.store';
```

with:

```ts
import { useEditTransactionStore } from './edit_transaction.store';
import { useEditTransactionState } from './edit_transaction.state';
```

Replace the destructuring block:

```ts
const {
  amountStr,
  visible,
  saving,
  setSaving,
  showCategoryPicker,
  setShowCategoryPicker,
  handleNumpad,
  rateOverride,
  setRateOverride,
} = useEditTransactionStore();
```

with:

```ts
const amountStr = useEditTransactionStore((s) => s.amountStr);
const handleNumpad = useEditTransactionStore((s) => s.handleNumpad);

const visible = useEditTransactionState((s) => s.visible);
const saving = useEditTransactionState((s) => s.saving);
const setSaving = useEditTransactionState((s) => s.setSaving);
const showCategoryPicker = useEditTransactionState((s) => s.showCategoryPicker);
const setShowCategoryPicker = useEditTransactionState((s) => s.setShowCategoryPicker);
const rateOverride = useEditTransactionState((s) => s.rateOverride);
const setRateOverride = useEditTransactionState((s) => s.setRateOverride);
```

- [ ] **Step 4: Update sheet open call site**

Run: `grep -rn "useEditTransactionStore" screens app __tests__ 2>/dev/null`

Wherever `open(tx)` was being called, change the import to `useEditTransactionState` and split into two calls so data and state are both initialised. For each match, replace:

```ts
import { useEditTransactionStore } from '@/screens/transactions/transaction_form/edit_transaction.store';
// ...
useEditTransactionStore.getState().open(tx);
```

with:

```ts
import { useEditTransactionStore } from '@/screens/transactions/transaction_form/edit_transaction.store';
import { useEditTransactionState } from '@/screens/transactions/transaction_form/edit_transaction.state';
// ...
useEditTransactionStore.getState().loadFromTx(tx);
useEditTransactionState.getState().open(tx);
```

The same pattern for any `close()` call sites — replace `useEditTransactionStore.getState().close()` with two calls:

```ts
useEditTransactionStore.getState().reset();
useEditTransactionState.getState().close();
```

- [ ] **Step 5: Rewrite `edit_transaction.store.test.ts`**

```ts
import { Currency, TransactionType } from '@/constants/enums';
import { useEditTransactionStore } from '@/screens/transactions/transaction_form/edit_transaction.store';
import type { Transaction } from '@/database/entities/transaction.entity';

const NOW = '2026-05-01T12:00:00.000Z';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 150,
    currency: Currency.EGP,
    egp_amount: 150,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat_food',
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

beforeEach(() => useEditTransactionStore.getState().reset());

describe('useEditTransactionStore initial state', () => {
  it('starts with editingTx=null and amountStr="0"', () => {
    const s = useEditTransactionStore.getState();
    expect(s.editingTx).toBeNull();
    expect(s.amountStr).toBe('0');
  });
});

describe('useEditTransactionStore.loadFromTx', () => {
  it('stores the transaction', () => {
    const tx = makeTx();
    useEditTransactionStore.getState().loadFromTx(tx);
    expect(useEditTransactionStore.getState().editingTx).toBe(tx);
  });

  it('formats integer amount without decimal for integer amounts', () => {
    useEditTransactionStore.getState().loadFromTx(makeTx({ amount: 200 }));
    expect(useEditTransactionStore.getState().amountStr).toBe('200');
  });

  it('formats fractional amount as a string with decimal', () => {
    useEditTransactionStore.getState().loadFromTx(makeTx({ amount: 99.5 }));
    expect(useEditTransactionStore.getState().amountStr).toBe('99.5');
  });
});

describe('useEditTransactionStore.handleNumpad', () => {
  it('digit replaces "0" with the digit (leading-zero guard)', () => {
    useEditTransactionStore.getState().handleNumpad('digit', '7');
    expect(useEditTransactionStore.getState().amountStr).toBe('7');
  });

  it('pressing "0" when amountStr is "0" keeps it "0"', () => {
    useEditTransactionStore.getState().handleNumpad('digit', '0');
    expect(useEditTransactionStore.getState().amountStr).toBe('0');
  });

  it('digit appends to a non-zero string', () => {
    useEditTransactionStore.getState().handleNumpad('digit', '4');
    useEditTransactionStore.getState().handleNumpad('digit', '2');
    expect(useEditTransactionStore.getState().amountStr).toBe('42');
  });

  it('decimal appends "." when not already present', () => {
    useEditTransactionStore.getState().handleNumpad('digit', '5');
    useEditTransactionStore.getState().handleNumpad('decimal');
    expect(useEditTransactionStore.getState().amountStr).toBe('5.');
  });

  it('decimal is a no-op when "." is already present', () => {
    useEditTransactionStore.getState().handleNumpad('digit', '5');
    useEditTransactionStore.getState().handleNumpad('decimal');
    useEditTransactionStore.getState().handleNumpad('decimal');
    expect(useEditTransactionStore.getState().amountStr).toBe('5.');
  });

  it('backspace removes the last character', () => {
    useEditTransactionStore.getState().handleNumpad('digit', '5');
    useEditTransactionStore.getState().handleNumpad('digit', '3');
    useEditTransactionStore.getState().handleNumpad('backspace');
    expect(useEditTransactionStore.getState().amountStr).toBe('5');
  });

  it('backspace on a single character resets to "0"', () => {
    useEditTransactionStore.getState().handleNumpad('digit', '5');
    useEditTransactionStore.getState().handleNumpad('backspace');
    expect(useEditTransactionStore.getState().amountStr).toBe('0');
  });

  it('limits decimal digits to 2', () => {
    useEditTransactionStore.getState().handleNumpad('digit', '5');
    useEditTransactionStore.getState().handleNumpad('decimal');
    useEditTransactionStore.getState().handleNumpad('digit', '1');
    useEditTransactionStore.getState().handleNumpad('digit', '2');
    useEditTransactionStore.getState().handleNumpad('digit', '3');
    expect(useEditTransactionStore.getState().amountStr).toBe('5.12');
  });

  it('digit action without value argument defaults to empty string', () => {
    useEditTransactionStore.getState().handleNumpad('digit', '5');
    useEditTransactionStore.getState().handleNumpad('digit');
    expect(useEditTransactionStore.getState().amountStr).toBe('5');
  });
});

describe('useEditTransactionStore.reset', () => {
  it('clears editingTx and amountStr', () => {
    useEditTransactionStore.getState().loadFromTx(makeTx());
    useEditTransactionStore.getState().reset();
    const s = useEditTransactionStore.getState();
    expect(s.editingTx).toBeNull();
    expect(s.amountStr).toBe('0');
  });
});
```

- [ ] **Step 6: Create `edit_transaction.state.test.ts`**

```ts
import { Currency, TransactionType } from '@/constants/enums';
import { useEditTransactionState } from '@/screens/transactions/transaction_form/edit_transaction.state';
import type { Transaction } from '@/database/entities/transaction.entity';

const NOW = '2026-05-01T12:00:00.000Z';

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 150,
    currency: Currency.EGP,
    egp_amount: 150,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat_food',
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

beforeEach(() => useEditTransactionState.getState().reset());

describe('useEditTransactionState initial state', () => {
  it('starts with every flag false', () => {
    const s = useEditTransactionState.getState();
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
    expect(s.rateOverride).toBe(false);
  });
});

describe('useEditTransactionState.open', () => {
  it('sets visible=true', () => {
    useEditTransactionState.getState().open(makeTx());
    expect(useEditTransactionState.getState().visible).toBe(true);
  });

  it('sets rateOverride=true when tx has an exchange_rate', () => {
    useEditTransactionState.getState().open(makeTx({ exchange_rate: 50 }));
    expect(useEditTransactionState.getState().rateOverride).toBe(true);
  });

  it('sets rateOverride=false when tx.exchange_rate is null', () => {
    useEditTransactionState.getState().open(makeTx({ exchange_rate: null }));
    expect(useEditTransactionState.getState().rateOverride).toBe(false);
  });
});

describe('useEditTransactionState.close', () => {
  it('resets every flag', () => {
    useEditTransactionState.setState({
      visible: true,
      saving: true,
      showCategoryPicker: true,
      rateOverride: true,
    });
    useEditTransactionState.getState().close();
    const s = useEditTransactionState.getState();
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
    expect(s.rateOverride).toBe(false);
  });
});

describe('useEditTransactionState setters', () => {
  it('setSaving toggles', () => {
    useEditTransactionState.getState().setSaving(true);
    expect(useEditTransactionState.getState().saving).toBe(true);
    useEditTransactionState.getState().setSaving(false);
    expect(useEditTransactionState.getState().saving).toBe(false);
  });

  it('setShowCategoryPicker toggles', () => {
    useEditTransactionState.getState().setShowCategoryPicker(true);
    expect(useEditTransactionState.getState().showCategoryPicker).toBe(true);
    useEditTransactionState.getState().setShowCategoryPicker(false);
    expect(useEditTransactionState.getState().showCategoryPicker).toBe(false);
  });

  it('setRateOverride toggles', () => {
    useEditTransactionState.getState().setRateOverride(true);
    expect(useEditTransactionState.getState().rateOverride).toBe(true);
    useEditTransactionState.getState().setRateOverride(false);
    expect(useEditTransactionState.getState().rateOverride).toBe(false);
  });
});

describe('useEditTransactionState.reset', () => {
  it('clears every flag', () => {
    useEditTransactionState.setState({
      visible: true,
      saving: true,
      showCategoryPicker: true,
      rateOverride: true,
    });
    useEditTransactionState.getState().reset();
    const s = useEditTransactionState.getState();
    expect(s.visible).toBe(false);
    expect(s.saving).toBe(false);
    expect(s.showCategoryPicker).toBe(false);
    expect(s.rateOverride).toBe(false);
  });
});
```

- [ ] **Step 7: Run tests**

Run: `npx jest __tests__/edit_transaction.store.test.ts __tests__/edit_transaction.state.test.ts -v`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add screens/transactions/transaction_form/edit_transaction.store.ts screens/transactions/transaction_form/edit_transaction.state.ts screens/transactions/transaction_form/edit_transaction.hook.ts __tests__/edit_transaction.store.test.ts __tests__/edit_transaction.state.test.ts
git add -u  # any open/close call site updates
git commit -m "refactor(edit_transaction): split mixed store into data store + UI state"
```

---

### Task 7: Split `categories.store.ts` (move composite actions to hook)

**Files:**
- Modify: `screens/settings/categories/categories.store.ts` (data only)
- Create: `screens/settings/categories/categories.state.ts` (UI only)
- Modify: `screens/settings/categories/categories.hook.ts` (orchestrate composite actions)
- Create: `__tests__/categories.store.test.ts`
- Create: `__tests__/categories.state.test.ts`

- [ ] **Step 1: Rewrite `categories.store.ts` to data only**

```ts
import { create } from 'zustand';

import type { Category } from '@/store/category.store';

interface CategoriesScreenStore {
  editingCategory: Category | null;
  categoryToDelete: Category | null;
  setEditingCategory: (c: Category | null) => void;
  setCategoryToDelete: (c: Category | null) => void;
  reset: () => void;
}

const INITIAL = {
  editingCategory: null as Category | null,
  categoryToDelete: null as Category | null,
};

export const useCategoriesScreenStore = create<CategoriesScreenStore>((set) => ({
  ...INITIAL,
  setEditingCategory: (c) => set({ editingCategory: c }),
  setCategoryToDelete: (c) => set({ categoryToDelete: c }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 2: Create `categories.state.ts`**

```ts
import { create } from 'zustand';

interface CategoriesScreenState {
  activeTab: 'expense' | 'income';
  showAddSheet: boolean;
  showDeleteConfirm: boolean;
  showReassignSheet: boolean;
  setActiveTab: (tab: 'expense' | 'income') => void;
  setShowAddSheet: (v: boolean) => void;
  setShowDeleteConfirm: (v: boolean) => void;
  setShowReassignSheet: (v: boolean) => void;
  reset: () => void;
}

const INITIAL = {
  activeTab: 'expense' as const,
  showAddSheet: false,
  showDeleteConfirm: false,
  showReassignSheet: false,
};

export const useCategoriesScreenState = create<CategoriesScreenState>((set) => ({
  ...INITIAL,
  setActiveTab: (tab) => set({ activeTab: tab }),
  setShowAddSheet: (v) => set({ showAddSheet: v }),
  setShowDeleteConfirm: (v) => set({ showDeleteConfirm: v }),
  setShowReassignSheet: (v) => set({ showReassignSheet: v }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 3: Rewrite `categories.hook.ts` with orchestration**

```ts
import { useRouter } from 'expo-router';

import type { Category, NewCategoryInput, UpdateCategoryInput } from '@/store/category.store';
import { useCategoryStore } from '@/store/category.store';
import { useCategoriesScreenStore } from './categories.store';
import { useCategoriesScreenState } from './categories.state';

export function useCategories() {
  const router = useRouter();
  const { categories, addCategory, updateCategory, deleteCategory, reassignAndDelete } =
    useCategoryStore();

  const editingCategory = useCategoriesScreenStore((s) => s.editingCategory);
  const categoryToDelete = useCategoriesScreenStore((s) => s.categoryToDelete);
  const setEditingCategory = useCategoriesScreenStore((s) => s.setEditingCategory);
  const setCategoryToDelete = useCategoriesScreenStore((s) => s.setCategoryToDelete);

  const activeTab = useCategoriesScreenState((s) => s.activeTab);
  const setActiveTab = useCategoriesScreenState((s) => s.setActiveTab);
  const showAddSheet = useCategoriesScreenState((s) => s.showAddSheet);
  const setShowAddSheet = useCategoriesScreenState((s) => s.setShowAddSheet);
  const showDeleteConfirm = useCategoriesScreenState((s) => s.showDeleteConfirm);
  const setShowDeleteConfirm = useCategoriesScreenState((s) => s.setShowDeleteConfirm);
  const showReassignSheet = useCategoriesScreenState((s) => s.showReassignSheet);
  const setShowReassignSheet = useCategoriesScreenState((s) => s.setShowReassignSheet);

  const displayedCategories = categories.filter((c) => c.type === activeTab);
  const defaultCategories = displayedCategories.filter((c) => c.is_default === 1);
  const customCategories = displayedCategories.filter((c) => c.is_default === 0);
  const customCount = categories.filter((c) => c.is_default === 0).length;
  const isAtLimit = customCount >= 30;

  function openAddSheet() {
    setEditingCategory(null);
    setShowAddSheet(true);
  }

  function openEditSheet(category: Category) {
    setEditingCategory(category);
    setShowAddSheet(true);
  }

  function closeSheet() {
    setShowAddSheet(false);
    setEditingCategory(null);
  }

  function openDeleteConfirm(category: Category) {
    setCategoryToDelete(category);
    setShowDeleteConfirm(true);
  }

  function openReassignSheet(category: Category) {
    setCategoryToDelete(category);
    setShowReassignSheet(true);
  }

  function closeDeleteFlow() {
    setCategoryToDelete(null);
    setShowDeleteConfirm(false);
    setShowReassignSheet(false);
  }

  const handleSave = async (data: NewCategoryInput | UpdateCategoryInput) => {
    if (editingCategory) {
      await updateCategory(editingCategory.id, data as UpdateCategoryInput);
    } else {
      await addCategory(data as NewCategoryInput);
    }
    closeSheet();
  };

  const handleDeletePress = (category: Category) => {
    const hasTransactions = false; // always false in M2a — transactions don't exist yet
    if (hasTransactions) {
      openReassignSheet(category);
    } else {
      openDeleteConfirm(category);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    await deleteCategory(categoryToDelete.id);
    closeDeleteFlow();
  };

  const handleReassignConfirm = async (toId: string) => {
    if (!categoryToDelete) return;
    await reassignAndDelete(categoryToDelete.id, toId);
    closeDeleteFlow();
  };

  const reassignOptions = categories.filter(
    (c) => c.type === categoryToDelete?.type && c.id !== categoryToDelete?.id,
  );

  return {
    activeTab,
    defaultCategories,
    customCategories,
    isAtLimit,
    showAddSheet,
    editingCategory,
    categoryToDelete,
    showDeleteConfirm,
    showReassignSheet,
    reassignOptions,
    setActiveTab,
    openAddSheet,
    openEditSheet,
    closeSheet,
    handleSave,
    handleDeletePress,
    handleDeleteConfirm,
    handleReassignConfirm,
    closeDeleteFlow,
    goBack: () => router.back(),
  };
}
```

- [ ] **Step 4: Create `categories.store.test.ts`**

```ts
import { useCategoriesScreenStore } from '@/screens/settings/categories/categories.store';
import type { Category } from '@/store/category.store';

const fakeCategory: Category = {
  id: 'cat-1',
  name: 'Food',
  type: 'expense',
  icon: 'food-fork-drink',
  color: '#C9973A',
  is_default: 0,
  sort_order: 0,
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
};

beforeEach(() => useCategoriesScreenStore.getState().reset());

describe('useCategoriesScreenStore', () => {
  it('starts with no editing or deleting target', () => {
    const s = useCategoriesScreenStore.getState();
    expect(s.editingCategory).toBeNull();
    expect(s.categoryToDelete).toBeNull();
  });

  it('setEditingCategory stores the value', () => {
    useCategoriesScreenStore.getState().setEditingCategory(fakeCategory);
    expect(useCategoriesScreenStore.getState().editingCategory).toBe(fakeCategory);
  });

  it('setCategoryToDelete stores the value', () => {
    useCategoriesScreenStore.getState().setCategoryToDelete(fakeCategory);
    expect(useCategoriesScreenStore.getState().categoryToDelete).toBe(fakeCategory);
  });

  it('reset clears both', () => {
    useCategoriesScreenStore.getState().setEditingCategory(fakeCategory);
    useCategoriesScreenStore.getState().setCategoryToDelete(fakeCategory);
    useCategoriesScreenStore.getState().reset();
    const s = useCategoriesScreenStore.getState();
    expect(s.editingCategory).toBeNull();
    expect(s.categoryToDelete).toBeNull();
  });
});
```

- [ ] **Step 5: Create `categories.state.test.ts`**

```ts
import { useCategoriesScreenState } from '@/screens/settings/categories/categories.state';

beforeEach(() => useCategoriesScreenState.getState().reset());

describe('useCategoriesScreenState', () => {
  it('starts with activeTab=expense and all sheets hidden', () => {
    const s = useCategoriesScreenState.getState();
    expect(s.activeTab).toBe('expense');
    expect(s.showAddSheet).toBe(false);
    expect(s.showDeleteConfirm).toBe(false);
    expect(s.showReassignSheet).toBe(false);
  });

  it('setActiveTab switches between expense and income', () => {
    useCategoriesScreenState.getState().setActiveTab('income');
    expect(useCategoriesScreenState.getState().activeTab).toBe('income');
    useCategoriesScreenState.getState().setActiveTab('expense');
    expect(useCategoriesScreenState.getState().activeTab).toBe('expense');
  });

  it('setShowAddSheet toggles', () => {
    useCategoriesScreenState.getState().setShowAddSheet(true);
    expect(useCategoriesScreenState.getState().showAddSheet).toBe(true);
    useCategoriesScreenState.getState().setShowAddSheet(false);
    expect(useCategoriesScreenState.getState().showAddSheet).toBe(false);
  });

  it('setShowDeleteConfirm toggles', () => {
    useCategoriesScreenState.getState().setShowDeleteConfirm(true);
    expect(useCategoriesScreenState.getState().showDeleteConfirm).toBe(true);
    useCategoriesScreenState.getState().setShowDeleteConfirm(false);
    expect(useCategoriesScreenState.getState().showDeleteConfirm).toBe(false);
  });

  it('setShowReassignSheet toggles', () => {
    useCategoriesScreenState.getState().setShowReassignSheet(true);
    expect(useCategoriesScreenState.getState().showReassignSheet).toBe(true);
    useCategoriesScreenState.getState().setShowReassignSheet(false);
    expect(useCategoriesScreenState.getState().showReassignSheet).toBe(false);
  });

  it('reset returns to defaults', () => {
    useCategoriesScreenState.setState({
      activeTab: 'income',
      showAddSheet: true,
      showDeleteConfirm: true,
      showReassignSheet: true,
    });
    useCategoriesScreenState.getState().reset();
    const s = useCategoriesScreenState.getState();
    expect(s.activeTab).toBe('expense');
    expect(s.showAddSheet).toBe(false);
    expect(s.showDeleteConfirm).toBe(false);
    expect(s.showReassignSheet).toBe(false);
  });
});
```

- [ ] **Step 6: Run tests**

Run: `npx jest __tests__/categories.store.test.ts __tests__/categories.state.test.ts -v`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add screens/settings/categories/categories.store.ts screens/settings/categories/categories.state.ts screens/settings/categories/categories.hook.ts __tests__/categories.store.test.ts __tests__/categories.state.test.ts
git commit -m "refactor(settings/categories): split mixed store; move composite actions to hook"
```

---

## Phase 3: Replace `useState` in Hooks

### Task 8: `dashboard.hook.ts` — extract to `dashboard.state.ts` + `dashboard.store.ts`

**Files:**
- Create: `screens/dashboard/dashboard.state.ts`
- Create: `screens/dashboard/dashboard.store.ts`
- Modify: `screens/dashboard/dashboard.hook.ts`
- Create: `__tests__/dashboard.state.test.ts`
- Create: `__tests__/dashboard.store.test.ts`

- [ ] **Step 1: Create `dashboard.state.ts`**

```ts
import { create } from 'zustand';

interface DashboardState {
  isBreakdownVisible: boolean;
  refreshing: boolean;
  setBreakdownVisible: (v: boolean) => void;
  setRefreshing: (v: boolean) => void;
  reset: () => void;
}

const INITIAL = {
  isBreakdownVisible: false,
  refreshing: false,
};

export const useDashboardState = create<DashboardState>((set) => ({
  ...INITIAL,
  setBreakdownVisible: (v) => set({ isBreakdownVisible: v }),
  setRefreshing: (v) => set({ refreshing: v }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 2: Create `dashboard.store.ts`**

```ts
import { create } from 'zustand';

import type { AccountStats } from '@/database/account_stats';

interface DashboardStore {
  statsMap: Record<string, AccountStats>;
  setStatsMap: (m: Record<string, AccountStats>) => void;
  reset: () => void;
}

const INITIAL = {
  statsMap: {} as Record<string, AccountStats>,
};

export const useDashboardStore = create<DashboardStore>((set) => ({
  ...INITIAL,
  setStatsMap: (m) => set({ statsMap: m }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 3: Update `dashboard.hook.ts`**

Replace the file contents:

```ts
import { useCallback, useEffect, useMemo } from 'react';
import { useRouter } from 'expo-router';

import { getDb } from '@/database/client';
import { getAccountsStats } from '@/database/account_stats';
import { useAccountStore } from '@/store/account.store';
import { useCurrencyStore } from '@/store/currency.store';
import { computeNetWorth, groupAccountsByType } from './dashboard.helpers';
import { useDashboardState } from './dashboard.state';
import { useDashboardStore } from './dashboard.store';

export function useDashboard() {
  const router = useRouter();
  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore((s) => s.loadAccounts);
  const rate = useCurrencyStore((s) => s.rate);
  const isManualOverride = useCurrencyStore((s) => s.isManualOverride);

  const isBreakdownVisible = useDashboardState((s) => s.isBreakdownVisible);
  const setBreakdownVisible = useDashboardState((s) => s.setBreakdownVisible);
  const refreshing = useDashboardState((s) => s.refreshing);
  const setRefreshing = useDashboardState((s) => s.setRefreshing);

  const statsMap = useDashboardStore((s) => s.statsMap);
  const setStatsMap = useDashboardStore((s) => s.setStatsMap);

  const loadStats = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) {
        setStatsMap({});
        return;
      }
      try {
        const db = await getDb();
        const result = await getAccountsStats(db, ids);
        setStatsMap(result);
      } catch (err) {
        console.error('[dashboard] loadStats failed:', err);
      }
    },
    [setStatsMap],
  );

  useEffect(() => {
    loadStats(accounts.map((a) => a.id));
  }, [accounts]);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAccounts();
    } finally {
      setRefreshing(false);
    }
  }, [loadAccounts, setRefreshing]);

  const netWorth = useMemo(() => computeNetWorth(accounts, rate), [accounts, rate]);
  const groupedAccounts = useMemo(() => groupAccountsByType(accounts), [accounts]);

  const goToAccount = (id: string) => router.push(`/accounts/${id}`);
  const goToAddAccount = () => router.push('/accounts/add_account');
  const goToSettings = () => router.push('/settings');

  return {
    accounts,
    rate,
    isManualOverride,
    netWorth,
    groupedAccounts,
    statsMap,
    isBreakdownVisible,
    setBreakdownVisible,
    refreshing,
    refresh,
    goToAccount,
    goToAddAccount,
    goToSettings,
  };
}
```

- [ ] **Step 4: Create `dashboard.state.test.ts`**

```ts
import { useDashboardState } from '@/screens/dashboard/dashboard.state';

beforeEach(() => useDashboardState.getState().reset());

describe('useDashboardState', () => {
  it('starts with both flags false', () => {
    const s = useDashboardState.getState();
    expect(s.isBreakdownVisible).toBe(false);
    expect(s.refreshing).toBe(false);
  });

  it('setBreakdownVisible toggles', () => {
    useDashboardState.getState().setBreakdownVisible(true);
    expect(useDashboardState.getState().isBreakdownVisible).toBe(true);
    useDashboardState.getState().setBreakdownVisible(false);
    expect(useDashboardState.getState().isBreakdownVisible).toBe(false);
  });

  it('setRefreshing toggles', () => {
    useDashboardState.getState().setRefreshing(true);
    expect(useDashboardState.getState().refreshing).toBe(true);
    useDashboardState.getState().setRefreshing(false);
    expect(useDashboardState.getState().refreshing).toBe(false);
  });

  it('reset clears both', () => {
    useDashboardState.setState({ isBreakdownVisible: true, refreshing: true });
    useDashboardState.getState().reset();
    const s = useDashboardState.getState();
    expect(s.isBreakdownVisible).toBe(false);
    expect(s.refreshing).toBe(false);
  });
});
```

- [ ] **Step 5: Create `dashboard.store.test.ts`**

```ts
import { useDashboardStore } from '@/screens/dashboard/dashboard.store';

beforeEach(() => useDashboardStore.getState().reset());

describe('useDashboardStore', () => {
  it('starts with empty statsMap', () => {
    expect(useDashboardStore.getState().statsMap).toEqual({});
  });

  it('setStatsMap replaces the map', () => {
    const next = { 'acc-1': { transactionCount: 3, lastTransactionDate: '2026-05-01' } };
    useDashboardStore.getState().setStatsMap(next);
    expect(useDashboardStore.getState().statsMap).toEqual(next);
  });

  it('reset returns to empty map', () => {
    useDashboardStore.getState().setStatsMap({
      'acc-1': { transactionCount: 1, lastTransactionDate: null },
    });
    useDashboardStore.getState().reset();
    expect(useDashboardStore.getState().statsMap).toEqual({});
  });
});
```

- [ ] **Step 6: Verify the AccountStats shape**

Run: `grep -n "type AccountStats\|interface AccountStats" database/account_stats.ts`

If `AccountStats` doesn't have `transactionCount` and `lastTransactionDate`, adjust the test fixture in `dashboard.store.test.ts` to use the actual fields. Use a partial cast if needed:

```ts
const next = { 'acc-1': { /* fill with real AccountStats fields */ } as AccountStats };
```

- [ ] **Step 7: Run tests**

Run: `npx jest __tests__/dashboard.state.test.ts __tests__/dashboard.store.test.ts -v`
Expected: all PASS.

- [ ] **Step 8: Commit**

```bash
git add screens/dashboard/dashboard.state.ts screens/dashboard/dashboard.store.ts screens/dashboard/dashboard.hook.ts __tests__/dashboard.state.test.ts __tests__/dashboard.store.test.ts
git commit -m "refactor(dashboard): replace useState with state and store files"
```

---

### Task 9: `transactions/detail/detail.hook.ts` — extract to state + store

**Files:**
- Create: `screens/transactions/detail/detail.state.ts`
- Create: `screens/transactions/detail/detail.store.ts`
- Modify: `screens/transactions/detail/detail.hook.ts`
- Create: `__tests__/tx_detail.state.test.ts`
- Create: `__tests__/tx_detail.store.test.ts`

- [ ] **Step 1: Create `detail.state.ts`**

```ts
import { create } from 'zustand';

interface TxDetailState {
  confirmVisible: boolean;
  deleting: boolean;
  reloadKey: number;
  setConfirmVisible: (v: boolean) => void;
  setDeleting: (v: boolean) => void;
  bumpReload: () => void;
  reset: () => void;
}

const INITIAL = {
  confirmVisible: false,
  deleting: false,
  reloadKey: 0,
};

export const useTxDetailState = create<TxDetailState>((set) => ({
  ...INITIAL,
  setConfirmVisible: (v) => set({ confirmVisible: v }),
  setDeleting: (v) => set({ deleting: v }),
  bumpReload: () => set((s) => ({ reloadKey: s.reloadKey + 1 })),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 2: Create `detail.store.ts`**

```ts
import { create } from 'zustand';

import type { Transaction } from '@/database/entities/transaction.entity';

interface TxDetailStore {
  tx: Transaction | null | undefined;
  setTx: (tx: Transaction | null | undefined) => void;
  reset: () => void;
}

const INITIAL = {
  tx: undefined as Transaction | null | undefined,
};

export const useTxDetailStore = create<TxDetailStore>((set) => ({
  ...INITIAL,
  setTx: (tx) => set({ tx }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 3: Update `detail.hook.ts`**

Replace `import { ..., useState } from 'react';` with `import { ..., } from 'react';` (drop `useState`). Add the new imports and remove the `useState` calls. The full hook becomes:

```ts
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { Alert } from 'react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionStore } from '@/store/transaction.store';
import type { Transaction } from '@/database/entities/transaction.entity';
import { formatTime12h } from '@/utils/format_time_12h';
import { formatTransactionTitle } from '@/utils/format_transaction_title';
import { useTxDetailState } from './detail.state';
import { useTxDetailStore } from './detail.store';

const numberFmt = new Intl.NumberFormat('en-US', { style: 'decimal' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export type DetailState = 'loading' | 'notFound' | 'ready';

const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  bank: Strings.typeBank,
  smart_wallet: Strings.typeSmartWallet,
  physical_wallet: Strings.typePhysicalWallet,
  physical_savings: Strings.typePhysicalSavings,
  credit_card: Strings.typeCreditCard,
};

const TYPE_BADGE: Record<TransactionType, string> = {
  [TransactionType.Expense]: Strings.typeBadgeExpense,
  [TransactionType.Income]: Strings.typeBadgeIncome,
  [TransactionType.Transfer]: Strings.typeBadgeTransfer,
  [TransactionType.CCPayment]: Strings.typeBadgeCcPayment,
};

function formatLongDate(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return `${MONTHS[m - 1]} ${d}, ${y}`;
}

function signedAmount(tx: Transaction): string {
  const num = numberFmt.format(tx.egp_amount);
  if (tx.type === TransactionType.Expense) return `−${num} EGP`;
  if (tx.type === TransactionType.Income) return `+${num} EGP`;
  return `${num} EGP`;
}

export function useTransactionDetail(id: string) {
  const tx = useTxDetailStore((s) => s.tx);
  const setTx = useTxDetailStore((s) => s.setTx);
  const resetData = useTxDetailStore((s) => s.reset);

  const confirmVisible = useTxDetailState((s) => s.confirmVisible);
  const setConfirmVisible = useTxDetailState((s) => s.setConfirmVisible);
  const deleting = useTxDetailState((s) => s.deleting);
  const setDeleting = useTxDetailState((s) => s.setDeleting);
  const reloadKey = useTxDetailState((s) => s.reloadKey);
  const bumpReload = useTxDetailState((s) => s.bumpReload);
  const resetUi = useTxDetailState((s) => s.reset);

  const accounts = useAccountStore((s) => s.accounts);
  const categories = useCategoryStore((s) => s.categories);
  const getById = useTransactionStore((s) => s.getById);
  const deleteTransaction = useTransactionStore((s) => s.deleteTransaction);

  // On unmount, drop any cached tx + reset UI flags so the next visit starts clean.
  useEffect(
    () => () => {
      resetData();
      resetUi();
    },
    [resetData, resetUi],
  );

  useEffect(() => {
    let cancelled = false;
    setTx(undefined);
    getById(id)
      .then((t) => {
        if (!cancelled) setTx(t);
      })
      .catch((e) => {
        console.error('[transactionDetail] getById failed', e);
        if (!cancelled) setTx(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id, getById, reloadKey, setTx]);

  const accountsById = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);
  const categoriesById = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const state: DetailState = tx === undefined ? 'loading' : tx === null ? 'notFound' : 'ready';

  const derived = useMemo(() => {
    if (!tx) return null;
    const account = accountsById.get(tx.account_id);
    const toAccount = tx.to_account_id ? accountsById.get(tx.to_account_id) : undefined;
    const category = tx.category_id ? categoriesById.get(tx.category_id) : undefined;
    const { title } = formatTransactionTitle({ tx, account, toAccount, category });

    const time = formatTime12h(tx.transaction_time);
    const dateLong = formatLongDate(tx.transaction_date);

    return {
      title,
      amountText: signedAmount(tx),
      dateTimeText: `${dateLong} · ${time}`,
      categoryLabel:
        category?.name ??
        (tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment
          ? TYPE_BADGE[tx.type]
          : Strings.uncategorized),
      categoryBadge: TYPE_BADGE[tx.type],
      accountLabel: toAccount
        ? `${account?.name ?? Strings.unknownAccount} → ${toAccount.name}`
        : (account?.name ?? Strings.unknownAccount),
      accountTypeLabel: account ? ACCOUNT_TYPE_LABELS[account.type] : undefined,
      originalAmountText:
        tx.currency === Currency.USD ? `${numberFmt.format(tx.amount)} USD` : undefined,
      exchangeRateText:
        tx.exchange_rate !== null ? `1 USD = ${numberFmt.format(tx.exchange_rate)} EGP` : undefined,
      noteText: tx.note?.trim() || Strings.detailNoteEmpty,
      category,
    };
  }, [tx, accountsById, categoriesById]);

  const openDeleteConfirm = useCallback(() => setConfirmVisible(true), [setConfirmVisible]);
  const closeDeleteConfirm = useCallback(() => {
    if (!deleting) setConfirmVisible(false);
  }, [deleting, setConfirmVisible]);

  const confirmDelete = useCallback(async () => {
    if (!tx) return;
    setDeleting(true);
    try {
      await deleteTransaction(tx.id);
      router.back();
    } catch (e) {
      console.error('[transactionDetail] delete failed', e);
      Alert.alert(Strings.errDeleteFailed);
    } finally {
      setDeleting(false);
      setConfirmVisible(false);
    }
  }, [tx, deleteTransaction, setDeleting, setConfirmVisible]);

  const reload = useCallback(() => bumpReload(), [bumpReload]);

  return {
    state,
    tx,
    derived,
    confirmVisible,
    deleting,
    openDeleteConfirm,
    closeDeleteConfirm,
    confirmDelete,
    reload,
  };
}
```

- [ ] **Step 4: Create `tx_detail.state.test.ts`**

```ts
import { useTxDetailState } from '@/screens/transactions/detail/detail.state';

beforeEach(() => useTxDetailState.getState().reset());

describe('useTxDetailState', () => {
  it('starts with all flags false and reloadKey 0', () => {
    const s = useTxDetailState.getState();
    expect(s.confirmVisible).toBe(false);
    expect(s.deleting).toBe(false);
    expect(s.reloadKey).toBe(0);
  });

  it('setConfirmVisible toggles', () => {
    useTxDetailState.getState().setConfirmVisible(true);
    expect(useTxDetailState.getState().confirmVisible).toBe(true);
    useTxDetailState.getState().setConfirmVisible(false);
    expect(useTxDetailState.getState().confirmVisible).toBe(false);
  });

  it('setDeleting toggles', () => {
    useTxDetailState.getState().setDeleting(true);
    expect(useTxDetailState.getState().deleting).toBe(true);
    useTxDetailState.getState().setDeleting(false);
    expect(useTxDetailState.getState().deleting).toBe(false);
  });

  it('bumpReload increments reloadKey', () => {
    useTxDetailState.getState().bumpReload();
    expect(useTxDetailState.getState().reloadKey).toBe(1);
    useTxDetailState.getState().bumpReload();
    expect(useTxDetailState.getState().reloadKey).toBe(2);
  });

  it('reset returns to defaults', () => {
    useTxDetailState.getState().setConfirmVisible(true);
    useTxDetailState.getState().setDeleting(true);
    useTxDetailState.getState().bumpReload();
    useTxDetailState.getState().reset();
    const s = useTxDetailState.getState();
    expect(s.confirmVisible).toBe(false);
    expect(s.deleting).toBe(false);
    expect(s.reloadKey).toBe(0);
  });
});
```

- [ ] **Step 5: Create `tx_detail.store.test.ts`**

```ts
import { useTxDetailStore } from '@/screens/transactions/detail/detail.store';
import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';

const FAKE_TX: Transaction = {
  id: 'tx-1',
  type: TransactionType.Expense,
  amount: 100,
  currency: Currency.EGP,
  egp_amount: 100,
  exchange_rate: null,
  to_amount: null,
  minimum_payment_snapshot: null,
  account_id: 'acc-1',
  to_account_id: null,
  category_id: 'cat-1',
  note: null,
  transaction_date: '2026-05-01',
  transaction_time: '10:00:00',
  created_at: '2026-05-01T00:00:00.000Z',
  updated_at: '2026-05-01T00:00:00.000Z',
};

beforeEach(() => useTxDetailStore.getState().reset());

describe('useTxDetailStore', () => {
  it('starts with tx=undefined', () => {
    expect(useTxDetailStore.getState().tx).toBeUndefined();
  });

  it('setTx accepts a transaction', () => {
    useTxDetailStore.getState().setTx(FAKE_TX);
    expect(useTxDetailStore.getState().tx).toBe(FAKE_TX);
  });

  it('setTx accepts null (not found)', () => {
    useTxDetailStore.getState().setTx(null);
    expect(useTxDetailStore.getState().tx).toBeNull();
  });

  it('reset returns tx to undefined', () => {
    useTxDetailStore.getState().setTx(FAKE_TX);
    useTxDetailStore.getState().reset();
    expect(useTxDetailStore.getState().tx).toBeUndefined();
  });
});
```

- [ ] **Step 6: Run tests**

Run: `npx jest __tests__/tx_detail.state.test.ts __tests__/tx_detail.store.test.ts -v`
Expected: all PASS.

- [ ] **Step 7: Commit**

```bash
git add screens/transactions/detail/detail.state.ts screens/transactions/detail/detail.store.ts screens/transactions/detail/detail.hook.ts __tests__/tx_detail.state.test.ts __tests__/tx_detail.store.test.ts
git commit -m "refactor(tx detail): replace useState with state and store files"
```

---

## Phase 4: Replace `useState` in Components

### Task 10: `transaction_form_body.tsx` — extract picker visibility to state

**Files:**
- Create: `screens/transactions/transaction_form/transaction_form_body.state.ts`
- Modify: `screens/transactions/transaction_form/transaction_form_body.tsx`
- Create: `__tests__/transaction_form_body.state.test.ts`

- [ ] **Step 1: Create `transaction_form_body.state.ts`**

```ts
import { create } from 'zustand';

interface TransactionFormBodyState {
  showIosDatePicker: boolean;
  showIosTimePicker: boolean;
  setShowIosDatePicker: (v: boolean) => void;
  setShowIosTimePicker: (v: boolean) => void;
  reset: () => void;
}

const INITIAL = {
  showIosDatePicker: false,
  showIosTimePicker: false,
};

export const useTransactionFormBodyState = create<TransactionFormBodyState>((set) => ({
  ...INITIAL,
  setShowIosDatePicker: (v) => set({ showIosDatePicker: v }),
  setShowIosTimePicker: (v) => set({ showIosTimePicker: v }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 2: Update `transaction_form_body.tsx`**

In `screens/transactions/transaction_form/transaction_form_body.tsx`:

- Remove `useState` from the React import line:

  ```ts
  import { useState } from 'react';
  ```

- Add the new import:

  ```ts
  import { useTransactionFormBodyState } from './transaction_form_body.state';
  ```

- Remove the two `useState` lines:

  ```ts
  const [showIosDatePicker, setShowIosDatePicker] = useState(false);
  const [showIosTimePicker, setShowIosTimePicker] = useState(false);
  ```

  Replace with:

  ```ts
  const showIosDatePicker = useTransactionFormBodyState((s) => s.showIosDatePicker);
  const setShowIosDatePicker = useTransactionFormBodyState((s) => s.setShowIosDatePicker);
  const showIosTimePicker = useTransactionFormBodyState((s) => s.showIosTimePicker);
  const setShowIosTimePicker = useTransactionFormBodyState((s) => s.setShowIosTimePicker);
  ```

- The two helpers `openDatePicker` / `openTimePicker` use functional updates `setShowIosDatePicker((v) => !v)`. Replace these with explicit reads:

  ```ts
  function openDatePicker() {
    setShowIosTimePicker(false);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ /* ...unchanged... */ });
    } else {
      setShowIosDatePicker(!showIosDatePicker);
    }
  }

  function openTimePicker() {
    setShowIosDatePicker(false);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({ /* ...unchanged... */ });
    } else {
      setShowIosTimePicker(!showIosTimePicker);
    }
  }
  ```

- [ ] **Step 3: Create `transaction_form_body.state.test.ts`**

```ts
import { useTransactionFormBodyState } from '@/screens/transactions/transaction_form/transaction_form_body.state';

beforeEach(() => useTransactionFormBodyState.getState().reset());

describe('useTransactionFormBodyState', () => {
  it('starts with both pickers closed', () => {
    const s = useTransactionFormBodyState.getState();
    expect(s.showIosDatePicker).toBe(false);
    expect(s.showIosTimePicker).toBe(false);
  });

  it('setShowIosDatePicker toggles', () => {
    useTransactionFormBodyState.getState().setShowIosDatePicker(true);
    expect(useTransactionFormBodyState.getState().showIosDatePicker).toBe(true);
    useTransactionFormBodyState.getState().setShowIosDatePicker(false);
    expect(useTransactionFormBodyState.getState().showIosDatePicker).toBe(false);
  });

  it('setShowIosTimePicker toggles', () => {
    useTransactionFormBodyState.getState().setShowIosTimePicker(true);
    expect(useTransactionFormBodyState.getState().showIosTimePicker).toBe(true);
    useTransactionFormBodyState.getState().setShowIosTimePicker(false);
    expect(useTransactionFormBodyState.getState().showIosTimePicker).toBe(false);
  });

  it('reset clears both flags', () => {
    useTransactionFormBodyState.setState({ showIosDatePicker: true, showIosTimePicker: true });
    useTransactionFormBodyState.getState().reset();
    const s = useTransactionFormBodyState.getState();
    expect(s.showIosDatePicker).toBe(false);
    expect(s.showIosTimePicker).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/transaction_form_body.state.test.ts -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/transaction_form/transaction_form_body.state.ts screens/transactions/transaction_form/transaction_form_body.tsx __tests__/transaction_form_body.state.test.ts
git commit -m "refactor(transaction_form_body): replace useState with state file"
```

---

### Task 11: `filter_date_custom_picker.tsx` — extract local state

**Files:**
- Create: `screens/transactions/filter/components/filter_date_custom_picker.state.ts`
- Modify: `screens/transactions/filter/components/filter_date_custom_picker.tsx`
- Create: `__tests__/filter_date_custom_picker.state.test.ts`

- [ ] **Step 1: Create the state file**

`screens/transactions/filter/components/filter_date_custom_picker.state.ts`:

```ts
import { create } from 'zustand';

interface FilterDateCustomPickerState {
  from: Date | undefined;
  to: Date | undefined;
  showFromPicker: boolean;
  showToPicker: boolean;
  setFrom: (d: Date | undefined) => void;
  setTo: (d: Date | undefined) => void;
  setShowFromPicker: (v: boolean) => void;
  setShowToPicker: (v: boolean) => void;
  initialize: (from: Date | undefined, to: Date | undefined) => void;
  reset: () => void;
}

const INITIAL = {
  from: undefined as Date | undefined,
  to: undefined as Date | undefined,
  showFromPicker: false,
  showToPicker: false,
};

export const useFilterDateCustomPickerState = create<FilterDateCustomPickerState>((set) => ({
  ...INITIAL,
  setFrom: (d) => set({ from: d }),
  setTo: (d) => set({ to: d }),
  setShowFromPicker: (v) => set({ showFromPicker: v }),
  setShowToPicker: (v) => set({ showToPicker: v }),
  initialize: (from, to) => set({ from, to, showFromPicker: false, showToPicker: false }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 2: Update the component**

In `screens/transactions/filter/components/filter_date_custom_picker.tsx`:

- Drop `useState` from the React import:

  ```ts
  import { useEffect } from 'react';
  ```

- Add the state import:

  ```ts
  import { useFilterDateCustomPickerState } from './filter_date_custom_picker.state';
  ```

- Replace the four `useState` calls with selectors:

  ```ts
  const from = useFilterDateCustomPickerState((s) => s.from);
  const to = useFilterDateCustomPickerState((s) => s.to);
  const showFromPicker = useFilterDateCustomPickerState((s) => s.showFromPicker);
  const showToPicker = useFilterDateCustomPickerState((s) => s.showToPicker);
  const setFrom = useFilterDateCustomPickerState((s) => s.setFrom);
  const setTo = useFilterDateCustomPickerState((s) => s.setTo);
  const setShowFromPicker = useFilterDateCustomPickerState((s) => s.setShowFromPicker);
  const setShowToPicker = useFilterDateCustomPickerState((s) => s.setShowToPicker);
  const initialize = useFilterDateCustomPickerState((s) => s.initialize);
  ```

- Replace the existing `useEffect` body with one call:

  ```ts
  useEffect(() => {
    if (!visible) return;
    initialize(isoToDate(initialFrom), isoToDate(initialTo));
  }, [visible, initialFrom, initialTo, initialize]);
  ```

- [ ] **Step 3: Create `filter_date_custom_picker.state.test.ts`**

```ts
import { useFilterDateCustomPickerState } from '@/screens/transactions/filter/components/filter_date_custom_picker.state';

beforeEach(() => useFilterDateCustomPickerState.getState().reset());

describe('useFilterDateCustomPickerState', () => {
  it('starts with both dates undefined and pickers closed', () => {
    const s = useFilterDateCustomPickerState.getState();
    expect(s.from).toBeUndefined();
    expect(s.to).toBeUndefined();
    expect(s.showFromPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
  });

  it('setFrom and setTo update dates', () => {
    const d1 = new Date('2026-05-01');
    const d2 = new Date('2026-05-02');
    useFilterDateCustomPickerState.getState().setFrom(d1);
    useFilterDateCustomPickerState.getState().setTo(d2);
    const s = useFilterDateCustomPickerState.getState();
    expect(s.from).toBe(d1);
    expect(s.to).toBe(d2);
  });

  it('setFrom(undefined) clears the date', () => {
    useFilterDateCustomPickerState.getState().setFrom(new Date());
    useFilterDateCustomPickerState.getState().setFrom(undefined);
    expect(useFilterDateCustomPickerState.getState().from).toBeUndefined();
  });

  it('setShowFromPicker and setShowToPicker toggle', () => {
    useFilterDateCustomPickerState.getState().setShowFromPicker(true);
    expect(useFilterDateCustomPickerState.getState().showFromPicker).toBe(true);
    useFilterDateCustomPickerState.getState().setShowFromPicker(false);
    expect(useFilterDateCustomPickerState.getState().showFromPicker).toBe(false);
    useFilterDateCustomPickerState.getState().setShowToPicker(true);
    expect(useFilterDateCustomPickerState.getState().showToPicker).toBe(true);
    useFilterDateCustomPickerState.getState().setShowToPicker(false);
    expect(useFilterDateCustomPickerState.getState().showToPicker).toBe(false);
  });

  it('initialize sets from/to and closes both pickers', () => {
    const d1 = new Date('2026-05-01');
    const d2 = new Date('2026-05-15');
    useFilterDateCustomPickerState.setState({ showFromPicker: true, showToPicker: true });
    useFilterDateCustomPickerState.getState().initialize(d1, d2);
    const s = useFilterDateCustomPickerState.getState();
    expect(s.from).toBe(d1);
    expect(s.to).toBe(d2);
    expect(s.showFromPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
  });

  it('initialize accepts undefined dates', () => {
    useFilterDateCustomPickerState.getState().initialize(undefined, undefined);
    const s = useFilterDateCustomPickerState.getState();
    expect(s.from).toBeUndefined();
    expect(s.to).toBeUndefined();
  });

  it('reset clears every field', () => {
    useFilterDateCustomPickerState.setState({
      from: new Date(),
      to: new Date(),
      showFromPicker: true,
      showToPicker: true,
    });
    useFilterDateCustomPickerState.getState().reset();
    const s = useFilterDateCustomPickerState.getState();
    expect(s.from).toBeUndefined();
    expect(s.to).toBeUndefined();
    expect(s.showFromPicker).toBe(false);
    expect(s.showToPicker).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/filter_date_custom_picker.state.test.ts -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/filter/components/filter_date_custom_picker.state.ts screens/transactions/filter/components/filter_date_custom_picker.tsx __tests__/filter_date_custom_picker.state.test.ts
git commit -m "refactor(filter_date_custom_picker): replace useState with state file"
```

---

### Task 12: `filter_amount_section.tsx` — extract local string state

**Files:**
- Create: `screens/transactions/filter/components/filter_amount_section.state.ts`
- Modify: `screens/transactions/filter/components/filter_amount_section.tsx`
- Create: `__tests__/filter_amount_section.state.test.ts`

- [ ] **Step 1: Create the state file**

```ts
import { create } from 'zustand';

interface FilterAmountSectionState {
  minStr: string;
  maxStr: string;
  setMinStr: (s: string) => void;
  setMaxStr: (s: string) => void;
  reset: () => void;
}

const INITIAL = {
  minStr: '',
  maxStr: '',
};

export const useFilterAmountSectionState = create<FilterAmountSectionState>((set) => ({
  ...INITIAL,
  setMinStr: (v) => set({ minStr: v }),
  setMaxStr: (v) => set({ maxStr: v }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 2: Update the component**

In `screens/transactions/filter/components/filter_amount_section.tsx`:

- Replace the React import line `import { useEffect, useState } from 'react';` with:

  ```ts
  import { useEffect } from 'react';
  ```

- Add the state import:

  ```ts
  import { useFilterAmountSectionState } from './filter_amount_section.state';
  ```

- Replace the two `useState` calls with selectors and an init effect (the originals seeded `useState(formatAmount(min))` once on mount, so we mirror that with an effect that runs once):

  ```ts
  const minStr = useFilterAmountSectionState((s) => s.minStr);
  const maxStr = useFilterAmountSectionState((s) => s.maxStr);
  const setMinStr = useFilterAmountSectionState((s) => s.setMinStr);
  const setMaxStr = useFilterAmountSectionState((s) => s.setMaxStr);
  ```

- Replace the two existing sync effects:

  ```ts
  useEffect(() => {
    setMinStr(formatAmount(min));
  }, [min]);
  useEffect(() => {
    setMaxStr(formatAmount(max));
  }, [max]);
  ```

  with the same effects but parameterised on the new setter:

  ```ts
  useEffect(() => {
    setMinStr(formatAmount(min));
  }, [min, setMinStr]);
  useEffect(() => {
    setMaxStr(formatAmount(max));
  }, [max, setMaxStr]);
  ```

- [ ] **Step 3: Create `filter_amount_section.state.test.ts`**

```ts
import { useFilterAmountSectionState } from '@/screens/transactions/filter/components/filter_amount_section.state';

beforeEach(() => useFilterAmountSectionState.getState().reset());

describe('useFilterAmountSectionState', () => {
  it('starts with empty strings', () => {
    const s = useFilterAmountSectionState.getState();
    expect(s.minStr).toBe('');
    expect(s.maxStr).toBe('');
  });

  it('setMinStr updates minStr', () => {
    useFilterAmountSectionState.getState().setMinStr('100');
    expect(useFilterAmountSectionState.getState().minStr).toBe('100');
  });

  it('setMaxStr updates maxStr', () => {
    useFilterAmountSectionState.getState().setMaxStr('500');
    expect(useFilterAmountSectionState.getState().maxStr).toBe('500');
  });

  it('reset clears both strings', () => {
    useFilterAmountSectionState.setState({ minStr: '100', maxStr: '500' });
    useFilterAmountSectionState.getState().reset();
    const s = useFilterAmountSectionState.getState();
    expect(s.minStr).toBe('');
    expect(s.maxStr).toBe('');
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/filter_amount_section.state.test.ts -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add screens/transactions/filter/components/filter_amount_section.state.ts screens/transactions/filter/components/filter_amount_section.tsx __tests__/filter_amount_section.state.test.ts
git commit -m "refactor(filter_amount_section): replace useState with state file"
```

---

### Task 13: `add_edit_category_sheet.tsx` — extract sheet form state

**Files:**
- Create: `screens/settings/categories/components/add_edit_category_sheet.state.ts`
- Modify: `screens/settings/categories/components/add_edit_category_sheet.tsx`
- Create: `__tests__/add_edit_category_sheet.state.test.ts`

- [ ] **Step 1: Create the state file**

```ts
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { create } from 'zustand';

import { CategoryType } from '@/constants/enums';
import { AccountColors } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface AddEditCategorySheetState {
  type: CategoryType;
  selectedIcon: IconName | null;
  selectedColor: string;
  iconError: string;
  isLoading: boolean;
  setType: (t: CategoryType) => void;
  setSelectedIcon: (icon: IconName | null) => void;
  setSelectedColor: (c: string) => void;
  setIconError: (msg: string) => void;
  setIsLoading: (v: boolean) => void;
  initialize: (params: {
    type: CategoryType;
    icon: IconName | null;
    color: string;
  }) => void;
  reset: () => void;
}

const INITIAL = {
  type: 'expense' as CategoryType,
  selectedIcon: null as IconName | null,
  selectedColor: AccountColors[0],
  iconError: '',
  isLoading: false,
};

export const useAddEditCategorySheetState = create<AddEditCategorySheetState>((set) => ({
  ...INITIAL,
  setType: (t) => set({ type: t }),
  setSelectedIcon: (icon) => set({ selectedIcon: icon }),
  setSelectedColor: (c) => set({ selectedColor: c }),
  setIconError: (msg) => set({ iconError: msg }),
  setIsLoading: (v) => set({ isLoading: v }),
  initialize: ({ type, icon, color }) =>
    set({
      type,
      selectedIcon: icon,
      selectedColor: color,
      iconError: '',
      isLoading: false,
    }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 2: Update the component**

In `screens/settings/categories/components/add_edit_category_sheet.tsx`:

- Drop `useState` from React import:

  ```ts
  import { useEffect } from 'react';
  ```

- Add the state import:

  ```ts
  import { useAddEditCategorySheetState } from './add_edit_category_sheet.state';
  ```

- Remove all five `useState` lines and replace with:

  ```ts
  const type = useAddEditCategorySheetState((s) => s.type);
  const selectedIcon = useAddEditCategorySheetState((s) => s.selectedIcon);
  const selectedColor = useAddEditCategorySheetState((s) => s.selectedColor);
  const iconError = useAddEditCategorySheetState((s) => s.iconError);
  const isLoading = useAddEditCategorySheetState((s) => s.isLoading);
  const setType = useAddEditCategorySheetState((s) => s.setType);
  const setSelectedIcon = useAddEditCategorySheetState((s) => s.setSelectedIcon);
  const setSelectedColor = useAddEditCategorySheetState((s) => s.setSelectedColor);
  const setIconError = useAddEditCategorySheetState((s) => s.setIconError);
  const setIsLoading = useAddEditCategorySheetState((s) => s.setIsLoading);
  const initialize = useAddEditCategorySheetState((s) => s.initialize);
  ```

- Replace the existing init effect:

  ```ts
  useEffect(() => {
    if (visible) {
      if (editingCategory) {
        reset({ name: editingCategory.name });
        initialize({
          type: editingCategory.type,
          icon: editingCategory.icon as IconName,
          color: editingCategory.color,
        });
      } else {
        reset({ name: '' });
        initialize({
          type: activeTab as CategoryType,
          icon: null,
          color: AccountColors[0],
        });
      }
    }
  }, [visible, editingCategory, activeTab]);
  ```

  Note: `reset` here is the RHF reset (still imported from `useZodForm`). `initialize` is the new state action.

- [ ] **Step 3: Create the test file**

```ts
import { CategoryType } from '@/constants/enums';
import { AccountColors } from '@/constants/theme';
import { useAddEditCategorySheetState } from '@/screens/settings/categories/components/add_edit_category_sheet.state';

beforeEach(() => useAddEditCategorySheetState.getState().reset());

describe('useAddEditCategorySheetState', () => {
  it('starts with default expense type, no icon, first color', () => {
    const s = useAddEditCategorySheetState.getState();
    expect(s.type).toBe('expense');
    expect(s.selectedIcon).toBeNull();
    expect(s.selectedColor).toBe(AccountColors[0]);
    expect(s.iconError).toBe('');
    expect(s.isLoading).toBe(false);
  });

  it('setType updates the type', () => {
    useAddEditCategorySheetState.getState().setType('income' as CategoryType);
    expect(useAddEditCategorySheetState.getState().type).toBe('income');
  });

  it('setSelectedIcon updates the icon (and accepts null)', () => {
    useAddEditCategorySheetState.getState().setSelectedIcon('home');
    expect(useAddEditCategorySheetState.getState().selectedIcon).toBe('home');
    useAddEditCategorySheetState.getState().setSelectedIcon(null);
    expect(useAddEditCategorySheetState.getState().selectedIcon).toBeNull();
  });

  it('setSelectedColor updates the color', () => {
    useAddEditCategorySheetState.getState().setSelectedColor('#abcdef');
    expect(useAddEditCategorySheetState.getState().selectedColor).toBe('#abcdef');
  });

  it('setIconError updates the message', () => {
    useAddEditCategorySheetState.getState().setIconError('Pick an icon');
    expect(useAddEditCategorySheetState.getState().iconError).toBe('Pick an icon');
    useAddEditCategorySheetState.getState().setIconError('');
    expect(useAddEditCategorySheetState.getState().iconError).toBe('');
  });

  it('setIsLoading toggles', () => {
    useAddEditCategorySheetState.getState().setIsLoading(true);
    expect(useAddEditCategorySheetState.getState().isLoading).toBe(true);
    useAddEditCategorySheetState.getState().setIsLoading(false);
    expect(useAddEditCategorySheetState.getState().isLoading).toBe(false);
  });

  it('initialize sets type/icon/color and clears error+loading', () => {
    useAddEditCategorySheetState.setState({ iconError: 'something', isLoading: true });
    useAddEditCategorySheetState.getState().initialize({
      type: 'income' as CategoryType,
      icon: 'home',
      color: '#000',
    });
    const s = useAddEditCategorySheetState.getState();
    expect(s.type).toBe('income');
    expect(s.selectedIcon).toBe('home');
    expect(s.selectedColor).toBe('#000');
    expect(s.iconError).toBe('');
    expect(s.isLoading).toBe(false);
  });

  it('reset returns to defaults', () => {
    useAddEditCategorySheetState.setState({
      type: 'income' as CategoryType,
      selectedIcon: 'home',
      selectedColor: '#fff',
      iconError: 'err',
      isLoading: true,
    });
    useAddEditCategorySheetState.getState().reset();
    const s = useAddEditCategorySheetState.getState();
    expect(s.type).toBe('expense');
    expect(s.selectedIcon).toBeNull();
    expect(s.selectedColor).toBe(AccountColors[0]);
    expect(s.iconError).toBe('');
    expect(s.isLoading).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/add_edit_category_sheet.state.test.ts -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add screens/settings/categories/components/add_edit_category_sheet.state.ts screens/settings/categories/components/add_edit_category_sheet.tsx __tests__/add_edit_category_sheet.state.test.ts
git commit -m "refactor(add_edit_category_sheet): replace useState with state file"
```

---

### Task 14: `reassign_category_sheet.tsx` — extract local state

**Files:**
- Create: `screens/settings/categories/components/reassign_category_sheet.state.ts`
- Modify: `screens/settings/categories/components/reassign_category_sheet.tsx`
- Create: `__tests__/reassign_category_sheet.state.test.ts`

- [ ] **Step 1: Create the state file**

```ts
import { create } from 'zustand';

interface ReassignCategorySheetState {
  selectedId: string | null;
  isLoading: boolean;
  setSelectedId: (id: string | null) => void;
  setIsLoading: (v: boolean) => void;
  reset: () => void;
}

const INITIAL = {
  selectedId: null as string | null,
  isLoading: false,
};

export const useReassignCategorySheetState = create<ReassignCategorySheetState>((set) => ({
  ...INITIAL,
  setSelectedId: (id) => set({ selectedId: id }),
  setIsLoading: (v) => set({ isLoading: v }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 2: Update the component**

In `screens/settings/categories/components/reassign_category_sheet.tsx`:

- Remove the `useState` import:

  ```ts
  // delete: import { useState } from 'react';
  ```

- Add the state import:

  ```ts
  import { useReassignCategorySheetState } from './reassign_category_sheet.state';
  ```

- Replace the two `useState` lines with:

  ```ts
  const selectedId = useReassignCategorySheetState((s) => s.selectedId);
  const isLoading = useReassignCategorySheetState((s) => s.isLoading);
  const setSelectedId = useReassignCategorySheetState((s) => s.setSelectedId);
  const setIsLoading = useReassignCategorySheetState((s) => s.setIsLoading);
  ```

- The existing `handleConfirm` does:

  ```ts
  setIsLoading(true);
  try {
    await onConfirm(selectedId);
  } finally {
    setIsLoading(false);
    setSelectedId(null);
  }
  ```

  This still works as-is — leave it.

- [ ] **Step 3: Create the test file**

```ts
import { useReassignCategorySheetState } from '@/screens/settings/categories/components/reassign_category_sheet.state';

beforeEach(() => useReassignCategorySheetState.getState().reset());

describe('useReassignCategorySheetState', () => {
  it('starts with selectedId=null and isLoading=false', () => {
    const s = useReassignCategorySheetState.getState();
    expect(s.selectedId).toBeNull();
    expect(s.isLoading).toBe(false);
  });

  it('setSelectedId stores an id and accepts null to clear', () => {
    useReassignCategorySheetState.getState().setSelectedId('cat-7');
    expect(useReassignCategorySheetState.getState().selectedId).toBe('cat-7');
    useReassignCategorySheetState.getState().setSelectedId(null);
    expect(useReassignCategorySheetState.getState().selectedId).toBeNull();
  });

  it('setIsLoading toggles', () => {
    useReassignCategorySheetState.getState().setIsLoading(true);
    expect(useReassignCategorySheetState.getState().isLoading).toBe(true);
    useReassignCategorySheetState.getState().setIsLoading(false);
    expect(useReassignCategorySheetState.getState().isLoading).toBe(false);
  });

  it('reset clears both fields', () => {
    useReassignCategorySheetState.setState({ selectedId: 'x', isLoading: true });
    useReassignCategorySheetState.getState().reset();
    const s = useReassignCategorySheetState.getState();
    expect(s.selectedId).toBeNull();
    expect(s.isLoading).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/reassign_category_sheet.state.test.ts -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add screens/settings/categories/components/reassign_category_sheet.state.ts screens/settings/categories/components/reassign_category_sheet.tsx __tests__/reassign_category_sheet.state.test.ts
git commit -m "refactor(reassign_category_sheet): replace useState with state file"
```

---

### Task 15: `adjust_balance_sheet.tsx` — extract local state

**Files:**
- Create: `screens/accounts/detail/components/adjust_balance_sheet.state.ts`
- Modify: `screens/accounts/detail/components/adjust_balance_sheet.tsx`
- Create: `__tests__/adjust_balance_sheet.state.test.ts`

- [ ] **Step 1: Create the state file**

```ts
import { create } from 'zustand';

interface AdjustBalanceSheetState {
  input: string;
  error: string;
  setInput: (v: string) => void;
  setError: (v: string) => void;
  initialize: (currentBalance: number) => void;
  reset: () => void;
}

const INITIAL = {
  input: '',
  error: '',
};

export const useAdjustBalanceSheetState = create<AdjustBalanceSheetState>((set) => ({
  ...INITIAL,
  setInput: (v) => set({ input: v }),
  setError: (v) => set({ error: v }),
  initialize: (currentBalance) => set({ input: String(currentBalance), error: '' }),
  reset: () => set(INITIAL),
}));
```

- [ ] **Step 2: Update the component**

In `screens/accounts/detail/components/adjust_balance_sheet.tsx`:

- Drop `useState` from React import:

  ```ts
  import { useEffect } from 'react';
  ```

- Add the state import:

  ```ts
  import { useAdjustBalanceSheetState } from './adjust_balance_sheet.state';
  ```

- Replace the two `useState` lines with selectors:

  ```ts
  const input = useAdjustBalanceSheetState((s) => s.input);
  const error = useAdjustBalanceSheetState((s) => s.error);
  const setInput = useAdjustBalanceSheetState((s) => s.setInput);
  const setError = useAdjustBalanceSheetState((s) => s.setError);
  const initialize = useAdjustBalanceSheetState((s) => s.initialize);
  ```

- Replace the existing init effect:

  ```ts
  useEffect(() => {
    if (visible) {
      initialize(currentBalance);
    }
  }, [visible, currentBalance, initialize]);
  ```

- The TextInput `onChangeText` block currently does:

  ```ts
  onChangeText={(v) => {
    setInput(v);
    setError('');
  }}
  ```

  Leave it as-is (both setters are now from the store).

- [ ] **Step 3: Create the test file**

```ts
import { useAdjustBalanceSheetState } from '@/screens/accounts/detail/components/adjust_balance_sheet.state';

beforeEach(() => useAdjustBalanceSheetState.getState().reset());

describe('useAdjustBalanceSheetState', () => {
  it('starts with empty input and empty error', () => {
    const s = useAdjustBalanceSheetState.getState();
    expect(s.input).toBe('');
    expect(s.error).toBe('');
  });

  it('setInput updates the input string', () => {
    useAdjustBalanceSheetState.getState().setInput('123.45');
    expect(useAdjustBalanceSheetState.getState().input).toBe('123.45');
  });

  it('setError updates the error message', () => {
    useAdjustBalanceSheetState.getState().setError('invalid');
    expect(useAdjustBalanceSheetState.getState().error).toBe('invalid');
    useAdjustBalanceSheetState.getState().setError('');
    expect(useAdjustBalanceSheetState.getState().error).toBe('');
  });

  it('initialize seeds input from a number and clears error', () => {
    useAdjustBalanceSheetState.setState({ error: 'old' });
    useAdjustBalanceSheetState.getState().initialize(150);
    const s = useAdjustBalanceSheetState.getState();
    expect(s.input).toBe('150');
    expect(s.error).toBe('');
  });

  it('reset returns to empty defaults', () => {
    useAdjustBalanceSheetState.setState({ input: '99', error: 'oops' });
    useAdjustBalanceSheetState.getState().reset();
    const s = useAdjustBalanceSheetState.getState();
    expect(s.input).toBe('');
    expect(s.error).toBe('');
  });
});
```

- [ ] **Step 4: Run tests**

Run: `npx jest __tests__/adjust_balance_sheet.state.test.ts -v`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add screens/accounts/detail/components/adjust_balance_sheet.state.ts screens/accounts/detail/components/adjust_balance_sheet.tsx __tests__/adjust_balance_sheet.state.test.ts
git commit -m "refactor(adjust_balance_sheet): replace useState with state file"
```

---

## Phase 5: Documentation

### Task 16: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update the screens/ anatomy section**

In `CLAUDE.md`, find the `### screens/ anatomy` section (right after the `### app/ rules` section). Replace the current paragraph:

```
Each folder: `index.tsx` (UI, no useState/useSharedValue) · `<name>.hook.ts` (logic, RHF/Zod, nav) · `<name>.store.ts` (local UI state, omit if unneeded) · `<name>.anim.ts` (Reanimated only) · `components/`
```

with:

```
Each folder: `index.tsx` (UI, no useState/useSharedValue) · `<name>.hook.ts` (logic, RHF/Zod, nav, no useState) · `<name>.store.ts` (data: form drafts, selections, fetched results — omit if none) · `<name>.state.ts` (UI state: visibility, loading, errors, tab selection — omit if none) · `<name>.anim.ts` (Reanimated only) · `components/` (per-component `.state.ts` lives next to its `.tsx` when the component had local state)
```

- [ ] **Step 2: Verify the change**

Run: `grep -n "state.ts" CLAUDE.md`
Expected: at least one match referring to the new convention.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: document .store.ts vs .state.ts convention"
```

---

## Phase 6: Final Verification

### Task 17: Full test suite + grep + smoke test

**Files:** none modified — verification only.

- [ ] **Step 1: Confirm no `useState` remains under `screens/**` (excluding `.anim.ts`)**

Run:

```bash
grep -rn "useState" screens --include="*.ts" --include="*.tsx" | grep -v "\.anim\.ts"
```

Expected: empty output. If anything appears, return to the matching task and fix it.

- [ ] **Step 2: Confirm there are no leftover imports of removed `.store.ts` files**

The renamed paths are:
- `account_detail.store` → `account_detail.state`
- `settings/currency/currency.store` → `settings/currency/currency.state`
- `onboarding/ready/ready.store` → `onboarding/ready/ready.state`

Run:

```bash
grep -rn "account_detail.store\|settings/currency/currency.store\|onboarding/ready/ready.store" . --include="*.ts" --include="*.tsx"
```

Expected: empty.

- [ ] **Step 3: Confirm split stores no longer expose moved state from data store**

Run:

```bash
grep -rn "useFilterDrawerStore.*\.visible\|useAddTransactionStore.*\.visible\|useEditTransactionStore.*\.visible\|useCategoriesScreenStore.*\.activeTab" . --include="*.ts" --include="*.tsx"
```

Expected: empty.

- [ ] **Step 4: Run the full coverage suite**

Run: `npm run test:coverage`
Expected: PASS, with coverage thresholds met (80% lines / 95% functions / 100% branches).

If coverage drops below threshold, identify the under-covered file and add the missing test case (the simple state stores have one branch each — the `reset()` path in `handleNumpad` may need an explicit non-zero `decimal-after-2-digits` test which is already present in copied tests).

- [ ] **Step 5: Manual smoke test**

Boot the app: `npx expo start`. Walk through every flow that touched a refactored module:

| Flow | What to verify |
|---|---|
| Onboarding O1 → O6 | Currency selection, security choice, account creation, summary completion. The "Open My Dashboard" CTA still triggers `completing` flag (button disables briefly). |
| Dashboard | Pull-to-refresh works, breakdown sheet opens/closes, account stats load. |
| Account detail | Edit name, adjust balance, archive — all sheets open/close, save buttons disable while saving. |
| Transactions list | Search input updates with debounce, type tabs switch, filter drawer opens/closes, applied filters persist after close. |
| Filter drawer | Account picker, category picker, custom date picker open and close cleanly. Reset clears draft. Apply commits to applied filters. |
| Add transaction | FAB opens sheet, type tabs work, numpad keeps amountStr correct, account/category pickers open, USD account triggers exchange rate row, override toggle works, save closes the sheet and resets the form. |
| Edit transaction | Open from a transaction row, amount initialises correctly, exchange rate override matches the saved tx, save closes cleanly. |
| Transaction detail | Loads the transaction, delete confirm sheet opens/closes, deleting disables the confirm button. |
| Settings → Categories | Switch tabs, add category sheet opens/closes, edit sheet preserves icon/color, delete confirm flow opens/closes. |
| Settings → Currency | Manual rate panel opens/closes, fetch button disables during fetch, save button disables during save. |

- [ ] **Step 6: Final commit (if needed) / push**

If any tests or smoke fixes were applied during step 5, commit them:

```bash
git add -A
git commit -m "fix: smoke-test corrections after store/state split"
```

Then push the branch:

```bash
git push -u origin refactor/store-state-split
```

---

## Self-Review Checklist Results

**Spec coverage:**
- ✅ §1 File layout — implicitly enforced by every task creating files in the prescribed location.
- ✅ §2 Data vs UI rule — every task respects the classification table; each new file's contents map cleanly to one bucket.
- ✅ §3 Concrete per-file changes — Phases 1–4 cover every entry in the spec's per-file tables.
- ✅ §4 Per-instance reset — every new state/store exports `reset()`; sheet hooks call it (existing `useEffect(() => () => reset(), [])` pattern preserved in Tasks 1, 9).
- ✅ §5 Cross-store coordination — Task 4 (filter), Task 5 (add tx), Task 6 (edit tx), Task 7 (categories) all move composite actions into their hooks.
- ✅ §6 Tests — every renamed/split test file is updated; new state files get bespoke tests for coverage thresholds.
- ✅ §7 CLAUDE.md update — Task 16.

**Placeholder scan:** none. Every step contains exact code or exact commands.

**Type consistency:**
- `useFilterDrawerStore.setDraft` — added in Task 4 Step 1, used by `transactions.hook.ts` in Task 4 Step 4 and tests in Task 4 Step 5.
- `useEditTransactionStore.loadFromTx` — added in Task 6 Step 1, used by call-site updates in Task 6 Step 4 and tests in Task 6 Step 5.
- `useDashboardState`, `useDashboardStore` — defined Task 8, consumed Task 8.
- `useTxDetailState.bumpReload` — defined Task 9 Step 1, used in Task 9 Step 3 (`reload = useCallback(() => bumpReload(), [bumpReload])`).
- `initialize` actions on the picker / sheet states — defined and used in their respective tasks (Tasks 11, 13, 15).
