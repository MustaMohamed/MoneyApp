# MA-030 — Adjust balance on an overdrawn account
base: 13f5c7fc7daa9a7c9d5f6fbf721f88cba3bb2c4b · verify: emulator · flags: none · expected diff: ~85 lines

Design in one line: the input holds the magnitude, a two-segment sign control (`SegmentedTabs`, HeroUI `Tabs`) holds the sign, and `parseAdjustInput` composes them and applies the card floor. `parseNonNegativeDecimal` and its 13 other call sites do not change; a typed or pasted leading `-` is read by this sheet alone, where `parseAdjustInput` strips one and folds it into the sign.

## Steps
Commit order: 1 · 4 · 2+5+6 as one commit · 3. Step 2 changes `parseAdjustInput`'s arity and `adjust_balance_sheet.tsx:57` calls it with one argument until step 5; step 6's `accountType` prop is an excess-prop error until step 5 declares it; step 3 calls the two-argument signature and reads `isNegative`.

### 1. The sheet state carries the sign apart from the magnitude
- File: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.state.ts` (`AdjustBalanceSheetStateShape`, `initialize` at `:27`)
- Change: add `isNegative: boolean` to the shape and `INITIAL_STATE` (`false`), a `setNegative: (v: boolean) => void` action, and make `initialize(currentBalance)` set `{ input: String(Math.abs(currentBalance)), isNegative: currentBalance < 0, error: '' }`. `reset` keeps `set(INITIAL_STATE)`.
- Test: `__tests__/adjust_balance_sheet.state.test.ts`. Rewrite "handles negative balance": `initialize(-50)` gives `input '50'`, `isNegative true`. Add: `initialize(1500)` gives `isNegative false`; `initialize(0)` gives `input '0'`, `isNegative false`; `setNegative(true)` leaves `input` and `error` alone; `reset` returns `isNegative` to `false`; initial state has `isNegative false`.

### 2. `parseAdjustInput` composes sign and magnitude, reads a typed minus, and keeps the card floor
- File: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.helpers.ts` (`parseAdjustInput`)
- Change: signature becomes `parseAdjustInput(raw: string, sign: { isNegative: boolean; accountType: AccountType }): AdjustParseResult`. Export `splitLeadingMinus(raw: string): { magnitude: string; typedNegative: boolean }`: trims, strips exactly one leading `-` (U+002D), returns the rest; `'--5'` gives `magnitude '-5'`, `'-'` gives `''`. `parseAdjustInput` calls it, takes the magnitude through `parseNonNegativeDecimal` unchanged (so `''`, `'-'`, `'--5'`, `'abc'`, `'0.005'` stay `{ ok: false }`), and sets `negative = sign.isNegative || typedNegative` (an OR, never a toggle: `−` selected plus a typed minus is still negative). `negative && accountType === AccountType.CreditCard` is `{ ok: false }`. Otherwise `value` is `-magnitude` when `negative` and `magnitude !== 0`, else `magnitude` (never `-0`; `roundMoney` would persist it). Update the file's one-line doc: finite, card floor at zero, non-card may be negative, one leading minus read.
- Test: `__tests__/screens/accounts/adjust_balance_validation.test.ts`, written first. Every existing case gets `{ isNegative: false, accountType: AccountType.Bank }` and keeps its expectation, except A-02, which inverts as the ticket names it: "A-02: a leading minus reads negative on a non-card", `('-5', positive, Bank)` is `{ ok: true, value: -5 }`. New cases: `('-5', positive, CreditCard)` is `{ ok: false }`; `('-5', negative, Bank)` is `-5`; `('--5', positive, Bank)` and `('-', positive, Bank)` are `{ ok: false }`; `('-0', positive, Bank)` is `{ ok: true, value: 0 }` asserted with `Object.is(result.value, 0)`; `('5', negative, Bank)` is `{ ok: true, value: -5 }`; `('1,900', negative, SmartWallet)` is `-1900`; `('5', negative, CreditCard)` is `{ ok: false }`; `('0', negative, Bank)` is `{ ok: true, value: 0 }` with `Object.is`; `('0.005', negative, Bank)` is `{ ok: false }`; `('5', positive, CreditCard)` is `{ ok: true, value: 5 }`. `splitLeadingMinus`: `'-1900'` is `{ magnitude: '1900', typedNegative: true }`, `'1900'` is `{ magnitude: '1900', typedNegative: false }`, `' -5 '` is `{ magnitude: '5', typedNegative: true }`.
- Also: `__tests__/account.repository.test.ts:418` (B1-03) passes `{ isNegative: false, accountType: AccountType.Bank }`; the suite already imports `AccountType`.

