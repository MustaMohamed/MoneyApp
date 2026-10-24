# MA-252 — Detail state pieces live once in src/components/ui
base: 55706296c69fd941f5326c890c551a3998bb336f · verify: emulator · flags: money path · expected diff: ~190 lines

## Steps
### 1. One not-found state serves both details
- File: `src/modules/transactions/screens/transactions/detail/components/not_found_state.tsx` moves by `git mv` to `src/components/ui/detail_not_found_state.tsx`; `src/modules/transactions/screens/transactions/detail/index.tsx` (`:14`, `:51`); `src/modules/commitments/screens/commitments/detail/index.tsx` (`:13`, `:45`); `src/modules/commitments/screens/commitments/detail/components/not_found_state.tsx` is deleted.
- Change: commit A is the `git mv` plus the transactions index's import specifier, nothing else (ADR 2026-10-18 §3). Commit B renames `NotFoundState` to `DetailNotFoundState(props: DetailNotFoundStateProps): React.ReactElement`, with `DetailNotFoundStateProps { title: string; body: string; testID?: string }`: `title` and `body` required, never `null`; `testID` optional, set on the outer `View`. The file drops `Strings`; classes and the `Type`/`lineHeightFor` styles stay as they are. Transactions mounts it with `Strings.detailNotFoundTitle`, `Strings.detailNotFoundBody` and no testID; commitments with `Strings.commitmentsDetailNotFoundTitle`, `Strings.commitmentsDetailNotFoundBody` and `testID="commitment-detail-not-found"`.
- Test: none · the piece holds no logic, and a render case needs a new `.tsx` suite (`.claude/rules/tests.md` Render-suite policy); Screens `not found` on both files.

### 2. One load-error piece and one resolver serve both details
- File: `src/modules/transactions/screens/transactions/detail/components/detail_load_error.helpers.ts` and `detail_load_error.tsx` move by `git mv` to `src/components/ui/detail_load_error.helpers.ts` and `src/components/ui/detail_load_error.tsx`; both detail `index.tsx` files (transactions `:12`, `:53`, `:98`; commitments `:10`, `:47`, `:84`); the commitments `detail/components/detail_load_error.tsx` and `detail_load_error.helpers.ts` are deleted.
- Change: commit A is the two `git mv`s plus the import specifiers in the transactions index and in the two test files below. Commit B: the helpers export `DetailLoadErrorCopy { loadTitle: string; refreshTitle: string; description: string; retryLabel: string }`, all required, never `null`. `resolveDetailLoadErrorTitle(floating: boolean, copy: DetailLoadErrorCopy): string` returns `copy.refreshTitle` when `floating`, else `copy.loadTitle`. `resolveDetailLoadErrorAlertProps(floating: boolean)` and `FLOATING_ALERT_PROPS` stay as they are. `DetailLoadError(props: DetailLoadErrorProps)`, `DetailLoadErrorProps { copy: DetailLoadErrorCopy; testID: string; floating?: boolean; onRetry: () => void }`: `copy`, `testID`, `onRetry` required; `floating` optional, default `false`. `description`, `actionLabel`, `actionAccessibilityLabel` and `retryLabel` read `copy`, and both branches pass `testID`. Neither file imports `Strings`. Each index declares one module-level `DetailLoadErrorCopy` and passes it, with its testID, to both mounts: transactions `detailLoadErrorTitle`, `detailRefreshErrorTitle`, `detailLoadErrorDescription`, `detailLoadRetry` with `detail-load-error`; commitments `commitmentsDetailLoadErrorTitle`, `commitmentsDetailRefreshErrorTitle`, `commitmentsDetailLoadErrorDescription`, `commitmentsDetailLoadRetry` with `commitment-detail-load-error`.
- Test: first · `__tests__/screens/transactions/detail/detail_load_error.helpers.test.ts` moves by `git mv` to `__tests__/components/ui/detail_load_error.helpers.test.ts`, its title rows run for both details' copies (each `floating` value gives that copy's own title), its alert-props cases stay; `__tests__/screens/commitments_detail_load_error.helpers.test.ts` is deleted; the two MA-182 cases of `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx` (`:173`, `:186`) import from `@/components/ui/detail_load_error` and pass the transactions copy and `testID="detail-load-error"`, assertions unchanged.

