# MA-161 — List failure states and the tinted danger box on the transactions load-error alerts
base: 4d282648da0253f966bd7c74af424a7407b9e2e1 · verify: emulator · flags: user copy · expected diff: ~230 lines

## Steps
### 1. The any-transaction read asks one row of SQLite
- File: `src/modules/transactions/database/transactions.ts` (new `getAnyTransactionExists`, ~9 lines), `src/modules/transactions/repositories/transaction.repository.ts` (`TransactionRepository`, `:264`, ~6), `src/modules/transactions/screens/transactions/transactions.hook.ts` (`loadExistence`, `:290-302`, ~2)
- Change: `getAnyTransactionExists(db: SQLiteDatabase): Promise<boolean>`, one required argument, never `null`, runs `SELECT 1 FROM transactions LIMIT 1` through `db.getFirstAsync` and resolves `true` when a row comes back. `TransactionRepository.hasAny(): Promise<boolean>`, no arguments, never `null`, rejects when the read throws; it is a class method only, `ITransactionRepository` (`:78`) stays as it is. `loadExistence` passes `await transactionRepository.hasAny()` to `resolveExistence(requestId, version, hasAny)`; its request guard, its `existenceFailed` flag and its catch stay. `src/database/transactions.ts` gets no new export.
- Test: `first` · `__tests__/transaction.query_executor.test.ts`: `getAnyTransactionExists`, imported from the module path, resolves `false` on the emptied table and `true` after one `insertTransactionRow`. `__tests__/screens/transactions/transactions_hook.test.ts`: the repository mock gains `hasAny`, the cases at `:2500-2821` and `:2859-2944` answer through it with a boolean, and the case at `:2511` asserts `getAll` is never called.

### 2. The list's failure copy, and the first-load error as the error-state block
- File: `src/constants/strings.ts` (`:1261-1265`, ~7), `src/modules/transactions/screens/transactions/components/transaction_load_error.helpers.ts` (~16), `src/modules/transactions/screens/transactions/components/transaction_load_error.tsx` (`:14-54`, ~24)
- Change: Values, keys unchanged: `transactionsLoadError` `Couldn't load your transactions`, `transactionsRefreshError` `Couldn't refresh your transactions.`, `transactionsLoadMoreError` `Couldn't load more.`, `transactionsAccountLookupError` `Couldn't load account names.`; one new key, `transactionsLoadErrorDescription` `Something went wrong reading your data. Your transactions are still there.` New `resolveTransactionLoadErrorAlertProps(variant: TransactionLoadErrorTitleVariant)`, required argument, never `null`, returns `undefined` for `initial`, `{ mode: 'inline', tinted: true, flatRetry: true }` for `pagination`, and `{ mode: 'floating', floatingOffset: 'tabBar', tinted: true, flatRetry: true }` for `refresh`, `totals` and `accounts`. `TransactionLoadError` spreads a defined result into one `LoadErrorAlert` beside the title, `Strings.transactionsLoadRetry`, `onRetry` and the `testID`; `tinted` rides the spread unread until step 3 declares the prop, which TypeScript 6.0.3 accepts in a JSX spread. On `undefined` it mounts `ErrorState` as `src/modules/accounts/screens/accounts/list/index.tsx:189-201` does, with `edges={[]}`, `flat`, `iconName="alert-circle-outline"`, the title, the description, `Strings.transactionsLoadRetry` as label and accessibility label, `onAction={onRetry}` and `testID="transaction-load-error"`, and no loading flag, since a retry returns the slot to the skeleton. `TransactionLoadError` keeps its two required props, `variant` and `onRetry`.
- Test: `first` · `__tests__/screens/transactions/transaction_load_error.helpers.test.ts`: the five titles and the description equal the literals above with `transactionsTotalsLoadError` unchanged, none starts with `Could not`, `Strings.transactionsLoadRetry` reads `Try again`, and `resolveTransactionLoadErrorAlertProps` returns the value above for each of the five variants. `__tests__/screens/transactions.screen.test.tsx` gains `jest.mock('@/components/ui/error_state', …)` beside the `empty_state` mock at `:70`: the suite imports the real list screen (`:8`), `error_state.tsx:4` loads `uniwind`, and Jest resolves that to `node_modules/uniwind/src/index.ts`, raw TypeScript that `jest.config.js:20-22` leaves untransformed and that no suite loads at base.

