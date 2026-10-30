# MA-273 — A sheet's body mounts at its first open, and the stale-rate mark updates on an open rate sheet
base: 4b28fa70 · verify: emulator · flags: none · expected diff: ~50 lines

## Steps
### 1. The close lifecycle remembers that a sheet has opened, across settled closes
- File: `src/components/ui/sheet_close_lifecycle.ts` (`SheetCloseLifecycle`, `createSheetCloseLifecycle`, `settleSheetCloseLifecycle`)
- Change: Add `hasEverOpened: boolean` to `SheetCloseLifecycle`, required, never `null`, true from the first render that reads `isOpen` true and never false after. `createSheetCloseLifecycle(isOpen: boolean)` keeps its signature and sets it to `isOpen`. The settled literal at `:49-55` sets it `true`, since only an opened sheet settles. `syncSheetCloseLifecycle` carries it by its spread and its `createSheetCloseLifecycle(true)`. `hasOpened` keeps its meaning, and `RENDERED_FIELDS` (`sheet.hook.ts:23`) stays: the flag moves only with `isOpen`, which `useSheetCloseLifecycle` stores during render.
- Test: `first` · `__tests__/components/ui/sheet_close_lifecycle.test.ts`: mounted closed reads false through `syncSheetCloseLifecycle(_, false)` and a `-1`; an open reads true; a settled close and a reopen keep it true; mounted open reads true.

### 2. `Sheet` draws the host's children from the first open on
- File: `src/components/ui/sheet.tsx` (`SheetProps.children`, `:230`)
- Change: `{children}` becomes `{closeLifecycle.hasEverOpened ? children : null}`, with a one-line JSDoc on `children`: it mounts at the first open and stays through later closes. The header, the footer and `BottomSheet.Content` stay as they are. All 22 sites of `git grep -lE "<Sheet( |$)" -- src` pass through this line and no site renders HeroUI's `BottomSheet` directly, so no call site changes. `closeLifecycle` reads the new `isOpen` in the render that receives it (`sheet.hook.ts:33-36`), so the body arrives with the open flag in one Portal update. The rate sheet's shell stays mounted with its form's body (`rate_editor_sheet.tsx:190`) and only `RateEditorSheetBody` waits; `onOpenComplete` runs after the sheet settles, so `focusInput` finds the mounted input.
- Test: `first` · `__tests__/components/ui/month_filter.test.tsx`, one new describe on the real `Sheet`, under the Render-suite policy: 22 Acceptance lines name this wiring and no suite renders the real `Sheet` today. Take it with `jest.requireActual`. Read the mock as `jest.requireMock<{ BottomSheet: object }>('heroui-native')` and save its `BottomSheet`. In `beforeAll` assign it `Object.assign(root, original, { Content })`, and restore the saved one in `afterAll`: `jest.replaceProperty` throws on a function property, and `BottomSheet.Portal` at `sheet.tsx:174` needs the statics. `root` draws children while closed, because the `jest.setup.js` mock returns `null` closed and the case would pass at base. `Content` draws its children and keeps its `onClose` prop, because the `jest.setup.js` mock never calls it and a close that never settles also passes with `hasOpened` at `:230`. Add a `jest.mock('@gorhom/bottom-sheet', ...)` for `BottomSheetFooter`, since the real import dies on `react-native-worklets`, and a `jest.mock('react-native-safe-area-context', ...)` for `useSafeAreaInsets`. Assert with a body child's mount spy: closed draws the title and never calls the spy; open calls it once; after `isOpen` false and the kept `onClose` called inside `act`, the child is still mounted and the spy count is still 1; reopening does not call it again.

