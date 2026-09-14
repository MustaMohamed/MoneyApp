# MA-054 — A whitespace-only account name passes validation and is stored empty
base: 662bb98ac4bab1bcbd66ad30a887dc829fbba134 · verify: emulator · flags: user copy · expected diff: ~10 lines outside tests, ~70 with tests

## Steps
### 1. The empty-name copy is MA-019's line
- File: `src/constants/strings.ts` (`errNameRequired`, `strings.ts:162`)
- Change: value becomes `'Enter a name for this account.'`, key unchanged. Two consumers, both schemas (`git grep -n errNameRequired src`), so nothing else moves.
- Test: written first, `__tests__/screens/accounts/account_name.strings.test.ts`, the shape of `accounts_list.strings.test.ts:4`: one `it` asserting `Strings.errNameRequired` is `'Enter a name for this account.'` byte-exact. Red at base. Both schema suites keep comparing against the key.

### 2. The add schema reads the trimmed name everywhere
- File: `__tests__/add_account.schema.test.ts` (`fieldErrors`, `:46`; `describe('name')`, `:78`), then `src/modules/accounts/utils/add_account.schema.ts` (`name`, `:17`; the duplicate branch, `:35-39`)
- Change: `name` becomes `z.string().trim().min(1, Strings.errNameRequired).max(30, Strings.errNameTooLong)`; Zod 4.5.4's `.trim()` rewrites the value before later checks, so `min`, `max` and the `superRefine` all see the trimmed string and `zodResolver` hands the trimmed name to `onValid` (`@hookform/resolvers` 5.9.1 returns parsed data unless `raw`). The duplicate branch gains a guard, `data.name.length > 0 && isAccountNameTaken(accounts, data.name)`, and `data.name.trim()` in the message drops its now-redundant `.trim()`. Do not use `min(1, { abort: true })`: probed on this checkout, it also skips the object `superRefine`, so an empty name would hide every credit-card error until the next re-validate.
- Test: written first, four cases under `describe('name')`. `'   '` with no accounts gives `Strings.errNameRequired`. `'   '` with `[accountFixture('')]` gives `Strings.errNameRequired` and exactly one issue on `name` (`fieldErrors` keeps the last issue, so a leaked duplicate message fails it). `' Cash '` with no accounts parses and `result.data.name` is `'Cash'` (call `safeParse` directly). `' Cash '` with `[accountFixture('cash')]` gives `Strings.errNameDuplicateNamed('Cash')`; this one passes at base through `isAccountNameTaken`'s own trim and the message's `.trim()` (`:96-98` is the same shape), kept as the acceptance row. `' ' + 'a'.repeat(30) + ' '` has no `name` error. The other four fail at base.

### 3. The rename schema reads the trimmed name everywhere
- File: `__tests__/screens/accounts/edit_account_schema.test.ts` (`err`, `:28`), then `src/modules/accounts/utils/edit_account.schema.ts` (`name`, `:10-16`)
- Change: `.trim()` before `.min(1, ...)`; the refine becomes `(n) => n.length === 0 || !isAccountNameTaken(accounts, n, accountId)`. Same reason as step 2 for not using `abort`.
- Test: written first. Add a helper that returns every message on `name` (`err` returns `issues[0]` only, which cannot see a second issue). `'   '` gives `[Strings.errNameRequired]` alone, also with `acct('id-blank', '')` in the list. `' Cash '` against `[acct('id-self', 'My Bank')]` parses with `data.name === 'Cash'`. `' Cash '` against `acct('id-other', 'cash')` gives `Strings.errNameDuplicate`. `' ' + 'a'.repeat(30) + ' '` parses. All fail at base except the last two shapes' duplicate case, which passes at base through `isAccountNameTaken`'s own trim; keep it as the acceptance row.

## Screens
- In-app add account, `/accounts/add_account` (`src/modules/accounts/screens/accounts/add_account`): name of three spaces, balance filled, Save tapped; the rail under the name field reads "Enter a name for this account."
- Onboarding N2, `(onboarding)/add_account` (`src/modules/onboarding/screens/onboarding/add_account`): same input, Save and continue tapped; same line in the rail. Reach it on a fresh install or by resetting onboarding.
- Account detail rename, `/accounts/[id]` on an account with a name (`src/modules/accounts/screens/accounts/detail`, `FormErrorText` at `detail/index.tsx:142`): clear the field to spaces, Save; the error line under the field reads the same copy.
- Empty name renders the identical string on all three; one whitespace shot per screen is enough. `' Cash '` saving as `'Cash'` is step 2 and 3's unit test, not a shot.

## Non-goals
- "Unnamed account" for stored blank names (MA-057, #462); no migration, no display change on the list.
- The Edit account screen replacing inline rename, and archived names in its duplicate check (MA-019, #385).
- Categories and commitments (MA-058, #463).
- `isAccountNameTaken` stays as it is; restore (`account.repository.ts:116`) keeps its check.
- The `.trim()` calls in `toNewAccountInput` (`account_form.helpers.ts:65`) and `account_detail.hook.ts:174` stay; they are redundant after step 2 and 3, not wrong, and `__tests__/account_form.helpers.test.ts:379` covers the first.
- `maxLength={30}` on both inputs stays.
- No `.hook.ts`, store or repository change; no new string key.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck`; `npm test -- --ci` per step, once the step's schema commit is in, since the test-first commit is red by design.
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gate proof: `npx jest __tests__/screens/accounts/account_name.strings.test.ts __tests__/add_account.schema.test.ts __tests__/screens/accounts/edit_account_schema.test.ts` red on the test-only commit, green after the schema commit.

## Risks
- Amended after review: step 2's fourth case marked as passing at base, the per-commit chain scoped so the test-first commit is not asked to be green, and step 1 given a strings suite so the copy has a gate that reads differently at base and head.
- A Zod bump past 4.5.4 that stops refinements running after a failed `min` makes the guards dead code but keeps the tests green; the guards stay correct either way.
- MA-019 (#385) landing first and adding its own required-name key would leave two strings for one message; step 1 reuses `errNameRequired` so the merge is a key rename at most.
- MA-048 (#449) touches the accounts list, not these files.

## Self-assessment
Step 2's guard is the row I am least sure about: the ticket says the duplicate check must not run on a name that is empty once trimmed, and I chose an inline `length > 0` guard over Zod's `abort` because the probe showed `abort` silencing the whole object `superRefine`, which carries the credit-card rules. If the reviewer prefers the rules split into a second `superRefine` so `abort` can be used, that is a bigger diff for the same acceptance. The screens are the other soft spot: N2 needs a reset-to-onboarding path the implementer must find, and the rename shot needs an account that already has a name, since a blank-named account's field loads empty.