### 3. The shared alert draws the tinted danger box on request
- File: `src/components/ui/load_error_alert.geometry.ts` (new, ~30), `src/components/ui/load_error_alert.tsx` (`LoadErrorAlertCommonProps` `:12-22`, the alert `:74-106`, ~36)
- Change: `LoadErrorAlertCommonProps.tinted?: boolean`, optional, never `null`; absent or `false` draws today's alert in all four modes. The geometry file exports `LoadErrorAlertMode = 'fill' | 'inline' | 'floating' | 'bare'`, `resolveLoadErrorAlertTone(mode: LoadErrorAlertMode, tinted: boolean): 'plain' | 'tint' | 'tintOverSurface'` (`plain` when not tinted, `tintOverSurface` when tinted and `floating`, else `tint`), and `resolveLoadErrorRetryHitSlop(retrySize: ButtonSize, fontScale: number, tinted: boolean): { top: number; bottom: number } | undefined`, all arguments required, which returns `touchFloorSlop(resolveSmallButtonHeight(fontScale)) + TOUCH_SLOP_PIXEL_MARGIN` on each side for a tinted `sm` retry and `undefined` otherwise (the margin as `src/modules/transactions/screens/transactions/components/transactions_rail.geometry.ts:22-27`). Under a tint the box takes the 12% danger fill and a one-point 30% danger border (frame A8 `.alrt`; `border-danger/30` as `src/modules/transactions/screens/transactions/detail/components/detail_row.tsx:30`), `Radius.md` corners, the indicator in `Colors.dark.negative`, the title in the foreground colour with `font-inter-semibold`, `fontSize: Type.meta` and `lineHeight: lineHeightFor(Type.meta)`; under `tintOverSurface` the fill lies over the alert's own surface with the same corners, through `Alert`'s `background` prop. Both `Button` literals take the slop as `hitSlop`; `resolveRowStacking` and the drawn button height stay.
- Test: `first` · `__tests__/components/ui/load_error_alert.geometry.test.ts` (new): the tone for each of the four modes with `tinted` on and off; a tinted `sm` retry at font scales 1.0 and 2.0 gets equal `top` and `bottom` and `resolveSmallButtonHeight(scale) + top + bottom` is at least `TouchSize.min`; `md` and an untinted `sm` get `undefined`.

### 4. The detail's floating alert and the form's alert ask for the tint
- File: `src/modules/transactions/screens/transactions/detail/components/detail_load_error.helpers.ts` (~4), `src/modules/transactions/screens/transactions/detail/components/detail_load_error.tsx` (~2), `src/modules/transactions/screens/transactions/transaction_form/components/transaction_form_data_error.tsx` (~1)
- Change: New `resolveDetailLoadErrorTinted(floating: boolean): boolean`, required argument, returns `floating`; `DetailLoadError` passes it as `tinted` and keeps `Strings.detailLoadRetry` and the bordered retry. `TransactionFormDataError` passes `tinted` and keeps `retrySize="md"`.
- Test: `first` · `__tests__/screens/transactions/detail/detail_load_error.helpers.test.ts`: `resolveDetailLoadErrorTinted(true)` is `true` and `(false)` is `false`. The form's one prop literal has no logic layer; see Untested inputs.