### 3. The currency helpers give the wait until a rate's next age read
- File: `src/modules/currency/store/currency.helpers.ts` (new `resolveRateStaleDelayMs`, beside `isRateStale`)
- Change: `resolveRateStaleDelayMs(rateUpdatedAt: string | null, nowMs: number): number | undefined`, both arguments required, `nowMs` never `null`. It returns `undefined` when no later read can change the mark: `rateUpdatedAt` `null`, unparseable, or already stale. Otherwise it returns the milliseconds to the first instant `isRateStale` reads true, `updated + 30 days + 1 - nowMs`, capped at `2 ** 31 - 1`, the most one `setTimeout` can wait. `isRateStale` and `RATE_STALE_THRESHOLD_DAYS` do not change.
- Test: `first` · `__tests__/currency.helpers.test.ts`: from `2026-09-01T12:00:00.000Z`, `2026-08-31T12:00:00.000Z` and `2028-02-15T12:00:00.000Z`, at 29 days old `isRateStale` reads true at `now + delay` and false at `now + delay - 1`; at 1 day old the delay is `2 ** 31 - 1`; a day-ahead update time gives the same cap; `null`, `'not a date'` and an already stale rate give `undefined`.

### 4. `useRateStale` turns the mark at the boundary with no render in between
- File: `src/modules/currency/store/use_rate_stale.hook.ts`, new, the `store/use_*.hook.ts` shape of `src/modules/accounts/store/use_accounts_by_id.hook.ts`
- Change: `useRateStale(rateUpdatedAt: string | null, isActive: boolean): boolean`, both arguments required, the return never `null` or `undefined`. State holds the boolean, initialised lazily from `isRateStale(rateUpdatedAt, Date.now())`. An effect on `[rateUpdatedAt, isActive]`, when `isActive`, reads the clock, sets the boolean and arms `setTimeout` for `resolveRateStaleDelayMs`. A timer that fires does the same read and re-arms until the helper returns `undefined`. Cleanup clears the timer. `isActive` false arms nothing, and its turn to true is the next read. The render path holds no `Date.now()` outside the `useState` initialiser: the React Compiler (`app.json:63`) may cache such a read and Jest never runs the compiler.
- Test: `first` · `__tests__/use_rate_stale.hook.test.ts`, new `.ts`, `jest.useFakeTimers({ now })` and `renderHook`: one second short of the age reads false, then true after timers advance with no rerender; 29 days short, past the cap, stays false until the boundary and turns true there; `isActive` false arms nothing (`jest.getTimerCount()` 0) and a turn to true past the boundary reads true; a new `rateUpdatedAt` reads false; `null` arms nothing; unmount leaves no timer.

### 5. The pay sheet's Rate row and its editor read the hook
- File: `src/modules/commitments/screens/commitments/detail/components/pay_sheet.hook.ts` (`usePaySheet`, `:11`, `:404`)
- Change: `const rateStale = useRateStale(rateUpdatedAt, visible && requiresRate);` after `requiresRate` (`:184`), and `state.rateStale` reads it, still `boolean`. The `isRateStale` import goes. `pay_sheet.tsx` keeps passing `state.rateStale` to `RateRow` and `RateEditor`.
- Test: `first` · `__tests__/screens/commitments_pay_sheet.hook.test.ts`: under fake timers, `visible` true, a USD commitment and `rate_updated_at` one second short of the age, `state.rateStale` reads false, then true after timers advance with no form call. With `visible` false and the clock past the boundary, a rerender at `visible` true reads true.

### 6. The add and edit transaction sheet's Rate row and its editor read the hook
- File: `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx` (`:31`, `:137`)
- Change: `const rateStale = useRateStale(rateUpdatedAt, requiresRate);`, the `isRateStale` import goes, `Props` do not change.
- Test: `first` · `__tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx`, a case beside `:509`, under the Render-suite policy, since the Acceptance line names this sheet's Rate row: `usdExpense` under fake timers with `rateUpdatedAt` one second short of the age; `exchange-rate-row-stale` is absent, then present after timers advance with no press.

