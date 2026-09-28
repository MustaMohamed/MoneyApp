# MA-106 — Add and edit sheet: saved toast, no-accounts and data-error states in the new shape
base: 10b1540f · verify: emulator · flags: user copy · expected diff: ~55 lines

All `transaction_form/` paths below are under `src/modules/transactions/screens/transactions/`. All test paths in `transaction_form/` are under `__tests__/screens/transactions/`.

## Steps
### 1. The three strings read as the ticket writes them
- File: `src/constants/strings.ts` (`addTxDataLoadError` :872, `addTxDataLoadRetry` :873, new key `transactionSavedToast` beside `transactionSaveError` :535)
- Change: `addTxDataLoadError` becomes `Couldn't load your accounts and categories.`, `addTxDataLoadRetry` becomes `Try again`, `transactionSavedToast` is `Transaction saved.`. Both existing key names stay: `__tests__/screens/load_error_copy.test.ts:56, :87` pins them by name. `addTxNoAccountsTitle`, `addTxNoAccountsBody`, `addTxNoAccountsCta` are not touched.
- Test: `first` · `transaction_form/transaction_form_copy.test.ts`, a `MA-106` describe: the three values verbatim; `addTxNoAccountsTitle` still `No Accounts Yet`; no `Strings` value contains `Could not load the accounts and categories`.

### 2. A save leaves `'saved'` for the close to return
- File: `transaction_form/transaction_form_host.state.ts` (`TransactionFormPostCloseAction` :16, `completeSave` :182-187)
- Change: the type becomes `'addAccount' | 'saved'`; `completeSave` sets `{ phase: 'closing', postCloseAction: 'saved' }` on the path that returns `true`. `completeClose`, `requestClose`, `requestAccountCreation`, `openAdd`, `openEdit` keep their bodies and signatures; a close without a save still returns `undefined`.
- Test: `first` · `transaction_form/transaction_form_host_state.test.ts`: after `openAdd` then `completeSave(sessionId)`, `completeClose(sessionId)` returns `'saved'`; the same after `openEdit`; `requestClose` then `completeClose` returns `undefined`; `completeSave` from a replaced session leaves `postCloseAction` undefined.

### 3. The toast shows once, after the sheet has closed
- File: `transaction_form/transaction_form_host.hook.ts` (`handleCloseComplete` :133-136)
- Change: the hook reads `const { toast } = useToast()` from `@/components/ui/toast`; `handleCloseComplete` calls `toast.show({ label: Strings.transactionSavedToast, variant: 'success' })` when `completeClose` returns `'saved'`, and keeps the `'addAccount'` push. `handleSaved` is unchanged: it shows nothing and still calls `onEditSaved`. The hook's return shape is unchanged.
- Test: `first` · new `transaction_form/transaction_form_host.hook.test.ts` (logic-only, `renderHook`, `@/components/ui/toast` mocked as in `__tests__/screens/accounts/account_detail.hook.test.ts:41`, `expo-router` mocked): after `openAdd` and `handleSaved(sessionId)` the toast mock has no call; after `handleCloseComplete()` it has one call with `{ label: Strings.transactionSavedToast, variant: 'success' }`; the same after `openEdit`, with `onEditSaved` called once; a second `handleCloseComplete()` adds no call; a close without a save shows nothing; the `'addAccount'` close pushes and shows nothing.

### 4. The footer is hidden while form data has failed, on add and on edit
- File: `transaction_form/transaction_form.helpers.ts` (new export), `transaction_form/add_transaction_session.tsx` (:26), `transaction_form/edit_transaction_session.tsx` (:41)
- Change: new `resolveTransactionFormFooterVisible(input: { formDataLoadError: boolean; formDataReady: boolean; hasAccounts: boolean }): boolean`, `false` when `formDataLoadError`, otherwise `!formDataReady || hasAccounts`. The add session passes its three hook fields; the edit session passes `hasAccounts: true` and replaces its literal `visible: true`. `TransactionFormFooterState`, `publishFooter` and `getOpeningState` are unchanged; after Try again the status leaves `error` and the footer returns with the loading state.
- Test: `first` · `transaction_form/transaction_form.helpers.test.ts`: failed → `false` whatever the other two read; loading → `true`; ready with accounts → `true`; ready without accounts → `false`.

