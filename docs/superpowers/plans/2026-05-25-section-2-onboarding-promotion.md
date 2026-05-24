# §2 Onboarding Promotion — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the rebranded V2 onboarding the live flow, delete the V1 tree, and remove the `newOnboarding` flag and all dead security plumbing.

**Architecture:** Delete `screens/onboarding/` (V1), rename `screens/onboarding_v2/`→`screens/onboarding/`, collapse the four route dispatchers to one-liner re-exports, delete the `currency`/`security` routes, trim `OnboardingStep` to `N1`–`N4`, make the `O*`→`N1` restart migration unconditional, and strip security state/keys/enum/strings.

**Tech Stack:** Expo Router v3, Zustand v5, expo-secure-store, TypeScript strict, Jest. Spec: [2026-05-25-section-2-onboarding-promotion-design.md](../specs/2026-05-25-section-2-onboarding-promotion-design.md).

**Interdependency note:** Deleting `OnboardingStep.O*` and `feature_flags.ts` ripples across the store, `app/index.tsx`, and the route files simultaneously — the tree will not typecheck until the whole migration is applied. Tasks are sequenced so the change is applied coherently, then verified green and committed together (one code commit). Do **not** push between tasks; push once at the end after full CI parity.

---

### Task 1: Store — unconditional `O*`→`N1` migration, default `N1`, security removed (TDD)

**Files:**
- Modify: `store/onboarding.store.ts`
- Test: `__tests__/onboarding.store.test.ts`, `__tests__/onboarding_v2_store_restart.test.ts`

- [ ] **Step 1: Update the restart test to expect unconditional migration**

In `__tests__/onboarding_v2_store_restart.test.ts`, remove the `FeatureFlags: { newOnboarding: true }` mock entirely and assert the restart happens with no flag:

```ts
import * as SecureStore from 'expo-secure-store';
import { OnboardingStep } from '@/constants/enums';
import { loadOnboardingState } from '@/store/onboarding.store';

jest.mock('expo-secure-store');

describe('loadOnboardingState — legacy O* migration', () => {
  beforeEach(() => jest.clearAllMocks());

  it('migrates any persisted O* step to N1 and rewrites secure store', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((k: string) =>
      Promise.resolve(k === 'onboarding_step' ? 'O3' : null),
    );
    const { step } = await loadOnboardingState();
    expect(step).toBe(OnboardingStep.N1);
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith('onboarding_step', OnboardingStep.N1);
  });

  it('leaves a valid N* step untouched', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation((k: string) =>
      Promise.resolve(k === 'onboarding_step' ? 'N3' : null),
    );
    const { step } = await loadOnboardingState();
    expect(step).toBe(OnboardingStep.N3);
  });
});
```

(Use the real `SecureStoreKeys` string values if they differ from `'onboarding_step'` — check `constants/secure_store_keys.ts`.)

