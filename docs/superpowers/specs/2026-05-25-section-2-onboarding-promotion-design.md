# §2 Onboarding — Promote V2, Delete V1 (Design)

**Date:** 2026-05-25
**Author:** Tariq (technical lead) · brainstormed with the user
**Type:** Migration / cleanup (no new product surface)
**Driver:** §2 is the only section whose rebrand (`screens/onboarding_v2/*`) was built but never promoted. `FeatureFlags.newOnboarding` is still `false`, so the **live app runs the pre-rebrand V1 tree**. Every other section (§5–§9) promoted V2 → deleted V1 → dropped its flag. This closes that gap.
**Source:** [post-ship review](../reviews/2026-05-24-post-ship-heroui-consistency-review.md) (§ Critical finding).

## Goal & end state

Make the rebranded V2 the live onboarding and delete everything V1. End state:

- A single `screens/onboarding/` tree (the former V2), no `_v2` suffix anywhere.
- **4-step flow**: welcome → add_account → more_accounts → ready.
- Currency selection folded into welcome; **no security step**.
- No `newOnboarding` flag (it was the last flag → `feature_flags.ts` deleted).
- No security plumbing (store fields, enum, secure-store keys all removed — user decision).

## Current state (verified)

- V2 flow & nav (verified by reading the hooks):
  - `welcome` (step `N1`) — currency picker folded in → pushes `add_account`.
  - `add_account` (`N2`) — first account → `more_accounts`; back → `welcome`.
  - `more_accounts` (`N3`) — add more / continue → `ready`.
  - `ready` (`N4`) — 3-row summary (no security row) → `completeOnboarding` → dashboard.
- `app/index.tsx` `STEP_HREF` maps `O1`–`O6` **and** `N1`–`N4`; `O2`→`/currency`, `O3`→`/security`.
- `app/(onboarding)/_layout.tsx` `OnboardingStackParams` declares `currency` + `security`.
- The 4 shared route files branch on the flag; `currency`/`security` route files are V1-only re-exports.
- `store/onboarding.store.ts`: default `currentStep: O1`; force-restart `O*`→`N1` is **flag-gated** (currently dead).
- `SecurityChoice`/`SecuritySetupSkipped` secure-store keys + `SecurityChoice` enum are read **only** by onboarding (grep-confirmed; the sole external references are tests).

## Decisions

1. **Step enum: keep `N1`–`N4`, delete `O1`–`O6`.** Migration-safe — once `O*` leaves the enum, the existing `isOnboardingStep` guard falls any persisted legacy `O*` value back to the default with zero identifier collision. Renaming `N*`→`O1`–`O4` was rejected: it collides with the old `O2`/`O3` (currency/security) meanings on persisted values and would need a bespoke reset migration. The vestigial "N" naming is an acceptable cosmetic follow-up.
2. **Security plumbing: remove entirely** (user decision). Re-add if/when real PIN/biometric ships.
3. **Flag: delete `feature_flags.ts`** — `newOnboarding` is the last flag; the file and its test go.
4. **Restart migration becomes unconditional.** Because V1 is genuinely live, real incomplete users have `O*` persisted. On first launch after this ships, `loadOnboardingState` maps any `O*` step → `N1` (clean restart on the new flow). This also prevents redirecting to the now-deleted `/currency` `/security` routes.

## Change surface

### Screens
- **Delete** `screens/onboarding/` (V1 — 26 files).
- **Rename** `screens/onboarding_v2/` → `screens/onboarding/`.
- Drop `V2` suffixes from identifiers: `useAddAccountV2`→`useAddAccount`, `useMoreAccountsV2`→`useMoreAccounts`, `useReadyV2`→`useReady`, and the `*ScreenV2` default-export component names.

### Routes (`app/(onboarding)/`)
- `welcome`, `add_account`, `more_accounts`, `ready` `index.tsx` → one-liner re-exports: `export { default } from '@/screens/onboarding/<name>';`.
- **Delete** `app/(onboarding)/currency/` and `app/(onboarding)/security/`.
- `_layout.tsx`: remove `currency` + `security` from `OnboardingStackParams`.

