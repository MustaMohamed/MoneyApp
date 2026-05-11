# Section 2 · Onboarding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compress the existing 6-screen onboarding flow (O1–O6) into a 4-screen v2 flow (N1–N4) behind `FeatureFlags.newOnboarding`, porting all screens to §1 primitives and NativeWind classes, with zero visible change when the flag is `false`.

**Architecture:** Each new screen lives under `screens/onboarding_v2/<screen>/` (hook + anim + screen + optional components). The 4 existing `app/(onboarding)/*/index.tsx` route files become conditional dispatchers: when `FeatureFlags.newOnboarding` is `true` they render the v2 screen, otherwise the v1 screen. The flag is a compile-time `as const` boolean; Metro tree-shakes the unused branch. `store/onboarding.store.ts` gets one targeted change — `loadOnboardingState` force-restarts from N1 if the flag is `true` and a persisted O* step is found.

**Tech Stack:** Expo Router v3 · TypeScript strict · Zustand v5 · RHF v7 + Zod v4 · react-native-reanimated · NativeWind v5 · gluestack-ui v2 primitives (`Box`, `Text`, `Button`, `Input`, `Pressable` from `components/ui/`) · `AcctTokens` from `constants/theme_tokens.ts` · `FlashList` from `@shopify/flash-list` · RN `Switch` · `react-native-safe-area-context` · Jest + RNTL

---

## Spec reference

All decisions in this plan flow from the approved spec at:
`docs/superpowers/specs/2026-05-11-section-2-onboarding-design.md`

Section numbers cited as `spec §2.x`. When this plan prescribes code, it is the canonical form — if the spec and plan conflict on an implementation detail, this plan takes precedence (the spec governs intent, the plan governs execution).

---

## File Map

### Modified existing files

| File | Change |
|---|---|
| `constants/enums.ts` | Add `N1`, `N2`, `N3`, `N4` to `OnboardingStep` enum |
| `constants/strings.ts` | Add 7 new keys: `n1CurrencyLabel`, `n1CurrencyNote`, `n3AccountSaved`, `n3AddMoreSubtitle`, `o4MinPaymentHint`, `o4AprHint`, `o4MinPaymentPlaceholderV2` |
| `store/onboarding.store.ts` | Change `const step` → `let step`; add force-restart block for flag=true + O* step |
| `app/(onboarding)/welcome/index.tsx` | Conditional dispatcher component |
| `app/(onboarding)/add_account/index.tsx` | Conditional dispatcher component |
| `app/(onboarding)/more_accounts/index.tsx` | Conditional dispatcher component |
| `app/(onboarding)/ready/index.tsx` | Conditional dispatcher component |

### New files — tests

| File | What it covers |
|---|---|
| `__tests__/screens/onboarding_v2_welcome.hook.test.ts` | `selected` default; `setSelected`; `onContinue` commits currency + step + nav |
| `__tests__/screens/onboarding_v2_add_account.hook.test.ts` | Default color = `AcctTokens.midnight.rich`; save without `isAddingMore` → N3 + nav; save with `isAddingMore` → `backOrReplace`; `onBack` target |
| `__tests__/screens/onboarding_v2_more_accounts.hook.test.ts` | `handleContinue` → N4 + nav; `handleAddAnother` → nav with param; `accounts` from store |
| `__tests__/screens/onboarding_v2_ready.hook.test.ts` | `rows` has 3 items; no Security row; `computeTotalBalance` sums; double-tap guard; `completeOnboarding` called |
| `__tests__/screens/smoke/onboarding_v2_welcome.screen.test.tsx` | Renders; `ProgressDots` present; pill row present |
| `__tests__/screens/smoke/onboarding_v2_add_account.screen.test.tsx` | Renders; `ProgressDots` present; form renders |
| `__tests__/screens/smoke/onboarding_v2_more_accounts.screen.test.tsx` | Renders; `ProgressDots` present; check-circle region present |
| `__tests__/screens/smoke/onboarding_v2_ready.screen.test.tsx` | Renders; `ProgressDots` present; summary card has 3 rows |
| `__tests__/onboarding_v2_store_restart.test.ts` | `loadOnboardingState` force-restart: flag=true + O* persisted → resolves N1, persists N1 |

### New files — screens

| File | Responsibility |
|---|---|
| `screens/onboarding_v2/welcome/welcome.hook.ts` | Currency selection logic; `onContinue` commits + navigates |
| `screens/onboarding_v2/welcome/welcome.anim.ts` | `illustrationEntering`, `headlineEntering`, `pillsEntering`, `ctaEntering` with `_v2` key |
| `screens/onboarding_v2/welcome/index.tsx` | N1 screen UI — GeoIllustration + headline + currency pills + CTA |
| `screens/onboarding_v2/add_account/add_account.hook.ts` | Port of O4 hook; updated color default, step, back target |
| `screens/onboarding_v2/add_account/add_account.anim.ts` | Port verbatim from O4 anim |
| `screens/onboarding_v2/add_account/index.tsx` | N2 screen UI — §1 primitives, `Switch` for interest, helper hints |
| `screens/onboarding_v2/add_account/components/type_pill.tsx` | Port of O4 `TypePill` to §1 primitives |
| `screens/onboarding_v2/more_accounts/more_accounts.hook.ts` | Port of O5 hook; `handleDone` → `handleContinue`; nav to N4 |
| `screens/onboarding_v2/more_accounts/more_accounts.anim.ts` | New: `checkEntering`, `headlineEntering`, `subtitleEntering`, `rowEntering` |
| `screens/onboarding_v2/more_accounts/index.tsx` | N3 screen UI — check-circle header + FlashList + dashed add row + CTA |
| `screens/onboarding_v2/more_accounts/components/account_row.tsx` | Port of O5 `AccountRow`; icon bg = `account.color` inline style |
| `screens/onboarding_v2/ready/ready.hook.ts` | Port of O6 hook; 3-row summary; no Security row |
| `screens/onboarding_v2/ready/ready.state.ts` | Port verbatim from O6 `ready.state.ts` |
| `screens/onboarding_v2/ready/ready.helpers.ts` | Port `computeTotalBalance` only; no `resolveSecurityLabel` |
| `screens/onboarding_v2/ready/ready.anim.ts` | Port from O6 anim with key `'ready_v2'` |
| `screens/onboarding_v2/ready/index.tsx` | N4 screen UI — 3-row summary card; §1 primitives |

---

## Phase 1 · Setup — enum, strings, store patch (Day 1, morning)

**Verification gate:** `npm run typecheck` passes. New store test passes. No existing tests broken.

---

### Task 1: Extend `OnboardingStep` enum

**Files:**
- Modify: `constants/enums.ts`
- (No new test file — the enum extension is validated implicitly by hook tests in later tasks. The store restart test in Task 2 also exercises N1 as a valid enum value.)

- [ ] **Step 1: Open `constants/enums.ts` and add N1–N4**

The current `OnboardingStep` block (lines 9–16) is:

```ts
export enum OnboardingStep {
  O1 = 'O1',
  O2 = 'O2',
  O3 = 'O3',
  O4 = 'O4',
  O5 = 'O5',
  O6 = 'O6',
}
```

Replace it with:

```ts
export enum OnboardingStep {
  O1 = 'O1',
  O2 = 'O2',
  O3 = 'O3',
  O4 = 'O4',
  O5 = 'O5',
  O6 = 'O6', // retained until cleanup PR
  N1 = 'N1',
  N2 = 'N2',
  N3 = 'N3',
  N4 = 'N4',
}
```

No other changes to the file.

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0. The `isOnboardingStep` guard in `store/onboarding.store.ts` uses `Object.values(OnboardingStep).includes(...)` and automatically accepts N1–N4 — no change needed there.

- [ ] **Step 3: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add constants/enums.ts && git commit -m "feat(onboarding-v2): add N1..N4 to OnboardingStep enum"
```

---

### Task 2: Add new string keys

**Files:**
- Modify: `constants/strings.ts`

- [ ] **Step 1: Add the 7 new keys to `constants/strings.ts`**

Insert the following block immediately after the `o4Cta` line (after `o4Cta: 'Save Account',`):

```ts
  // N1 — Welcome + Currency (v2 keys)
  n1CurrencyLabel: 'BASE CURRENCY',
  n1CurrencyNote: 'Change anytime in Settings.',

  // N3 — Add Another? (v2 keys)
  n3AccountSaved: 'Account saved',
  n3AddMoreSubtitle: 'Want to add another? You can add credit cards, cash wallets, and more.',

  // N2 — CC field improvements (v2 keys — old keys kept for O4 screen during flag=false window)
  o4MinPaymentHint: 'Copy from your latest statement. Leave blank if your card is new.',
  o4AprHint: 'Annual rate — usually 25–40% on Egyptian credit cards. Find it on your cardholder agreement or in your bank app under "Rates".',
  o4MinPaymentPlaceholderV2: 'From your statement',
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add constants/strings.ts && git commit -m "feat(onboarding-v2): add N1/N2/N3 string keys"
```

---

### Task 3: Patch `loadOnboardingState` force-restart + unit test

**Files:**
- Modify: `store/onboarding.store.ts`
- Create: `__tests__/onboarding_v2_store_restart.test.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/musta/Code/projects/practice/MoneyApp/__tests__/onboarding_v2_store_restart.test.ts`:

```ts
import * as SecureStore from 'expo-secure-store';
import { OnboardingStep } from '@/constants/enums';

// We need to control FeatureFlags before the module loads.
// jest.mock hoists above imports, so this fires before loadOnboardingState imports it.
jest.mock('@/constants/feature_flags', () => ({
  FeatureFlags: { newOnboarding: true },
}));

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn().mockResolvedValue(undefined),
}));

// Minimal repo stub — loadOnboardingState calls AppSettingsRepository internally
// via the store singleton, but the store singleton is created at module load time.
// We mock the repository to avoid SQLite in tests.
jest.mock('@/repositories/app_settings.repository', () => ({
  AppSettingsRepository: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
  })),
}));

// Import after mocks are in place
import { loadOnboardingState } from '@/store/onboarding.store';

const mockGetItemAsync = SecureStore.getItemAsync as jest.Mock;
const mockSetItemAsync = SecureStore.setItemAsync as jest.Mock;

