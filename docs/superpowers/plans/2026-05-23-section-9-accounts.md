# Section 9 · Accounts — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the Accounts domain detail-and-form surfaces (`screens/accounts/**`) to HeroUI Native + Cairo Nights, replace the dead `MiniChart` with an information-rich balance hero, migrate `adjust_balance_sheet` from `react-native-actions-sheet` to the declarative `Sheet`, keep the archive dialog as a re-skinned RN `Modal`, and (in a separately-gated final PR) delete the legacy `react-native-actions-sheet` dependency + patch.

**Architecture:** V1/V2 directory split — the identical mechanic §4/§5/§6/§7 used. V1 code at `screens/accounts/` stays untouched until the §9a cleanup task. V2 code lives in `screens/accounts_v2/`. The two route files (`app/(app)/accounts/[id]/index.tsx` and `app/(app)/accounts/add_account/index.tsx`) become flag-branch components reading `FeatureFlags.newAccounts`. After local QA, a single promotion commit flips the flag; a cleanup commit deletes V1, restores the routes to one-line re-exports, removes the flag, and updates CLAUDE.md. **§9b** (dependency + patch deletion) is a separate, hard-gated, user-escalated PR that may only land after BOTH §8's `pay_sheet` migration AND §9a are merged to `main`.

**Tech Stack:** React Native · Expo (expo-dev-client) · TypeScript strict · Expo Router v3 · expo-sqlite · Zustand v5 · RHF v7 + Zod v4 · HeroUI Native v1.0 · Unistyles 3 (via Uniwind) · @gorhom/bottom-sheet v5 · react-native-reanimated v4 · MaterialCommunityIcons · Jest

**Spec:** [`docs/superpowers/specs/2026-05-23-section-9-accounts-design.md`](../specs/2026-05-23-section-9-accounts-design.md)

---

## ⚠️ High-blast-radius / critical-trigger PRs (escalation map)

These steps fire CLAUDE.md critical triggers. Tariq/Sarah approve §9a routine work on the user's behalf; the items below need explicit handling:

| Step | Trigger | Handling |
|---|---|---|
| Task 12 — promotion (flip `newAccounts` → true) | #3 High blast radius (flag flip) | Gated behind Task 11 device-QA (user-walked). Routine flag-flip mechanics, but **only after** the QA gate clears. |
| Task 13 — V1 deletion + flag removal | #3 High blast radius (V1 deletion) | Team-approved (cleanup is mandated by the flag rule), runs after promotion merges. |
| Task 11 — device QA | #8 Manual device QA | **Always user-escalated.** Only the user walks the matrix on a real device. |
| **Task 14 — §9b dep + patch deletion** | #3 (high blast radius) AND #4 (dependency removal) | **HARD-GATED + USER-ESCALATED.** Must not start until §8 `pay_sheet` and §9a are both on `main`, the zero-importer grep is clean, and the user has explicitly authorized the deletion. |

Everything else (component re-skins, sheet migration, hook/state copies, tests, strings, wave sequencing) is team-decided.

---

## CLAUDE.md coordination note (§8 ↔ §9)

Both §8 and §9 edit the **same two CLAUDE.md regions**:

1. The **Tech Stack** line tag — `react-native-actions-sheet (legacy, phasing out §4–§9; …)`.
2. The **Bottom Sheets → "Legacy consumers still in-flight"** list (which names both `adjust_balance_sheet.tsx` (§9) and `pay_sheet.tsx` (§8)).

**Rule:** whichever section's PR merges *second* rebases its CLAUDE.md edit on the other's. §9a removes only the `adjust_balance_sheet.tsx` line from the legacy-consumer list. §9b (later) removes the **entire** "react-native-actions-sheet — LEGACY" section and drops the Tech Stack tag — but only once `pay_sheet.tsx` is also gone. Do not delete the whole section in §9a.

---

## Parallel Execution Map

```
§9a
Group A (Shared infra)              ─── no deps ──► start immediately
  Task 1: Strings — balance-hero caption keys
  Task 2: parseAdjustInput pure helper + tests

Group B (V2 scaffold — copies)      ─── no deps ──► parallel with A
  Task 3: V2 detail state + anim (verbatim copies, renamed store factory)
  Task 4: V2 detail hook (verbatim logic copy, repointed imports)
  Task 5: V2 add_account hook + anim (copies)

Group C (V2 components)             ─── depends on A ──► parallel after Task 1/2
  Task 6:  balance_hero.tsx + tests (replaces mini_chart)
  Task 7:  adjust_balance_sheet.tsx (Sheet migration) + state copy
  Task 8:  archive_confirmation_dialog.tsx (Modal re-skin)
  Task 9:  add_account type_pill.tsx (copy) + add_account/index.tsx (mirror onboarding_v2)

Group D (Screen integration)        ─── depends on B + C
  Task 10: detail/index.tsx assembly + edit-schema test

Group E (Route flag-branch + QA)    ─── depends on D
  Task 11: flag-branch both routes (flag still false) + 🛑 device QA gate

Group F (Promote + cleanup)         ─── depends on E
  Task 12: promotion commit — flip newAccounts → true   [HIGH BLAST RADIUS]
  Task 13: cleanup commit — delete V1, rename V2→canonical, drop flag, CLAUDE.md   [HIGH BLAST RADIUS]

§9b  (SEPARATE PR — HARD-GATED, USER-ESCALATED)
  Task 14: delete react-native-actions-sheet dep + patch + CLAUDE.md legacy section
           GATE: §8 pay_sheet AND §9a (Task 13) both merged to main + user authorization
```

**Parallel-safe:** Tasks 1–5 can all run at once. After Task 1+2 land, Tasks 6/7/8/9 run in parallel (different files). Task 10 is sequential after 6–9. Tasks 11→12→13 are strictly sequential. Task 14 is a wholly separate, gated PR.

---

## File Map (§9a)

### New files (under `screens/accounts_v2/`)

```
screens/accounts_v2/detail/index.tsx
screens/accounts_v2/detail/account_detail.hook.ts
screens/accounts_v2/detail/account_detail.state.ts
screens/accounts_v2/detail/account_detail.anim.ts
screens/accounts_v2/detail/components/balance_hero.tsx
screens/accounts_v2/detail/components/adjust_balance_sheet.tsx
screens/accounts_v2/detail/components/adjust_balance_sheet.state.ts
screens/accounts_v2/detail/components/adjust_balance_sheet.helpers.ts
screens/accounts_v2/detail/components/archive_confirmation_dialog.tsx
screens/accounts_v2/add_account/index.tsx
screens/accounts_v2/add_account/add_account.hook.ts
screens/accounts_v2/add_account/add_account.anim.ts
screens/accounts_v2/add_account/components/type_pill.tsx

__tests__/screens/accounts_v2/adjust_balance_validation.test.ts
__tests__/screens/accounts_v2/balance_hero.helpers.test.ts
__tests__/screens/accounts_v2/account_detail_v2.hook.test.ts
__tests__/screens/accounts_v2/add_account_v2.hook.test.ts
__tests__/screens/accounts_v2/edit_account_schema.test.ts
```

> NOTE on the balance-hero helper test: the type-aware caption / utilisation-color logic is extracted to a pure helper (`balance_hero.helpers.ts`) so it is unit-testable without rendering (logic-only testing rule). The `.tsx` component imports it.

### Modified files (§9a)

```
constants/strings.ts                       (new balance-hero caption keys)
app/(app)/accounts/[id]/index.tsx          (route → flag-branch, then one-liner in cleanup)
app/(app)/accounts/add_account/index.tsx   (route → flag-branch, then one-liner in cleanup)
constants/feature_flags.ts                 (flip newAccounts in promotion; remove in cleanup)
CLAUDE.md                                  (remove adjust_balance_sheet.tsx from legacy list in cleanup)
```

### Deleted files (§9a cleanup task only)

```
screens/accounts/                          (entire V1 detail + add_account tree)
```

### §9b files (separate gated PR)

```
package.json                               (remove "react-native-actions-sheet" line)
patches/react-native-actions-sheet+10.1.2.patch   (DELETE)
CLAUDE.md                                  (remove the "react-native-actions-sheet — LEGACY" section + Tech Stack tag)
```

---

## Task 1: Strings — balance-hero caption keys

