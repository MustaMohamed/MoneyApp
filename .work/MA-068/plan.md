# MA-068 — Accounts: "Unnamed account" on the archived card's row, names summary and restored toast
base: efd1d2da07a95a38698fd0c1b1e6e43c2f60f1e6 · verify: emulator · flags: none · expected diff: ~8 lines outside tests, ~40 in tests

All three sites read `resolveAccountName` from `src/utils/account_name.ts` (unknown, then deleted, then blank; `__tests__/account_name.test.ts:42` already pins the archived blank case). No new string, no new branch. At HEAD the three raw reads are `accounts_list.hook.ts:129`, `archived_card.helpers.ts:34`, `archived_account_row.tsx:68`, the only `.name` reads left under `src/modules/accounts/screens/accounts/list/`: `grep -rn "\.name\b" src/modules/accounts/screens/accounts/list/`.

## Steps
### 1. The names summary reads the label
- File: `src/modules/accounts/screens/accounts/list/components/archived_card.helpers.ts` (`resolveArchivedSummary`, `:33-35`)
- Change: `rows.map((row) => resolveAccountName(row.account))`; import from `@/utils/account_name`. Signature unchanged; the one consumer is `accounts_list.hook.ts:169`.
- Test: `__tests__/screens/accounts/archived_card.helpers.test.ts`, `describe('resolveArchivedSummary')`, written first. Add "reads a blank name as the unnamed label": rows from `resolveArchivedCardRows` over `[{ id: 'arch-1', name: '   ', is_archived: 1 }, { id: 'arch-2', name: 'Vodafone Cash' }]` on `'all'`; assert `resolveArchivedSummary(rows)` is `` `${Strings.unnamedAccount}, Vodafone Cash` ``. Base gives `'   , Vodafone Cash'`.

### 2. The restored toast reads the label, after the not-found guard
- File: `src/modules/accounts/screens/accounts/list/accounts_list.hook.ts` (`unarchive`, `:127-130` and `:152`)
- Change: the lookup keeps the account, not its name: `const account = ...archivedAccounts.find(...)`, `if (account === undefined) return;`, then `const name = resolveAccountName(account);` before `setUnarchiveError(undefined)`. `:152` stays `Strings.accountsArchivedRestored(name)`. Import from `@/utils/account_name`. The guard stays on the lookup result, never on the resolver's string (the resolver never returns `undefined`). Nothing else in the callback moves: MA-065 (#479) rewrites `:136-146` and MA-067 (#481) mocks the toast in this suite; this step touches neither range.
- Test: `__tests__/screens/accounts/accounts_list.hook.test.ts`, `describe('useAccountsList — unarchive from a row')`, written first. Add "toasts the unnamed label for a blank-named archived account": `storeState = { ...storeState, archivedAccounts: [makeTestAccount({ id: 'arch-3', name: '  ', is_archived: 1 })], archivedCount: 1 }`, `unarchive('arch-3')`; assert `mockUnarchive.mock.calls` equals `[['arch-3']]` (the id, never a name, reaches the store) and `toast.show` called once with `{ label: Strings.accountsArchivedRestored(Strings.unnamedAccount), variant: 'success' }`. Base toasts `'   restored.'`. The `:492` assertion (`'Old HSBC restored.'`) and the not-found case at `:640` stay as written; the not-found case is Acceptance line 2.

### 3. The row title reads the label
- File: `src/modules/accounts/screens/accounts/list/components/archived_account_row.tsx` (`:68`)
- Change: `{resolveAccountName(account)}` in `ListGroup.ItemTitle`, the same read the active row makes at `account_list_row.tsx:64`; import from `@/utils/account_name`. The accessibility label at `:42` already resolves through `account_row_a11y_label.ts:10` and does not change.
- Test: none; a `.tsx` render site, and `.claude/rules/tests.md` adds no render suites. The emulator shot below is the check.

## Screens
- Accounts list (`/accounts`), one visit, one archived account seeded blank by SQL (`UPDATE accounts SET name = '' WHERE id = <archived id>`), at least one other archived account so the summary joins two names:
  - archived card collapsed: the summary line reads `Unnamed account, <other>`;
  - archived card expanded: the blank row's title reads `Unnamed account`, caption unchanged.
- Not shot: the restored toast (step 2's test pins it, and the tap writes), the archived detail header and its toast (MA-059), the active row after restore (MA-059), any state a step's test asserts.

## Non-goals
- The label rule and its copy, `Strings.unnamedAccount`, `resolveAccountName`, `__tests__/account_name.test.ts`.
- The active list row, the detail screens, the picker, the archived detail's header and toast (MA-059, #467); dashboard, onboarding, transactions, commitments (MA-060 to MA-063).
- The repository's name-taken check at `account.repository.ts:117`, which compares `existing.name` as stored; the label never reaches it. No test is added there: the rule is Acceptance line 3 and nothing in this diff can change it.
- A trim or fallback written into the store, the row VM (`ArchivedAccountRowVM` keeps `account: Account`) or `Strings.accountsArchivedSummary`; the resolver is called at the read, not cached into data.
- Accessibility work on the row; `:42` already resolves.
- Any edit inside `accounts_list.hook.ts:136-146` (MA-065) or a toast mock in the hook suite (MA-067).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- `test -f __tests__/screens/accounts/archived_card.helpers.test.ts __tests__/screens/accounts/accounts_list.hook.test.ts` before citing either (both present at base).
- Gate: `npx jest __tests__/screens/accounts/archived_card.helpers.test.ts __tests__/screens/accounts/accounts_list.hook.test.ts` is red with steps 1 and 2's tests alone (`'   , Vodafone Cash'`, `'   restored.'`) and green with their code. Suite count moves from 38 to 39 in the hook suite and 8 to 9 in the helpers suite.
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-065 or MA-067 lands first: rebase `accounts_list.hook.ts` and `accounts_list.hook.test.ts`; the conflict is import lines and test placement, not logic. If MA-067's toast mock is in, step 2's assertion reads `mockToast.show` instead of `useToast().toast.show`, same object shape.
- A future ticket that trims on write makes step 1 and 2's blank inputs unreachable from the app; the tests still hold because the resolver is the contract.
- The emulator seed must target an account with `is_archived = 1`; a blank active account is MA-059's shot, not this one.

## Self-assessment
Step 2 is the least sure row, not for the code but for the file it shares. Two Planned siblings edit the same callback and the same suite, and the plan's promise that they do not overlap rests on their plans at bf143b32 and dcf05592, which the implementer may find already merged in a different shape; the guard-then-resolve order itself has one safe sequence and is stated. Steps 1 and 3 are one-line reads with a helper test and an emulator shot, and nothing else in the module reads `.name`.