describe('loadOnboardingState — force-restart when flag=true', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSetItemAsync.mockResolvedValue(undefined);
  });

  it('force-restarts to N1 when flag=true and persisted step is an O* value', async () => {
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'onboarding_step') return Promise.resolve('O3');
      if (key === 'onboarding_complete') return Promise.resolve('false');
      if (key === 'base_currency') return Promise.resolve('EGP');
      if (key === 'security_choice') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    const result = await loadOnboardingState();

    expect(result.step).toBe(OnboardingStep.N1);
    expect(mockSetItemAsync).toHaveBeenCalledWith(
      expect.stringContaining('onboarding_step'),
      OnboardingStep.N1,
    );
  });

  it('does NOT restart when persisted step is already an N* value', async () => {
    mockGetItemAsync.mockImplementation((key: string) => {
      if (key === 'onboarding_step') return Promise.resolve('N3');
      if (key === 'onboarding_complete') return Promise.resolve('false');
      if (key === 'base_currency') return Promise.resolve('EGP');
      if (key === 'security_choice') return Promise.resolve(null);
      return Promise.resolve(null);
    });

    const result = await loadOnboardingState();

    expect(result.step).toBe(OnboardingStep.N3);
    // setItemAsync should NOT have been called for the restart (it may be called by other store actions but not specifically for force-restart)
    const restartCall = mockSetItemAsync.mock.calls.find(
      ([, v]) => v === OnboardingStep.N1,
    );
    expect(restartCall).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest __tests__/onboarding_v2_store_restart.test.ts --no-coverage
```

Expected: FAIL — the force-restart block does not exist yet.

- [ ] **Step 3: Patch `store/onboarding.store.ts`**

In `loadOnboardingState()`, the current line is:

```ts
const step: OnboardingStep = isOnboardingStep(stepRaw) ? stepRaw : OnboardingStep.O1;
```

Replace that single line with:

```ts
let step: OnboardingStep = isOnboardingStep(stepRaw) ? stepRaw : OnboardingStep.O1;

// Force-restart: if the new-onboarding flag is enabled and the persisted step is from
// the old O* flow, restart from N1. This handles the flag-flip moment for testers.
// No production users will be affected during the §2 window (flag ships as false).
if (FeatureFlags.newOnboarding && step.startsWith('O')) {
  step = OnboardingStep.N1;
  await SecureStore.setItemAsync(SecureStoreKeys.OnboardingStep, OnboardingStep.N1);
}
```

Also add the import for `FeatureFlags` at the top of the file (after the existing imports):

```ts
import { FeatureFlags } from '@/constants/feature_flags';
```

The full import block at the top of `store/onboarding.store.ts` should now be:

```ts
import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import { Currency, OnboardingStep, SecurityChoice } from '@/constants/enums';
import { FeatureFlags } from '@/constants/feature_flags';
import { SecureStoreKeys } from '@/constants/secure_store_keys';
import {
  AppSettingsRepository,
  type IAppSettingsRepository,
} from '@/repositories/app_settings.repository';
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest __tests__/onboarding_v2_store_restart.test.ts --no-coverage
```

Expected: PASS, 2 tests passing.

- [ ] **Step 5: Run full test suite to confirm no regressions**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run test:coverage
```

Expected: all existing tests still pass. Coverage thresholds met.

- [ ] **Step 6: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add store/onboarding.store.ts __tests__/onboarding_v2_store_restart.test.ts && git commit -m "feat(onboarding-v2): patch loadOnboardingState force-restart for flag=true + O* step"
```

---

## Phase 2 · N1 — Welcome + Currency (Day 1, afternoon)

**Verification gate:** N1 hook tests pass. N1 smoke test passes. `npm run typecheck` passes.

---

### Task 4: N1 hook test + implementation

**Files:**
- Create: `__tests__/screens/onboarding_v2_welcome.hook.test.ts`
- Create: `screens/onboarding_v2/welcome/welcome.hook.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p /Users/musta/Code/projects/practice/MoneyApp/screens/onboarding_v2/welcome
```

- [ ] **Step 2: Write the failing test**

Create `/Users/musta/Code/projects/practice/MoneyApp/__tests__/screens/onboarding_v2_welcome.hook.test.ts`:

```ts
import { act, renderHook } from '@testing-library/react-native';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useWelcome } from '@/screens/onboarding_v2/welcome/welcome.hook';
import { OnboardingStep, Currency } from '@/constants/enums';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
}));
jest.mock('@/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));

const mockSetBaseCurrency = jest.fn().mockResolvedValue(undefined);
const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();

function setup(baseCurrency: Currency = Currency.EGP) {
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { baseCurrency },
      setBaseCurrency: mockSetBaseCurrency,
      setStep: mockSetStep,
    }),
  );
  jest.spyOn(require('expo-router'), 'useRouter').mockReturnValue({ push: mockPush });
}