### 5. A toast sits above a floating load-error alert
- File: `src/components/ui/toast_clearance.state.ts` (~24), `src/components/ui/toast.tsx` (`AppToastProvider`, `:26-33`, ~6), `src/components/ui/load_error_alert.geometry.ts` (~5), `src/components/ui/load_error_alert.tsx` (the `floating` arm, `:118-129`, ~30)
- Change: The state gains `alertClearance: number | undefined` and `alertOwner: number | undefined`, both `undefined` at rest and after `reset`, never `null`, and `holdAlertToastClearance(px: number): () => void`, whose release clears the pair only while `alertOwner` is still that call's token (`.claude/rules/state.md` rule 5: two tab screens can each float an alert, and focus on the next can fire before blur on the last). `resolveToastBottomClearance(bottomClearance: number | undefined, alertClearance: number | undefined): number | undefined`, both arguments required, returns the larger of the defined values and `undefined` when both are. `AppToastProvider` feeds that to `resolveToastInsets`, whose signature stays. `resolveFloatingAlertToastClearance(windowHeight: number, alertTop: number): number` returns `windowHeight - alertTop + Spacing.xs`. The gap of 8 is the frames': `.float` sits at 72 and holds a 60-high alert, `.toast` sits at 140 (A8, A14). The `floating` wrapper reads its top with `measureInWindow` on each layout and holds that value while its screen has focus (`useFocusEffect`, as `src/modules/navigation/screens/tabs/tabs.hook.ts:31`), releasing on blur and unmount and replacing its own hold on a new layout. The hold lives in a component only the `floating` arm mounts, so `fill`, `inline` and `bare` call no navigation hook. The alert's position classes (`:52-55`) stay.
- Test: `first` · `__tests__/components/ui/toast_clearance.state.test.ts`: a hold sets `alertClearance` and its release clears it; a release that runs after a later hold leaves the later hold; `reset` clears it; `resolveToastBottomClearance` over `(undefined, undefined)`, `(120, undefined)`, `(undefined, 240)`, `(120, 240)` and `(300, 240)`. `__tests__/components/ui/load_error_alert.geometry.test.ts`: `resolveFloatingAlertToastClearance(731, 490.3)` equals `731 - 490.3 + Spacing.xs`.

### 6. Every success toast prints its label in the foreground colour
- File: `src/components/ui/toast.tsx` (`withSuccessIcon`, `:46-50`, ~6)
- Change: A config with `variant: 'success'` and no `component` forwards to HeroUI with `variant: 'default'`, whose label reads `--overlay-foreground`, equal to `--foreground` in `global.css:9,17`, and with `icon` as the caller's or else `SUCCESS_ICON`. A string, a `component` call and every other variant forward as the same object. No call site changes.
- Test: `first` · `__tests__/components/ui/toast_success_icon.test.ts`: the cases at `:35`, `:66` and `:79` expect `variant: 'default'` beside the icon, the check still in `Colors.dark.positive`; the danger, string and custom-component cases keep `toBe(options)`.

