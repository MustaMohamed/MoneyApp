# MA-061 — Onboarding: "Unnamed account" on the N3 account row
base: efd1d2da07a95a38698fd0c1b1e6e43c2f60f1e6 · verify: emulator · flags: none · expected diff: ~2 lines

## Steps
### 1. The N3 row title reads the shared resolver
- File: `src/modules/onboarding/screens/onboarding/more_accounts/components/account_row.tsx` (`AccountRow`, `account_row.tsx:48`)
- Change: replace `{account.name}` with `{resolveAccountName(account)}` and add `import { resolveAccountName } from '@/utils/account_name';` in the `@/` import block (alphabetical, before `@/utils/format_amount`). The `Account` type the row already imports from `@/modules/accounts/store/account.store` is the entity type re-exported (`account.store.ts:14`), so the call typechecks as-is. Same shape as MA-059's `account_list_row.tsx:64`. Line 28's `resolveAccountRowA11yLabel` already resolves through MA-059 (`account_row_a11y_label.ts:10`); leave it.
- Test: `none`. The title is JSX in a `.tsx`; `.claude/rules/tests.md` forbids a new render suite, and no logic-only test can observe the row's children. The behaviour behind the call is asserted at `__tests__/account_name.test.ts:26` and `:38` (empty and whitespace names read `Strings.unnamedAccount`), the shared a11y label's blank case at `__tests__/accounts/account_row_a11y_label.test.ts:34`, and N3's continue path at `__tests__/screens/onboarding_more_accounts.hook.test.ts:85` (`handleContinue` writes N4 regardless of any name). All three pass at base; do not add a case that passes at base for this change. The Screens shot below is the one gate that differs between base and head.

## Screens
- N3 more accounts (`src/app/(onboarding)/more_accounts/index.tsx`), one state: a blank-named row. `mqa reset`, walk N1 → N2, save an account (any name; N2 refuses a blank, MA-054), land on N3, then `mqa db "UPDATE accounts SET name = '' WHERE id = '<id>'"` and relaunch. N3 resumes (step stays N3 in secure store) and the row title reads "Unnamed account". Shoot that row. Do not shoot the a11y label (`account_row_a11y_label.test.ts:34` asserts it), the empty state, or Continue.

## Non-goals
- The label rule, `Strings.unnamedAccount`, and the accounts module's sites (MA-059, shipped at base).
- The shared a11y label at `account_row.tsx:28`; already rerouted.
- Dashboard (MA-060), transactions (MA-062), commitments (MA-063).
- Any onboarding-local helper, constant or string for the fallback; the row calls the resolver directly.
- Trimming or rewriting the stored name; onboarding resume state (`src/constants/secure_store_keys.ts:2-4`).
- N2's own name validation, and the `is_deleted` branch of the resolver (the store never lists a soft-deleted account, `src/modules/accounts/database/accounts.ts:10`).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `resolveAccountName` moves or its `Account` parameter narrows away from the store's re-export; typecheck catches it.
- The emulator seed lands on the wrong device without `mqa claim` first, or a warm app never relaunches (`am force-stop` after the UPDATE).
- The reviewer asks for a test on the title; there is no logic-only layer that sees it, and a render test is forbidden.

## Self-assessment
The only step I am unsure about is the empty Test field. The repo's rules leave no layer where a logic-only test can see a `.tsx` child, so the shot is the sole base-vs-head gate, and a reviewer holding the "every step has a test" line may push back; the citations to the three existing cases are there so the implementer can show the behaviour is already pinned and nothing new can fail on this diff except the pixels.