describe('useWelcome', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('defaults selected to onboarding store baseCurrency (EGP)', () => {
    const { result } = renderHook(() => useWelcome());
    expect(result.current.state.selected).toBe(Currency.EGP);
  });

  it('defaults selected to USD if store baseCurrency is USD', () => {
    setup(Currency.USD);
    const { result } = renderHook(() => useWelcome());
    expect(result.current.state.selected).toBe(Currency.USD);
  });

  it('setSelected updates the selected currency', () => {
    const { result } = renderHook(() => useWelcome());
    act(() => {
      result.current.setSelected(Currency.USD);
    });
    expect(result.current.state.selected).toBe(Currency.USD);
  });

  it('onContinue calls setBaseCurrency with selected currency', async () => {
    const { result } = renderHook(() => useWelcome());
    act(() => {
      result.current.setSelected(Currency.USD);
    });
    await act(async () => {
      await result.current.onContinue();
    });
    expect(mockSetBaseCurrency).toHaveBeenCalledWith(Currency.USD);
  });

  it('onContinue calls setStep with N2', async () => {
    const { result } = renderHook(() => useWelcome());
    await act(async () => {
      await result.current.onContinue();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N2);
  });

  it('onContinue navigates to /(onboarding)/add_account', async () => {
    const { result } = renderHook(() => useWelcome());
    await act(async () => {
      await result.current.onContinue();
    });
    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/add_account');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest __tests__/screens/onboarding_v2_welcome.hook.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/screens/onboarding_v2/welcome/welcome.hook'`.

- [ ] **Step 4: Create `screens/onboarding_v2/welcome/welcome.hook.ts`**

```ts
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { useOnboardingStore } from '@/store/onboarding.store';
import { Currency, OnboardingStep } from '@/constants/enums';

export function useWelcome() {
  const { state: onboardingState, setBaseCurrency, setStep } = useOnboardingStore(
    useShallow((s) => ({
      state: s.state,
      setBaseCurrency: s.setBaseCurrency,
      setStep: s.setStep,
    })),
  );
  const router = useRouter();
  const [selected, setSelected] = useState<Currency>(onboardingState.baseCurrency);

  const onContinue = async () => {
    await setBaseCurrency(selected);
    await setStep(OnboardingStep.N2);
    router.push('/(onboarding)/add_account');
  };

  return { state: { selected }, setSelected, onContinue };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest __tests__/screens/onboarding_v2_welcome.hook.test.ts --no-coverage
```

Expected: PASS, 6 tests passing.

- [ ] **Step 6: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/welcome/welcome.hook.ts __tests__/screens/onboarding_v2_welcome.hook.test.ts && git commit -m "feat(onboarding-v2): N1 welcome hook + tests"
```

---

### Task 5: N1 anim file

**Files:**
- Create: `screens/onboarding_v2/welcome/welcome.anim.ts`

No separate test — the anim file is covered by the smoke test (renders without throwing means the hook does not crash).

- [ ] **Step 1: Create `screens/onboarding_v2/welcome/welcome.anim.ts`**

```ts
import { FadeInDown, FadeInUp } from 'react-native-reanimated';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

export function useWelcomeAnim() {
  // Key is 'welcome_v2' to avoid collision with the old 'welcome' key
  // while both v1 and v2 screens co-exist during the flag=false window.
  const play = useFirstMountEntering('welcome_v2');

  return {
    illustrationEntering: play ? FadeInDown.duration(280) : undefined,
    headlineEntering: play ? FadeInUp.delay(80).duration(320) : undefined,
    pillsEntering: play ? FadeInUp.delay(160).duration(300) : undefined,
    ctaEntering: play ? FadeInUp.delay(200).duration(400) : undefined,
  };
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/welcome/welcome.anim.ts && git commit -m "feat(onboarding-v2): N1 welcome anim (welcome_v2 key)"
```

---

### Task 6: N1 screen + smoke test

**Files:**
- Create: `screens/onboarding_v2/welcome/index.tsx`
- Create: `__tests__/screens/smoke/onboarding_v2_welcome.screen.test.tsx`

- [ ] **Step 1: Write the failing smoke test**

Create `/Users/musta/Code/projects/practice/MoneyApp/__tests__/screens/smoke/onboarding_v2_welcome.screen.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    default: { View: RN.View, Text: RN.Text },
    FadeInDown: { duration: jest.fn(() => ({})) },
    FadeInUp: { delay: jest.fn(() => ({ duration: jest.fn(() => ({})) })) },
    useFirstMountEntering: jest.fn(() => false),
    View: RN.View,
    Text: RN.Text,
    createAnimatedComponent: (c: any) => c,
  };
});
jest.mock('@/utils/use_first_mount_entering.hook', () => ({
  useFirstMountEntering: jest.fn(() => false),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({ useRouter: () => ({ push: jest.fn() }) }));
jest.mock('@/store/onboarding.store', () => ({
  useOnboardingStore: (sel: any) =>
    sel({
      state: { baseCurrency: 'EGP' },
      setBaseCurrency: jest.fn().mockResolvedValue(undefined),
      setStep: jest.fn().mockResolvedValue(undefined),
    }),
}));
jest.mock('@/components/geo_illustration', () => ({
  GeoIllustration: () => null,
}));
jest.mock('@/components/progress_dots', () => ({
  ProgressDots: ({ testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'progress-dots'} />;
  },
}));

import WelcomeScreenV2 from '@/screens/onboarding_v2/welcome';

describe('WelcomeScreenV2 smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<WelcomeScreenV2 />)).not.toThrow();
  });

  it('renders ProgressDots', () => {
    const { getByTestId } = render(<WelcomeScreenV2 />);
    expect(getByTestId('progress-dots')).toBeTruthy();
  });

  it('renders both currency pills (EGP and USD)', () => {
    const { getByText } = render(<WelcomeScreenV2 />);
    expect(getByText('EGP')).toBeTruthy();
    expect(getByText('USD')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest "__tests__/screens/smoke/onboarding_v2_welcome.screen.test.tsx" --no-coverage
```

Expected: FAIL — `Cannot find module '@/screens/onboarding_v2/welcome'`.

- [ ] **Step 3: Create `screens/onboarding_v2/welcome/index.tsx`**

```tsx
import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { GeoIllustration } from '@/components/geo_illustration';
import { ProgressDots } from '@/components/progress_dots';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { cn } from '@/utils/cn';
import { useWelcome } from './welcome.hook';
import { useWelcomeAnim } from './welcome.anim';

export default function WelcomeScreenV2() {
  const { state, setSelected, onContinue } = useWelcome();
  const { illustrationEntering, headlineEntering, pillsEntering, ctaEntering } = useWelcomeAnim();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <ProgressDots totalSteps={4} currentStep={1} />

      <ScrollView className="flex-1" contentContainerStyle={{ flexGrow: 1 }}>
        <Box className="flex-1 items-center justify-center gap-6 px-4">
          <Animated.View entering={illustrationEntering}>
            <GeoIllustration />
          </Animated.View>

          <Animated.View entering={headlineEntering} className="items-center gap-1">
            <Text variant="hero" className="text-center font-soraExtra">
              {Strings.o1Headline}
            </Text>
            <Text variant="body" className="text-text2 text-center mt-1">
              {Strings.o1Subtext}
            </Text>
          </Animated.View>

          <Text variant="hint" className="mt-4 self-start">
            {Strings.n1CurrencyLabel}
          </Text>

          <Animated.View entering={pillsEntering} className="flex-row gap-3 w-full">
            {(['EGP', 'USD'] as Currency[]).map((code) => (
              <Pressable
                key={code}
                onPress={() => setSelected(code)}
                className={cn(
                  'flex-1 flex-row items-center justify-center gap-2 py-3 rounded-[10px] border-[1.5px]',
                  state.selected === code
                    ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]'
                    : 'border-border bg-surfaceEl',
                )}
              >
                <Text className="text-[18px]">{code === 'EGP' ? '🇪🇬' : '🇺🇸'}</Text>
                <Text
                  variant="body"
                  className={cn(
                    'font-soraBold',
                    state.selected === code ? 'text-gold-600' : 'text-text2',
                  )}
                >
                  {code}
                </Text>
              </Pressable>
            ))}
          </Animated.View>

          <Box className="mt-3 bg-surface rounded-[10px] px-4 py-3 w-full">
            <Text variant="caption" className="text-text2">
              {Strings.n1CurrencyNote}
            </Text>
          </Box>
        </Box>
      </ScrollView>

      <Box className="border-t border-surface pt-2 px-4 pb-6">
        <Animated.View entering={ctaEntering}>
          <Button variant="primary" label={Strings.o1Cta} onPress={onContinue} />
        </Animated.View>
      </Box>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Run smoke test to verify it passes**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest "__tests__/screens/smoke/onboarding_v2_welcome.screen.test.tsx" --no-coverage
```

Expected: PASS, 3 tests passing.

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/welcome/index.tsx "__tests__/screens/smoke/onboarding_v2_welcome.screen.test.tsx" && git commit -m "feat(onboarding-v2): N1 welcome screen + smoke test"
```

---

### Task 7: N1 route wrapper

**Files:**
- Modify: `app/(onboarding)/welcome/index.tsx`

- [ ] **Step 1: Replace the existing one-liner re-export with the conditional dispatcher**

Current content of `app/(onboarding)/welcome/index.tsx`:
```tsx
export { default } from '@/screens/onboarding/welcome';
```

Replace with:

```tsx
import React from 'react';
import { FeatureFlags } from '@/constants/feature_flags';
import WelcomeScreenV1 from '@/screens/onboarding/welcome';
import WelcomeScreenV2 from '@/screens/onboarding_v2/welcome';

export default function WelcomeRoute() {
  return FeatureFlags.newOnboarding ? <WelcomeScreenV2 /> : <WelcomeScreenV1 />;
}
```

This is a valid `app/` route file: it has a default export (the `WelcomeRoute` function component), has no `.hook.ts`/`.anim.ts`/`.store.ts` siblings, and the existing `_layout.tsx` is untouched. Metro tree-shakes the unused branch at build time.

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Manual verification (flag=false)**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx expo start
```

Open on Android Expo Go. Navigate to the welcome screen. Expected: old V1 screen renders unchanged (`FeatureFlags.newOnboarding` is still `false`).

- [ ] **Step 4: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add "app/(onboarding)/welcome/index.tsx" && git commit -m "feat(onboarding-v2): N1 route wrapper — conditional dispatcher"
```

---

## Phase 3 · N2 — Add Account (Day 2, morning)

**Verification gate:** N2 hook tests pass. N2 smoke test passes. `npm run typecheck` passes.

---

### Task 8: N2 hook test + implementation

**Files:**
- Create: `__tests__/screens/onboarding_v2_add_account.hook.test.ts`
- Create: `screens/onboarding_v2/add_account/add_account.hook.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p /Users/musta/Code/projects/practice/MoneyApp/screens/onboarding_v2/add_account/components
```

- [ ] **Step 2: Write the failing test**

Create `/Users/musta/Code/projects/practice/MoneyApp/__tests__/screens/onboarding_v2_add_account.hook.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react-native';
import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useAddAccountV2 } from '@/screens/onboarding_v2/add_account/add_account.hook';
import { OnboardingStep, AccountType } from '@/constants/enums';
import { AcctTokens } from '@/constants/theme_tokens';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() })),
}));
jest.mock('@/utils/onboarding_nav', () => ({ backOrReplace: jest.fn() }));
jest.mock('@/store/account.store', () => ({
  useAccountStore: Object.assign(jest.fn(), {
    getState: jest.fn(() => ({ loadAccounts: jest.fn().mockResolvedValue(undefined) })),
  }),
}));
jest.mock('@/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));

const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockAddAccount = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();
const mockBackOrReplace = jest.fn();

function setup(isAddingMore = false) {
  const { useLocalSearchParams, useRouter } = require('expo-router');
  (useLocalSearchParams as jest.Mock).mockReturnValue(
    isAddingMore ? { isAddingMore: 'true' } : {},
  );
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush, back: jest.fn(), replace: jest.fn() });
  (require('@/utils/onboarding_nav').backOrReplace as jest.Mock) = mockBackOrReplace;

  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] }, addAccount: mockAddAccount }),
  );
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { baseCurrency: 'EGP' }, setStep: mockSetStep }),
  );
}