### 5. Add Account and Try again draw flat
- File: `transaction_form/components/no_accounts_empty.tsx` (:31-36), `transaction_form/components/transaction_form_data_error.tsx` (:10-16)
- Change: the `Button` gains `flat` (primary, default `md` size); the `LoadErrorAlert` gains `flatRetry` and keeps `mode="fill"`, its testID and both string keys. Title, body, icon and placement of the empty block stay as shipped. `src/components/ui/load_error_alert.tsx` and `src/components/ui/button.tsx` are not edited.
- Test: `none` · a flat fill and a radius are pixels, and an assertion on the prop is source text (`tests.md`, M35); the Screens states prove both.

### 6. A toast over the tabs sits at the add button's own offset where the path hides the button
- File: `src/modules/navigation/screens/tabs/tabs.helpers.ts` (`resolveTabsGeometry` :4-10), `src/modules/navigation/screens/tabs/tabs.hook.ts` (:20-23)
- Change: `resolveTabsGeometry(safeAreaBottom: number, addButtonHidden: boolean): { fabBottomOffset: number; toastClearance: number }`; `toastClearance` is `fabBottomOffset` when `addButtonHidden`, else `fabBottomOffset + Size.fab + Spacing.md` as today; `fabBottomOffset` does not depend on the flag. The hook passes `shouldHideGlobalFab(pathname, false)`: the pathname half only, so an open sheet never moves the clearance. `fabHidden` keeps its expression. The focus effect already re-publishes when `toastClearance` changes.
- Test: `first` · `__tests__/screens/navigation/tabs.helpers.test.ts`: the three cases take the second argument; hidden gives `34 + Size.tabBarHeight + Spacing.md`, shown gives today's figure, both grow by the safe-area delta. `__tests__/screens/navigation/tabs.hook.test.ts`: the `@/components/ui/fab_visibility` mock (:16-18) is removed and the real `shouldHideGlobalFab` runs; `usePathname` and `useAnySheetOpen` become per-test mocks, nothing else new is mocked; on `/dashboard` the held clearance is the shown figure, on `/transactions/detail/tx-1` the hidden one, and with `useAnySheetOpen` true on `/dashboard` it stays the shown one.

### 7. The feature files carry the five states
- File: `.claude/skills/emulator-verify/features/transaction_form.md` (States, Outbound :40), `.claude/skills/emulator-verify/features/transaction_detail.md` (States, Outbound :22), `.claude/skills/emulator-verify/features/README.md` (:37)
- Change: append the rows in Screens below, each with Frame, Force and Proof; the Outbound Save row and the detail's edit row gain the toast; the README row's frames read `D1 to D8, D13 to D15, A15 (transactions canvas)`. Proof text quotes only the ticket's strings. The `loading` row's `transaction_form_host.state.ts:93` reference still holds after step 2.
- Test: `none` · documentation.