### 3. One edit-pencil piece draws the gold pencil in both headers
- File: `src/components/ui/detail_edit_action.tsx` (new); `src/modules/transactions/screens/transactions/detail/components/detail_header.tsx:30-36`; `src/modules/commitments/screens/commitments/detail/index.tsx:32-38`.
- Change: `DetailEditAction(props: DetailEditActionProps)`, `DetailEditActionProps { accessibilityLabel: string; onPress: () => void }`, both required, never `null`; it renders `HeaderIconAction` (`src/components/ui/header_icon_action.tsx:17`) with `icon="pencil-outline"`, `iconSize={Size.iconSm}`, `iconColor={GoldTokens[500]}` and the default trailing edge. The transactions header passes `Strings.detailEditAccessibility` and `onEdit`; the commitments index `Strings.commitmentsDetailEditAccessibility` and `goToEdit`. Both drop `HeaderIconAction` and `GoldTokens`; the transactions header keeps `Size` for its spinner, the commitments index drops `Size`.
- Test: none · the five `DetailHeader` cases of `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx:59-118` (label, press, the MA-194 box and tap band) pass unchanged; a commitments header case needs a new `.tsx` suite; Screens `header title, large font` on both files.

### 4. One read of accounts by id exists
- File: `src/modules/accounts/store/account_lookup.helpers.ts`; `src/modules/accounts/store/use_accounts_by_id.hook.ts` (new); `src/modules/accounts/store/account.store.ts:131-132` (`loadAccountLookup`).
- Change: the helpers add `AccountLookupSources { accounts: readonly Account[]; archivedAccounts: readonly Account[]; accountLookupById: Readonly<Record<string, Account>> }` and `AccountsByIdRead { accountsById: ReadonlyMap<string, Account>; lookupFailed: boolean }`, every field required, never `null`. `readAccountsById(sources: AccountLookupSources): Map<string, Account>` returns `mergeAccountsById(sources.accounts, sources.archivedAccounts, sources.accountLookupById)`, which stays as it is. `lookupLeavesUnresolved(read: AccountsByIdRead, ids: readonly string[]): boolean` is true only when `read.lookupFailed` and `findMissingAccountIds(ids, read.accountsById)` is not empty. `useAccountsById(): AccountsByIdRead` selects `accounts`, `archivedAccounts`, `accountLookupById` and `accountLookupError` with `useShallow`, memoises `readAccountsById` on the three lists alone, and returns a memoised `{ accountsById, lookupFailed: accountLookupError }`; it loads nothing. `loadAccountLookup` builds `known` with `readAccountsById(get())`.
- Test: first · `__tests__/account_lookup.helpers.test.ts` adds `readAccountsById` (active over archived over cache, cache-only id kept) and `lookupLeavesUnresolved` (false with a missing id while `lookupFailed` is false; false when failed and every id resolves; true when failed and one id is missing; false for no ids); new `__tests__/use_accounts_by_id.hook.test.ts`, the store mocked with `attachMockSelectorStore` (`src/test_helpers/mock_zustand_selectors.ts:50`): active, archived and cache-only ids resolve; `accountsById` keeps its identity across a render where only `accountLookupError` flips; `lookupFailed` follows `accountLookupError`. The `loadAccountLookup` cases of `__tests__/account.store.test.ts` pass unchanged.