describe('useAddAccountV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useAddAccountV2())).not.toThrow();
  });

  it('default selected_color is AcctTokens.midnight.rich', () => {
    const { result } = renderHook(() => useAddAccountV2());
    expect(result.current.form.getValues('selected_color')).toBe(AcctTokens.midnight.rich);
  });

  it('default selected_type is Bank', () => {
    const { result } = renderHook(() => useAddAccountV2());
    expect(result.current.form.getValues('selected_type')).toBe(AccountType.Bank);
  });

  it('onBack without isAddingMore targets /(onboarding)/welcome', () => {
    const { result } = renderHook(() => useAddAccountV2());
    act(() => {
      result.current.onBack();
    });
    expect(mockBackOrReplace).toHaveBeenCalledWith(expect.anything(), '/(onboarding)/welcome');
  });

  it('onBack with isAddingMore targets /(onboarding)/more_accounts', () => {
    setup(true);
    const { result } = renderHook(() => useAddAccountV2());
    act(() => {
      result.current.onBack();
    });
    expect(mockBackOrReplace).toHaveBeenCalledWith(expect.anything(), '/(onboarding)/more_accounts');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest __tests__/screens/onboarding_v2_add_account.hook.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/screens/onboarding_v2/add_account/add_account.hook'`.

- [ ] **Step 4: Create `screens/onboarding_v2/add_account/add_account.hook.ts`**

```ts
import { useEffect, useMemo } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useZodForm } from '@/utils/use_zod_form.hook';
import { backOrReplace } from '@/utils/onboarding_nav';
import { AcctTokens } from '@/constants/theme_tokens';
import { AccountType, OnboardingStep } from '@/constants/enums';
import {
  createAddAccountSchema,
  type AddAccountFormData,
} from '@/utils/schemas/add_account.schema';

// The 12 ACCOUNT_COLORS sourced from AcctTokens.*.rich values (spec §2.4).
// Used by the color picker in index.tsx. Exported so the screen can render the row.
export const ACCOUNT_COLORS = [
  AcctTokens.midnight.rich, // #1B2B4B — default
  AcctTokens.gold.rich,     // #C9973A
  AcctTokens.nile.rich,     // #2D7D6E
  AcctTokens.paprika.rich,  // #C45C2A
  AcctTokens.plum.rich,     // #5A2D55
  AcctTokens.lapis.rich,    // #185FA5
  AcctTokens.rose.rich,     // #B8526D
  AcctTokens.sand.rich,     // #C9A876
  AcctTokens.amethyst.rich, // #7B3F8C
  AcctTokens.emerald.rich,  // #4CAF82
  AcctTokens.saffron.rich,  // #D4830A
  AcctTokens.steel.rich,    // #4A6FA5
] as const;

export function useAddAccountV2() {
  const router = useRouter();
  const { isAddingMore } = useLocalSearchParams<{ isAddingMore?: string }>();
  const { state: accountState, addAccount } = useAccountStore(
    useShallow((s) => ({ state: s.state, addAccount: s.addAccount })),
  );
  const { state: onboardingState, setStep } = useOnboardingStore(
    useShallow((s) => ({ state: s.state, setStep: s.setStep })),
  );

  useEffect(() => {
    useAccountStore.getState().loadAccounts();
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
      selected_color: AcctTokens.midnight.rich, // v2: use AcctTokens instead of AccountColors[0]
      currency: onboardingState.baseCurrency,
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
      interest_tracking: (data.interest_tracking ? 1 : 0) as 0 | 1,
      sort_order: accountState.accounts.length,
      credit_limit: isCC && data.credit_limit?.trim() ? parseFloat(data.credit_limit) : null,
      revolving_balance:
        isCC && data.revolving_balance?.trim() ? parseFloat(data.revolving_balance) || 0 : null,
      minimum_payment: isCC && data.min_payment?.trim() ? parseFloat(data.min_payment) : null,
      statement_due_day: isCC && data.due_day?.trim() ? parseInt(data.due_day, 10) : null,
      apr: isCC && data.interest_tracking && data.apr?.trim() ? parseFloat(data.apr) : null,
    });
    if (isAddingMore) {
      backOrReplace(router, '/(onboarding)/more_accounts');
    } else {
      await setStep(OnboardingStep.N3); // v2: was O5 in original hook
      router.push('/(onboarding)/more_accounts');
    }
  };

  const onBack = () =>
    backOrReplace(
      router,
      isAddingMore ? '/(onboarding)/more_accounts' : '/(onboarding)/welcome', // v2: was /security
    );

  return { form, handleSave: form.handleSubmit(onSubmit), onBack };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest __tests__/screens/onboarding_v2_add_account.hook.test.ts --no-coverage
```

Expected: PASS, 5 tests passing.

- [ ] **Step 6: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/add_account/add_account.hook.ts __tests__/screens/onboarding_v2_add_account.hook.test.ts && git commit -m "feat(onboarding-v2): N2 add_account hook + tests"
```

---

### Task 9: N2 anim file + TypePill component

**Files:**
- Create: `screens/onboarding_v2/add_account/add_account.anim.ts`
- Create: `screens/onboarding_v2/add_account/components/type_pill.tsx`

- [ ] **Step 1: Create `screens/onboarding_v2/add_account/add_account.anim.ts`**

Port verbatim from `screens/onboarding/add_account/add_account.anim.ts` — no changes needed (this anim has no `useFirstMountEntering`, so no key collision risk):

```ts
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

- [ ] **Step 2: Create `screens/onboarding_v2/add_account/components/type_pill.tsx`**

Port from `screens/onboarding/add_account/components/type_pill.tsx` with §1 primitives replacing bare RN components and StyleSheet replaced by Tailwind classes. `TYPE_OPTIONS` and `TypeOption` are identical — no schema changes.

```tsx
import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated from 'react-native-reanimated';

import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { AccountType } from '@/constants/enums';
import { GoldTokens, CoreTokens } from '@/constants/theme_tokens';
import { cn } from '@/utils/cn';
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
  { type: AccountType.CreditCard, icon: 'credit-card', label: Strings.typeCreditCard, fullWidth: true },
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
        className={cn(
          'flex-row items-center gap-2 py-3 px-3 rounded-[8px] border-[1.5px]',
          isSelected
            ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]'
            : 'border-border bg-surfaceEl',
        )}
      >
        <MaterialCommunityIcons name={option.icon} size={18} color={iconColor} />
        <Text
          variant="body"
          className={cn('font-soraBold', isSelected ? 'text-gold-600' : 'text-text2')}
        >
          {option.label}
        </Text>
      </Pressable>
    </Animated.View>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/add_account/add_account.anim.ts "screens/onboarding_v2/add_account/components/type_pill.tsx" && git commit -m "feat(onboarding-v2): N2 anim (port) + TypePill to §1 primitives"
```

---

### Task 10: N2 screen + smoke test

**Files:**
- Create: `screens/onboarding_v2/add_account/index.tsx`
- Create: `__tests__/screens/smoke/onboarding_v2_add_account.screen.test.tsx`

- [ ] **Step 1: Write the failing smoke test**

Create `/Users/musta/Code/projects/practice/MoneyApp/__tests__/screens/smoke/onboarding_v2_add_account.screen.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    default: { View: RN.View },
    FadeInDown: { duration: jest.fn(() => ({})) },
    FadeOutUp: { duration: jest.fn(() => ({})) },
    useSharedValue: jest.fn((v: any) => ({ value: v })),
    useAnimatedStyle: jest.fn(() => ({})),
    withSequence: jest.fn((...args: any[]) => args[args.length - 1]),
    withSpring: jest.fn((v: any) => v),
    withTiming: jest.fn((v: any) => v),
    View: RN.View,
    createAnimatedComponent: (c: any) => c,
  };
});
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), back: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => ({}),
}));
jest.mock('@/utils/onboarding_nav', () => ({ backOrReplace: jest.fn() }));
jest.mock('@/store/account.store', () => ({
  useAccountStore: Object.assign(
    (sel: any) => sel({ state: { accounts: [] }, addAccount: jest.fn() }),
    { getState: jest.fn(() => ({ loadAccounts: jest.fn() })) },
  ),
}));
jest.mock('@/store/onboarding.store', () => ({
  useOnboardingStore: (sel: any) =>
    sel({ state: { baseCurrency: 'EGP' }, setStep: jest.fn() }),
}));
jest.mock('@/components/progress_dots', () => ({
  ProgressDots: ({ testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'progress-dots'} />;
  },
}));

import AddAccountScreenV2 from '@/screens/onboarding_v2/add_account';

describe('AddAccountScreenV2 smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<AddAccountScreenV2 />)).not.toThrow();
  });

  it('renders ProgressDots', () => {
    const { getByTestId } = render(<AddAccountScreenV2 />);
    expect(getByTestId('progress-dots')).toBeTruthy();
  });

  it('renders the Account Name input', () => {
    const { getByPlaceholderText } = render(<AddAccountScreenV2 />);
    expect(getByPlaceholderText('e.g. CIB Savings')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest "__tests__/screens/smoke/onboarding_v2_add_account.screen.test.tsx" --no-coverage
```

Expected: FAIL — `Cannot find module '@/screens/onboarding_v2/add_account'`.

- [ ] **Step 3: Create `screens/onboarding_v2/add_account/index.tsx`**

```tsx
import React from 'react';
import { ScrollView, Switch } from 'react-native';
import Animated from 'react-native-reanimated';
import { Controller, useWatch } from 'react-hook-form';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ProgressDots } from '@/components/progress_dots';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { AccountType, Currency } from '@/constants/enums';
import { CoreTokens, GoldTokens } from '@/constants/theme_tokens';
import { cn } from '@/utils/cn';
import { useAddAccountV2, ACCOUNT_COLORS } from './add_account.hook';
import { useAddAccountAnim } from './add_account.anim';
import { TypePill, TYPE_OPTIONS } from './components/type_pill';

const CURRENCY_OPTIONS: Currency[] = [Currency.EGP, Currency.USD];

export default function AddAccountScreenV2() {
  const { form, handleSave, onBack } = useAddAccountV2();
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
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      {/* Header */}
      <Box className="flex-row items-center justify-between px-4 h-14">
        <Pressable onPress={onBack} className="w-9 h-9 rounded-[8px] bg-surface border border-border items-center justify-center">
          <MaterialCommunityIcons name="chevron-left" size={24} color={CoreTokens.text2} />
        </Pressable>
        <Text variant="title" className="font-soraBold">{Strings.o4Title}</Text>
        <Box className="w-9 h-9" />
      </Box>

      <ProgressDots totalSteps={4} currentStep={2} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }} keyboardShouldPersistTaps="handled">
        {/* Account Type */}
        <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">
          {Strings.o4SectionType}
        </Text>
        <Box className="flex-row flex-wrap gap-2">
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
          <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">
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
                hasError={!!errors.name}
              />
            )}
          />
          {errors.name ? (
            <Animated.Text entering={errorEntering} exiting={errorExiting} className="text-negative font-inter text-[12px] mt-1">
              {errors.name.message}
            </Animated.Text>
          ) : null}
        </Box>

        {/* Currency */}
        <Box className="pt-1">
          <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">
            {Strings.o4SectionCurrency}
          </Text>
          <Box className="flex-row gap-2">
            {CURRENCY_OPTIONS.map((code) => (
              <Pressable
                key={code}
                onPress={() => form.setValue('currency', code)}
                className={cn(
                  'flex-1 py-3 px-3 rounded-[10px] border-[1.5px] items-center justify-center',
                  selectedCurrency === code ? 'border-gold-600 bg-[rgba(201,151,58,0.08)]' : 'border-border bg-surfaceEl',
                )}
              >
                <Text variant="body" className={cn('font-soraBold', selectedCurrency === code ? 'text-gold-600' : 'text-text2')}>
                  {code}
                </Text>
              </Pressable>
            ))}
          </Box>
        </Box>

        {/* Balance */}
        <Box className="pt-1">
          <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">
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
                hasError={!!errors.balance}
              />
            )}
          />
          {errors.balance ? (
            <Animated.Text entering={errorEntering} exiting={errorExiting} className="text-negative font-inter text-[12px] mt-1">
              {errors.balance.message}
            </Animated.Text>
          ) : null}
        </Box>

        {/* Color picker */}
        <Box className="pt-1">
          <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">
            {Strings.o4SectionColor}
          </Text>
          <Box className="flex-row flex-wrap gap-2">
            {ACCOUNT_COLORS.map((color) => (
              <Pressable
                key={color}
                onPress={() => form.setValue('selected_color', color)}
                className="p-0.5"
              >
                <Box
                  className={cn(
                    'w-8 h-8 rounded-full',
                    selectedColor === color && 'border-2 border-gold-500 scale-110',
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
              <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">{Strings.o4SectionRevolving}</Text>
              <Controller
                control={control}
                name="revolving_balance"
                render={({ field: { value, onChange } }) => (
                  <Input value={value} onChangeText={onChange} placeholder={Strings.o4RevolvingPlaceholder} keyboardType="decimal-pad" />
                )}
              />
            </Box>

            {/* Credit Limit */}
            <Box className="pt-1">
              <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">{Strings.o4SectionLimit}</Text>
              <Controller
                control={control}
                name="credit_limit"
                render={({ field: { value, onChange, onBlur } }) => (
                  <Input value={value} onChangeText={onChange} onBlur={onBlur} placeholder={Strings.o4CreditLimitPlaceholder} keyboardType="decimal-pad" hasError={!!errors.credit_limit} />
                )}
              />
              {errors.credit_limit ? (
                <Animated.Text entering={errorEntering} exiting={errorExiting} className="text-negative font-inter text-[12px] mt-1">{errors.credit_limit.message}</Animated.Text>
              ) : null}
            </Box>

            {/* Min Payment */}
            <Box className="pt-1">
              <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">{Strings.o4SectionMinPayment}</Text>
              <Controller
                control={control}
                name="min_payment"
                render={({ field: { value, onChange } }) => (
                  <Input value={value} onChangeText={onChange} placeholder={Strings.o4MinPaymentPlaceholderV2} keyboardType="decimal-pad" />
                )}
              />
              <Text variant="caption" className="text-text2 mt-1">{Strings.o4MinPaymentHint}</Text>
            </Box>

            {/* Due Day */}
            <Box className="pt-1">
              <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">{Strings.o4SectionDueDay}</Text>
              <Controller
                control={control}
                name="due_day"
                render={({ field: { value, onChange } }) => (
                  <Input value={value} onChangeText={onChange} placeholder={Strings.o4DueDayPlaceholder} keyboardType="number-pad" maxLength={2} />
                )}
              />
            </Box>

            {/* Interest Tracking — native Switch (spec §2.4) */}
            <Box className="flex-row items-center justify-between py-3">
              <Text variant="body" className="font-interSemi text-text1">{Strings.o4InterestLabel}</Text>
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

            {/* APR (shown when interest tracking ON) */}
            {interestTracking && (
              <Animated.View entering={aprEntering} exiting={aprExiting} className="pt-1">
                <Text variant="hint" className="pt-2 pb-2 font-soraBold text-gold-500 tracking-widest">{Strings.o4SectionApr}</Text>
                <Controller
                  control={control}
                  name="apr"
                  render={({ field: { value, onChange, onBlur } }) => (
                    <Input value={value} onChangeText={onChange} onBlur={onBlur} placeholder={Strings.o4AprPlaceholder} keyboardType="decimal-pad" hasError={!!errors.apr} />
                  )}
                />
                <Text variant="caption" className="text-text2 mt-1">{Strings.o4AprHint}</Text>
                {errors.apr ? (
                  <Animated.Text entering={errorEntering} exiting={errorExiting} className="text-negative font-inter text-[12px] mt-1">{errors.apr.message}</Animated.Text>
                ) : null}
              </Animated.View>
            )}
          </Animated.View>
        )}
      </ScrollView>

      {/* CTA bar */}
      <Box className="border-t border-surface pt-2 px-4 pb-6">
        <Animated.View style={btnAnim}>
          <Button
            variant="primary"
            label={Strings.o4Cta}
            onPress={() => {
              triggerBtnPress();
              handleSave();
            }}
            disabled={isSubmitting}
          />
        </Animated.View>
      </Box>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Run smoke test to verify it passes**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest "__tests__/screens/smoke/onboarding_v2_add_account.screen.test.tsx" --no-coverage
```

Expected: PASS, 3 tests passing.

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/add_account/index.tsx "__tests__/screens/smoke/onboarding_v2_add_account.screen.test.tsx" && git commit -m "feat(onboarding-v2): N2 add_account screen + smoke test"
```

---

### Task 11: N2 route wrapper

**Files:**
- Modify: `app/(onboarding)/add_account/index.tsx`

- [ ] **Step 1: Replace the existing one-liner with the conditional dispatcher**

Current content:
```tsx
export { default } from '@/screens/onboarding/add_account';
```

Replace with:

```tsx
import React from 'react';
import { FeatureFlags } from '@/constants/feature_flags';
import AddAccountScreenV1 from '@/screens/onboarding/add_account';
import AddAccountScreenV2 from '@/screens/onboarding_v2/add_account';

export default function AddAccountRoute() {
  return FeatureFlags.newOnboarding ? <AddAccountScreenV2 /> : <AddAccountScreenV1 />;
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add "app/(onboarding)/add_account/index.tsx" && git commit -m "feat(onboarding-v2): N2 route wrapper — conditional dispatcher"
```

---

## Phase 4 · N3 — Add Another? (Day 2, afternoon)

**Verification gate:** N3 hook tests pass. N3 smoke test passes. `npm run typecheck` passes.

---

### Task 12: N3 hook test + implementation

**Files:**
- Create: `__tests__/screens/onboarding_v2_more_accounts.hook.test.ts`
- Create: `screens/onboarding_v2/more_accounts/more_accounts.hook.ts`

- [ ] **Step 1: Create directory structure**

```bash
mkdir -p /Users/musta/Code/projects/practice/MoneyApp/screens/onboarding_v2/more_accounts/components
```

- [ ] **Step 2: Write the failing test**

Create `/Users/musta/Code/projects/practice/MoneyApp/__tests__/screens/onboarding_v2_more_accounts.hook.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react-native';
import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useMoreAccountsV2 } from '@/screens/onboarding_v2/more_accounts/more_accounts.hook';
import { OnboardingStep } from '@/constants/enums';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
  useFocusEffect: jest.fn(),
}));
jest.mock('@/store/account.store', () => ({
  useAccountStore: Object.assign(jest.fn(), {
    getState: jest.fn(() => ({ loadAccounts: jest.fn().mockResolvedValue(undefined) })),
  }),
}));
jest.mock('@/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));

const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockPush = jest.fn();

const fakeAccounts = [
  { id: '1', name: 'CIB Savings', type: 'bank', currency: 'EGP', color: '#1B2B4B', current_balance: 5000, opening_balance: 5000 },
  { id: '2', name: 'Cash', type: 'physical_wallet', currency: 'EGP', color: '#2D7D6E', current_balance: 200, opening_balance: 200 },
];

function setup(accounts = fakeAccounts) {
  const { useRouter } = require('expo-router');
  (useRouter as jest.Mock).mockReturnValue({ push: mockPush });

  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts } }),
  );
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ setStep: mockSetStep }),
  );
}

