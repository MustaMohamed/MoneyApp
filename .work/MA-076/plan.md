# MA-076 — Add form: the duplicate-name check spans archived accounts
base: 6bacf1bc · verify: none · flags: none · expected diff: ~12 lines

## Steps
### 1. The add schema refuses a name held in either list, and the hook passes both
- File: `src/modules/accounts/utils/add_account.schema.ts` (`createAddAccountSchema`, `:12`, refinement `:33`)
- Change: signature becomes `createAddAccountSchema(accounts: Account[], archivedAccounts: Account[])`; the `superRefine` calls `isAccountNameTaken([...accounts, ...archivedAccounts], data.name)`, the merge `createEditAccountFormSchema` uses at `edit_account.schema.ts:43`. The name issue stays first in the `superRefine`; `errNameDuplicateNamed(data.name)` and the blank-name gate are unchanged. `AddAccountFormData` is unchanged. `src/utils/schemas/add_account.schema.ts` is a bare re-export with no consumer and needs no edit.
- File: `src/modules/accounts/components/account_form/use_account_form.hook.ts` (`:32-33`)
- Change: the single selector at `:32` becomes a grouped read, `const { accounts, archivedAccounts } = useAccountStore(useShallow((s) => ({ accounts: s.accounts, archivedAccounts: s.archivedAccounts })));` with `useShallow` imported from `zustand/react/shallow`, the shape `accounts_list.hook.ts:31-34` uses (`state.md:12`); the memo becomes `createAddAccountSchema(accounts, archivedAccounts)` with deps `[accounts, archivedAccounts]`. `attachMockSelectorStore` runs the selector against the mock state, so the three suites need only the `archivedAccounts` slot below. `onValid` (`:51-52`, sort order over the active list) and `submit` (`:67-75`, the `inserted` bypass) are untouched: the bypass runs `onValid` without `handleSubmit`, so the widened memo never reaches a retry.
- File: the three hook suites whose store mock lacks the slot, `__tests__/account_form.hook.test.ts:22-25`, `__tests__/screens/accounts/add_account.hook.test.ts:31-36`, `__tests__/screens/onboarding_add_account.hook.test.ts:39-44`
- Change: each mock factory gains `archivedAccounts: mockArchivedAccounts`, a `let mockArchivedAccounts: { id: string; name: string }[] = []` reset in `setup()`. Without it the spread reads `undefined` and every submit throws.
- Test: `__tests__/add_account.schema.test.ts`, written first. `fieldErrors` (`:46-53`) gains a third parameter `archivedAccounts: Account[] = emptyAccounts` and every `createAddAccountSchema(...)` call in the file passes two lists. New cases under `describe('name')`: an archived "savings" (`accountFixture` with `is_archived: 1`) against typed ` Savings ` refuses with `Strings.errNameDuplicateNamed('Savings')`; an archived name that differs only by a leading format character (`'‏Savings'` in the list) is refused; a whitespace-only name beside a blank-named archived account reads `errNameRequired` alone; a name held in neither list passes. `__tests__/account_form.hook.test.ts:104` ("the retry does not re-validate against the row it just inserted") stays as the retry case; its `mockAddAccount` republication (`:106-108`) is unchanged.

### 2. Both add paths refuse an archived name before the write
- File: `__tests__/screens/onboarding_add_account.hook.test.ts`
- Change: none in source.
- Test: new case beside `:104`: `mockArchivedAccounts = [{ id: 'arch', name: 'cib savings' }]`, `fillAndSubmit(result)`; `mockAddAccount`, `mockSetStep` and `mockReplace` not called; `result.current.form.getFieldState('name').error?.message` is `Strings.errNameDuplicateNamed('CIB Savings')` (a refusal read this way under `renderHook`: `__tests__/screens/commitments_pay_sheet.hook.test.ts:241`); `state.statusMessage` falsy.
- File: `__tests__/screens/accounts/add_account.hook.test.ts`
- Test: the same case for `useAddAccountApp`: archived `'new account'` in the mock, `fillValidDraft`, `handleSave`; `mockAddAccount` and `mockBack` not called; the name field's error is `Strings.errNameDuplicateNamed('New Account')`.

### 3. The lists the form receives free a deleted name and hold an archived one
- File: `__tests__/account.repository.test.ts`
- Change: none in source.
- Test: in `describe('a soft-deleted account leaves both lists — MA-020')` (`:367`), one case: `createAddAccountSchema(await repo.getAll(), await repo.getArchived())` accepts a draft whose name a row deleted through `repo.delete` held (add `baseInput` as "Old Wallet", `repo.archive(id)`, then `repo.delete(id)`; `delete` throws `AccountNotArchivedError` on an active row, `account.repository.ts:129`, and the sequence is the suite's own at `:523-524`; the seeded blank-named row at `:370` is not enough, its name is already empty). In `describe('AccountRepository.archive — TC-M15-02')` (`:300`), one case: after `repo.archive(id)` the same two-list schema refuses "cib savings" with `Strings.errNameDuplicateNamed('cib savings')`. The draft shape is `baseData` from `add_account.schema.test.ts:32-44`; copy the object literal, the suite has no shared fixture for it.

### 4. ADR 2026-09-09 section 3 records the add check as widened
- File: `docs/adr/2026-09-09-account-unarchive-sort-position.md:36`
- Change: the last sentence, "Widened for the edit check by MA-074 (#503), which passes the archived list beside the active one; the add check is widened by MA-076 (#505).", becomes past tense over both checks: "Widened over both lists for the edit check by MA-074 (#503) and for the add check by MA-076 (#505); each passes the archived list beside the active one." The restore guard sentence before it stays.
- Test: none, prose.

## Non-goals
- The edit check and the edit screen (MA-074 #503, MA-075 #504).
- No repository guard on `add`, no `UNIQUE` on `name`, no migration; rows that already share a name stay, and `AccountRepository.unarchive` (`account.repository.ts:116-117`) keeps refusing them over the active list with `accountsArchivedNameTaken`.
- No new string; `errNameDuplicate` (`strings.ts:164`) stays the old edit schema's line and is not touched.
- No change to `submit`'s `inserted` bypass, the sort-order allocator, N2 resume, or the form's rendering.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gate check for step 1: `npx jest __tests__/add_account.schema.test.ts` fails at base on the archived case (at base the two-argument call fails typecheck; the runtime case fails if the second argument is dropped), passes at head.

## Risks
- A suite mocks `useAccountStore` for a screen that mounts `useAccountForm` and was missed: `grep -rln "useAccountForm\|useAddAccount" __tests__` returns four, the three named above plus `__tests__/account_form.state.test.ts`, which never touches the store; a throw on spread of `undefined` would show any other.
- The ADR sentence is already present tense naming MA-076 (PR #512 wrote it); the edit is one sentence, not a section.

## Self-assessment
Step 3's archive-then-delete sequence is the one I am least sure about: it reads the two lists through the repository after a soft delete, and the deleted row keeps `is_archived = 1` (`:395-399`), so the case only holds because `getArchived` filters `is_deleted` (`database/accounts.ts:18`). The rest is the MA-074 shape applied one file over.