**Goal:** Add the three new caption keys the balance hero needs. The label reuses the existing `accountDetailBalance` ("Current Balance"), per the spec sign-off (Open Question #4 — reuse, non-critical). No string is renamed or removed.

**Files:**
- Modify: `constants/strings.ts`

- [ ] **Step 1: Locate the account string block**

Open `constants/strings.ts`. Find the `accountDetail*` block (around `accountDetailBalance: 'Current Balance'`, ~line 177) and the `adjustBalance*` block (~line 190). New keys go directly after the `accountDetail*` block.

- [ ] **Step 2: Add the three new keys**

Insert after `accountDetailArchiveConfirm`:

```typescript
  // §9 Account Detail — balance hero captions
  accountHeroOpening: (amount: string, currency: string) => `Opening ${amount} ${currency}`,
  accountHeroAdjusted: 'adjusted',
  accountHeroAvailable: (avail: string, currency: string, limit: string) =>
    `Available ${avail} ${currency} of ${limit}`,
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: clean (function-style keys compile under the existing `Strings` const-as-const pattern).

- [ ] **Step 4: Commit**

```bash
git add constants/strings.ts
git commit -m "feat(§9a): add balance-hero caption string keys"
```

---

## Task 2: `parseAdjustInput` pure helper + tests

**Goal:** Extract the parse-and-validate logic currently inline in V1's `adjust_balance_sheet.tsx` `handleSave` into a pure, unit-testable helper. Covers spec test cases A-01..A-04.

**Files:**
- Create: `screens/accounts_v2/detail/components/adjust_balance_sheet.helpers.ts`
- Create: `__tests__/screens/accounts_v2/adjust_balance_validation.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `__tests__/screens/accounts_v2/adjust_balance_validation.test.ts`:

```typescript
import { parseAdjustInput } from '@/screens/accounts_v2/detail/components/adjust_balance_sheet.helpers';

describe('parseAdjustInput', () => {
  it('A-01: parses a valid positive decimal string', () => {
    expect(parseAdjustInput('27500')).toEqual({ ok: true, value: 27500 });
  });

  it('A-01: parses a decimal with a fractional part', () => {
    expect(parseAdjustInput('123.45')).toEqual({ ok: true, value: 123.45 });
  });

  it('A-02: rejects a negative number', () => {
    expect(parseAdjustInput('-5')).toEqual({ ok: false });
  });

  it('A-03: rejects an empty string', () => {
    expect(parseAdjustInput('')).toEqual({ ok: false });
  });

  it('A-03: rejects a non-numeric string', () => {
    expect(parseAdjustInput('abc')).toEqual({ ok: false });
  });

  it('A-04: accepts zero (0 >= 0)', () => {
    expect(parseAdjustInput('0')).toEqual({ ok: true, value: 0 });
  });

  it('rejects Infinity-producing input', () => {
    expect(parseAdjustInput('1e999')).toEqual({ ok: false });
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npm test -- __tests__/screens/accounts_v2/adjust_balance_validation.test.ts`
Expected: FAIL — `parseAdjustInput is not a function` (module does not exist).

- [ ] **Step 3: Implement the helper**

Create `screens/accounts_v2/detail/components/adjust_balance_sheet.helpers.ts`:

```typescript
/**
 * Pure parse-and-validate for the Adjust Balance input.
 * Mirrors the V1 inline guard verbatim ([layla] §3.4): the value must be
 * finite and >= 0. Applies to ALL account types including credit cards.
 */
export type AdjustParseResult = { ok: true; value: number } | { ok: false };

export function parseAdjustInput(raw: string): AdjustParseResult {
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n < 0) {
    return { ok: false };
  }
  return { ok: true, value: n };
}
```

- [ ] **Step 4: Run the tests — they must pass**

Run: `npm test -- __tests__/screens/accounts_v2/adjust_balance_validation.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add screens/accounts_v2/detail/components/adjust_balance_sheet.helpers.ts __tests__/screens/accounts_v2/adjust_balance_validation.test.ts
git commit -m "feat(§9a): extract parseAdjustInput pure helper + validation tests (A-01..A-04)"
```

---

## Task 3: V2 detail state + anim (verbatim copies)

**Goal:** Stand up the V2 detail folder's data-plumbing files. Both are functional copies of V1 — no shape change (spec §4.3).

**Files:**
- Create: `screens/accounts_v2/detail/account_detail.state.ts`
- Create: `screens/accounts_v2/detail/account_detail.anim.ts`

- [ ] **Step 1: Create `account_detail.state.ts`**

Copy of V1 (`screens/accounts/detail/account_detail.state.ts`) verbatim. The factory + singleton pattern is preserved exactly:

```typescript
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

- [ ] **Step 2: Create `account_detail.anim.ts`**

Copy of V1 (`screens/accounts/detail/account_detail.anim.ts`) verbatim:

```typescript
import {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useAccountDetailAnim() {
  const headerScale = useSharedValue(1);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: headerScale.value }],
  }));

  const triggerEditToggle = () => {
    headerScale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1.0, { damping: 10 }),
    );
  };

  return {
    headerStyle,
    triggerEditToggle,
    fieldEntering: FadeInDown.duration(200),
    fieldExiting: FadeOutUp.duration(150),
    errorEntering: FadeInDown.duration(150),
    errorExiting: FadeOutUp.duration(100),
  };
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add screens/accounts_v2/detail/account_detail.state.ts screens/accounts_v2/detail/account_detail.anim.ts
git commit -m "feat(§9a): scaffold V2 detail state + anim (verbatim copies)"
```

---

## Task 4: V2 detail hook (verbatim logic copy)

**Goal:** Copy V1's `useAccountDetail` hook into V2 with imports repointed to the V2 state file. Logic (edit schema, RHF, save/adjust/archive handlers, `beforeRemove` listener, unmount reset) is unchanged — this is the load-bearing guard against regressions (spec R8). Covers spec hook test §5.5.

**Files:**
- Create: `screens/accounts_v2/detail/account_detail.hook.ts`
- Create: `__tests__/screens/accounts_v2/account_detail_v2.hook.test.ts`

- [ ] **Step 1: Write the failing smoke tests**

Create `__tests__/screens/accounts_v2/account_detail_v2.hook.test.ts` (mirrors the V1 hook test, repointed to V2):

```typescript
import { renderHook } from '@testing-library/react-native';

import { useAccountDetail } from '@/screens/accounts_v2/detail/account_detail.hook';
import { useAccountStore } from '@/store/account.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => ({ id: 'acc-1' }),
  useRouter: () => ({ back: jest.fn() }),
  useNavigation: () => ({ addListener: jest.fn(() => jest.fn()) }),
}));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/screens/accounts_v2/detail/account_detail.state', () => {
  const mockState = {
    state: {
      isEditing: false,
      isAdjustVisible: false,
      isArchiveVisible: false,
      isSaving: false,
      isAdjusting: false,
      isArchiving: false,
    },
    setEditing: jest.fn(),
    setAdjustVisible: jest.fn(),
    setArchiveVisible: jest.fn(),
    setSaving: jest.fn(),
    setAdjusting: jest.fn(),
    setArchiving: jest.fn(),
    reset: jest.fn(),
  };
  const useAccountDetailState = Object.assign(
    jest.fn((sel: any) => sel(mockState)),
    {
      getState: jest.fn(() => ({
        state: { isEditing: false },
        setEditing: jest.fn(),
      })),
    },
  );
  return { useAccountDetailState };
});

function setup() {
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { accounts: [] },
      updateAccount: jest.fn(),
      archiveAccount: jest.fn(),
      adjustBalance: jest.fn(),
    }),
  );
}