### Enum (`constants/enums.ts`)
- Delete `OnboardingStep.O1`–`O6`. Keep `N1`–`N4`.
- Delete the `SecurityChoice` enum.

### Store (`store/onboarding.store.ts`)
- `INITIAL_STATE.currentStep`: `O1` → `N1`.
- Remove `securityChoice` from state, `setSecurityChoice`, the `SecurityChoice`/`SecuritySetupSkipped` SecureStore writes, the `securityRaw` load, and the `SecurityChoice` import.
- Restart guard: replace `if (FeatureFlags.newOnboarding && step.startsWith('O'))` with unconditional `if (step.startsWith('O'))` → `N1`; remove the now-unneeded `oxlint-disable` and the `FeatureFlags` import.

### Resume router (`app/index.tsx`)
- `STEP_HREF` reduces to exactly `N1`–`N4` → routes (the `Record<OnboardingStep, Href>` now has only those keys).

### Secure-store keys (`constants/secure_store_keys.ts`)
- Delete `SecurityChoice` and `SecuritySetupSkipped`.

### Feature flags
- Delete `constants/feature_flags.ts` and remove all imports (the 4 route files + store, all handled above).

### Strings (`constants/strings.ts`) — delete (verified 0 non-test refs after V1 removal)
`o1SignIn`; `o2Title`, `o2Heading`, `o2Subtitle`, `o2Cta`, `o2NoteLabel`, `o2NoteBody`; `currencyEGP`, `currencyUSD`, `currencyEGPCode`, `currencyUSDCode`; `o3Title`, `o3HeaderTitle`, `o3HeaderSub`, `o3PinLabel`, `o3PinSub`, `o3BiometricLabel`, `o3BiometricSub`, `o3SkipLabel`, `o3SkipSub`, `o3BestBadge`, `o3Cta`; `o6Security`, `o6SecurityPin`, `o6SecurityBiometric`, `o6SecurityEnabled`, `o6SecuritySkipped`; `o4InterestOn`, `o4InterestOff`, `o4MinPaymentPlaceholder`; `o5Title`, `o5SubtitleSuffix`.
(Re-verify each is unreferenced repo-wide at execution time before deleting.)

### Tests
- **Delete** `__tests__/feature_flags.test.ts` (no flags remain).
- **Delete** V1-only logic tests (e.g. `__tests__/ready.helpers.test.ts` — tests the V1 `resolveSecurityLabel` helper that's deleted; plus any V1 welcome/currency/security/add_account/more_accounts hook tests).
- **Update** `__tests__/onboarding_v2_store_restart.test.ts` — drop the `newOnboarding: true` mock; assert the now-unconditional `O*`→`N1` restart.
- **Update** `__tests__/screens/onboarding_v2_ready.hook.test.ts` — remove the `Strings.o6Security` absence assertion (string deleted); assert the 3-row summary shape instead.
- Final test inventory enumerated during execution.

### Docs (`CLAUDE.md`)
- **Business Rules** section: drop rule 6 (security removed); renumber the step labels to the 4-step flow — currency is pre-selected/edited in welcome (`N1`), `N2` requires ≥1 saved account before proceeding, `N3` is the skippable more-accounts step, `OnboardingComplete` is set only on the "Open My Dashboard" tap at `N4`.

## Out of scope
The triplicated `type_pill.tsx` dedup and the other HeroUI/consistency findings from the review — deferred to their own fix-waves. This PR is promotion + deletion + cleanup only.

## Verification
- Full local CI parity (`format:check`, `lint`, `typecheck`, `jest --ci`, `expo-doctor`, Android prebuild dry-run) green before push.
- 🛑 **Device QA gate (user):** fresh-install walk of the V2 flow; force-close-resume mid-flow; and the `O*`→`N1` migration starting from a V1-persisted step (set `OnboardingStep` secure-store value to e.g. `O3`, relaunch, confirm clean restart at welcome with no crash / no redirect to a deleted route).

## Risks
- **High blast radius** — touches the live first-run path, secure store, and deletes the current onboarding. Mitigated by the unconditional restart migration and the mandatory device QA gate.
- **Persisted-step edge cases** — covered by the restart migration + `isOnboardingStep` fallback; exercised in device QA.