describe('useMoreAccountsV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useMoreAccountsV2())).not.toThrow();
  });

  it('accounts reflects account store state', () => {
    const { result } = renderHook(() => useMoreAccountsV2());
    expect(result.current.accounts).toHaveLength(2);
    expect(result.current.accounts[0].name).toBe('CIB Savings');
  });

  it('handleContinue calls setStep with N4', async () => {
    const { result } = renderHook(() => useMoreAccountsV2());
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N4);
  });

  it('handleContinue navigates to /(onboarding)/ready', async () => {
    const { result } = renderHook(() => useMoreAccountsV2());
    await act(async () => {
      await result.current.handleContinue();
    });
    expect(mockPush).toHaveBeenCalledWith('/(onboarding)/ready');
  });

  it('handleAddAnother navigates to /(onboarding)/add_account with isAddingMore=true', () => {
    const { result } = renderHook(() => useMoreAccountsV2());
    act(() => {
      result.current.handleAddAnother();
    });
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/(onboarding)/add_account',
      params: { isAddingMore: 'true' },
    });
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest __tests__/screens/onboarding_v2_more_accounts.hook.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/screens/onboarding_v2/more_accounts/more_accounts.hook'`.

- [ ] **Step 4: Create `screens/onboarding_v2/more_accounts/more_accounts.hook.ts`**

```ts
import { useCallback, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { OnboardingStep } from '@/constants/enums';

export function useMoreAccountsV2() {
  const router = useRouter();
  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { setStep } = useOnboardingStore(useShallow((s) => ({ setStep: s.setStep })));

  const initialCountRef = useRef<number>(accountState.accounts.length);
  const initialCount = initialCountRef.current;

  useFocusEffect(
    useCallback(() => {
      useAccountStore.getState().loadAccounts();
    }, []),
  );

  const handleAddAnother = () => {
    router.push({
      pathname: '/(onboarding)/add_account',
      params: { isAddingMore: 'true' },
    });
  };

  // Renamed from handleDone → handleContinue (spec §2.5); navigates to N4 (was O6)
  const handleContinue = async () => {
    await setStep(OnboardingStep.N4);
    router.push('/(onboarding)/ready');
  };

  return { accounts: accountState.accounts, initialCount, handleAddAnother, handleContinue };
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest __tests__/screens/onboarding_v2_more_accounts.hook.test.ts --no-coverage
```

Expected: PASS, 5 tests passing.

- [ ] **Step 6: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/more_accounts/more_accounts.hook.ts __tests__/screens/onboarding_v2_more_accounts.hook.test.ts && git commit -m "feat(onboarding-v2): N3 more_accounts hook + tests"
```

---

### Task 13: N3 anim + AccountRow component

**Files:**
- Create: `screens/onboarding_v2/more_accounts/more_accounts.anim.ts`
- Create: `screens/onboarding_v2/more_accounts/components/account_row.tsx`

- [ ] **Step 1: Create `screens/onboarding_v2/more_accounts/more_accounts.anim.ts`**

New animations vs. O5 — adds check-circle, headline, and subtitle entering animations:

```ts
import { FadeInDown, FadeInRight, ZoomIn } from 'react-native-reanimated';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

export function useMoreAccountsAnim() {
  // Key is 'more_accounts_v2' to avoid collision with existing 'more_accounts' key.
  const play = useFirstMountEntering('more_accounts_v2');

  return {
    checkEntering: play ? ZoomIn.springify().damping(12).stiffness(120) : undefined,
    headlineEntering: play ? FadeInDown.delay(100).duration(280) : undefined,
    subtitleEntering: play ? FadeInDown.delay(180).duration(280) : undefined,
    // isInitialMount=true: stagger by index (rows present on first mount)
    // isInitialMount=false: no stagger (row added after returning from N2)
    rowEntering: (index: number, isInitialMount: boolean) =>
      isInitialMount
        ? FadeInRight.delay(index * 60).duration(300)
        : FadeInRight.duration(250),
  };
}
```

- [ ] **Step 2: Create `screens/onboarding_v2/more_accounts/components/account_row.tsx`**

Port of O5 `AccountRow`. Key change: icon container uses `account.color` via inline style (runtime hex — cannot be a Tailwind class). Icon color is always `CoreTokens.text1` (white on colored background).

```tsx
import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import Animated, { type EntryOrExitLayoutType } from 'react-native-reanimated';

import { Box } from '@/components/ui/box';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { AccountType } from '@/constants/enums';
import { CoreTokens, SemanticTokens } from '@/constants/theme_tokens';
import type { Account } from '@/store/account.store';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

const TYPE_ICONS: Record<AccountType, IconName> = {
  [AccountType.Bank]: 'bank',
  [AccountType.SmartWallet]: 'cellphone-nfc',
  [AccountType.PhysicalWallet]: 'wallet',
  [AccountType.PhysicalSavings]: 'piggy-bank',
  [AccountType.CreditCard]: 'credit-card',
};

const TYPE_LABELS: Record<AccountType, string> = {
  [AccountType.Bank]: Strings.typeBank,
  [AccountType.SmartWallet]: Strings.typeSmartWallet,
  [AccountType.PhysicalWallet]: Strings.typePhysicalWallet,
  [AccountType.PhysicalSavings]: Strings.typePhysicalSavings,
  [AccountType.CreditCard]: Strings.typeCreditCard,
};

export function AccountRowV2({
  account,
  index,
  entering,
}: {
  account: Account;
  index: number;
  entering: EntryOrExitLayoutType | undefined;
}) {
  const icon = TYPE_ICONS[account.type];
  const typeLabel = `${TYPE_LABELS[account.type]} · ${account.currency}`;
  const formattedBalance = new Intl.NumberFormat('en-US').format(account.opening_balance);
  const isCC = account.type === AccountType.CreditCard;

  return (
    <Animated.View entering={entering}>
      <Box className="flex-row items-center gap-3 px-3 py-3 rounded-[8px] bg-surface border border-border">
        {/* Icon container — runtime hex from account.color; inline style is the only correct approach */}
        <Box
          className="w-10 h-10 rounded-[8px] items-center justify-center border border-border"
          style={{ backgroundColor: account.color }}
        >
          <MaterialCommunityIcons name={icon} size={20} color={CoreTokens.text1} />
        </Box>

        <Box className="flex-1 gap-0.5">
          <Text variant="body" className="font-soraBold text-text1" numberOfLines={1}>
            {account.name}
          </Text>
          <Text variant="caption" className="text-text2">
            {typeLabel}
          </Text>
        </Box>

        <Text
          variant="body"
          className="font-soraBold"
          style={{ color: isCC ? SemanticTokens.negative : SemanticTokens.positive }}
        >
          {formattedBalance}
        </Text>
      </Box>
    </Animated.View>
  );
}
```

- [ ] **Step 3: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/more_accounts/more_accounts.anim.ts "screens/onboarding_v2/more_accounts/components/account_row.tsx" && git commit -m "feat(onboarding-v2): N3 anim + AccountRowV2 component"
```