describe('useAccountDetail (V2)', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useAccountDetail())).not.toThrow();
  });

  it('account is undefined when accounts list is empty', () => {
    const { result } = renderHook(() => useAccountDetail());
    expect(result.current.state.account).toBeUndefined();
  });

  it('exposes the handler surface the screen consumes', () => {
    const { result } = renderHook(() => useAccountDetail());
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.handleAdjustBalance).toBe('function');
    expect(typeof result.current.handleArchive).toBe('function');
    expect(typeof result.current.onBack).toBe('function');
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npm test -- __tests__/screens/accounts_v2/account_detail_v2.hook.test.ts`
Expected: FAIL — cannot resolve `@/screens/accounts_v2/detail/account_detail.hook`.

- [ ] **Step 3: Create the hook**

Create `screens/accounts_v2/detail/account_detail.hook.ts` as a copy of V1 (`screens/accounts/detail/account_detail.hook.ts`) with the ONLY change being the state import path (`./account_detail.state` resolves to the V2 file because it is colocated). Reproduce verbatim:

```typescript
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { z } from 'zod';
import { useShallow } from 'zustand/react/shallow';

import { Strings } from '@/constants/strings';
import { AccountColors } from '@/constants/theme';
import { useAccountStore } from '@/store/account.store';
import { useZodForm } from '@/utils/use_zod_form.hook';

import { useAccountDetailState } from './account_detail.state';

export function useAccountDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const navigation = useNavigation();

  const {
    state: accountState,
    updateAccount,
    archiveAccount,
    adjustBalance,
  } = useAccountStore(
    useShallow((s) => ({
      state: s.state,
      updateAccount: s.updateAccount,
      archiveAccount: s.archiveAccount,
      adjustBalance: s.adjustBalance,
    })),
  );
  const {
    state: detailState,
    setEditing,
    setAdjustVisible,
    setArchiveVisible,
    setSaving,
    setAdjusting,
    setArchiving,
    reset,
  } = useAccountDetailState(
    useShallow((s) => ({
      state: s.state,
      setEditing: s.setEditing,
      setAdjustVisible: s.setAdjustVisible,
      setArchiveVisible: s.setArchiveVisible,
      setSaving: s.setSaving,
      setAdjusting: s.setAdjusting,
      setArchiving: s.setArchiving,
      reset: s.reset,
    })),
  );

  // oxlint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => reset(), []); // cleanup on unmount only; reset is a stable Zustand action

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (!useAccountDetailState.getState().state.isEditing) return;
      e.preventDefault();
      useAccountDetailState.getState().setEditing(false);
    });
    return unsubscribe;
  }, [navigation]);

  const account = accountState.accounts.find((a) => a.id === id);

  const editSchema = useMemo(
    () =>
      z.object({
        name: z
          .string()
          .min(1, Strings.errNameRequired)
          .max(30, Strings.errNameTooLong)
          .refine(
            (n) =>
              !accountState.accounts.some(
                (a) => a.id !== id && a.name.trim().toLowerCase() === n.trim().toLowerCase(),
              ),
            { message: Strings.errNameDuplicate },
          ),
        color: z.string(),
      }),
    [accountState.accounts, id],
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

  const onBack = () => {
    if (detailState.isEditing) {
      setEditing(false);
    } else {
      router.back();
    }
  };

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

- [ ] **Step 4: Run the tests — they must pass**

Run: `npm test -- __tests__/screens/accounts_v2/account_detail_v2.hook.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add screens/accounts_v2/detail/account_detail.hook.ts __tests__/screens/accounts_v2/account_detail_v2.hook.test.ts
git commit -m "feat(§9a): V2 detail hook (verbatim logic copy) + smoke tests"
```

---

## Task 5: V2 add_account hook + anim (copies)

**Goal:** Provide the V2 main-app Add Account hook and anim. The hook is a copy of V1's `useAddAccountApp` (`screens/accounts/add_account/add_account.hook.ts`) — it already does the right thing: reuse the shared schema, `addAccount`, `router.back()` on save. We rename it to `useAddAccountAppV2` to avoid confusion and keep V1 untouched. The color picker uses `ACCOUNT_COLORS` from the onboarding_v2 hook idiom (AcctTokens rich values) per spec §2.4/§2.8. Anim is a copy of the onboarding_v2 anim (`useAddAccountAnim` + `useTypePillAnim`).

**Files:**
- Create: `screens/accounts_v2/add_account/add_account.hook.ts`
- Create: `screens/accounts_v2/add_account/add_account.anim.ts`
- Create: `__tests__/screens/accounts_v2/add_account_v2.hook.test.ts`

- [ ] **Step 1: Write the failing smoke tests**

Create `__tests__/screens/accounts_v2/add_account_v2.hook.test.ts`:

```typescript
import { renderHook } from '@testing-library/react-native';

import { useAddAccountAppV2 } from '@/screens/accounts_v2/add_account/add_account.hook';
import { useAccountStore } from '@/store/account.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn() }),
}));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));

function setup() {
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] }, addAccount: jest.fn() }),
  );
}

describe('useAddAccountAppV2', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useAddAccountAppV2())).not.toThrow();
  });

  it('returns form, handleSave, and onBack', () => {
    const { result } = renderHook(() => useAddAccountAppV2());
    expect(result.current.form).toBeDefined();
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.onBack).toBe('function');
  });

  it('exports the 12-entry ACCOUNT_COLORS preset row', async () => {
    const { ACCOUNT_COLORS } = await import('@/screens/accounts_v2/add_account/add_account.hook');
    expect(ACCOUNT_COLORS).toHaveLength(12);
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npm test -- __tests__/screens/accounts_v2/add_account_v2.hook.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Create the anim file**

Create `screens/accounts_v2/add_account/add_account.anim.ts` as a verbatim copy of `screens/onboarding_v2/add_account/add_account.anim.ts` (exports `useAddAccountAnim` and `useTypePillAnim`):

```typescript
import {
  FadeInDown,
  FadeOutUp,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

export function useAddAccountAnim() {
  const btnScale = useSharedValue(1);

  const btnAnim = useAnimatedStyle(() => ({
    transform: [{ scale: btnScale.value }],
  }));

  const triggerBtnPress = () => {
    btnScale.value = withSequence(
      withTiming(0.97, { duration: 80 }),
      withSpring(1.0, { damping: 10 }),
    );
  };

  return {
    btnAnim,
    triggerBtnPress,
    ccEntering: FadeInDown.duration(250),
    ccExiting: FadeOutUp.duration(200),
    aprEntering: FadeInDown.duration(200),
    aprExiting: FadeOutUp.duration(150),
    errorEntering: FadeInDown.duration(150),
    errorExiting: FadeOutUp.duration(100),
  };
}

export function useTypePillAnim() {
  const scale = useSharedValue(1);

  const pillAnim = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const triggerPillTap = () => {
    scale.value = withSequence(
      withSpring(1.03, { damping: 8, stiffness: 200 }),
      withSpring(1.0, { damping: 12 }),
    );
  };

  return { pillAnim, triggerPillTap };
}
```

- [ ] **Step 4: Create the hook**

Create `screens/accounts_v2/add_account/add_account.hook.ts`. It is V1's `useAddAccountApp` body (returns `{ form, handleSave, onBack }`, calls `router.back()` on submit) PLUS the `ACCOUNT_COLORS` preset export copied from `onboarding_v2/add_account/add_account.hook.ts` (AcctTokens rich values), with default `selected_color` set to `AcctTokens.midnight.rich`:

```typescript
import { useRouter } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { AccountType, Currency } from '@/constants/enums';
import { AcctTokens } from '@/constants/theme_tokens';
import { useAccountStore } from '@/store/account.store';
import {
  createAddAccountSchema,
  type AddAccountFormData,
} from '@/utils/schemas/add_account.schema';
import { useZodForm } from '@/utils/use_zod_form.hook';

// 12 ACCOUNT_COLORS sourced from AcctTokens.*.rich values (spec §2.4), mirroring
// onboarding_v2/add_account. Exported so index.tsx renders the picker row.
export const ACCOUNT_COLORS = [
  AcctTokens.midnight.rich,
  AcctTokens.gold.rich,
  AcctTokens.nile.rich,
  AcctTokens.paprika.rich,
  AcctTokens.plum.rich,
  AcctTokens.lapis.rich,
  AcctTokens.rose.rich,
  AcctTokens.sand.rich,
  AcctTokens.amethyst.rich,
  AcctTokens.emerald.rich,
  AcctTokens.saffron.rich,
  AcctTokens.steel.rich,
] as const;

export function useAddAccountAppV2() {
  const router = useRouter();
  const { state: accountState, addAccount } = useAccountStore(
    useShallow((s) => ({ state: s.state, addAccount: s.addAccount })),
  );

  useEffect(() => {
    void useAccountStore.getState().loadAccounts();
  }, []);

  const schema = useMemo(
    () => createAddAccountSchema(accountState.accounts),
    [accountState.accounts],
  );

  const form = useZodForm(schema, {
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    defaultValues: {
      name: '',
      balance: '',
      selected_type: AccountType.Bank,
      selected_color: AcctTokens.midnight.rich,
      currency: Currency.EGP,
      interest_tracking: false,
      credit_limit: '',
      apr: '',
      revolving_balance: '',
      min_payment: '',
      due_day: '',
    },
  });

  const onSubmit = async (data: AddAccountFormData) => {
    const isCC = data.selected_type === AccountType.CreditCard;
    await addAccount({
      name: data.name.trim(),
      type: data.selected_type,
      currency: data.currency,
      opening_balance: parseFloat(data.balance),
      color: data.selected_color,
      interest_tracking: data.interest_tracking ? 1 : 0,
      sort_order: accountState.accounts.length,
      credit_limit: isCC && data.credit_limit?.trim() ? parseFloat(data.credit_limit) : null,
      revolving_balance:
        isCC && data.revolving_balance?.trim() ? parseFloat(data.revolving_balance) || 0 : null,
      minimum_payment: isCC && data.min_payment?.trim() ? parseFloat(data.min_payment) : null,
      statement_due_day: isCC && data.due_day?.trim() ? parseInt(data.due_day, 10) : null,
      apr: isCC && data.interest_tracking && data.apr?.trim() ? parseFloat(data.apr) : null,
    });
    router.back();
  };

  const onBack = () => router.back();

  return { form, handleSave: form.handleSubmit(onSubmit), onBack };
}
```

- [ ] **Step 5: Run the tests — they must pass**

Run: `npm test -- __tests__/screens/accounts_v2/add_account_v2.hook.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add screens/accounts_v2/add_account/add_account.hook.ts screens/accounts_v2/add_account/add_account.anim.ts __tests__/screens/accounts_v2/add_account_v2.hook.test.ts
git commit -m "feat(§9a): V2 add_account hook (router.back on save) + anim + ACCOUNT_COLORS"
```

---

## Task 6: `balance_hero.tsx` + helper (replaces `mini_chart`)

**Goal:** Replace the dead `MiniChart` with an information-rich balance hero (spec §2.3). All caption/utilisation logic lives in a pure helper so it is unit-testable (logic-only testing rule). Covers spec worked examples E-1..E-5 and test R4.

**Files:**
- Create: `screens/accounts_v2/detail/components/balance_hero.helpers.ts`
- Create: `screens/accounts_v2/detail/components/balance_hero.tsx`
- Create: `__tests__/screens/accounts_v2/balance_hero.helpers.test.ts`

- [ ] **Step 1: Write the failing helper tests**

Create `__tests__/screens/accounts_v2/balance_hero.helpers.test.ts`:

```typescript
import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/store/account.store';
import {
  availableCreditColor,
  buildHeroCaption,
} from '@/screens/accounts_v2/detail/components/balance_hero.helpers';

function mkAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    name: 'CIB',
    type: AccountType.Bank,
    currency: Currency.EGP,
    opening_balance: 30000,
    current_balance: 30000,
    color: '#1B2B4B',
    credit_limit: null,
    revolving_balance: null,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0,
    apr: null,
    is_archived: 0,
    sort_order: 0,
    created_at: '2026-05-23T00:00:00.000Z',
    updated_at: '2026-05-23T00:00:00.000Z',
    ...overrides,
  } as Account;
}

describe('buildHeroCaption — non-CC types', () => {
  it('E-1: shows opening only when current === opening', () => {
    const cap = buildHeroCaption(mkAccount({ opening_balance: 30000, current_balance: 30000 }));
    expect(cap.text).toBe('Opening 30,000 EGP');
    expect(cap.adjusted).toBe(false);
  });

  it('E-1: appends adjusted flag when current !== opening', () => {
    const cap = buildHeroCaption(mkAccount({ opening_balance: 30000, current_balance: 28100 }));
    expect(cap.text).toBe('Opening 30,000 EGP');
    expect(cap.adjusted).toBe(true);
  });

  it('E-4: uses the account currency (USD), no conversion', () => {
    const cap = buildHeroCaption(
      mkAccount({ currency: Currency.USD, opening_balance: 100, current_balance: 100 }),
    );
    expect(cap.text).toBe('Opening 100 USD');
  });
});

describe('buildHeroCaption — credit cards', () => {
  it('E-2: shows available credit and is colored positive at low utilisation', () => {
    const cap = buildHeroCaption(
      mkAccount({ type: AccountType.CreditCard, credit_limit: 50000, current_balance: 4080 }),
    );
    expect(cap.text).toBe('Available 45,920 EGP of 50,000');
    expect(cap.color).toBe(availableCreditColor(45920, 50000));
  });

  it('E-5: CC paid off shows full available, positive', () => {
    const cap = buildHeroCaption(
      mkAccount({ type: AccountType.CreditCard, credit_limit: 50000, current_balance: 0 }),
    );
    expect(cap.text).toBe('Available 50,000 EGP of 50,000');
  });

  it('§3.8: CC with null credit_limit falls back to Opening caption (no divide-by-zero)', () => {
    const cap = buildHeroCaption(
      mkAccount({ type: AccountType.CreditCard, credit_limit: null, opening_balance: 0, current_balance: 1000 }),
    );
    expect(cap.text).toBe('Opening 0 EGP');
  });

  it('§3.8: CC with zero credit_limit falls back to Opening caption', () => {
    const cap = buildHeroCaption(
      mkAccount({ type: AccountType.CreditCard, credit_limit: 0, opening_balance: 500, current_balance: 500 }),
    );
    expect(cap.text).toBe('Opening 500 EGP');
  });

  it('clamps available at zero when balance exceeds limit', () => {
    const cap = buildHeroCaption(
      mkAccount({ type: AccountType.CreditCard, credit_limit: 1000, current_balance: 1500 }),
    );
    expect(cap.text).toBe('Available 0 EGP of 1,000');
  });
});

describe('availableCreditColor — thresholds match §5 AccountCard', () => {
  it('returns text2 grey when limit <= 0', () => {
    expect(availableCreditColor(0, 0)).toBe('#6B7F99');
  });
  it('positive when > 50% available', () => {
    expect(availableCreditColor(600, 1000)).toBe('#4CAF82');
  });
  it('warning when 20%–50% available', () => {
    expect(availableCreditColor(300, 1000)).toBe('#E8B130');
  });
  it('negative when < 20% available', () => {
    expect(availableCreditColor(100, 1000)).toBe('#E05A42');
  });
});
```

- [ ] **Step 2: Run the failing tests**

Run: `npm test -- __tests__/screens/accounts_v2/balance_hero.helpers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the helper**

Create `screens/accounts_v2/detail/components/balance_hero.helpers.ts`. The three thresholds are reimplemented locally per spec §4.5 (do NOT import across screen domains; the §5 `availableCreditColor` is a private fn in `account_card.tsx`). Module-level color values come from `theme_tokens` per the CLAUDE.md module-level-color rule:

```typescript
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';
import type { Account } from '@/store/account.store';
import { formatAmount } from '@/utils/format_amount';

/**
 * Three-threshold utilisation color, identical to §5 AccountCard's private fn
 * (spec §4.5 / R4). Reimplemented locally — not imported across screen domains.
 *   > 50% available → positive · 20%–50% → warning · < 20% → negative
 */
export function availableCreditColor(available: number, limit: number): string {
  if (limit <= 0) return CoreTokens.text2;
  const pct = available / limit;
  if (pct > 0.5) return SemanticTokens.positive;
  if (pct >= 0.2) return SemanticTokens.warning;
  return SemanticTokens.negative;
}

export interface HeroCaption {
  text: string;
  /** true only for non-CC accounts whose current balance has drifted from opening */
  adjusted: boolean;
  /** runtime color for CC available-credit captions; undefined for Opening captions */
  color?: string;
}

/**
 * Type-aware context caption beneath the balance (spec §2.3).
 * - Non-CC: `Opening {opening} {currency}`, with `adjusted=true` when current !== opening.
 * - CC with credit_limit > 0: `Available {max(0, limit - balance)} {currency} of {limit}`,
 *   colored by utilisation.
 * - CC with null/0 credit_limit: falls back to the Opening caption (no divide-by-zero).
 */
export function buildHeroCaption(account: Account): HeroCaption {
  const currency = account.currency;
  const isCC = account.type === AccountType.CreditCard;
  const limit = account.credit_limit ?? 0;

  if (isCC && limit > 0) {
    const available = Math.max(0, limit - account.current_balance);
    return {
      text: Strings.accountHeroAvailable(
        formatAmount(available),
        currency,
        formatAmount(limit),
      ),
      adjusted: false,
      color: availableCreditColor(available, limit),
    };
  }

  return {
    text: Strings.accountHeroOpening(formatAmount(account.opening_balance), currency),
    adjusted: account.current_balance !== account.opening_balance,
  };
}
```

- [ ] **Step 4: Run the helper tests — they must pass**

Run: `npm test -- __tests__/screens/accounts_v2/balance_hero.helpers.test.ts`
Expected: PASS (14 tests).

- [ ] **Step 5: Implement the component**

Create `screens/accounts_v2/detail/components/balance_hero.tsx`. Flat surface, no LinearGradient (reserved for dashboard). Account-color accent bar via runtime hex (`style={{ backgroundColor }}` — the only allowed inline color, spec §2.3). Balance gold (`text-accent`) for assets, `text-danger` for CC. Type chip tinted by `color + '22'`:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AcctTokens } from '@/constants/theme_tokens';
import type { Account } from '@/store/account.store';
import { formatAmount } from '@/utils/format_amount';

import { buildHeroCaption } from './balance_hero.helpers';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_LABEL: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank,
  [AccountType.SmartWallet]: Strings.typeSmartWallet,
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet,
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings,
  [AccountType.CreditCard]: Strings.typeCreditCard,
};

const TYPE_ICON: Record<AccountType, IconName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

interface BalanceHeroProps {
  account: Account;
}

export function BalanceHero({ account }: BalanceHeroProps) {
  const color = account.color ?? AcctTokens.midnight.rich;
  const isCC = account.type === AccountType.CreditCard;
  const caption = buildHeroCaption(account);

  return (
    <Box className="bg-surface border-border mx-4 mt-2 overflow-hidden rounded-2xl border">
      {/* Account-color accent bar — runtime hex (only allowed inline color) */}
      <View style={{ height: 4, width: '100%', backgroundColor: color }} />

      <Box className="px-4 py-4">
        {/* Label + type chip row */}
        <Box style={{ flexDirection: 'row' }} className="items-center justify-between">
          <Text variant="caption" className="text-muted uppercase tracking-wider">
            {Strings.accountDetailBalance}
          </Text>
          <Box
            style={{ flexDirection: 'row', backgroundColor: color + '22' }}
            className="border-border items-center gap-1 rounded-full border px-2 py-0.5"
          >
            <MaterialCommunityIcons name={TYPE_ICON[account.type]} size={12} color={color} />
            <Text variant="caption" className="text-muted font-semibold">
              {TYPE_LABEL[account.type]}
            </Text>
          </Box>
        </Box>

        {/* Balance */}
        <Text
          variant="numMd"
          numberOfLines={1}
          className={isCC ? 'text-danger mt-1' : 'text-accent mt-1'}
        >
          {formatAmount(account.current_balance)} {account.currency}
        </Text>

        {/* Context caption */}
        <Text variant="caption" className="mt-1" style={caption.color ? { color: caption.color } : undefined}>
          {caption.text}
          {caption.adjusted ? ` · ${Strings.accountHeroAdjusted}` : ''}
        </Text>
      </Box>
    </Box>
  );
}
```

- [ ] **Step 6: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add screens/accounts_v2/detail/components/balance_hero.helpers.ts screens/accounts_v2/detail/components/balance_hero.tsx __tests__/screens/accounts_v2/balance_hero.helpers.test.ts
git commit -m "feat(§9a): balance hero (replaces MiniChart) + pure caption/utilisation helper"
```

---

## Task 7: `adjust_balance_sheet.tsx` — migrate to `Sheet`

**Goal:** The headline migration (spec §2.6). Replace `react-native-actions-sheet` `ActionSheet` (imperative `.show()/.hide()` ref) with the declarative `Sheet` (`size="sm"`, `footer` prop). State store is copied verbatim. The parse guard now calls `parseAdjustInput` (Task 2).

**Files:**
- Create: `screens/accounts_v2/detail/components/adjust_balance_sheet.state.ts`
- Create: `screens/accounts_v2/detail/components/adjust_balance_sheet.tsx`

> No new render test — the validation logic is covered by Task 2's helper tests (logic-only rule). This is a controlled UI rewrite; behavioral logic is unchanged.

- [ ] **Step 1: Create the state store (verbatim copy of V1)**

Create `screens/accounts_v2/detail/components/adjust_balance_sheet.state.ts`:

```typescript
import { create } from 'zustand';

interface AdjustBalanceSheetStateShape {
  input: string;
  error: string;
}

interface AdjustBalanceSheetState {
  state: AdjustBalanceSheetStateShape;
  setInput: (v: string) => void;
  setError: (v: string) => void;
  initialize: (currentBalance: number) => void;
  reset: () => void;
}

const INITIAL_STATE: AdjustBalanceSheetStateShape = {
  input: '',
  error: '',
};

export const useAdjustBalanceSheetState = create<AdjustBalanceSheetState>((set) => ({
  state: INITIAL_STATE,
  setInput: (v) => set((s) => ({ state: { ...s.state, input: v } })),
  setError: (v) => set((s) => ({ state: { ...s.state, error: v } })),
  initialize: (currentBalance) => set({ state: { input: String(currentBalance), error: '' } }),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 2: Create the migrated sheet component**

Create `screens/accounts_v2/detail/components/adjust_balance_sheet.tsx`. Key changes from V1: `Sheet` instead of `ActionSheet`; no `sheetRef`/`useEffect` `.show()/.hide()` — the `initialize(currentBalance)` seeding moves into a `visible`-gated effect; CTA bar moves to the `footer` prop with HeroUI `Button`s; HeroUI `Input` replaces the raw `TextInput`; validation uses `parseAdjustInput`:

```typescript
import React, { useEffect } from 'react';
import { View } from 'react-native';
import { useShallow } from 'zustand/react/shallow';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

import { parseAdjustInput } from './adjust_balance_sheet.helpers';
import { useAdjustBalanceSheetState } from './adjust_balance_sheet.state';

interface AdjustBalanceSheetProps {
  visible: boolean;
  currentBalance: number;
  currency: Currency;
  onClose: () => void;
  onSave: (newBalance: number) => void;
  isLoading: boolean;
}

export function AdjustBalanceSheet({
  visible,
  currentBalance,
  currency,
  onClose,
  onSave,
  isLoading,
}: AdjustBalanceSheetProps) {
  const {
    state: adjustState,
    setInput,
    setError,
    initialize,
  } = useAdjustBalanceSheetState(
    useShallow((s) => ({
      state: s.state,
      setInput: s.setInput,
      setError: s.setError,
      initialize: s.initialize,
    })),
  );

  // Seed the input from the current balance whenever the sheet opens.
  // (The legacy .show()/.hide() ref calls are gone — `visible` drives the Sheet.)
  useEffect(() => {
    if (visible) {
      initialize(currentBalance);
    }
  }, [visible, currentBalance, initialize]);

  const handleSave = () => {
    const result = parseAdjustInput(adjustState.input);
    if (!result.ok) {
      setError(Strings.errBalanceInvalid);
      return;
    }
    setError('');
    onSave(result.value);
  };

  const footer = (
    <Box style={{ flexDirection: 'row' }} className="gap-2">
      <Box style={{ flex: 1 }}>
        <Button variant="secondary" label={Strings.adjustBalanceCancel} onPress={onClose} />
      </Box>
      <Box style={{ flex: 2 }}>
        <Button
          variant="primary"
          label={Strings.adjustBalanceSave}
          onPress={handleSave}
          isDisabled={isLoading}
          isLoading={isLoading}
        />
      </Box>
    </Box>
  );

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={Strings.adjustBalanceTitle}
      size="sm"
      footer={footer}
    >
      <Sheet.Body>
        <Box className="px-4 pt-2">
          <Text variant="hint" className="font-soraBold text-gold-500 pb-2 tracking-widest">
            {Strings.adjustBalanceLabel}
          </Text>
          <Box style={{ flexDirection: 'row' }} className="items-center gap-2">
            <View style={{ flex: 1 }}>
              <Input
                value={adjustState.input}
                onChangeText={(v) => {
                  setInput(v);
                  setError('');
                }}
                keyboardType="decimal-pad"
                isInvalid={!!adjustState.error}
              />
            </View>
            <Text variant="body" className="text-muted font-soraBold">
              {currency}
            </Text>
          </Box>
          {adjustState.error ? (
            <Text variant="caption" className="text-danger mt-1">
              {adjustState.error}
            </Text>
          ) : null}
        </Box>
      </Sheet.Body>
    </Sheet>
  );
}
```

- [ ] **Step 3: Verify no `react-native-actions-sheet` import remains in this file**

Run: `grep -n "react-native-actions-sheet" screens/accounts_v2/detail/components/adjust_balance_sheet.tsx`
Expected: no output (zero matches).

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 5: Run the full suite — no regressions**

Run: `npm test -- --ci`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add screens/accounts_v2/detail/components/adjust_balance_sheet.tsx screens/accounts_v2/detail/components/adjust_balance_sheet.state.ts
git commit -m "feat(§9a): migrate AdjustBalanceSheet from react-native-actions-sheet to declarative Sheet (size=sm)"
```

---

## Task 8: `archive_confirmation_dialog.tsx` — Modal re-skin