### 7. The feature files carry the new states and the changed proofs
- File: `.claude/skills/emulator-verify/features/transactions.md` (~11 rows), `transaction_detail.md` (2), `transaction_form.md` (3), `dashboard.md` (1), `commitments.md` (1), `budget.md` (1), `accounts_list.md` (1), `archived_account.md` (1), all in the same folder
- Change: New rows, one line each, with force and proof.
  - `transactions.md` · `first-load error` (A7): the force of `add button clearance, load error`, at 1.0 and 2.0; `transaction-load-error` reads the title and the body under `transactions-list-header`, the rail and `fab-button` present; `Try again` reads 48 scrolled to the list's end at both scales, never at rest, where at 1.0 it lies under the fold (the block is 230.5 high in 182.9 of room) and `fab-button` lies over the headline and the body; at 2.0 at the end the list's top edge cuts the block's first 38 dp.
  - `transactions.md` · `first-load error, any-transaction read failed` (A7): an empty unfiltered month with a throw forced in `hasAny`; the block's strings read and neither empty block's headline does.
  - `transactions.md` · `refresh error` (A8): a throw forced on a refresh of loaded rows, at 1.0 and 2.0, the refresh started by `mqa open /accounts` then `mqa back`, since one `mqa scroll up` at 2.0 starts none; the new title, a crop of the tinted box with no row text through it, the box's bottom edge and sides where `main` has them and its height 65.9 at 1.0 against `main`'s 72.0 (two title lines of 18.3 against two of 24), a `tapxy` inside the 44 band but off the drawn button retries.
  - `transactions.md` · `load-more error` (A9): a seed past `PAGE_SIZE` with a throw forced in `loadMore`; the alert under the last day card, tint alone, the rows' bounds unchanged.
  - `transactions.md` · `account names failed` (no frame): a throw forced at `src/modules/accounts/store/account.store.ts:132` with a row whose account neither list holds; `Couldn't load account names.` in the floating box, the rows in place.
  - `transaction_detail.md` · `refresh error` (C12): a throw forced on the detail's second `getById`; the tinted box over the surface at the bottom edge, strings and `Retry` as on `main`.
  - `transaction_detail.md`, `dashboard.md`, `commitments.md`, `budget.md` · `saved toast after edit, refresh failed` on the first and `saved toast, refresh failed` on the three tabs (no frame): the screen's refresh force, then a save; the toast's box ends above the alert's top, the two do not intersect, and the retry takes a tap while the toast shows.
  
  Rewritten rows: `transactions.md` `add button clearance, load error` (the block, `Clearance proof`), `load error retry, large font` (its force becomes `refresh error`'s), `hero, figures failed` (tint over surface, flat retry), `toast after a delete, refresh failed` (the toast above the alert, the tap while it shows, the new title), `toast after a delete` (label colour), and its header sentence gains frames A7 to A9; `transaction_form.md` `form data failed` (the tint replaces the MA-134 note), `form data failed, large font`, `saved toast` (label colour); `accounts_list.md` `after unarchive` and `archived_account.md` `after delete` (label in the foreground colour, check in the success colour, one crop).
- Test: `none` · feature files are recipes for the emulator pass, with no Jest layer.

## Screens
- `emulator-verify/features/transactions.md`: first-load error · new, frame A7, step 7
- `emulator-verify/features/transactions.md`: first-load error, any-transaction read failed · new, frame A7, step 7
- `emulator-verify/features/transactions.md`: add button clearance, load error
- `emulator-verify/features/transactions.md`: load error retry, large font
- `emulator-verify/features/transactions.md`: refresh error · new, frame A8, step 7
- `emulator-verify/features/transactions.md`: load-more error · new, frame A9, step 7
- `emulator-verify/features/transactions.md`: account names failed · new, no frame, step 7
- `emulator-verify/features/transactions.md`: hero, figures failed
- `emulator-verify/features/transactions.md`: toast after a delete, refresh failed
- `emulator-verify/features/transactions.md`: toast after a delete
- `emulator-verify/features/transaction_detail.md`: refresh error · new, frame C12, step 7
- `emulator-verify/features/transaction_form.md`: form data failed
- `emulator-verify/features/transaction_form.md`: form data failed, large font
- `emulator-verify/features/transaction_form.md`: saved toast
- `emulator-verify/features/transaction_detail.md`: saved toast after edit, refresh failed · new, no frame, step 7
- `emulator-verify/features/dashboard.md`: saved toast, refresh failed · new, no frame, step 7
- `emulator-verify/features/commitments.md`: saved toast, refresh failed · new, no frame, step 7
- `emulator-verify/features/budget.md`: saved toast, refresh failed · new, no frame, step 7
- `emulator-verify/features/accounts_list.md`: after unarchive
- `emulator-verify/features/archived_account.md`: after delete

## Non-goals
- The detail's strings, its `Retry` label, a flat retry on frame C12 and its first-load alert, which keeps the untinted `fill` alert: MA-094 (#550).
- `tinted`, the hit slop or `flatRetry` on any alert outside the transactions screens: the dashboard, commitments list and detail, budget and its copy sheet, categories, the account detail and its activity card pass none of them.
- The alert's place, padding, gap, icon size and `sm` button height. `bottom-24` stays though frame A8 draws the alert level with the + button, and D14's `Try again` stays 48.
- The toast's type size and weight (frame `.toast .t` reads 14 over 20 at 600). Step 6 changes the label's colour only.
- `src/modules/transactions/screens/transactions/index.tsx`: the slot order, `LIST_BOTTOM_CLEARANCE` (`:68`) and the three `TransactionLoadError` mounts stay; `ErrorState` gets no `clearsFab`.
- `getTransactions`, `getAll({ limit: 1 })` for other callers, and `ITransactionRepository`.
- Renaming a load-error key. `__tests__/screens/load_error_copy.test.ts:58-61, :116-119` pins them by name.
- The empty states and the delete dialog (MA-093, shipped), the detail's delete (MA-094), the form's validation and save failure (MA-095), the copy sweep (MA-097).

## Untested inputs
- `tinted` on the form's alert, step 4: one prop literal in a `.tsx` with no logic layer.
- The tint's fill, border, corners, icon and title style on the HeroUI `Alert`, step 3: the tone resolver is tested, the drawn look is the render check's.
- `ErrorState` mounted in the list's empty slot with `flat` and `edges={[]}`, step 2.
- The floating wrapper's `measureInWindow` read and its focus-scoped hold, and `AppToastProvider` joining the two clearances, step 5.
- A tap in the slop of the tinted retry, step 3: the slop's numbers are tested, the tap is `transactions.md · refresh error`.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- Step 5 assumes `useWindowDimensions().height` equals the height of the root view HeroUI's toast container fills (`node_modules/heroui-native/src/providers/toast/insets-container.tsx`, `absolute inset-0`). If Android reports a shorter window, the toast lands off by the difference.
- `__tests__/screens/budget/budget_screen.test.tsx:649` renders the floating alert for real under `jest.mock('expo-router', () => ({ useFocusEffect: jest.fn() }))`. A hold that reads another `expo-router` export breaks that suite.
- `__tests__/screens/commitments.screen.test.tsx` and `__tests__/screens/budget/budget_copy_sheet.test.tsx` import the real `load_error_alert.tsx` and mock no `expo-router`, so from step 5 they load the real module. It loads under this Jest config: `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx` imports it unmocked through `src/components/ui/stack_header.tsx:2` and passes at base. If either suite fails at import on step 5's commit, the remedy is the mock at `__tests__/screens/budget/budget_screen.test.tsx:44-46`.
- A floating `LoadErrorAlert` mounted outside a navigator would throw in `useFocusEffect`. The seven floating call sites at base all sit inside screens.
- `transactions.md · refresh error`: the surface under the tint needs the box's own `Radius.md` corners, or surface shows outside the border at each corner.
- `transactions.md · refresh error`: the retry's slop reaches 3 dp past the drawn button inside a rounded box. `mqa bounds` shows no slop, so the tap in the band is the proof.
- `transactions.md · first-load error`: at 1.0 as at 2.0 the block is taller than the room under the list header, 230.5 in 182.9 at 1.0, so at rest the retry is under the fold and the + button lies over the headline and the body. Only `LIST_BOTTOM_CLEARANCE` keeps the block clear of the + button at the list's end.
- `transactions.md · toast after a delete, refresh failed`: `toast.show` runs in the tick the alert mounts and the hold lands after the alert's first layout, so the toast can draw one frame at the old inset before it moves up.
- `transaction_detail.md · saved toast after edit, refresh failed`: on the tabs copy the tabs hold the toast at the hidden + button's level, where the alert sits at `bottom-4`; the alert's hold has to win there.
- `transaction_form.md · form data failed`: the tint alone lies on the sheet's surface, a different ground from the list's background under A9.
- not probed: `transactions.md` · refresh error
- not probed: `transactions.md` · load-more error
- not probed: `transactions.md` · account names failed
- not probed: `transactions.md` · hero, figures failed
- not probed: `transaction_detail.md` · refresh error
- not probed: `transaction_form.md` · form data failed
- not probed: `transaction_form.md` · form data failed, large font
- not probed: `transactions.md` · toast after a delete, refresh failed
- not probed: `transaction_detail.md` · saved toast after edit, refresh failed

## Self-assessment
Step 5 is the one I am least sure about. The alert's top is known only after layout, in window coordinates, and HeroUI's toast inset counts from the bottom of its root container, so the step rests on those two frames of reference agreeing on Android and on `measureInWindow` answering on Fabric before the toast is seen. The owner-checked release and the focus scope are inferred from how React Navigation orders focus and blur across tabs, which no test at this layer can reproduce. The state and the two resolvers are fixed and tested first; the measuring component is the implementer's to shape, and the five toast rows on the emulator are what prove it.