- [ ] **Step 2: Run it — expect FAIL** (flag-gated guard won't migrate without the flag)

Run: `npm test -- onboarding_v2_store_restart --ci`
Expected: FAIL (step stays `O3`).

- [ ] **Step 3: Edit `store/onboarding.store.ts`**

- `INITIAL_STATE.currentStep`: `OnboardingStep.O1` → `OnboardingStep.N1`.
- Remove `securityChoice` from `INITIAL_STATE` and the `OnboardingStore` interface; delete `setSecurityChoice`.
- In `loadOnboardingState`: drop the `securityRaw` fetch + `securityChoice` resolution; remove it from the `setState` call and return.
- Replace the guard with:

```ts
if (step.startsWith('O')) {
  step = OnboardingStep.N1;
  await SecureStore.setItemAsync(SecureStoreKeys.OnboardingStep, OnboardingStep.N1);
}
```

- Remove the `oxlint-disable` line above it, the `FeatureFlags` import, the `SecurityChoice` import, and the `isSecurityChoice` helper.

- [ ] **Step 4: Run the store tests — expect PASS**

Run: `npm test -- onboarding.store onboarding_v2_store_restart --ci`
Expected: PASS. (Update `onboarding.store.test.ts` if it asserted `securityChoice`/`setSecurityChoice` or default `O1` — change default expectation to `N1`, remove security assertions.)

---

### Task 2: Enum — drop `O1`–`O6` and `SecurityChoice`

**Files:**
- Modify: `constants/enums.ts`

- [ ] **Step 1:** Delete `O1`–`O6` from `OnboardingStep` (keep `N1`–`N4`). Delete the entire `SecurityChoice` enum.
- [ ] **Step 2:** Verify no stray refs: `grep -rn "OnboardingStep.O[0-9]\|SecurityChoice" --include="*.ts" --include="*.tsx" . | grep -v __tests__` → expect only files handled in later tasks (none should remain after Task 9/10).

---

### Task 3: Secure-store keys — drop security keys

**Files:**
- Modify: `constants/secure_store_keys.ts`

- [ ] **Step 1:** Delete the `SecurityChoice` and `SecuritySetupSkipped` entries.
- [ ] **Step 2:** `grep -rn "SecurityChoice\|SecuritySetupSkipped" constants/secure_store_keys.ts` → expect empty.

---

### Task 4: Delete the V1 onboarding tree

**Files:**
- Delete: `screens/onboarding/` (all 26 V1 files)

- [ ] **Step 1:** `git rm -r screens/onboarding`
- [ ] **Step 2:** Confirm: `test ! -d screens/onboarding && echo gone`

---

### Task 5: Rename V2 → onboarding, drop `V2` suffixes

**Files:**
- Rename: `screens/onboarding_v2/` → `screens/onboarding/`
- Modify: the renamed hooks/screens to drop `V2` identifiers.

- [ ] **Step 1:** `git mv screens/onboarding_v2 screens/onboarding`
- [ ] **Step 2:** Rename identifiers (keep file names): `useAddAccountV2`→`useAddAccount` (`screens/onboarding/add_account/add_account.hook.ts` + its `index.tsx` consumer), `useMoreAccountsV2`→`useMoreAccounts`, `useReadyV2`→`useReady`, and any default-export component named `*ScreenV2`→`*Screen`. Use `grep -rn "V2" screens/onboarding` to find every occurrence, including comment cruft like `// v2: was O5`.
- [ ] **Step 3:** Fix internal import paths if any file imported via the `onboarding_v2` alias: `grep -rn "onboarding_v2" . --include="*.ts" --include="*.tsx"` → expect empty after fixes (route files handled in Task 6, tests in Task 10).

---

### Task 6: Collapse route dispatchers, delete currency/security routes, trim `_layout`

**Files:**
- Modify: `app/(onboarding)/welcome/index.tsx`, `add_account/index.tsx`, `more_accounts/index.tsx`, `ready/index.tsx`
- Delete: `app/(onboarding)/currency/`, `app/(onboarding)/security/`
- Modify: `app/(onboarding)/_layout.tsx`

- [ ] **Step 1:** Replace each of the four dispatcher `index.tsx` bodies with a one-liner re-export, e.g. `app/(onboarding)/welcome/index.tsx`:

```ts
export { default } from '@/screens/onboarding/welcome';
```

(and `add_account`, `more_accounts`, `ready` analogously). Remove the `FeatureFlags` import + the V1/V2 ternary + the `oxlint-disable`.

- [ ] **Step 2:** `git rm -r "app/(onboarding)/currency" "app/(onboarding)/security"`
- [ ] **Step 3:** In `app/(onboarding)/_layout.tsx`, delete the `currency: undefined;` and `security: undefined;` lines from `OnboardingStackParams`.

---

### Task 7: Resume router — trim `STEP_HREF`

**Files:**
- Modify: `app/index.tsx`

- [ ] **Step 1:** Reduce `STEP_HREF` to exactly the four `N*` entries:

```ts
const STEP_HREF: Record<OnboardingStep, Href> = {
  N1: '/(onboarding)/welcome',
  N2: '/(onboarding)/add_account',
  N3: '/(onboarding)/more_accounts',
  N4: '/(onboarding)/ready',
};
```

(Remove the `O1`–`O6` keys and the now-stale comment.)

---

### Task 8: Delete the feature-flag module

**Files:**
- Delete: `constants/feature_flags.ts`, `__tests__/feature_flags.test.ts`

- [ ] **Step 1:** Confirm no remaining importers: `grep -rn "feature_flags\|FeatureFlags" --include="*.ts" --include="*.tsx" . | grep -v __tests__` → expect empty (route files + store already cleaned).
- [ ] **Step 2:** `git rm constants/feature_flags.ts __tests__/feature_flags.test.ts`

---

### Task 9: Strings — remove V1-only keys

**Files:**
- Modify: `constants/strings.ts`

- [ ] **Step 1:** Delete these keys (verified 0 non-test refs): `o1SignIn`; `o2Title`,`o2Heading`,`o2Subtitle`,`o2Cta`,`o2NoteLabel`,`o2NoteBody`; `currencyEGP`,`currencyUSD`,`currencyEGPCode`,`currencyUSDCode`; `o3Title`,`o3HeaderTitle`,`o3HeaderSub`,`o3PinLabel`,`o3PinSub`,`o3BiometricLabel`,`o3BiometricSub`,`o3SkipLabel`,`o3SkipSub`,`o3BestBadge`,`o3Cta`; `o6Security`,`o6SecurityPin`,`o6SecurityBiometric`,`o6SecurityEnabled`,`o6SecuritySkipped`; `o4InterestOn`,`o4InterestOff`,`o4MinPaymentPlaceholder`; `o5Title`,`o5SubtitleSuffix`.
- [ ] **Step 2:** Re-verify each is unreferenced repo-wide before final commit: `for k in o1SignIn o2Title ... ; do grep -rq "Strings.$k\b" --include="*.ts" --include="*.tsx" . && echo "STILL USED: $k"; done` → expect no output.

---

### Task 10: Tests — delete V1, rename V2, update changed behavior

**Files:** under `__tests__/`

- [ ] **Step 1 — delete (test deleted V1 code):** `currency.store.test.ts`, `security.helpers.test.ts`, `screens/onboarding_currency.hook.test.ts`, `screens/onboarding_currency_store.test.ts`, `screens/onboarding_security.hook.test.ts`, `screens/onboarding_security_store.test.ts`, `screens/onboarding_add_account.hook.test.ts`, `screens/onboarding_more_accounts.hook.test.ts`, `screens/onboarding_ready.hook.test.ts`.
- [ ] **Step 2 — rename V2 tests to canonical names + repoint imports** (`screens/onboarding_v2/...`→`screens/onboarding/...`): `screens/onboarding_v2_add_account.hook.test.ts`→`screens/onboarding_add_account.hook.test.ts`; `screens/onboarding_v2_more_accounts.hook.test.ts`→`screens/onboarding_more_accounts.hook.test.ts`; `screens/onboarding_v2_ready.hook.test.ts`→`screens/onboarding_ready.hook.test.ts`; `screens/onboarding_v2_ready_state.test.ts`→`screens/onboarding_ready_state.test.ts`; `screens/onboarding_v2_welcome.hook.test.ts`→`screens/onboarding_welcome.hook.test.ts`. In the renamed ready-hook test, delete the `expect(labels).not.toContain(Strings.o6Security)` line; assert `rows.length === 3` instead.
- [ ] **Step 3 — update `ready.helpers.test.ts`:** remove the `resolveSecurityLabel` describe block and the `SecurityChoice`/`Strings.o6Security*` imports; keep the `computeTotalBalance` cases (path `@/screens/onboarding/ready/ready.helpers` still resolves post-rename).
- [ ] **Step 4 — verify ambiguous tests by import path:** for `ready.state.test.ts` and `ready.store.test.ts`, check their imports — if they import a deleted V1 module, delete the test; if they import surviving code, repoint the path. (`ready.store.test.ts` likely tests deleted V1 store → delete; confirm.)
- [ ] **Step 5:** Run the onboarding test subset: `npm test -- onboarding ready welcome more_accounts add_account --ci` → expect PASS.

---

### Task 11: Docs — CLAUDE.md business rules

**Files:**
- Modify: `CLAUDE.md` (Business Rules section)

- [ ] **Step 1:** Drop rule 6 (security UI). Renumber the onboarding rules to the 4-step flow: currency pre-selected/edited in welcome (`N1`); `N2` requires ≥1 saved account before proceeding; `N3` more-accounts is skippable; `OnboardingComplete` set only on the "Open My Dashboard" tap at `N4`; force-close resumes from the persisted step. Keep rule wording otherwise intact.

---

### Task 12: Full CI parity + commit + PR

- [ ] **Step 1:** Run the full local CI parity chain:

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ CI parity green"
```

Fix any failure, re-run from the top until green.

- [ ] **Step 2:** Commit the code change (single coherent commit) + the docs (spec/plan/review) as a prior commit.
- [ ] **Step 3:** Push and open a PR against `main` with the summary, the change list, and the **device QA checklist** (fresh-install walk, force-close-resume, `O*`→`N1` migration from a seeded V1 step).

---

## Self-review notes
- **Spec coverage:** every spec change-surface item maps to a task (screens 4–5, routes 6, enum 2, store 1, keys 3, flag 8, strings 9, tests 10, docs 11). ✓
- **Type consistency:** `OnboardingStep` reduced to `N1`–`N4` is consistent across store (Task 1), enum (Task 2), and `STEP_HREF` (Task 7). ✓
- **Security removal** is consistent across store (1), enum (2), keys (3), strings (9), tests (10). ✓