**Goal:** Keep the RN `Modal` (centered alert), re-skin to tokens + HeroUI `Text`/`Button` (spec §2.7). CC net-worth warning preserved. Scrim literal `rgba(0,0,0,0.65)` is allowed (modal scrim, consistent with §4's kept dialog).

**Files:**
- Create: `screens/accounts_v2/detail/components/archive_confirmation_dialog.tsx`

> No unit test — pure presentational re-skin, no behavioral logic. The archive flow (flag flip, transaction preservation) is covered by the repository tests (A-12, already passing).

- [ ] **Step 1: Create the re-skinned dialog**

Create `screens/accounts_v2/detail/components/archive_confirmation_dialog.tsx`:

```typescript
import React from 'react';
import { Modal, View } from 'react-native';

import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/store/account.store';

interface ArchiveConfirmationDialogProps {
  visible: boolean;
  account: Account | undefined;
  onClose: () => void;
  onConfirm: () => void;
  isLoading: boolean;
}

export function ArchiveConfirmationDialog({
  visible,
  account,
  onClose,
  onConfirm,
  isLoading,
}: ArchiveConfirmationDialogProps) {
  const isCC = account?.type === AccountType.CreditCard;

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      statusBarTranslucent
    >
      {/* Scrim — literal rgba allowed for modal scrims (spec §2.7) */}
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(0,0,0,0.65)',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 20,
        }}
      >
        <Box className="bg-surface border-border w-full rounded-2xl border p-5">
          <Text variant="h3" className="text-foreground font-soraBold mb-2">
            {Strings.accountDetailArchiveTitle}
          </Text>
          <Text variant="body" className="text-muted mb-2">
            {Strings.accountDetailArchiveBody}
          </Text>
          {isCC ? (
            <Text variant="caption" className="text-accent mb-2">
              {Strings.accountDetailArchiveCCWarning}
            </Text>
          ) : null}
          <Box style={{ flexDirection: 'row' }} className="mt-1 gap-2">
            <Box style={{ flex: 1 }}>
              <Button variant="secondary" label={Strings.accountDetailCancel} onPress={onClose} />
            </Box>
            <Box style={{ flex: 1 }}>
              <Button
                variant="danger"
                label={Strings.accountDetailArchiveConfirm}
                onPress={onConfirm}
                isDisabled={isLoading}
                isLoading={isLoading}
              />
            </Box>
          </Box>
        </Box>
      </View>
    </Modal>
  );
}
```

> NOTE: `variant="danger"` must be a valid HeroUI Native `ButtonVariant`. If `tsc` reports it is not assignable, fall back to `variant="primary"` with a destructive override or the closest destructive variant the HeroUI `ButtonVariant` union exposes — confirm against `node_modules/heroui-native` types at implementation time. This is a non-critical variant-naming call.

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: clean. (Resolve the `variant="danger"` note above if it errors.)

- [ ] **Step 3: Commit**

```bash
git add screens/accounts_v2/detail/components/archive_confirmation_dialog.tsx
git commit -m "feat(§9a): re-skin ArchiveConfirmationDialog (RN Modal kept, tokens + HeroUI Button)"
```

---

## Task 9: `type_pill.tsx` copy + `add_account/index.tsx` (mirror onboarding_v2)

**Goal:** Build the V2 Add Account screen as a faithful mirror of `onboarding_v2/add_account/index.tsx` minus `ProgressDots`, with a back-arrow header and `router.back()` on save (spec §2.8). The `type_pill` is a verbatim copy of the onboarding_v2 one.

**Files:**
- Create: `screens/accounts_v2/add_account/components/type_pill.tsx`
- Create: `screens/accounts_v2/add_account/index.tsx`

- [ ] **Step 1: Create `type_pill.tsx` (verbatim copy of onboarding_v2)**

Copy `screens/onboarding_v2/add_account/components/type_pill.tsx` exactly, changing only the relative anim import to resolve against the V2 folder (`../add_account.anim`, which is the file created in Task 5):

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { cn } from 'heroui-native';
import React from 'react';
import Animated from 'react-native-reanimated';

import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { GoldTokens, CoreTokens } from '@/constants/theme_tokens';

import { useTypePillAnim } from '../add_account.anim';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export type TypeOption = {
  type: AccountType;
  icon: IconName;
  label: string;
  fullWidth?: boolean;
};

export const TYPE_OPTIONS: TypeOption[] = [
  { type: AccountType.Bank, icon: 'bank', label: Strings.typeBank },
  { type: AccountType.SmartWallet, icon: 'cellphone-nfc', label: Strings.typeSmartWallet },
  { type: AccountType.PhysicalWallet, icon: 'wallet', label: Strings.typePhysicalWallet },
  { type: AccountType.PhysicalSavings, icon: 'piggy-bank', label: Strings.typePhysicalSavings },
  {
    type: AccountType.CreditCard,
    icon: 'credit-card',
    label: Strings.typeCreditCard,
    fullWidth: true,
  },
];

export function TypePill({
  option,
  isSelected,
  onSelect,
}: {
  option: TypeOption;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { pillAnim, triggerPillTap } = useTypePillAnim();
  const iconColor = isSelected ? GoldTokens[600] : CoreTokens.text2;

  return (
    <Animated.View
      style={[pillAnim, { borderRadius: 8 }]}
      className={option.fullWidth ? 'w-full' : 'w-[48.5%]'}
    >
      <Pressable
        onPress={() => {
          triggerPillTap();
          onSelect();
        }}
        style={{ flexDirection: 'row' }}
        className={cn(
          'items-center gap-2 rounded-[8px] border-[1.5px] px-3 py-3',
          isSelected ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]' : 'border-border bg-default',
        )}
      >
        <MaterialCommunityIcons name={option.icon} size={18} color={iconColor} />
        <Text
          variant="body"
          className={cn('font-soraBold', isSelected ? 'text-gold-600' : 'text-muted')}
        >
          {option.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 2: Create `index.tsx`**

Create `screens/accounts_v2/add_account/index.tsx` — a copy of `onboarding_v2/add_account/index.tsx` with these exact differences (spec §2.8): (a) drop the `ProgressDots` import + element; (b) header title is `Strings.u4Title`, CTA is `Strings.u4Cta`; (c) use the V2 hook `useAddAccountAppV2` (no `isAddingMore`/onboarding nav); (d) `onBack`/save pop via `router.back()` (handled in the hook). Header is `BackButton` + centered title + `Box className="h-9 w-9"` spacer:

```typescript
import { cn } from 'heroui-native';
import React from 'react';
import { Controller, useWatch } from 'react-hook-form';
import { Switch } from 'react-native';
import Animated from 'react-native-reanimated';

import { BackButton } from '@/components/ui/back_button';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';

import { useAddAccountAnim } from './add_account.anim';
import { useAddAccountAppV2, ACCOUNT_COLORS } from './add_account.hook';
import { TypePill, TYPE_OPTIONS } from './components/type_pill';

const CURRENCY_OPTIONS: Currency[] = [Currency.EGP, Currency.USD];

export default function AddAccountAppScreenV2() {
  const { form, handleSave, onBack } = useAddAccountAppV2();
  const {
    btnAnim,
    triggerBtnPress,
    ccEntering,
    ccExiting,
    aprEntering,
    aprExiting,
    errorEntering,
    errorExiting,
  } = useAddAccountAnim();
  const {
    control,
    formState: { errors, isSubmitting },
  } = form;
  const selectedType = useWatch({ control, name: 'selected_type' });
  const selectedColor = useWatch({ control, name: 'selected_color' });
  const selectedCurrency = useWatch({ control, name: 'currency' });
  const interestTracking = useWatch({ control, name: 'interest_tracking' });
  const isCreditCard = selectedType === AccountType.CreditCard;

  return (
    <Screen>
      {/* Header — onboarding_v2 header minus ProgressDots */}
      <Box
        style={{ flexDirection: 'row', height: 56 }}
        className="items-center justify-between px-4"
      >
        <BackButton onPress={onBack} />
        <Text variant="title" className="font-soraBold">
          {Strings.u4Title}
        </Text>
        <Box className="h-9 w-9" />
      </Box>

      <ScreenScroll
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Account Type */}
        <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
          {Strings.o4SectionType}
        </Text>
        <Box style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
          {TYPE_OPTIONS.map((opt) => (
            <TypePill
              key={opt.type}
              option={opt}
              isSelected={selectedType === opt.type}
              onSelect={() => form.setValue('selected_type', opt.type, { shouldValidate: true })}
            />
          ))}
        </Box>

        {/* Account Name */}
        <Box className="pt-1">
          <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
            {Strings.o4SectionName}
          </Text>
          <Controller
            control={control}
            name="name"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.o4NamePlaceholder}
                maxLength={30}
                isInvalid={!!errors.name}
              />
            )}
          />
          {errors.name ? (
            <Animated.Text
              entering={errorEntering}
              exiting={errorExiting}
              className="text-negative font-inter mt-1 text-[12px]"
            >
              {errors.name.message}
            </Animated.Text>
          ) : null}
        </Box>

        {/* Currency */}
        <Box className="pt-1">
          <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
            {Strings.o4SectionCurrency}
          </Text>
          <Box style={{ flexDirection: 'row' }} className="gap-2">
            {CURRENCY_OPTIONS.map((code) => (
              <Pressable
                key={code}
                onPress={() => form.setValue('currency', code)}
                style={{ flex: 1 }}
                className={cn(
                  'items-center justify-center rounded-[10px] border-[1.5px] px-3 py-3',
                  selectedCurrency === code
                    ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]'
                    : 'border-border bg-default',
                )}
              >
                <Text
                  variant="body"
                  className={cn(
                    'font-soraBold',
                    selectedCurrency === code ? 'text-gold-600' : 'text-muted',
                  )}
                >
                  {code}
                </Text>
              </Pressable>
            ))}
          </Box>
        </Box>

        {/* Balance */}
        <Box className="pt-1">
          <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
            {Strings.o4SectionBalance}
          </Text>
          <Controller
            control={control}
            name="balance"
            render={({ field: { value, onChange, onBlur } }) => (
              <Input
                value={value}
                onChangeText={onChange}
                onBlur={onBlur}
                placeholder={Strings.o4BalancePlaceholder}
                keyboardType="decimal-pad"
                isInvalid={!!errors.balance}
              />
            )}
          />
          {errors.balance ? (
            <Animated.Text
              entering={errorEntering}
              exiting={errorExiting}
              className="text-negative font-inter mt-1 text-[12px]"
            >
              {errors.balance.message}
            </Animated.Text>
          ) : null}
        </Box>

        {/* Color picker */}
        <Box className="pt-1">
          <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
            {Strings.o4SectionColor}
          </Text>
          <Box style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
            {ACCOUNT_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => form.setValue('selected_color', color)}
                className="p-0.5"
              >
                <Box
                  className={cn(
                    'h-8 w-8 rounded-full',
                    selectedColor === color && 'border-gold-500 scale-110 border-2',
                  )}
                  style={{ backgroundColor: color }}
                />
              </Pressable>
            ))}
          </Box>
        </Box>

        {/* CC conditional fields */}
        {isCreditCard && (
          <Animated.View entering={ccEntering} exiting={ccExiting} className="pt-1">
            {/* Revolving Balance */}
            <Box className="pt-1">
              <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
                {Strings.o4SectionRevolving}
              </Text>
              <Controller
                control={control}
                name="revolving_balance"
                render={({ field: { value, onChange } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4RevolvingPlaceholder}
                    keyboardType="decimal-pad"
                  />
                )}
              />
            </Box>

            {/* Credit Limit */}
            <Box className="pt-1">
              <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
                {Strings.o4SectionLimit}
              </Text>
              <Controller
                control={control}
                name="credit_limit"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    placeholder={Strings.o4CreditLimitPlaceholder}
                    keyboardType="decimal-pad"
                    isInvalid={!!errors.credit_limit}
                  />
                )}
              />
              {errors.credit_limit ? (
                <Animated.Text
                  entering={errorEntering}
                  exiting={errorExiting}
                  className="text-negative font-inter mt-1 text-[12px]"
                >
                  {errors.credit_limit.message}
                </Animated.Text>
              ) : null}
            </Box>

            {/* Min Payment */}
            <Box className="pt-1">
              <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
                {Strings.o4SectionMinPayment}
              </Text>
              <Controller
                control={control}
                name="min_payment"
                render={({ field: { value, onChange } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4MinPaymentPlaceholderV2}
                    keyboardType="decimal-pad"
                  />
                )}
              />
              <Text variant="caption" className="text-muted mt-1">
                {Strings.o4MinPaymentHint}
              </Text>
            </Box>

            {/* Due Day */}
            <Box className="pt-1">
              <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
                {Strings.o4SectionDueDay}
              </Text>
              <Controller
                control={control}
                name="due_day"
                render={({ field: { value, onChange } }) => (
                  <Input
                    value={value}
                    onChangeText={onChange}
                    placeholder={Strings.o4DueDayPlaceholder}
                    keyboardType="number-pad"
                    maxLength={2}
                  />
                )}
              />
            </Box>

            {/* Interest Tracking — native Switch */}
            <Box style={{ flexDirection: 'row' }} className="items-center justify-between py-3">
              <Text variant="body" className="font-interSemi text-foreground">
                {Strings.o4InterestLabel}
              </Text>
              <Switch
                value={interestTracking}
                onValueChange={(v) => form.setValue('interest_tracking', v)}
                trackColor={{ false: CoreTokens.border, true: GoldTokens[600] }}
                thumbColor={CoreTokens.text1}
                ios_backgroundColor={CoreTokens.border}
                accessibilityRole="switch"
                accessibilityLabel={Strings.o4InterestLabel}
              />
            </Box>

            {/* APR (when interest tracking ON) */}
            {interestTracking && (
              <Animated.View entering={aprEntering} exiting={aprExiting} className="pt-1">
                <Text variant="hint" className="font-soraBold text-gold-500 pt-2 pb-2 tracking-widest">
                  {Strings.o4SectionApr}
                </Text>
                <Controller
                  control={control}
                  name="apr"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input
                      value={value}
                      onChangeText={onChange}
                      onBlur={onBlur}
                      placeholder={Strings.o4AprPlaceholder}
                      keyboardType="decimal-pad"
                      isInvalid={!!errors.apr}
                    />
                  )}
                />
                <Text variant="caption" className="text-muted mt-1">
                  {Strings.o4AprHint}
                </Text>
                {errors.apr ? (
                  <Animated.Text
                    entering={errorEntering}
                    exiting={errorExiting}
                    className="text-negative font-inter mt-1 text-[12px]"
                  >
                    {errors.apr.message}
                  </Animated.Text>
                ) : null}
              </Animated.View>
            )}
          </Animated.View>
        )}
      </ScreenScroll>

      {/* CTA bar */}
      <Box className="border-separator border-t px-4 pt-2 pb-6">
        <Animated.View style={btnAnim}>
          <Button
            variant="primary"
            label={Strings.u4Cta}
            onPress={() => {
              triggerBtnPress();
              void handleSave();
            }}
            disabled={isSubmitting}
          />
        </Animated.View>
      </Box>
    </Screen>
  );
}
```

- [ ] **Step 3: Type check**

Run: `npx tsc --noEmit`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add screens/accounts_v2/add_account/components/type_pill.tsx screens/accounts_v2/add_account/index.tsx
git commit -m "feat(§9a): V2 Add Account screen mirrors onboarding_v2 (no ProgressDots, back-arrow, pop on save)"
```

---

## Task 10: detail/index.tsx assembly + edit-schema test

**Goal:** Assemble the V2 Account Detail screen using `Screen`/`ScreenScroll`, the header (BackButton + centered title + Edit/Save toggle), `BalanceHero`, the inline edit block, the actions block, and the two overlays. Also add the edit-schema test (spec §5.2, A-07/A-08).

**Files:**
- Create: `screens/accounts_v2/detail/index.tsx`
- Create: `__tests__/screens/accounts_v2/edit_account_schema.test.ts`

- [ ] **Step 1: Write the failing edit-schema test**

The edit refine logic lives inline in `account_detail.hook.ts`. Replicate the exact schema shape in the test to lock A-07/A-08 (the hook builds it identically). Create `__tests__/screens/accounts_v2/edit_account_schema.test.ts`:

```typescript
import '@/utils/zod_config';
import { z } from 'zod';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/store/account.store';

// Mirrors the editSchema built in screens/accounts_v2/detail/account_detail.hook.ts.
// Kept in lock-step with the hook: name min(1)/max(30) + self-excluding duplicate refine.
function makeEditSchema(accounts: Account[], id: string) {
  return z.object({
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
  });
}

const acct = (id: string, name: string): Account =>
  ({
    id,
    name,
    type: AccountType.Bank,
    currency: Currency.EGP,
    opening_balance: 0,
    current_balance: 0,
    color: null,
    credit_limit: null,
    revolving_balance: null,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0,
    apr: null,
    is_archived: 0,
    sort_order: 0,
    created_at: '2026-05-23T00:00:00.000Z',
    updated_at: '2026-05-23T00:00:00.000Z',
  }) as Account;

function err(schema: ReturnType<typeof makeEditSchema>, data: { name: string; color: string }) {
  const r = schema.safeParse(data);
  return r.success ? undefined : r.error.issues[0]?.message;
}

describe('edit account schema', () => {
  const accounts = [acct('id-self', 'My Bank'), acct('id-other', 'Other Bank')];

  it('A-07: duplicate name of another account (diff case) → errNameDuplicate', () => {
    const schema = makeEditSchema(accounts, 'id-self');
    expect(err(schema, { name: 'OTHER BANK', color: '#fff' })).toBe(Strings.errNameDuplicate);
  });

  it('A-08: own current name is valid (self excluded by id)', () => {
    const schema = makeEditSchema(accounts, 'id-self');
    expect(err(schema, { name: 'My Bank', color: '#fff' })).toBeUndefined();
  });

  it('empty name → errNameRequired', () => {
    const schema = makeEditSchema(accounts, 'id-self');
    expect(err(schema, { name: '', color: '#fff' })).toBe(Strings.errNameRequired);
  });

  it('name > 30 chars → errNameTooLong', () => {
    const schema = makeEditSchema(accounts, 'id-self');
    expect(err(schema, { name: 'a'.repeat(31), color: '#fff' })).toBe(Strings.errNameTooLong);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run: `npm test -- __tests__/screens/accounts_v2/edit_account_schema.test.ts`
Expected: PASS already (the schema shape is self-contained in the test). If it fails, the failure is a test bug — fix the test, not source. (This test documents and locks the hook's refine; it has no source dependency to create.)

> NOTE: this test passes immediately because it reproduces the schema. Its job is regression-locking the A-07/A-08 contract, per spec §5.2. Keep it.

- [ ] **Step 3: Create the screen**

Create `screens/accounts_v2/detail/index.tsx`. Header preserved (boxy back button + centered title + Edit/Save toggle with `headerScale` press anim). `if (!account) return null;` guard preserved. Edit block uses `Input` + color picker (FadeInDown/FadeOutUp). Actions block is a `bg-surface` block with two `Pressable` rows + a hairline divider:

```typescript
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Controller } from 'react-hook-form';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { BackButton } from '@/components/ui/back_button';
import { Box } from '@/components/ui/box';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Screen, ScreenScroll } from '@/components/ui/screen';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens, GoldTokens, SemanticTokens } from '@/constants/theme_tokens';

import { useAccountDetailAnim } from './account_detail.anim';
import { useAccountDetail } from './account_detail.hook';
import { AdjustBalanceSheet } from './components/adjust_balance_sheet';
import { ArchiveConfirmationDialog } from './components/archive_confirmation_dialog';
import { BalanceHero } from './components/balance_hero';
import { ACCOUNT_COLORS } from '../add_account/add_account.hook';

const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

export default function AccountDetailScreenV2() {
  const {
    state: {
      account,
      isEditing,
      isAdjustVisible,
      isArchiveVisible,
      isSaving,
      isAdjusting,
      isArchiving,
    },
    form,
    setEditing,
    handleSave,
    setAdjustVisible,
    handleAdjustBalance,
    setArchiveVisible,
    handleArchive,
    onBack,
  } = useAccountDetail();
  const {
    headerStyle,
    triggerEditToggle,
    fieldEntering,
    fieldExiting,
    errorEntering,
    errorExiting,
  } = useAccountDetailAnim();
  const {
    control,
    formState: { errors },
  } = form;

  if (!account) return null;

  return (
    <Screen>
      <Animated.View style={headerStyle}>
        <Box
          style={{ flexDirection: 'row', height: 56 }}
          className="items-center justify-between px-2"
        >
          <BackButton onPress={onBack} />

          <Text variant="title" numberOfLines={1} className="font-soraBold flex-1 text-center">
            {account.name}
          </Text>

          {isEditing ? (
            <Pressable
              onPress={() => {
                triggerEditToggle();
                void handleSave();
              }}
              disabled={isSaving}
              hitSlop={hitSlop}
              className="bg-gold-500 border-gold-500 h-9 w-9 items-center justify-center rounded-[8px] border"
            >
              <Text variant="caption" className="font-soraBold text-accent-foreground">
                {Strings.accountDetailSave}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => {
                triggerEditToggle();
                setEditing(true);
              }}
              hitSlop={hitSlop}
              className="bg-surface border-border h-9 w-9 items-center justify-center rounded-[8px] border"
            >
              <Text variant="caption" className="font-soraBold text-accent">
                {Strings.accountDetailEdit}
              </Text>
            </Pressable>
          )}
        </Box>
      </Animated.View>

      <ScreenScroll
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <BalanceHero account={account} />

        {isEditing && (
          <Animated.View
            entering={fieldEntering}
            exiting={fieldExiting}
            className="mx-4 mt-4"
          >
            <Text variant="hint" className="font-soraBold text-gold-500 pb-2 tracking-widest">
              {Strings.o4SectionName}
            </Text>
            <Controller
              control={control}
              name="name"
              render={({ field: { value, onChange, onBlur } }) => (
                <Input
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  maxLength={30}
                  isInvalid={!!errors.name}
                />
              )}
            />
            {errors.name ? (
              <Animated.Text
                entering={errorEntering}
                exiting={errorExiting}
                className="text-negative font-inter mt-1 text-[12px]"
              >
                {errors.name.message}
              </Animated.Text>
            ) : null}

            <Text variant="hint" className="font-soraBold text-gold-500 pt-3 pb-2 tracking-widest">
              {Strings.o4SectionColor}
            </Text>
            <Controller
              control={control}
              name="color"
              render={({ field: { value, onChange } }) => (
                <Box style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
                  {ACCOUNT_COLORS.map((c) => (
                    <Pressable key={c} onPress={() => onChange(c)} className="p-0.5">
                      <Box
                        className={
                          value === c ? 'h-8 w-8 rounded-full border-gold-500 scale-110 border-2' : 'h-8 w-8 rounded-full'
                        }
                        style={{ backgroundColor: c }}
                      />
                    </Pressable>
                  ))}
                </Box>
              )}
            />
          </Animated.View>
        )}

        {!isEditing && (
          <Box className="bg-surface border-border mx-4 mt-5 overflow-hidden rounded-2xl border">
            <Pressable
              onPress={() => setAdjustVisible(true)}
              style={{ flexDirection: 'row', minHeight: 48 }}
              className="items-center gap-3 px-4 py-3"
            >
              <MaterialCommunityIcons name="pencil" size={20} color={CoreTokens.text2} />
              <Text variant="body" className="text-foreground flex-1">
                {Strings.accountDetailAdjustBalance}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={CoreTokens.text2} />
            </Pressable>

            <View
              className="border-separator border-t"
              style={{ marginHorizontal: 16 }}
            />

            <Pressable
              onPress={() => setArchiveVisible(true)}
              style={{ flexDirection: 'row', minHeight: 48 }}
              className="items-center gap-3 px-4 py-3"
            >
              <MaterialCommunityIcons name="archive" size={20} color={SemanticTokens.negative} />
              <Text variant="body" className="text-danger flex-1">
                {Strings.accountDetailArchive}
              </Text>
              <MaterialCommunityIcons name="chevron-right" size={20} color={SemanticTokens.negative} />
            </Pressable>
          </Box>
        )}
      </ScreenScroll>

      <AdjustBalanceSheet
        visible={isAdjustVisible}
        currentBalance={account.current_balance}
        currency={account.currency}
        onClose={() => setAdjustVisible(false)}
        onSave={(newBalance: number) => {
          void handleAdjustBalance(newBalance);
        }}
        isLoading={isAdjusting}
      />

      <ArchiveConfirmationDialog
        visible={isArchiveVisible}
        account={account}
        onClose={() => setArchiveVisible(false)}
        onConfirm={() => {
          void handleArchive();
        }}
        isLoading={isArchiving}
      />
    </Screen>
  );
}
```

> NOTE: `GoldTokens` is imported for parity with the header gold styling but is referenced only if the implementer needs a runtime gold value; if `tsc`/oxlint flags it as unused, drop the import. The Edit/Save toggle uses className tokens (`bg-gold-500`, `text-accent`) so `GoldTokens` may not be needed — remove if unused.

- [ ] **Step 4: Run the edit-schema test + full suite**

Run: `npm test -- __tests__/screens/accounts_v2/edit_account_schema.test.ts && npm test -- --ci`
Expected: PASS.

- [ ] **Step 5: Type check + lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: clean. (Resolve any unused-import warning per the note above.)

- [ ] **Step 6: Commit**

```bash
git add screens/accounts_v2/detail/index.tsx __tests__/screens/accounts_v2/edit_account_schema.test.ts
git commit -m "feat(§9a): assemble V2 Account Detail screen + edit-schema test (A-07/A-08)"
```

---

## Task 11: Flag-branch both routes + 🛑 device QA gate

**Goal:** Wire both V2 screens into their route files behind the existing `FeatureFlags.newAccounts` (still `false`, so V1 renders), then run the user-walked device QA. **Task 11 is a critical-trigger escalation (manual device QA — always user-walked).**

**Files:**
- Modify: `app/(app)/accounts/[id]/index.tsx`
- Modify: `app/(app)/accounts/add_account/index.tsx`

- [ ] **Step 1: Replace the `[id]` route with a flag-branch component**

Overwrite `app/(app)/accounts/[id]/index.tsx`:

```typescript
import React from 'react';

import { FeatureFlags } from '@/constants/feature_flags';
import AccountDetailScreenV1 from '@/screens/accounts/detail';
import AccountDetailScreenV2 from '@/screens/accounts_v2/detail';

export default function AccountDetailRoute() {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentional feature-flag guard; removed in §9a cleanup
  return FeatureFlags.newAccounts ? <AccountDetailScreenV2 /> : <AccountDetailScreenV1 />;
}
```

- [ ] **Step 2: Replace the `add_account` route with a flag-branch component**

Overwrite `app/(app)/accounts/add_account/index.tsx`:

```typescript
import React from 'react';

import { FeatureFlags } from '@/constants/feature_flags';
import AddAccountAppScreenV1 from '@/screens/accounts/add_account';
import AddAccountAppScreenV2 from '@/screens/accounts_v2/add_account';

export default function AddAccountRoute() {
  // oxlint-disable-next-line typescript/no-unnecessary-condition -- intentional feature-flag guard; removed in §9a cleanup
  return FeatureFlags.newAccounts ? <AddAccountAppScreenV2 /> : <AddAccountAppScreenV1 />;
}
```

- [ ] **Step 3: Run the pre-push CI parity chain**

Run the full chain from CLAUDE.md `Commands`:

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

Expected: green. Fix and re-run from the top on any failure.

- [ ] **Step 4: Commit + push the §9a feature branch**

```bash
git add "app/(app)/accounts/[id]/index.tsx" "app/(app)/accounts/add_account/index.tsx"
git commit -m "feat(§9a): flag-branch account routes behind newAccounts (flag still false)"
```

- [ ] **Step 5: 🛑 Device QA gate (USER-WALKED — escalate)**

Locally flip `FeatureFlags.newAccounts` to `true` (do NOT commit). Build and walk the matrix on iPhone SE + Pixel 4:

```bash
npx expo prebuild --clean
npx expo run:android
# then
npx expo run:ios
```

QA matrix (smoke the golden paths):
- Open an account from the Dashboard Accounts segment → Detail renders with `Screen`, balance hero (gold balance for assets), correct caption (`Opening … · adjusted` where divergent).
- Open a credit card → balance renders **red**, type chip "Credit Card", caption `Available X EGP of Y` colored by utilisation (E-2). CC with no limit → `Opening …` fallback.
- Tap Edit → name `Input` + color picker fade in; rename to a duplicate → `errNameDuplicate`; empty → `errNameRequired`; Save persists; back while editing cancels edit (does not pop).
- Tap Adjust Balance → `Sheet` opens at ~50%; input seeded with current balance; `-5`/`abc`/empty rejected; `0` accepted; Save writes balance, no transaction created, opening unchanged; close via swipe-down, scrim, and X.
- Tap Archive → centered `Modal`; CC shows gold warning; confirm archives, pops the screen; account vanishes from dashboard.
- Add Account (from `AddCard`) → mirrors onboarding (no progress dots), CC conditional fields + interest Switch + APR; Save pops back to dashboard.

Revert the local flag to `false` and confirm `git diff` shows no `feature_flags.ts` change before proceeding.

- [ ] **Step 6: Record QA outcome**

If clean, proceed to Task 12. If any issue surfaces, file a follow-up and fix before promotion.

---

## Task 12: Promotion commit — flip `newAccounts` → true  [HIGH BLAST RADIUS]

**Goal:** The one commit that exposes V2 to users. Per `constants/feature_flags.ts` rule, this commit changes ONLY the flag value, in the same PR that wires V2 (the route files are already wired from Task 11). High-blast-radius (flag flip) — runs only after the Task 11 device-QA gate cleared.

**Files:**
- Modify: `constants/feature_flags.ts`

- [ ] **Step 1: Flip the flag**

Edit `constants/feature_flags.ts`:

```typescript
  newAccounts: true, // §9
```

- [ ] **Step 2: Run the pre-push CI parity chain**

Run the full chain (Task 11 Step 3). Expected: green.

- [ ] **Step 3: Commit**

```bash
git add constants/feature_flags.ts
git commit -m "feat(§9a): promote V2 accounts — flip newAccounts flag to true"
```

---

## Task 13: Cleanup commit — delete V1, rename V2→canonical, drop flag  [HIGH BLAST RADIUS]

**Goal:** Per the flag rule (within 5 business days of promotion), delete V1, rename `accounts_v2` → `accounts`, restore the routes to one-liners, remove the flag, and update CLAUDE.md. High-blast-radius (V1 deletion) — team-approved cleanup.

**Files:**
- Delete: `screens/accounts/` (V1 detail + add_account)
- Rename: `screens/accounts_v2/` → `screens/accounts/`
- Modify: `app/(app)/accounts/[id]/index.tsx`, `app/(app)/accounts/add_account/index.tsx`
- Modify: `constants/feature_flags.ts`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Verify nothing else imports V1 paths**

Run: `grep -rn "screens/accounts/detail\|screens/accounts/add_account" --include='*.ts' --include='*.tsx' . | grep -v accounts_v2 | grep -v __tests__`
Expected: only the two route files reference `@/screens/accounts/...` (fixed in Step 4). If anything else does, resolve first.

- [ ] **Step 2: Delete the V1 detail + add_account trees**

```bash
rm -rf screens/accounts/detail screens/accounts/add_account
```

> NOTE: `screens/accounts/` holds ONLY `detail/` and `add_account/` (confirmed by the file tree). After removing both, the directory is empty — the rename in Step 3 recreates it.

- [ ] **Step 3: Rename V2 → canonical**

```bash
git mv screens/accounts_v2/detail screens/accounts/detail
git mv screens/accounts_v2/add_account screens/accounts/add_account
rmdir screens/accounts_v2 2>/dev/null || true
```

The V2 files use relative imports (`./account_detail.state`, `../add_account/add_account.hook`, etc.) so no in-file import paths need editing after the rename. Update the V2 test import paths (Step 5) and the route files (Step 4) — those use absolute `@/screens/...` aliases.

- [ ] **Step 4: Restore both routes to one-liners**

Overwrite `app/(app)/accounts/[id]/index.tsx`:

```typescript
export { default } from '@/screens/accounts/detail';
```

Overwrite `app/(app)/accounts/add_account/index.tsx`:

```typescript
export { default } from '@/screens/accounts/add_account';
```

- [ ] **Step 5: Repoint the §9 test import paths from `accounts_v2` → `accounts`**

Update the `@/screens/accounts_v2/...` imports in these five test files to `@/screens/accounts/...`:

```
__tests__/screens/accounts_v2/adjust_balance_validation.test.ts
__tests__/screens/accounts_v2/balance_hero.helpers.test.ts
__tests__/screens/accounts_v2/account_detail_v2.hook.test.ts
__tests__/screens/accounts_v2/add_account_v2.hook.test.ts
__tests__/screens/accounts_v2/edit_account_schema.test.ts   (no source import — only Strings/enums; leave as-is unless it references accounts_v2)
```

Use a targeted replace in each file: `@/screens/accounts_v2/` → `@/screens/accounts/`. (Optionally `git mv` the `__tests__/screens/accounts_v2/` directory to `__tests__/screens/accounts/`; if so, also rename the `account_detail_v2.hook.test.ts` mock path `@/screens/accounts_v2/detail/account_detail.state` → `@/screens/accounts/detail/account_detail.state`.)

- [ ] **Step 6: Remove the `newAccounts` flag entry**

Edit `constants/feature_flags.ts` and remove the line:

```typescript
  newAccounts: true, // §9
```

- [ ] **Step 7: Update CLAUDE.md (legacy-consumer list only)**

Edit the "Bottom Sheets" section's "Legacy consumers still in-flight" note. Remove the `adjust_balance_sheet.tsx` entry, leaving only the `pay_sheet.tsx` (§8) entry if §8 has not yet merged. **Do NOT delete the whole "react-native-actions-sheet — LEGACY" section** — that happens in §9b once `pay_sheet` is also gone. (See the §8↔§9 coordination note at the top: whoever merges second rebases.)

- [ ] **Step 8: Run the pre-push CI parity chain**

Run the full chain (Task 11 Step 3). Expected: green.

- [ ] **Step 9: Commit**

```bash
git add screens/ "app/(app)/accounts/[id]/index.tsx" "app/(app)/accounts/add_account/index.tsx" constants/feature_flags.ts CLAUDE.md __tests__/
git commit -m "$(cat <<'EOF'
chore(§9a): cleanup — delete V1 accounts tree, rename V2→canonical, drop newAccounts flag

- Delete screens/accounts/{detail,add_account} (V1), rename screens/accounts_v2/* → canonical.
- Restore both account route files to one-line re-exports.
- Remove newAccounts from FeatureFlags.
- Repoint §9 test imports accounts_v2 → accounts.
- Remove adjust_balance_sheet.tsx from CLAUDE.md legacy-consumer list (pay_sheet stays until §8).
EOF
)"
```

---

## §9b — Delete `react-native-actions-sheet` dep + patch  [HARD-GATED · USER-ESCALATED]

## Task 14: Remove the legacy dependency, its patch, and the CLAUDE.md section

**Goal:** Retire the last of `react-native-actions-sheet`. This is a **separate PR** and a **critical-trigger escalation** (high blast radius + dependency removal — CLAUDE.md triggers #3 and #4).

**🛑 HARD GATE — do not start until ALL are true:**
1. §8's `pay_sheet.tsx` migration is merged to `main`.
2. §9a (Task 13 cleanup) is merged to `main`.
3. The user has **explicitly authorized** the dependency + patch deletion (per spec §7 / Open Question #5).

**Files:**
- Modify: `package.json`
- Delete: `patches/react-native-actions-sheet+10.1.2.patch`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Confirm the gate — zero source importers**

Run both greps. **Both must be empty** before touching anything:

```bash
grep -rn "react-native-actions-sheet" screens/ components/ utils/ store/ app/
grep -rln "react-native-actions-sheet" . --include='*.ts' --include='*.tsx' | grep -v node_modules
```

Expected: the first returns nothing. The second returns at most `CLAUDE.md` (handled in Step 4) — no `.ts/.tsx` source file. If `pay_sheet.tsx` or any other consumer still imports it, **STOP** — the gate is not satisfied.

- [ ] **Step 2: Remove the dependency from `package.json`**

Delete the `"react-native-actions-sheet": "^10.1.2",` line from `dependencies`.

- [ ] **Step 3: Delete the patch file**

```bash
rm patches/react-native-actions-sheet+10.1.2.patch
```

- [ ] **Step 4: Remove the legacy section + Tech Stack tag from CLAUDE.md**

- Delete the entire "**`react-native-actions-sheet` — LEGACY, phasing out section by section.**" block under "Bottom Sheets" (the paragraph + the "Legacy consumers still in-flight" list).
- In the **Tech Stack** line, remove the `react-native-actions-sheet (legacy, phasing out §4–§9; do NOT add new usages)` token.

- [ ] **Step 5: Reinstall to regenerate the lockfile without the dep**

```bash
npm install
```

Expected: `postinstall` (patch-package) runs cleanly with no `react-native-actions-sheet` patch to apply; `package-lock.json` updates to drop the dep.

- [ ] **Step 6: Run the pre-push CI parity chain**

Run the full chain (Task 11 Step 3). The critical assertion: `npx expo prebuild --no-install --platform android` must still succeed without the dep (spec AC #12 / R5/R6).

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

Expected: green.

- [ ] **Step 7: Final zero-reference verification**

Run: `grep -rn "react-native-actions-sheet" . --include='*.ts' --include='*.tsx' --include='*.json' | grep -v node_modules | grep -v package-lock.json`
Expected: empty (no source, no CLAUDE.md, no package.json reference).

- [ ] **Step 8: Commit**

```bash
git add package.json package-lock.json CLAUDE.md
git rm patches/react-native-actions-sheet+10.1.2.patch
git commit -m "$(cat <<'EOF'
chore(§9b): remove react-native-actions-sheet dependency + patch

Last consumer (adjust_balance_sheet §9a, pay_sheet §8) migrated to @gorhom/bottom-sheet.
- Drop dep from package.json + lockfile.
- Delete patches/react-native-actions-sheet+10.1.2.patch.
- Remove the legacy-sheet phase-out section and Tech Stack tag from CLAUDE.md.
EOF
)"
```

---

## Final verification (§9a)

- [ ] **Step F.1: Full coverage run**

Run: `npm run test:coverage`
Expected thresholds: 80% lines / 95% functions / 100% branches. Fix gaps before merge.

- [ ] **Step F.2: No new hex/spacing literals, no actions-sheet import in the new tree**

```bash
grep -rn "react-native-actions-sheet" screens/accounts/
grep -rn "Colors.dark" screens/accounts/detail screens/accounts/add_account
```

Expected: first empty; second empty (the new tree uses className tokens + `theme_tokens` module-level values, never `Colors.dark.*`). Runtime account-color hex via `style={{}}` is the only allowed inline color.

- [ ] **Step F.3: No new copy outside strings.ts**

Confirm every user-visible string in the new tree references `Strings.*`.

---

## Self-Review

### Spec coverage

| Spec item | Task |
|---|---|
| §1/§2.1 Account Detail re-skin (Screen/ScreenScroll, HeroUI) | Task 10 |
| §2.2 Header (back + centered title + Edit/Save toggle, headerScale anim) | Task 3 (anim), Task 10 (header) |
| §2.3 Balance hero replaces MiniChart (type-aware caption, CC red, gold) | Task 6 |
| §2.4 Inline edit block (name Input + color picker, fades) | Task 10 |
| §2.5 Actions block (Adjust + Archive rows, destructive tint) | Task 10 |
| §2.6 AdjustBalanceSheet → declarative Sheet (size=sm, footer) | Task 7 |
| §2.7 Archive dialog kept as RN Modal, re-skinned, CC warning | Task 8 |
| §2.8 Add Account mirrors onboarding_v2 (no ProgressDots, pop on save) | Task 5 (hook), Task 9 (screen) |
| §2.8 type_pill migrated | Task 9 |
| §3.4 adjust validation (finite, ≥0, all types) | Task 2 |
| §3.6 edit name + color only; uniqueness self-excluded | Task 4 (hook), Task 10 (test) |
| §4.1 V1/V2 split + newAccounts flag | Tasks 11, 12, 13 |
| §4.2 Folder layout (V2 tree) | Tasks 3–10 |
| §4.3 store/state/hook shapes unchanged | Tasks 3, 4, 7 |
| §4.4 zero DB changes | (no task — confirmed none touch database/) |
| §4.5 reimplement availableCreditColor locally | Task 6 |
| §4.6 Sheet size=sm | Task 7 |
| §5.1 adjust validation tests A-01..A-04 | Task 2 |
| §5.2 edit schema tests A-07/A-08 | Task 10 |
| §5.3 add schema A-09..A-11 | already covered (existing `__tests__/add_account.schema.test.ts`) — audited, no gap |
| §5.4 repository A-05/A-06/A-09/A-12 | already covered (existing `__tests__/account.repository.test.ts`) — audited, no gap |
| §5.5 hook tests | Task 4 |
| §6 new caption string keys | Task 1 |
| §7 §9a/§9b split + hard gate | Tasks 13 (§9a end), 14 (§9b gate) |
| §8 AC #1 (cleanup state) | Task 13 |
| §8 AC #2–#7 (re-skin behaviors) | Tasks 6–10 |
| §8 AC #8 (tests pass, no literals) | Final verification |
| §8 AC #9 (device QA) | Task 11 |
| §8 AC #10–#13 (§9b) | Task 14 |

**Coverage:** all sections accounted for. A-09..A-12 and A-05/A-06 are already covered by existing tests (audited in spec §3.9 / §5.3 / §5.4) — this plan does not duplicate them, matching the spec's "audit, fill gaps, do not duplicate" directive.

### Placeholder scan

No TBD/TODO/FIXME. Every code step shows complete code. The two "NOTE" callouts (Task 8 `variant="danger"` fallback; Task 10 possibly-unused `GoldTokens` import) are explicit, bounded, non-critical implementer decisions, not placeholders.

### Type consistency

- `parseAdjustInput` (Task 2) → `AdjustParseResult` discriminated union → consumed in Task 7. Signature matches.
- `buildHeroCaption`/`availableCreditColor`/`HeroCaption` (Task 6) → consumed in `balance_hero.tsx` (Task 6). Names match.
- `useAddAccountAppV2` + `ACCOUNT_COLORS` (Task 5) → consumed in Task 9 screen and Task 10 detail color picker. Names match.
- `useAccountDetail` (Task 4) returns `{ state, form, setEditing, handleSave, setAdjustVisible, handleAdjustBalance, setArchiveVisible, handleArchive, onBack }` → destructured identically in Task 10. Matches V1 contract.
- `AdjustBalanceSheet` / `ArchiveConfirmationDialog` / `BalanceHero` props match their call sites in Task 10.
- `FeatureFlags.newAccounts` (existing, `false`) → flag-branched in Task 11, flipped in Task 12, removed in Task 13. Consistent.

### Risk recap (from spec §4.8)

R5/R6 (dep deletion before §8 migrates) is mitigated by the Task 14 hard gate + Step 1 grep. R8 (handler regressions) is mitigated by the verbatim hook copy (Task 4) + existing repository tests. R7 (hex literals) is checked in Final Verification Step F.2.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-23-section-9-accounts.md`. Two execution options:

**1. Subagent-Driven (recommended)** — Sarah dispatches a fresh `@dev` subagent per task, Tariq reviews between tasks. Best for §9a's component-by-component scope so each task gets a clean context. §9b is dispatched only after the user authorizes the gate.

**2. Inline Execution** — Execute tasks in this session using `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