### 7. The three `new` screen states are in their features files
- File: `.claude/skills/emulator-verify/features/commitment_detail.md`, `.claude/skills/emulator-verify/features/transaction_form.md`, `.claude/skills/emulator-verify/features/dashboard.md`
- Change: One `## States` row in each, frame `no frame, MA-273`.
  - `commitment_detail.md`, after `pay sheet, USD commitment, rate row`: `pay sheet, amount and rate focused`. Force: that state's seed, a cold launch, then the keyboard-up order of `transaction_form.md` § States `add, amount and rate focused` as the launch's first open of the pay sheet and of the editor, `amount-hero-value` focused and the drag in `pay-sheet-scroll`, then its keyboard-down order on a sheet opened fresh. Proof: that state's editor proof, `rate-editor-input`, the editor's `sheet-footer` top, `rate-editor-cancel` and `rate-editor-done` read the keyboard-down figures within 1 dp and the keyboard stays up from the raw tap to the focus; one shot per order.
  - `transaction_form.md`, after `budget picker sheet, close the sheet does not carry out`: `budget picker sheet, first open`. Force: a cold launch, that row's path to `budget-row`, `mqa bounds '~'`, then `$MQA tap 'id="budget-row"'`. Proof: the box read lists no `budget-picker-list`; after the tap `budget-picker-row-<its id>` sits inside `budget-picker-list` with the sheet at rest; one shot.
  - `dashboard.md`, after `net worth breakdown sheet, close the sheet does not carry out`: `net worth breakdown sheet, first open`. Force: a seed of one EGP bank account, `mqa open /dashboard` from a cold launch, `mqa bounds '~'` before any tap, then the net worth hero. Proof: the box read lists no `Bank, Smart Wallet, Cash` (`Strings.dashboardBreakdownLiquidCaption`); after the tap that text reads once with the sheet at rest; one shot.
- Test: `none` · a features file has no Jest layer; the render pass walks the rows.

## Screens
- `emulator-verify/features/commitment_detail.md`: pay sheet, USD commitment, rate row · none
- `emulator-verify/features/commitment_detail.md`: pay sheet, amount and rate focused · new, step 7 · a swipe or a drag
- `emulator-verify/features/add_commitment.md`: deactivate confirm over the edit sheet · a height that is not a whole number of dp
- `emulator-verify/features/add_commitment.md`: recurrence and duration pills, no adornment · a height that is not a whole number of dp
- `emulator-verify/features/transaction_form.md`: add, amount and rate focused · a swipe or a drag
- `emulator-verify/features/transaction_form.md`: To picker, overdrawn account · none
- `emulator-verify/features/transaction_form.md`: budget picker sheet, first open · new, step 7 · none
- `emulator-verify/features/transaction_form.md`: category picker, expense and income, large font · a font scale above 1.0
- `emulator-verify/features/transactions.md`: filter sheet footer, flat · none
- `emulator-verify/features/transactions.md`: month picker hit areas · a height that is not a whole number of dp, a font scale above 1.0
- `emulator-verify/features/commitments.md`: filter sheet footer, flat · none
- `emulator-verify/features/commitments.md`: month picker hit areas · a height that is not a whole number of dp, a font scale above 1.0
- `emulator-verify/features/add_account.md`: colour sheet, large font · a height that is not a whole number of dp, a font scale above 1.0
- `emulator-verify/features/account_detail.md`: adjust balance sheet, positive · none
- `emulator-verify/features/archived_account.md`: replacement sheet, overdrawn candidate · none
- `emulator-verify/features/budget.md`: copy sheet month filter · none
- `emulator-verify/features/budget.md`: income sheet, amount half-typed · none
- `emulator-verify/features/budget.md`: set-budget sheet, field focused · none
- `emulator-verify/features/budget.md`: spending plan sheet, total and category amount half-typed · none
- `emulator-verify/features/categories.md`: add sheet, first swatch default · none
- `emulator-verify/features/categories.md`: reassign sheet, large font · a font scale above 1.0
- `emulator-verify/features/dashboard.md`: net worth breakdown sheet, first open · new, step 7 · none

## Non-goals
- The rate editor over the list's search keyboard, MA-215 (#789).
- Any edit to the 22 call sites, or a move of `RateEditor` out of its form's body or under the `requiresRate` gate.
- Dropping a body at a close, or holding back a sheet's shell, title or footer.
- A two-step open before a probe or render pass shows a first open resting short.
- A change to the stale age, `isRateStale` or `RateRow`.
- An `AppState` listener for a device asleep across the boundary.
- Edits to the eight other features files on the `Size:` line; their rows exist.