---

### Task 14: N3 screen + smoke test

**Files:**
- Create: `screens/onboarding_v2/more_accounts/index.tsx`
- Create: `__tests__/screens/smoke/onboarding_v2_more_accounts.screen.test.tsx`

- [ ] **Step 1: Write the failing smoke test**

Create `/Users/musta/Code/projects/practice/MoneyApp/__tests__/screens/smoke/onboarding_v2_more_accounts.screen.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    default: { View: RN.View, Text: RN.Text },
    ZoomIn: { springify: jest.fn(() => ({ damping: jest.fn(() => ({ stiffness: jest.fn(() => ({})) })) })) },
    FadeInDown: { delay: jest.fn(() => ({ duration: jest.fn(() => ({})) })) },
    FadeInRight: { delay: jest.fn(() => ({ duration: jest.fn(() => ({})) })), duration: jest.fn(() => ({})) },
    View: RN.View,
    Text: RN.Text,
    createAnimatedComponent: (c: any) => c,
  };
});
jest.mock('@/utils/use_first_mount_entering.hook', () => ({
  useFirstMountEntering: jest.fn(() => false),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('@shopify/flash-list', () => {
  const { FlatList } = require('react-native');
  return { FlashList: FlatList };
});
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useFocusEffect: jest.fn(),
}));
jest.mock('@/store/account.store', () => ({
  useAccountStore: Object.assign(
    (sel: any) => sel({ state: { accounts: [] } }),
    { getState: jest.fn(() => ({ loadAccounts: jest.fn() })) },
  ),
}));
jest.mock('@/store/onboarding.store', () => ({
  useOnboardingStore: (sel: any) => sel({ setStep: jest.fn() }),
}));
jest.mock('@/components/progress_dots', () => ({
  ProgressDots: ({ testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'progress-dots'} />;
  },
}));

import MoreAccountsScreenV2 from '@/screens/onboarding_v2/more_accounts';

describe('MoreAccountsScreenV2 smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<MoreAccountsScreenV2 />)).not.toThrow();
  });

  it('renders ProgressDots', () => {
    const { getByTestId } = render(<MoreAccountsScreenV2 />);
    expect(getByTestId('progress-dots')).toBeTruthy();
  });

  it('renders the success headline', () => {
    const { getByText } = render(<MoreAccountsScreenV2 />);
    expect(getByText('Account saved')).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest "__tests__/screens/smoke/onboarding_v2_more_accounts.screen.test.tsx" --no-coverage
```

Expected: FAIL — `Cannot find module '@/screens/onboarding_v2/more_accounts'`.

- [ ] **Step 3: Create `screens/onboarding_v2/more_accounts/index.tsx`**

```tsx
import React from 'react';
import { FlashList } from '@shopify/flash-list';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ProgressDots } from '@/components/progress_dots';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Pressable } from '@/components/ui/pressable';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { SemanticTokens, GoldTokens } from '@/constants/theme_tokens';
import { useMoreAccountsV2 } from './more_accounts.hook';
import { useMoreAccountsAnim } from './more_accounts.anim';
import { AccountRowV2 } from './components/account_row';
import type { Account } from '@/store/account.store';

export default function MoreAccountsScreenV2() {
  const { accounts, initialCount, handleAddAnother, handleContinue } = useMoreAccountsV2();
  const { checkEntering, headlineEntering, subtitleEntering, rowEntering } = useMoreAccountsAnim();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <ProgressDots totalSteps={4} currentStep={3} />

      <Box className="flex-1 px-4">
        {/* Success header */}
        <Box className="items-center pt-8 pb-6 gap-3">
          <Animated.View entering={checkEntering}>
            <Box className="w-16 h-16 rounded-full bg-[rgba(76,175,130,0.12)] items-center justify-center">
              <MaterialCommunityIcons name="check-circle" size={40} color={SemanticTokens.positive} />
            </Box>
          </Animated.View>

          <Animated.Text entering={headlineEntering}>
            <Text variant="title" className="font-soraBold text-text1 text-center">
              {Strings.n3AccountSaved}
            </Text>
          </Animated.Text>

          <Animated.Text entering={subtitleEntering}>
            <Text variant="body" className="text-text2 text-center">
              {Strings.n3AddMoreSubtitle}
            </Text>
          </Animated.Text>
        </Box>

        {/* Account list */}
        <FlashList
          data={accounts}
          keyExtractor={(item: Account) => item.id}
          estimatedItemSize={64}
          contentContainerStyle={{ paddingBottom: 8 }}
          renderItem={({ item, index }: { item: Account; index: number }) => (
            <Box className="mb-2">
              <AccountRowV2
                account={item}
                index={index}
                entering={rowEntering(index, index < initialCount)}
              />
            </Box>
          )}
          ListFooterComponent={
            <Pressable
              onPress={handleAddAnother}
              className="flex-row items-center justify-center gap-2 p-3 mt-1 rounded-[8px] border-[1.5px] border-dashed border-border"
            >
              <Box
                className="w-7 h-7 rounded-[6px] items-center justify-center"
                style={{ backgroundColor: 'rgba(201,151,58,0.12)' }}
              >
                <Text className="text-gold-500 font-soraBold text-[16px]">+</Text>
              </Box>
              <Text variant="body" className="text-text2">
                {Strings.o5AddAnother}
              </Text>
            </Pressable>
          }
        />

        <Text variant="caption" className="text-text3 text-center px-4 py-2">
          {Strings.o5SettingsHint}
        </Text>
      </Box>

      {/* CTA */}
      <Box className="border-t border-surface pt-2 px-4 pb-6">
        <Button variant="primary" label={Strings.o5Cta} onPress={handleContinue} />
      </Box>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Run smoke test to verify it passes**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest "__tests__/screens/smoke/onboarding_v2_more_accounts.screen.test.tsx" --no-coverage
```

Expected: PASS, 3 tests passing.

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/more_accounts/index.tsx "__tests__/screens/smoke/onboarding_v2_more_accounts.screen.test.tsx" && git commit -m "feat(onboarding-v2): N3 more_accounts screen + smoke test"
```

---

### Task 15: N3 route wrapper

**Files:**
- Modify: `app/(onboarding)/more_accounts/index.tsx`

- [ ] **Step 1: Replace the existing one-liner with the conditional dispatcher**

Current content:
```tsx
export { default } from '@/screens/onboarding/more_accounts';
```

Replace with:

```tsx
import React from 'react';
import { FeatureFlags } from '@/constants/feature_flags';
import MoreAccountsScreenV1 from '@/screens/onboarding/more_accounts';
import MoreAccountsScreenV2 from '@/screens/onboarding_v2/more_accounts';

export default function MoreAccountsRoute() {
  return FeatureFlags.newOnboarding ? <MoreAccountsScreenV2 /> : <MoreAccountsScreenV1 />;
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add "app/(onboarding)/more_accounts/index.tsx" && git commit -m "feat(onboarding-v2): N3 route wrapper — conditional dispatcher"
```

---

## Phase 5 · N4 — Done (Day 3, morning)

**Verification gate:** N4 hook tests pass. N4 smoke test passes. `npm run typecheck` passes.

---

### Task 16: N4 state + helpers

**Files:**
- Create: `screens/onboarding_v2/ready/ready.state.ts`
- Create: `screens/onboarding_v2/ready/ready.helpers.ts`

- [ ] **Step 1: Create directory**

```bash
mkdir -p /Users/musta/Code/projects/practice/MoneyApp/screens/onboarding_v2/ready
```

- [ ] **Step 2: Create `screens/onboarding_v2/ready/ready.state.ts`**

Port verbatim from `screens/onboarding/ready/ready.state.ts` — no changes:

```ts
import { create } from 'zustand';

interface ReadyStateShape {
  completing: boolean;
}

interface ReadyState {
  state: ReadyStateShape;
  setCompleting: (completing: boolean) => void;
  reset: () => void;
}

const INITIAL_STATE: ReadyStateShape = { completing: false };

export const useReadyState = create<ReadyState>((set) => ({
  state: INITIAL_STATE,
  setCompleting: (completing) => set((s) => ({ state: { ...s.state, completing } })),
  reset: () => set({ state: INITIAL_STATE }),
}));
```

- [ ] **Step 3: Create `screens/onboarding_v2/ready/ready.helpers.ts`**

Port `computeTotalBalance` only. Do NOT include `resolveSecurityLabel` (dropped in N4):

```ts
import type { Account } from '@/store/account.store';

export function computeTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.current_balance, 0);
}
```

- [ ] **Step 4: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 5: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/ready/ready.state.ts screens/onboarding_v2/ready/ready.helpers.ts && git commit -m "feat(onboarding-v2): N4 ready state + helpers (computeTotalBalance, no resolveSecurityLabel)"
```

---

### Task 17: N4 hook test + implementation

**Files:**
- Create: `__tests__/screens/onboarding_v2_ready.hook.test.ts`
- Create: `screens/onboarding_v2/ready/ready.hook.ts`

- [ ] **Step 1: Write the failing test**

Create `/Users/musta/Code/projects/practice/MoneyApp/__tests__/screens/onboarding_v2_ready.hook.test.ts`:

```ts
import { renderHook, act } from '@testing-library/react-native';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useAccountStore } from '@/store/account.store';
import { useReadyV2 } from '@/screens/onboarding_v2/ready/ready.hook';
import { Strings } from '@/constants/strings';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('@/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/screens/onboarding_v2/ready/ready.state', () => ({
  useReadyState: jest.fn((sel: any) =>
    sel({ state: { completing: false }, setCompleting: jest.fn() }),
  ),
}));

const mockCompleteOnboarding = jest.fn().mockResolvedValue(undefined);
const mockSetCompleting = jest.fn();

const fakeAccounts = [
  { id: '1', current_balance: 5000, type: 'bank', opening_balance: 5000 },
  { id: '2', current_balance: 200, type: 'physical_wallet', opening_balance: 200 },
];

function setup(completing = false) {
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { baseCurrency: 'EGP' },
      completeOnboarding: mockCompleteOnboarding,
    }),
  );
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: fakeAccounts } }),
  );
  const { useReadyState } = require('@/screens/onboarding_v2/ready/ready.state');
  (useReadyState as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { completing }, setCompleting: mockSetCompleting }),
  );
}

describe('useReadyV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useReadyV2())).not.toThrow();
  });

  it('rows has exactly 3 items', () => {
    const { result } = renderHook(() => useReadyV2());
    expect(result.current.state.rows).toHaveLength(3);
  });

  it('rows does not include a Security row', () => {
    const { result } = renderHook(() => useReadyV2());
    const labels = result.current.state.rows.map((r) => r.label);
    expect(labels).not.toContain(Strings.o6Security);
  });

  it('rows contains Currency, Accounts, and TotalBalance', () => {
    const { result } = renderHook(() => useReadyV2());
    const labels = result.current.state.rows.map((r) => r.label);
    expect(labels).toContain(Strings.o6Currency);
    expect(labels).toContain(Strings.o6Accounts);
    expect(labels).toContain(Strings.o6TotalBalance);
  });

  it('TotalBalance value reflects sum of account.current_balance', () => {
    const { result } = renderHook(() => useReadyV2());
    const balanceRow = result.current.state.rows.find((r) => r.label === Strings.o6TotalBalance);
    // 5000 + 200 = 5200 → formatted as "5,200 EGP"
    expect(balanceRow?.value).toContain('5,200');
  });

  it('completing defaults to false', () => {
    const { result } = renderHook(() => useReadyV2());
    expect(result.current.state.completing).toBe(false);
  });

  it('handleComplete calls completeOnboarding', async () => {
    const { result } = renderHook(() => useReadyV2());
    await act(async () => {
      await result.current.handleComplete();
    });
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
  });

  it('double-tap guard: handleComplete does nothing when completing=true', async () => {
    setup(true); // completing = true
    const { result } = renderHook(() => useReadyV2());
    await act(async () => {
      await result.current.handleComplete();
    });
    expect(mockCompleteOnboarding).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest __tests__/screens/onboarding_v2_ready.hook.test.ts --no-coverage
```

Expected: FAIL — `Cannot find module '@/screens/onboarding_v2/ready/ready.hook'`.

- [ ] **Step 3: Create `screens/onboarding_v2/ready/ready.hook.ts`**

```ts
import { useShallow } from 'zustand/react/shallow';

import { useAccountStore } from '@/store/account.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useReadyState } from './ready.state';
import { computeTotalBalance } from './ready.helpers';
import { Strings } from '@/constants/strings';

type SummaryRow = { label: string; value: string; gold: boolean };

export function useReadyV2() {
  const { state: onboardingState, completeOnboarding } = useOnboardingStore(
    useShallow((s) => ({ state: s.state, completeOnboarding: s.completeOnboarding })),
  );
  const { state: accountState } = useAccountStore(useShallow((s) => ({ state: s.state })));
  const { state: readyState, setCompleting } = useReadyState(
    useShallow((s) => ({ state: s.state, setCompleting: s.setCompleting })),
  );

  const total = computeTotalBalance(accountState.accounts);
  const formattedTotal = new Intl.NumberFormat('en-US').format(total);

  // 3-row summary — Security row is dropped (spec §2.6)
  const rows: SummaryRow[] = [
    {
      label: Strings.o6Currency,
      value: onboardingState.baseCurrency,
      gold: true,
    },
    {
      label: Strings.o6Accounts,
      value: `${accountState.accounts.length} ${Strings.o6AccountsUnit}`,
      gold: false,
    },
    {
      label: Strings.o6TotalBalance,
      value: `${formattedTotal} ${onboardingState.baseCurrency}`,
      gold: true,
    },
  ];

  const handleComplete = async () => {
    if (readyState.completing) return;
    setCompleting(true);
    try {
      await completeOnboarding();
    } finally {
      setCompleting(false);
    }
  };

  return {
    state: { rows, completing: readyState.completing },
    handleComplete,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest __tests__/screens/onboarding_v2_ready.hook.test.ts --no-coverage
```

Expected: PASS, 8 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/ready/ready.hook.ts __tests__/screens/onboarding_v2_ready.hook.test.ts && git commit -m "feat(onboarding-v2): N4 ready hook + tests (3-row summary, no Security)"
```

---

### Task 18: N4 anim file

**Files:**
- Create: `screens/onboarding_v2/ready/ready.anim.ts`

- [ ] **Step 1: Create `screens/onboarding_v2/ready/ready.anim.ts`**

Port verbatim from `screens/onboarding/ready/ready.anim.ts` with key `'ready_v2'`:

```ts
import { FadeInUp, ZoomIn } from 'react-native-reanimated';
import { useFirstMountEntering } from '@/utils/use_first_mount_entering.hook';

export function useReadyAnim() {
  // Key is 'ready_v2' to avoid collision with existing 'ready' key while
  // both v1 and v2 screens co-exist during the flag=false window (spec R6).
  const play = useFirstMountEntering('ready_v2');

  return {
    checkEntering: play ? ZoomIn.springify().damping(10).stiffness(100) : undefined,
    headlineEntering: play ? FadeInUp.delay(200).duration(400) : undefined,
    subtitleEntering: play ? FadeInUp.delay(300).duration(350) : undefined,
    rowEntering: (index: number) =>
      play ? FadeInUp.delay(400 + index * 80).duration(300) : undefined,
    ctaEntering: play ? FadeInUp.delay(700).duration(400) : undefined,
  };
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/ready/ready.anim.ts && git commit -m "feat(onboarding-v2): N4 ready anim (ready_v2 key)"
```

---

### Task 19: N4 screen + smoke test

**Files:**
- Create: `screens/onboarding_v2/ready/index.tsx`
- Create: `__tests__/screens/smoke/onboarding_v2_ready.screen.test.tsx`

- [ ] **Step 1: Write the failing smoke test**

Create `/Users/musta/Code/projects/practice/MoneyApp/__tests__/screens/smoke/onboarding_v2_ready.screen.test.tsx`:

```tsx
import React from 'react';
import { render } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => {
  const RN = require('react-native');
  return {
    default: { View: RN.View, Text: RN.Text },
    ZoomIn: { springify: jest.fn(() => ({ damping: jest.fn(() => ({ stiffness: jest.fn(() => ({})) })) })) },
    FadeInUp: { delay: jest.fn(() => ({ duration: jest.fn(() => ({})) })) },
    View: RN.View,
    Text: RN.Text,
    createAnimatedComponent: (c: any) => c,
  };
});
jest.mock('@/utils/use_first_mount_entering.hook', () => ({
  useFirstMountEntering: jest.fn(() => false),
}));
jest.mock('react-native-safe-area-context', () => {
  const { View } = require('react-native');
  return { SafeAreaView: View };
});
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('expo-linear-gradient', () => ({ LinearGradient: 'LinearGradient' }));
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('@/store/onboarding.store', () => ({
  useOnboardingStore: (sel: any) =>
    sel({ state: { baseCurrency: 'EGP' }, completeOnboarding: jest.fn() }),
}));
jest.mock('@/store/account.store', () => ({
  useAccountStore: (sel: any) => sel({ state: { accounts: [] } }),
}));
jest.mock('@/screens/onboarding_v2/ready/ready.state', () => ({
  useReadyState: (sel: any) =>
    sel({ state: { completing: false }, setCompleting: jest.fn() }),
}));
jest.mock('@/components/progress_dots', () => ({
  ProgressDots: ({ testID }: any) => {
    const { View } = require('react-native');
    return <View testID={testID ?? 'progress-dots'} />;
  },
}));

import ReadyScreenV2 from '@/screens/onboarding_v2/ready';