### 3. The prefilled overdrawn value saves unedited, through SQLite
- File: `__tests__/account.repository.test.ts` (the `adjustedBalance` helper at `:394`, inside the `AccountRepository.adjustBalance` describe at `:340`)
- Change: none in `src/`. This step pins the acceptance that the write path is untouched for a negative target.
- Test: in the `AccountRepository.adjustBalance` describe, add "an overdrawn prefill saves unedited": `useAdjustBalanceSheetState.getState().initialize(-1900)`, read `{ input, isNegative }` from the state, `parseAdjustInput(input, { isNegative, accountType: AccountType.Bank })` is `{ ok: true, value: -1900 }`, `adjustedBalance(-1900)` resolves `-1900`; and one row-state case: after `repo.adjustBalance(id, -1900)` on an account whose `balance_review_required` was set to 1, the row reads `{ current_balance: -1900, balance_review_required: 0 }` and `updated_at` moved. Import the state from `@/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.state`; call `reset()` in `afterEach`.

### 4. Strings for the sign control
- File: `src/constants/strings.ts` (the `// Adjust Balance sheet` block, `:336-343`)
- Change: add `adjustBalanceSignA11y: 'Balance sign'`, `adjustBalanceSignPositive: '+'`, `adjustBalanceSignPositiveA11y: 'Positive balance'`, `adjustBalanceSignNegative: '−'` (U+2212, the same glyph as `MINUS_SIGN` in `format_amount.ts:15`; `strings.ts` has no imports, so it is a literal with a one-line comment naming the constant), `adjustBalanceSignNegativeA11y: 'Negative balance'`.
- Test: none; `Strings` is data and the two suites of steps 1 and 2 do not read it.

