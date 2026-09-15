# MA-060 — Dashboard: "Unnamed account" on the account card and the net worth breakdown rows
base: efd1d2da · verify: emulator · flags: none · expected diff: ~7 lines

`resolveAccountName(account: Account | undefined): string` at `src/utils/account_name.ts` is the MA-059 label rule (undefined → `Strings.unknownAccount`, `is_deleted === 1` → `Strings.deletedAccount`, blank after trim → `Strings.unnamedAccount`, else the stored name). Its copy sits at `src/constants/strings.ts:893-894`. Dashboard `Account` imports (`@/modules/accounts/store/account.store`) re-export the entity type the resolver takes, so no cast.

## Steps
### 1. The breakdown row builders carry the label, so both sheet render lines read it
- File: `src/modules/dashboard/screens/dashboard/dashboard.helpers.ts` (`computeLiquidityBreakdown` `:139,142`, `computeLiabilitiesBreakdown` `:182`)
- Change: import `resolveAccountName` from `@/utils/account_name` (sorted before `@/utils/money`); each `name: a.name` becomes `name: resolveAccountName(a)`. `AccountRow`/`LiabilityRow` shapes, the archived skip and the balance sort are unchanged; `net_worth_breakdown_sheet.tsx:225,305` need no edit.
- Test: `__tests__/screens/dashboard/dashboard_helpers.test.ts`, written first, `Strings` imported from `@/constants/strings`. Under `computeLiquidityBreakdown`: a `name: '   '` Bank row and a `name: ''` PhysicalSavings row yield `liquidAccounts[0].name` and `reserveAccounts[0].name` equal to `Strings.unnamedAccount`; a `is_deleted: 1` Bank row yields `Strings.deletedAccount`, and with `name: ''` still `Strings.deletedAccount`. Under `computeLiabilitiesBreakdown`: a `name: ''` CreditCard row `toEqual` `{ id, name: Strings.unnamedAccount, balance, statementDueDay: null }`; a `is_deleted: 1` CreditCard row reads `Strings.deletedAccount`. Both suites keep one case asserting a real padded name (`'  CIB  '`) passes through as stored.

### 2. The dashboard card title and its accessibility label read the label
- File: `src/modules/dashboard/screens/dashboard/components/account_card.tsx` (`:60` `accessibilityLabel={account.name}`, `:85` `{account.name}`)
- Change: import `resolveAccountName` from `@/utils/account_name` (after `@/modules/...`, before `@/utils/responsive`); both reads become `resolveAccountName(account)`. Same inline shape as MA-059's `account_list_row.tsx` and `balance_hero.tsx`; no helper file, no copy.
- Test: none. `.tsx` render tests are barred (`tests.md`); the value is the resolver, covered by `__tests__/account_name.test.ts`. The label is checked on the emulator through the a11y dump.

### 3. The snapshot read is shown to exclude a deleted account
- File: `__tests__/dashboard.repository.test.ts` (`insertAccount` `:19-36`, `describe('DashboardRepository')` `:150`)
- Change: no source change. `getSnapshot` reads `getAccounts` (`src/modules/accounts/database/accounts.ts:7-13`, `WHERE is_archived = 0 AND is_deleted = 0`), so acceptance bullet 2 holds at base. `insertAccount` gains `deleted?: 0 | 1` (default 0) written to `is_deleted`; the seed adds `{ id: 'deleted', name: '', archived: 1, deleted: 1 }`.
- Test: the ordered-snapshot case at `:151` still expects `snapshot.accounts` ids `['active-first', 'active-second']` and the stats call with those two ids; a deleted row leaving the list is what the assertion now proves. Characterization at base, the same kind the helpers suite marks at `:808`; say so in one line above the seed.

## Screens
- Seed by SQL before the walk: `UPDATE accounts SET name = '' WHERE id = <a bank id>` and one credit card id; deleted rows cannot be seeded onto the dashboard, the read drops them.
- Dashboard tab, accounts carousel: the blank Bank card, title "Unnamed account", card a11y label "Unnamed account" from the dump.
- Net worth breakdown sheet, opened from the same tab: liquid sub-row "Unnamed account" with its balance; liabilities legend row "Unnamed account" with its due caption. Reserve rows share the liquid builder and get no shot.

## Non-goals
- The label rule, its copy, `resolveAccountRowA11yLabel` and the accounts module's own sites (MA-059).
- The onboarding N3 row (MA-061), transactions (MA-062), commitments (MA-063).
- A `Strings` entry or a `.helpers.ts` label builder of the dashboard's own; a change to `AccountRow`, the balance sort, `getAccounts`, or any SQL or migration.
- Trimming or writing the stored name; `account_card.helpers.ts`, `account_carousel.helpers.ts` and `dashboard.presentation.ts` read no name and stay untouched.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- `test -f __tests__/screens/dashboard/dashboard_helpers.test.ts && test -f __tests__/dashboard.repository.test.ts` before either is cited as a gate.

## Risks
- `resolveAccountName`'s signature or fallback order changes under MA-061..063 in flight; step 1's deleted cases pin the order and fail if it moves.
- oxlint import ordering rejects the new import position; the fix is placement, the row is unchanged.
- A reviewer reads step 3 as a gate; it is not, and it is labelled as such.

## Self-assessment
Step 3 is the one I am least sure of. The acceptance names the deleted exclusion as a property of the dashboard's own read, and the only test that proves it today lives in `__tests__/account.repository.test.ts:274` against `getAccounts`, not against `getSnapshot`. Seeding a deleted row into the snapshot fixture makes the dashboard test own that property, but it adds a case that passes at base, which `review.md` treats with suspicion. If the implementer or reviewer judges the account repository test sufficient, dropping step 3 leaves acceptance intact and the diff at two files.