### 5. The readers that only name accounts use the shared read
- File: `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts:40-46`, `:185-188`; `src/modules/transactions/screens/transactions/transaction_form/transaction_form_prerequisites.helpers.ts:35-39`; `src/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook.ts:111-117`, `:177-180`; `src/modules/commitments/screens/commitments/components/commitment_form_body.hook.ts:45-69`, `:91-99`; `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx:143`.
- Change: the account detail takes `accountsById` from `useAccountsById()` and selects `accounts` alone, which still feeds `account` (`:115`) and `replacementOptions` (`:116`). `getMissingTransactionFormAccountIds(tx)` counts known ids from `readAccountsById(useAccountStore.getState())`. The edit hook's `contextualAccounts` is `useAccountsById().accountsById`, and it selects `accounts` alone for `resolveLockedStripChips`. `useCommitmentFormStripAccounts(accountId)` returns `useAccountsById().accountsById`, its signature and lookup effect unchanged. `useCommitmentFormStripError(accountId: string | undefined): string | undefined` drops its second argument and returns `Strings.transactionsAccountLookupError` when `lookupLeavesUnresolved(useAccountsById(), accountId === undefined ? [] : [accountId])`, else `undefined`; `commitment_form_body.tsx:143` drops the argument. None of the five files imports `mergeAccountsById`.
- Test: first · `__tests__/screens/commitments_form_body.hook.test.ts` adds `useCommitmentFormStripError`: the error string while `accountLookupError` is true and the id is unresolved; `undefined` when the id resolves, when the lookup has not failed, and for an `undefined` id. `__tests__/screens/accounts/account_detail.hook.test.ts`, the rest of `__tests__/screens/commitments_form_body.hook.test.ts` and the suites under `__tests__/screens/transactions/transaction_form/` pass with no assertion changed.

### 6. The readers that show the lookup error decide it through the shared read
- File: `src/modules/commitments/screens/commitments/commitments.hook.ts:100-107`, `:132-135`, `:340-341`; `src/modules/transactions/screens/transactions/detail/detail.hook.ts:94-101`, `:211-214`, `:233-234`; `src/modules/transactions/screens/transactions/transactions.hook.ts:130-139`, `:423-426`, `:435-436`.
- Change: each takes `accountRead = useAccountsById()` and its `accountsById`, and replaces `accountLookupError && findMissingAccountIds(ids, accountsById).length > 0` with `lookupLeavesUnresolved(accountRead, ids)`: the commitments list with `rowAccountIds`, the transactions list with `transactionAccountIds`, the detail with `currentTx === null ? [] : getTransactionAccountIds(currentTx)`. The detail's `hasUnresolvedAccount` (`:230`), which the flow card reads at `:268`, stays on `findMissingAccountIds` over the shared map. The transactions list keeps `accounts` and `accountsLoaded` in its own `useShallow` select for `:160-169` and `:450`. The detail's load effect and its `loadAccountLookup` call stay untouched, so one load asks the lookup once. None of the three imports `mergeAccountsById`.
- Test: none · no behaviour changes (ticket Rule 5); `__tests__/screens/commitments.hook.test.ts`, `__tests__/screens/transactions/detail/detail_hook.test.ts` (`:631`, `:641` and the asked-once cases `:752-822`) and `__tests__/screens/transactions/transactions_hook.test.ts` pass with no assertion changed.

### 7. The records name the shared pieces and the shared read
- File: `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md` (`:6`, a §1 extension after `:32`); `docs/adr/2026-09-15-account-lookup-keyed-by-id.md` (`:6`, a §3 amendment after `:28`); `.claude/skills/emulator-verify/features/commitment_detail.md:3`, `:27`; `.claude/skills/emulator-verify/features/transaction_detail.md:3` and a § States row.
- Change: 2026-10-18 gains "Extended 2026-10-24 (#851, MA-252)": `DetailNotFoundState`, `DetailLoadError` with `DetailLoadErrorCopy`, `resolveDetailLoadErrorTitle` and `resolveDetailLoadErrorAlertProps`, and `DetailEditAction` live in `src/components/ui/`; the transactions files moved by `git mv` in an imports-only commit and the commitments clones were deleted; each detail passes its own copy, label and testID; the spending plan detail's pencil stays on `HeaderIconAction` until the budget redesign. Its Applies to gains the four ui files: `src/components/ui/detail_not_found_state.tsx`, `src/components/ui/detail_load_error.tsx`, `src/components/ui/detail_load_error.helpers.ts` and `src/components/ui/detail_edit_action.tsx`. 2026-09-15 gains "Amended 2026-10-24, MA-251 (#850)": every reader names accounts through `useAccountsById` or `readAccountsById` and decides the shown error through `lookupLeavesUnresolved`, §4 holds; its Applies to names the hook and the seven readers. `commitment_detail.md:3` names the shared paths in place of `not_found_state.tsx` and `detail_load_error.tsx`; `commitment_detail.md:27`'s `not found` row adds the `Font scale` force (README) at 1.0 and 2.0 to its Force column, and its Proof's `one shot` reads `one shot at 1.0 and one at 2.0` (Acceptance line 5). `transaction_detail.md:3` says both details mount them since MA-252. The new row: `not found | C8, MA-182, MA-252 | mqa open /transactions/detail/no-such-transaction | mqa read finds Transaction not found and This transaction may have been deleted., centred; the header reads Transaction and label="Edit transaction" reads no match; one shot against C8`. C8 is the not-found frame per `transaction_detail.md:3`.
- Test: none · docs; `npm run lint` checks the banned phrases in tracked `.md`.