describe('ReadyScreenV2 smoke test', () => {
  it('renders without throwing', () => {
    expect(() => render(<ReadyScreenV2 />)).not.toThrow();
  });

  it('renders ProgressDots', () => {
    const { getByTestId } = render(<ReadyScreenV2 />);
    expect(getByTestId('progress-dots')).toBeTruthy();
  });

  it('renders exactly 3 summary rows', () => {
    const { getAllByTestId } = render(<ReadyScreenV2 />);
    expect(getAllByTestId('summary-row')).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest "__tests__/screens/smoke/onboarding_v2_ready.screen.test.tsx" --no-coverage
```

Expected: FAIL — `Cannot find module '@/screens/onboarding_v2/ready'`.

- [ ] **Step 3: Create `screens/onboarding_v2/ready/index.tsx`**

```tsx
import React from 'react';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ProgressDots } from '@/components/progress_dots';
import { Box } from '@/components/ui/box';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { SemanticTokens, GoldTokens } from '@/constants/theme_tokens';
import { cn } from '@/utils/cn';
import { useReadyV2 } from './ready.hook';
import { useReadyAnim } from './ready.anim';

export default function ReadyScreenV2() {
  const { state, handleComplete } = useReadyV2();
  const { rows, completing } = state;
  const { checkEntering, headlineEntering, subtitleEntering, rowEntering, ctaEntering } =
    useReadyAnim();

  return (
    <SafeAreaView className="flex-1 bg-bg" edges={['top', 'bottom']}>
      <ProgressDots totalSteps={4} currentStep={4} />

      <Box className="flex-1 items-center justify-center px-4 gap-4">
        <Animated.View entering={checkEntering}>
          <MaterialCommunityIcons name="check-circle" size={64} color={SemanticTokens.positive} />
        </Animated.View>

        <Animated.Text entering={headlineEntering}>
          <Text variant="hero" className="font-soraExtra text-text1 text-center">
            {Strings.o6Title}
          </Text>
        </Animated.Text>

        <Animated.Text entering={subtitleEntering}>
          <Text variant="body" className="text-text2 text-center">
            {Strings.o6Subtitle}
          </Text>
        </Animated.Text>

        {/* 3-row summary card */}
        <Box className="w-full bg-surface border border-border rounded-[12px] py-3 px-4">
          {rows.map((row, index) => (
            <Animated.View
              key={row.label}
              testID="summary-row"
              entering={rowEntering(index)}
              className={cn(
                'flex-row justify-between items-center py-3',
                index < rows.length - 1 && 'border-b border-surfaceEl',
              )}
            >
              <Text variant="body" className="text-text2">{row.label}</Text>
              <Text
                variant="body"
                className={cn('font-soraBold', row.gold ? 'text-gold-500' : 'text-text1')}
              >
                {row.value}
              </Text>
            </Animated.View>
          ))}
        </Box>
      </Box>

      {/* CTA bar */}
      <Box className="border-t border-surface pt-2 px-4 pb-6">
        <Animated.View entering={ctaEntering}>
          <Button
            variant="primary"
            label={Strings.o6Cta}
            onPress={handleComplete}
            disabled={completing}
          />
        </Animated.View>
      </Box>
    </SafeAreaView>
  );
}
```

- [ ] **Step 4: Run smoke test to verify it passes**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx jest "__tests__/screens/smoke/onboarding_v2_ready.screen.test.tsx" --no-coverage
```

Expected: PASS, 3 tests passing.

- [ ] **Step 5: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add screens/onboarding_v2/ready/index.tsx "__tests__/screens/smoke/onboarding_v2_ready.screen.test.tsx" && git commit -m "feat(onboarding-v2): N4 ready screen + smoke test"
```

---

### Task 20: N4 route wrapper

**Files:**
- Modify: `app/(onboarding)/ready/index.tsx`

- [ ] **Step 1: Replace the existing one-liner with the conditional dispatcher**

Current content:
```tsx
export { default } from '@/screens/onboarding/ready';
```

Replace with:

```tsx
import React from 'react';
import { FeatureFlags } from '@/constants/feature_flags';
import ReadyScreenV1 from '@/screens/onboarding/ready';
import ReadyScreenV2 from '@/screens/onboarding_v2/ready';

export default function ReadyRoute() {
  return FeatureFlags.newOnboarding ? <ReadyScreenV2 /> : <ReadyScreenV1 />;
}
```

- [ ] **Step 2: Run typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git add "app/(onboarding)/ready/index.tsx" && git commit -m "feat(onboarding-v2): N4 route wrapper — conditional dispatcher"
```

---

## Phase 6 · Final Integration Check (Day 3, afternoon)

**Verification gate:** All 9 acceptance criteria from spec §2.9 verified. Ready for Gate 2 (tariq code review).

---

### Task 21: Full test suite + typecheck sweep

**Files:** none created — verification only.

- [ ] **Step 1: Run full typecheck**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run typecheck
```

Expected: exits 0 with zero errors.

- [ ] **Step 2: Run full test coverage**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npm run test:coverage
```

Expected: exits 0. Thresholds unchanged — 80% lines / 95% functions / 100% branches. New hook files must achieve 100% branch coverage individually. If any branch threshold fails, identify the uncovered branch and add the missing test case before proceeding.

- [ ] **Step 3: Verify old O1–O6 flow untouched (flag=false)**

With `FeatureFlags.newOnboarding = false` (the default — do not change it), run the app on Android Expo Go:

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && npx expo start
```

Navigate: Welcome → Currency → Security → Add Account → More Accounts → Ready. Expected: identical behaviour to pre-§2. No visual changes, no crashes, no regression.

- [ ] **Step 4: Manual smoke — flag=true end-to-end**

Temporarily set `FeatureFlags.newOnboarding = true` in `constants/feature_flags.ts` (local only — do not commit). Restart Metro.

Expected sequence:
1. App starts at N1 (Welcome + Currency pills visible, ProgressDots shows step 1 of 4).
2. Select USD pill → tap Get Started → arrives at N2 (Add Account, step 2 of 4).
3. Fill name + balance → tap Save Account → arrives at N3 (check-circle visible, "Account saved" headline, step 3 of 4).
4. Tap "I'm done" → arrives at N4 (3-row summary with Currency/Accounts/Total Balance, NO Security row, step 4 of 4).
5. Tap "Open My Dashboard" → redirected to `/dashboard`.
6. Force-close app → relaunch → goes directly to `/dashboard` (OnboardingComplete is set).

- [ ] **Step 5: Manual smoke — isAddingMore round-trip**

With flag still temporarily `true`:

1. From N3, tap "+ Add another account".
2. Expected: arrives at N2 with form reset (empty name, empty balance, back button goes to N3).
3. Fill account, save → returns to N3 with both accounts listed.
4. Verify second account's icon container uses the saved color from the color picker.

- [ ] **Step 6: Manual smoke — force-restart behavior**

1. With flag `false`: complete O1 step, close app mid-flow (step is now O2 persisted).
2. Set flag `true` locally, restart Metro.
3. Open app → expected: starts at N1 (O2 persisted step is force-restarted to N1).

- [ ] **Step 7: Revert the local flag flip**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git diff constants/feature_flags.ts
```

Expected: shows `newOnboarding: true`. Revert:

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git checkout -- constants/feature_flags.ts
```

Confirm it is back to `false`:

```bash
grep "newOnboarding" /Users/musta/Code/projects/practice/MoneyApp/constants/feature_flags.ts
```

Expected: `newOnboarding: false`.

- [ ] **Step 8: Verify spec §2.11 file index matches disk**

```bash
find /Users/musta/Code/projects/practice/MoneyApp/screens/onboarding_v2 -name "*.ts" -o -name "*.tsx" | sort
find /Users/musta/Code/projects/practice/MoneyApp/__tests__/screens -name "onboarding_v2*" | sort
```

Expected: all 16 new screen files and 9 new test files are present. Cross-reference against the File Map at the top of this plan.

---

### Task 22: Open the PR

**Files:** none created — git operations only.

- [ ] **Step 1: Confirm branch and clean working tree**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && git status && git log --oneline -15
```

Expected: on branch `feat/section-2-onboarding`, working tree clean, ~20 commits visible from this session.

- [ ] **Step 2: Open the PR**

```bash
cd /Users/musta/Code/projects/practice/MoneyApp && gh pr create \
  --title "feat: §2 Onboarding — 6→4 step compression behind feature flag" \
  --body "$(cat <<'EOF'
## Summary

- Compresses the 6-screen onboarding flow (O1–O6) to a 4-screen flow (N1–N4) behind \`FeatureFlags.newOnboarding\`.
- N1: Welcome + Currency merged (inline pill selection, no separate route).
- N2: Add Account ported to §1 primitives; \`Switch\` for interest tracking; CC field helper hints; \`AcctTokens.*.rich\` color palette.
- N3: Add Another? with check-circle success header + FlashList account list + dashed add row.
- N4: Done with 3-row summary (Currency / Accounts / Total Balance) — Security row dropped.

## Flag state

\`FeatureFlags.newOnboarding = false\` on merge. **Zero UX change for end users.** Flag flip is a separate one-line PR after [tariq] code review (Gate 2).

## Spec

\`docs/superpowers/specs/2026-05-11-section-2-onboarding-design.md\`

## Test plan

- [ ] \`npm run typecheck\` — exits 0
- [ ] \`npm run test:coverage\` — exits 0, thresholds unchanged
- [ ] Android Expo Go with \`flag=false\`: O1–O6 flow unchanged
- [ ] Android Expo Go with \`flag=true\` (local flip): full N1→N2→N3→N4 flow completes; dashboard redirect on N4 CTA; relaunch skips onboarding
- [ ] isAddingMore round-trip: N3 → N2 (reset form) → N3 (both accounts listed)
- [ ] Force-restart: O* persisted step + flag=true → restarts at N1
EOF
)"
```

Expected: PR URL printed. Do not flip `FeatureFlags.newOnboarding`. Do not merge. Tag [tariq] as reviewer.

---

## Deferred Polish Note

OQ1–OQ5 from the spec are not blockers. If Marcus wants to revise N1/N3 copy strings (`n1CurrencyLabel`, `n1CurrencyNote`, `n3AccountSaved`, `n3AddMoreSubtitle`) before the implementation PR opens, that is a one-line change to `constants/strings.ts` — not a plan step. The plan proceeds with the spec-approved wording.

---

## Test Strategy Summary

| Test file | Type | Gate |
|---|---|---|
| `__tests__/onboarding_v2_store_restart.test.ts` | Unit (store logic) | Phase 1 |
| `__tests__/screens/onboarding_v2_welcome.hook.test.ts` | Unit (hook) | Phase 2 |
| `__tests__/screens/smoke/onboarding_v2_welcome.screen.test.tsx` | Smoke (render) | Phase 2 |
| `__tests__/screens/onboarding_v2_add_account.hook.test.ts` | Unit (hook) | Phase 3 |
| `__tests__/screens/smoke/onboarding_v2_add_account.screen.test.tsx` | Smoke (render) | Phase 3 |
| `__tests__/screens/onboarding_v2_more_accounts.hook.test.ts` | Unit (hook) | Phase 4 |
| `__tests__/screens/smoke/onboarding_v2_more_accounts.screen.test.tsx` | Smoke (render) | Phase 4 |
| `__tests__/screens/onboarding_v2_ready.hook.test.ts` | Unit (hook) | Phase 5 |
| `__tests__/screens/smoke/onboarding_v2_ready.screen.test.tsx` | Smoke (render) | Phase 5 |

**Coverage contract:** Hook unit tests drive branch coverage. Smoke tests contribute to line and function coverage. All 4 hook files must individually achieve 100% branch coverage. The `npm run test:coverage` thresholds (80% lines / 95% functions / 100% branches) apply project-wide and must not regress.

**NativeWind in tests:** NativeWind's Metro transform does not run in Jest. Tests assert on `className` strings and rendered text/testIDs, not computed pixel styles. This matches the project's existing test strategy.

---

## Acceptance Criteria Checklist (tied 1:1 to spec §2.9)

- [ ] **AC #1** — `FeatureFlags.newOnboarding = false` → old O1–O6 flow renders exactly as before. No regression.
- [ ] **AC #2** — `FeatureFlags.newOnboarding = true` → N1 → N2 → N3 → N4 flow completes in order.
- [ ] **AC #3a** — Business rule 1: `OnboardingComplete` set only on N4 CTA tap.
- [ ] **AC #3b** — Business rule 2: Force-restart to N1 when flag=true and O* step persisted.
- [ ] **AC #3c** — Business rule 5: EGP pre-selected (store default + `useWelcome` initial state).
- [ ] **AC #4** — `npm run typecheck` passes with zero errors.
- [ ] **AC #5** — `npm run test:coverage` passes. Thresholds unchanged.
- [ ] **AC #6** — §1 dev preview route at `app/(dev)/primitives/index.tsx` still renders all 5 primitives without regression.
- [ ] **AC #7** — `npx eslint tailwind.config.js` exits 0. No new hex literals introduced.
- [ ] **AC #8** — Animation fidelity matches O* screens subjectively on Android Expo Go.
- [ ] **AC #9** — `Switch` renders acceptably on Android API 26+ in Expo Go (visual check).