## Untested inputs
- Each of the 22 call sites on its own: one line in `Sheet` serves them all, step 2's case proves that line and the Screens rows walk the sites.
- The commitment form, the add and edit transaction sheet and the date picker dropping a body at a settled close: no code here changes, `__tests__/screens/commitments/commitment_form_host.hook.test.ts`, `__tests__/screens/transactions/transaction_form/transaction_form_host.test.tsx` and `__tests__/screens/transactions/transaction_form/date_picker_sheet.test.tsx` stay green. Step 2.
- A `fitContent` first open's resting height and the rate editor's lift over a real keyboard: Jest has no gorhom layout; the Screens rows read both. Step 2.
- A device asleep across the boundary: `JavaTimerManager.kt:183` targets `System.nanoTime()`, so the timer fires late by the sleep and the next open reads true. Step 4.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- In the render walk, the invariant pass of `features/README.md` § Invariant pass on `add_commitment.md`, `transaction_form.md`, `transactions.md`, `commitments.md`, `commitment_detail.md`, `add_account.md`, `account_detail.md` and `archived_account.md`.

## Risks
- `add_commitment.md · deactivate confirm over the edit sheet`: the confirm sheet has no title, so a first open snaps to the handle's height and the body's layout must re-target the running animation (`node_modules/@gorhom/bottom-sheet/src/components/bottomSheet/BottomSheet.tsx:890-898`, `:1018-1024`). A short rest needs a two-step open in `sheet.tsx`, ~15 lines, where `BottomSheet`'s `isOpen` follows the body's first layout; that goes in by `--amend`, within the gate.
- `add_commitment.md · recurrence and duration pills, no adornment`, `add_account.md · colour sheet, large font`: the same re-target from a title-only or title-and-footer detent. The pills row matches on bounds, first open against reopen. Under uiautomator `ends-row` rests at the footer's top, so that row's force needs a 95 dp drag before the tap. The colour sheet row stays open.
- `transactions.md · month picker hit areas`, `commitments.md · month picker hit areas`: the same re-target, and `yearRowHeight` stays `undefined` until the year row's first `onLayout`, now at the first open, so the step slop reads its default for those frames (`month_filter.hook.ts:88`).
- `transaction_form.md · add, amount and rate focused`, `commitment_detail.md · pay sheet, amount and rate focused`: the lift holds only while the shell has the keyboard's show. On the pay sheet the shell now mounts at the pay sheet's first open, before any field there takes focus. The pay sheet row matches, both orders 0.0 dp apart, one run per order against the three `transaction_form.md` asks. The add row stays open.
- During a re-target `animatedIndex` reads the next index (`BottomSheet.tsx:416-423`), so a `fitContent` sheet's overlay may reach full opacity at the start of a first open. Stills cannot show it.
- A sheet inside a gated body, `RateEditor` on the pay sheet and `MonthFilter` on the copy sheet, now registers its portal at the parent's first open, so it draws above siblings mounted earlier (`primitives/portal/portal.tsx:47`, `:76`). Nothing opens over either one.
- not probed: add_commitment.md · deactivate confirm over the edit sheet. The edit sheet opened from neither the header `Edit commitment` nor the bottom `Edit` on a deep-linked detail, at this head and with `sheet.tsx:230` reverted, cause unknown. This row's render read goes through a list route of `add_commitment.md` § Reach it, or waits on a diagnosis of that fact.
- not probed: transaction_form.md · add, amount and rate focused
- not probed: transaction_form.md · category picker, expense and income, large font
- not probed: transactions.md · month picker hit areas
- not probed: commitments.md · month picker hit areas
- not probed: add_account.md · colour sheet, large font
- not probed: categories.md · reassign sheet, large font

## Self-assessment
Step 2 is the least sure, in two places. The first open of the four `fitContent` sheets rests right by my reading of gorhom's `evaluatePosition`, and no one has run it. The test case swaps a property on the shared `heroui-native` mock and restores it, a shape only `__tests__/components/ui/toast_success_icon.test.ts` comes near, so the test writer may need a local mock in its place.