### 5. The sheet shows the sign control on non-card accounts and saves through it
- File: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.tsx` (`AdjustBalanceSheetProps`, `handleSave` at `:56`, the `Input` at `:119`)
- Change: add `accountType: AccountType` to the props. Read `isNegative` with `input` and `error` through the same `useShallow` selector; take `setNegative` from `getState()` like the other actions. `handleSave` calls `parseAdjustInput(input, { isNegative, accountType })`. The `Input`'s `onChangeText` runs `splitLeadingMinus(v)`; on a non-card with `typedNegative`, it calls `setNegative(true)` and `setInput(magnitude)`, so a pasted or hardware-typed `-1900` shows as `1900` with `−` selected, the state the save will read; otherwise `setInput(v)` unchanged. On a credit card the text stays as typed, so the minus stays visible and deletable and Save shows `errBalanceInvalid`; it never sets `isNegative` on an account that has no control to clear it. `setError('')` follows in both branches as today. When `accountType !== AccountType.CreditCard`, render between `FormSectionLabel` and `Input` a `SegmentedTabs<'positive' | 'negative'>` (`@/components/ui/tabs`) with segments `[{ value: 'positive', label: Strings.adjustBalanceSignPositive, accessibilityLabel: Strings.adjustBalanceSignPositiveA11y }, { value: 'negative', label: Strings.adjustBalanceSignNegative, accessibilityLabel: Strings.adjustBalanceSignNegativeA11y }]`, `value` derived from `isNegative`, `onValueChange` calling `setNegative(v === 'negative')` then `setError('')`, `variant="solid-gold"`, `density="compact"`, `listClassName="mb-2 w-full rounded-lg"`, `accessibilityLabel={Strings.adjustBalanceSignA11y}`, `isDisabled={isLoading}` (the shape at `type_tabs.tsx:28-37`). A credit card renders no control; its `isNegative` is `false` on every reachable balance because `transaction_policy.ts:291` floors cards at zero. Nothing else in the file moves: the `Input` keeps `keyboardType="decimal-pad"`, the header row keeps `formatAccountBalance(currentBalance, currency)`, the error rail is unchanged.
- Test: no render test (tests.md). The behaviour is covered by steps 1 to 3. Maintenance only: `__tests__/screens/accounts/adjust_balance_sheet_save_error.test.tsx` passes `accountType={AccountType.Bank}` in `renderSheet` and stubs `@/components/ui/tabs` the way `__tests__/screens/transactions/transaction_form/type_tabs.test.tsx:12` does, so the suite's four existing assertions keep passing unchanged; add nothing to it.

### 6. The detail screen passes the account type
- File: `src/modules/accounts/screens/accounts/detail/index.tsx` (`<AdjustBalanceSheet` at `:177`)
- Change: add `accountType={account.type}`.
- Test: none; a one-prop pass-through the typecheck enforces.

## Screens
- Account detail → Adjust balance, on a bank or wallet account with a negative balance (force it with an expense larger than the balance, or `mqa db "UPDATE accounts SET current_balance = -1900 WHERE name = '<name>'"` then relaunch): sheet open as prefilled, input `1900`, `−` selected, no error; after Save, the hero reading `−1,900 EGP`.
- Account detail → Adjust balance, on the same account with the user flipping `−` to `+` and saving: the hero reading `1,900 EGP`.
- Account detail → Adjust balance, on a credit card: no sign control, the rest as MA-027 shipped it.
- Not shot: any validation message. Step 2's suite asserts every rejection.

## Non-goals
- No clamp on the write path and no change to `applyAccountDelta`, `setAccountBalance`, `AccountRepository.adjustBalance`, or `account.store.ts`.
- No change to `parseNonNegativeDecimal`, `DECIMAL_PATTERN`, `add_account.schema.ts`, `budget.schema.ts`, or any other amount field; the minus stays refused there.
- No change to the hero, `formatAccountBalance`, the dashboard's overdrawn treatment, or the balance-review alert.
- No `prefix` slot on the `Input` wrapper; the sign lives in a separate control.
- No new message copy; `errBalanceInvalid` is the only rejection text.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gates that fail at base: `npx jest __tests__/screens/accounts/adjust_balance_validation.test.ts __tests__/adjust_balance_sheet.state.test.ts __tests__/account.repository.test.ts` (new cases and the changed signature fail to compile at base).

## Risks
- The sheet is `size="sm"` (45%, `sheet.tsx:30`); one more compact row above the input may clip the error rail on a short device with the keyboard up. If the render pass shows it, `size="md"` is the fix, not a layout hack.
- `SegmentedTabs` has run inside a `Sheet` only in `add_edit_category_sheet.tsx:216`; if the gold indicator misbehaves inside `size="sm"`, the same props as that sheet are the reference.
- Segment labels `+` and `−` are field-level copy under CLAUDE.md's "field labels stay team-decided"; if the reviewer reads them as new user copy under the ticket's copy rule, the swap is two `Strings` values.
- A credit card with a negative `current_balance` in the database (unreachable through `transaction_policy.ts`) would open with `isNegative true` and no control to flip it, and Save shows `errBalanceInvalid`. That is the ticket's own card rule applied to a state the app cannot produce; not handled.
- `Math.abs(-0)` is `0` and `String(0)` is `'0'`, so a `-0` balance prefills as positive zero; no path writes `-0` today (`roundMoney` on `0`).
- Only U+002D is read as a typed minus. A `−` (U+2212) pasted from the hero's `formatAccountBalance` output still fails `DECIMAL_PATTERN` and shows `errBalanceInvalid`; the ticket names "a leading minus" and the keypad produces neither.
- Amended 2026-09-08 after review: step 2 now reads one leading `-` and inverts A-02 as Acceptance 7 and the ticket's "tests to move" state (the first plan kept it rejected); step 5 mirrors the strip in `onChangeText`; a commit order was added because steps 2, 5 and 6 do not typecheck apart.

## Self-assessment
Step 5's layout is the least certain part: where the sign control sits (a full-width row between the label and the input) and whether the `sm` sheet keeps the error rail visible with the keyboard up are pixel questions the render pass, not this plan, settles. The parsing contract in step 2 I am sure of. The part I am least settled on is step 5's `onChangeText` strip on a non-card: it moves a character the user typed into a control they did not touch, and whether that reads as the sheet correcting them or as the sheet eating their keystroke is a feel question the render pass answers; the parser reads the minus either way, so the save is right whichever way the control behaves.
