# MA-064 — An account name of only invisible characters passes validation and is stored blank
base: ca01025b09c1d20139af5a822f3394afc057a6fc · verify: emulator · flags: none · expected diff: ~25 lines outside tests

## Steps
### 1. One helper decides what an invisible character is
- File: `src/utils/strip_format_chars.ts` (new, beside `src/utils/strip_name_edges.ts`)
- Change: export `stripFormatChars(name: string): string`, `name.replace(/\p{Cf}/gu, '')`, and `isBlankName(name: string): boolean`, true when `stripFormatChars(name).trim() === ''`. Strip before trim: `' ‏ Cash'` must read `'Cash'`, not `' Cash'`. The `u`-flag regex compiles under the shipped `node_modules/hermes-compiler/hermesc/osx-bin/hermesc` and babel leaves it as written (`@babel/plugin-transform-unicode-regex` does not touch property escapes).
- Test: `__tests__/strip_format_chars.test.ts`, first. `stripFormatChars` removes each of U+200F, U+200E, U+200B, U+200C, U+200D, U+2060, U+061C, U+00AD and keeps visible characters, NBSP and inner spaces; `isBlankName` is true for `''`, `'   '`, `'‏'`, `'​'`, `' ‏ ​ '`, `' '`, false for `'a'`, `'‏Cash'`, `'Ca‍sh'`.

### 2. The duplicate helper compares names with format characters removed
- File: `src/modules/accounts/utils/account_name_taken.ts` (`isAccountNameTaken`, `:5-6`)
- Change: both sides become `stripFormatChars(x).trim().toLowerCase()`. Signature unchanged; the three callers (`add_account.schema.ts:35`, `edit_account.schema.ts:15`, `account.repository.ts:117`) stay as they are. The helper still reports two blank names as duplicates; the schemas guard that in steps 3 and 4.
- Test: `__tests__/account_name_taken.test.ts`. `'‏Cash'` against stored `'Cash'` is taken; `'Cash'` against stored `'Cash​'` is taken; `' ‏cash '` against `'Cash'` is taken; `'Ca‍sh'` against `'Cash'` is taken; `'Wallet'` against `'‏Cash'` is not; the excluded id still excludes when the mark is the only difference.

### 3. Add account and onboarding N2 refuse an invisible-only name and never call it a duplicate
- File: `src/modules/accounts/utils/add_account.schema.ts` (`createAddAccountSchema`, `:17` and `:35`)
- Change: `:17` replaces `.min(1, Strings.errNameRequired)` with `.refine((n) => !isBlankName(n), Strings.errNameRequired)`, kept between `.trim()` and `.max(30, …)`; a bare `.min(1)` beside the refine would emit the required message twice for `''`. `:35` reads `!isBlankName(data.name) && isAccountNameTaken(accounts, data.name)`. The parsed name is still only trimmed; `errNameDuplicateNamed(data.name)` still carries the typed name. N2 and in-app add share this schema through `use_account_form.hook.ts:33`.
- Test: `__tests__/add_account.schema.test.ts`, `describe('name')`, first. `'‏'`, `'​'` and `' ‏ ​ '` each give `[errNameRequired]` alone on `name`, against no accounts, against `accountFixture('')` and against `accountFixture('‏')`; `'Ca‍sh'` parses to `'Ca‍sh'`; `' ‏Cash '` parses to `'‏Cash'` against no accounts and gives `errNameDuplicateNamed('‏Cash')` against `accountFixture('Cash')`; the MA-054 cases at `:91-103` stay green.

### 4. Rename refuses the same names through the edit schema
- File: `src/modules/accounts/utils/edit_account.schema.ts` (`createEditAccountSchema`, `:13` and `:15`)
- Change: `:13` replaces `.min(1, Strings.errNameRequired)` with `.refine((n) => !isBlankName(n), Strings.errNameRequired)`; the duplicate refine at `:15` reads `isBlankName(n) || !isAccountNameTaken(accounts, n, accountId)`. Rename builds this at `account_detail.hook.ts:201`.
- Test: `__tests__/screens/accounts/edit_account_schema.test.ts`, first, through `nameMessages`. `'‏'`, `'​'` and `' ‏ ​ '` each give `[errNameRequired]` alone, including beside `acct('id-blank', '')` and beside `acct('id-mark', '‏')`; `'‏Other Bank'` gives `errNameDuplicate`; `'My‍Bank'` from `id-self` parses to `'My‍Bank'`.

### 5. Restore refuses a name that differs from an active one only by a direction mark
- File: none; `account.repository.ts:117` already calls the helper.
- Test: `__tests__/account.repository.unarchive.test.ts`, in "the three refusals": `insertAccount('c', '‏old card', 7, 0, 0, …)` active, then `repo.unarchive('x')` rejects with `AccountNameTakenError` and `positionOf('x')` is unchanged. Integration against the bridged better-sqlite3 database, as the suite already runs.

## Screens
`adb shell input text` drops non-ASCII, so invisible characters reach the device through `mqa db` (`char(8207)` is U+200F), never through `mqa type`.
- Account detail rename (`src/app/(app)/accounts/[id]/index.tsx`), on an active account whose name was set to `char(8207)` by `mqa db`: rename opened, save with the field untouched. Shoot the field reading "Enter a name for this account." with no duplicate line; `mqa db` shows the row's name and `updated_at` unchanged.
- Add account (`src/app/(app)/accounts/add_account/index.tsx`), with an active account seeded as `char(8207) || 'Cash'`: type `Cash`, save. Shoot the duplicate message "You already have an account called “Cash”." under the field; `mqa db` shows no second row.
- Onboarding N2: no shot. It builds the same schema through `use_account_form.hook.ts:33`, and the field message is MA-054's rendering; the unit tests in step 3 cover the behaviour.

## Non-goals
- A name of only spaces (MA-054), the same check on category and commitment names (MA-058), "Unnamed account" for stored blanks (MA-057), the Edit account screen (MA-019).
- Stripping format characters from a saved name that has visible characters; the stored value stays trim-only.
- A migration or any rewrite of names already stored, including blank-looking ones.
- New copy; `Strings.errNameRequired` and the two duplicate strings are the only messages.
- Rewiring `stripNameEdges` or the category helper to the new helper.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gate check: each new test fails at `ca01025b` and passes at head; `test -f` every jest path above before citing it.

## Risks
- Hermes at runtime rejects `\p{Cf}` with the `u` flag: hermesc compiles it and Hermes has supported property escapes for years, but the render pass on the rename screen is the first live execution; a crash there means falling back to an explicit Cf character class in step 1 with the same tests.
- An oxlint rule refuses the `u`-flag regex or asks for `replaceAll`: `stripNameEdges` uses the same `.replace(/…/g, '')` shape and passes today.
- Zod's `.refine` placed before `.max` returning something other than `ZodString`: Zod 4.5.4's `refine` returns `this`, and the category schema chains `.overwrite(...).min().max().refine()` on the same version.

## Self-assessment
Step 3 is the one I am least sure about, on one point: replacing `.min(1)` with a `.refine` changes the issue code for an empty name from `too_small` to `custom`. Nothing in the tree reads the code (both schemas pass an explicit message, and `zod_config.ts` only supplies defaults), and the four existing tests that assert `[errNameRequired]` alone are the reason a bare `.min(1)` cannot stay beside the refine, but a consumer that inspects `issue.code` would be the thing that breaks. The rest is a two-line helper, a one-line comparison change and tests against a real database, all of which this repository already does in the same shape for categories.