## Screens
- `emulator-verify/features/commitment_detail.md`: not found, with the `Font scale` force (README) at 1.0 and 2.0; step 7 adds the force to the row's Force column
- `emulator-verify/features/commitment_detail.md`: load error retry, large font
- `emulator-verify/features/commitment_detail.md`: refresh error
- `emulator-verify/features/commitment_detail.md`: header title, large font
- `emulator-verify/features/transaction_detail.md`: not found · new, step 7 adds it (C8)
- `emulator-verify/features/transaction_detail.md`: first-load error
- `emulator-verify/features/transaction_detail.md`: load error retry, large font
- `emulator-verify/features/transaction_detail.md`: refresh error
- `emulator-verify/features/transaction_detail.md`: header title, large font
- The invariant pass (#802 Rule 4) on both files.

## Decision record
- `docs/adr/2026-09-15-account-lookup-keyed-by-id.md`: every reader names accounts and decides the shown lookup error through one shared read; step 7 adds the dated amendment.

## Non-goals
- The detail skeletons and their hero geometry (Out of scope, MA-217).
- Hiding the pencil on a stopped commitment (MA-217).
- The budget pencils, `spending_plan_detail/index.tsx:29-35` and `category_detail/index.tsx:73`, stay on `HeaderIconAction`.
- Reads of the active list alone keep `accounts`: the account detail's own account, the transactions filter prune and chips, the edit sheet's locked chips.
- No lint or structural guard on `mergeAccountsById`; no copy change; no testID added; no icon on either not-found state.

## Untested inputs
- `DetailNotFoundState` with and without `testID`: step 1, emulator only.
- The commitments copy through `DetailLoadError`: step 2, emulator only.
- The transactions index's `DetailLoadErrorCopy`, its testID and its not-found strings: steps 1-2, emulator only.
- The commitments `DetailEditAction` mount: step 3, emulator only.
- A store mock with no `accountLookupError` field reads `lookupFailed` as `undefined`: step 4.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-217 (#791) edits the commitments detail index beside these mounts; the second to merge rebases.
- A move and its edit in one commit can let git pair `detail_load_error.helpers.ts` with the deleted commitments copy, as MA-233's two accordions did (ADR 2026-10-18, 2026-10-22 extension); commit A prevents it.
- `useAccountsById` subscribes the account detail, the edit hook and the strip to `accountLookupError`: one more render when it flips, nothing drawn differently.
- Jest does not run the React Compiler, so the hook test proves `accountsById` identity without it.
- `commitment_detail.md · refresh error`: the alert floats in a rounded container over the scroll; a pixel change means a copy field or testID went missing.
- `commitment_detail.md · header title, large font`: the pencil box now comes through `DetailEditAction`; the Header proof bounds must match base.
- `transaction_detail.md · header title, large font`: the same.
- not probed: commitment_detail.md · header title, large font
- not probed: transaction_detail.md · not found new
- not probed: transaction_detail.md · first-load error
- not probed: transaction_detail.md · load error retry, large font
- not probed: transaction_detail.md · refresh error
- not probed: transaction_detail.md · header title, large font

## Self-assessment
Step 5's `useCommitmentFormStripError` worries me most. It now calls `useAccountsById` beside `useCommitmentFormStripAccounts` in the same body, so the strip holds two subscriptions and two memoised maps. Passing one read down would avoid that, but it would change more of `commitment_form_body.tsx` than one line.