## Screens
- `emulator-verify/features/transaction_form.md`: add expense, edit, add from an account (existing, re-run for the unchanged host and the open-after-jump path)
- States the file lacks, added by step 7:
  - `no accounts`, frame D13. Force: a seed with no active account, the FAB's add path. Proof: `mqa read` finds `No Accounts Yet` and `Add Account`; `no-accounts-cta` reads 48 ± 1 high; `sheet-footer` holds no Save; one shot, the button on a single accent fill.
  - `form data failed`, frame D14. Force: source force, `getOpeningState` (`transaction_form_host.state.ts:93`) returning `'idle' as const` and `loadPrerequisites` (`transaction_form_prerequisites.hook.ts:13`) rejecting, `mqa up`, then both modes under the one force: `add expense`, and `edit` from a seeded expense's detail; reverted with `git status` clean. Proof, on add and on edit alike: `mqa read` finds `Couldn't load your accounts and categories.` and `Try again`, and no `Save` and no `Save changes`; `transaction-form-data-error` bounds centred in the sheet body; `mqa bounds` on the `Try again` node reads 44 or more high; one shot per mode.
  - `saved toast`, frame A15. Force: `add expense`, an amount, a category, Save; again from a list row's edit. Proof: `mqa read` finds `Transaction saved.` once, after the sheet title is gone; the toast's bottom edge above the FAB's top edge; one shot.
- `emulator-verify/features/transaction_detail.md`, states the file lacks, added by step 7:
  - `saved toast after edit, tabs copy`, frame A15. Force: a seeded expense's detail from the Transactions tab, edit, Save changes. Proof: `Transaction saved.` in `mqa read`; no FAB; the toast's bottom edge `Spacing.md` above the tab bar's top edge; one shot.
  - `saved toast after edit, stacked twin`, frame A15. Force: the same on `/stacked/transactions/detail/<id>`. Proof: `Transaction saved.` in `mqa read`; no tab bar; the toast at the safe-area bottom; one shot.

## Non-goals
- The footer status track, the danger rings, the save-failure line (MA-105).
- The type tabs, the account strip, the fact rows, the loading skeleton (MA-104).
- The list's toast after a delete (MA-093, #549).
- The keyboard lift (MA-123, #598).
- The sheet's remaining strings (MA-097, #553); the `Retry` values of other screens (`startupErrorRetry`, `categoriesLoadRetry`, `dashboardLoadRetry`, `commitmentsLoadRetry`, `detailLoadRetry`).
- No edit to `src/components/ui/fab_visibility.ts`, `src/components/ui/toast.tsx`, `src/components/ui/toast_clearance.state.ts`, `src/components/ui/load_error_alert.tsx` or `transaction_form/index.tsx`.
- No change to `addTransactionForAccount` (`src/modules/accounts/screens/accounts/detail/account_detail.hook.ts:376-385`), `openEdit` callers (`detail/detail.hook.ts:250-253`, `transactions.hook.ts:602`) or the host's mount at `src/app/(app)/_layout.tsx:30`.
- No new case in a `.tsx` render suite; `transaction_form_sessions.test.tsx` and `transaction_form_host.test.tsx` change only if a step breaks them.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- The clearance passes `false` for the sheet argument; a reading of the ruling where an open sheet also lowers the toast changes step 6's hook line and its third hook test.
- A toast on `/commitments/*` and `/budget/*` tab routes drops to the lower clearance too, since the path rule hides the add button there; the ruling asks for it, and any frame that draws otherwise reopens step 6.
- `handleCloseComplete` closes over the render's `sessionId`; a form opened while the saved one is still closing gets no toast for the first save, as the `'addAccount'` push already behaves.
- If a zero-account seed routes to onboarding before the FAB is reachable, the `no accounts` Force needs another entry and step 7's row changes.
- `flatRetry` on the D14 alert rests on the Rules line on flat buttons; a frame drawing a bordered Try again removes that prop from step 5.

## Self-assessment
Step 6 is the one I am least sure about. The ruling names `shouldHideGlobalFab` and calls it a path rule, and that function also takes the open-sheet flag; I pass `false` so the clearance depends on the pathname alone and cannot move while a sheet opens or closes. `src/components/ui/sheet.tsx:122-132` drops its count when `isOpen` falls, before the close completes, so both readings put the saved toast at the same height; they differ only for a toast shown while some sheet is open over a tab. The geometry is shared by every toast over the tabs, so a wrong reading here reaches screens this ticket does not name.
