# MA-030 — Adjust balance on an overdrawn account
base: 13f5c7fc7daa9a7c9d5f6fbf721f88cba3bb2c4b · verify: emulator · flags: none · expected diff: ~30 lines

Design in one line: the input holds the whole signed value, as it did at base, and `parseAdjustInput` reads one leading minus from the text and applies the card floor. The keypad carries the sign — `decimal-pad`'s top-right key is `-` — so no control does. `parseNonNegativeDecimal` and its 13 other call sites do not change; the minus is stripped by this sheet alone before the shared parser sees the magnitude.

Amendment note for the implementer: the branch at `d42c7323` implements a `+` / `−` segmented sign control. Every step below is stated as the change from that branch state to the end state, so most of the work is deletion. `git show origin/main:<path>` is the reference for the three files that return to base.

## Steps
Commit order: all five steps in one commit. No intermediate ordering both typechecks and passes: `parseAdjustInput`'s arity, the state's `isNegative` field and the sheet's read of it are one contract, and the repository test asserts across all three.

### 1. `parseAdjustInput` reads the sign from the text alone
- File: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.helpers.ts`
- Change: signature becomes `parseAdjustInput(raw: string, accountType: AccountType): AdjustParseResult`. Delete the `AdjustSign` interface, `AdjustInputChange` and `resolveAdjustInputChange`. Inside, `typedNegative` from `splitLeadingMinus` is the whole sign: `typedNegative && accountType === AccountType.CreditCard` is `{ ok: false }`; otherwise `value` is `-magnitude` when `typedNegative` and `magnitude !== 0`, else `magnitude`. Keep `splitLeadingMinus` exported and unchanged, both glyphs and all — the suite asserts the two-glyph rule directly and `parseAdjustInput`'s single `{ ok: false }` cannot distinguish "stripped one minus" from "pattern refused". Keep the `AdjustParseResult` doc line and the `-0` comment; both still describe the code.
- Test: `__tests__/screens/accounts/adjust_balance_validation.test.ts`. Delete the `resolveAdjustInputChange` describe and the four `BANK_*` / `CARD_*` constants; every `parseAdjustInput` call takes `AccountType.Bank` or `AccountType.CreditCard` as its second argument. Delete the four cases that only existed for the selected sign: "reads a typed minus alongside a selected minus", "applies the selected minus to a bare magnitude", "refuses a selected minus on a credit card", "gives positive zero for a zero magnitude with the minus selected". Rewrite two to their typed form: "applies the selected minus to a comma-grouped wallet amount" becomes `('-1,900', SmartWallet)` is `-1900`; "rejects a sub-cent amount whatever the sign" becomes `('-0.005', Bank)` is `{ ok: false }`. Everything else keeps its name and its expectation, A-02's inversion included: `('-5', Bank)` is `{ ok: true, value: -5 }`, `('-5', CreditCard)` is `{ ok: false }`. The `splitLeadingMinus` describe stays byte-identical.
- Also: `__tests__/account.repository.test.ts:423` (B1-03) becomes `parseAdjustInput('1,234.56', AccountType.Bank)`.

### 2. The sheet holds the signed value and passes only the account type
- File: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.tsx`
- Change: delete `SIGN_SEGMENTS`, the `SignSegment` type, the `SegmentedTabs` element, the `isCard` binding, the `setNegative` binding, `isNegative` from the `useShallow` selector, and the `@/components/ui/tabs` and `MINUS_SIGN` / `PLUS_SIGN` imports. `onChangeText` returns to `setInput(v); setError('')`. `handleSave` calls `parseAdjustInput(input, accountType)`. The `accountType` prop stays — it is the card floor's only input. Against `origin/main` the file then differs by four lines: `AccountType` on the enums import, the prop, the destructure, the call. Nothing else moves: `keyboardType="decimal-pad"` is unchanged from base, the header row keeps `formatAccountBalance(currentBalance, currency)`, the error rail is untouched.
- Test: no render test (tests.md). Maintenance only: `__tests__/screens/accounts/adjust_balance_sheet_save_error.test.tsx` drops its `jest.mock('@/components/ui/tabs', …)` block, now mocking a module the sheet no longer imports; `accountType={AccountType.Bank}` in `renderSheet` stays, and the suite's four assertions keep passing unchanged.

### 3. The sheet state returns to holding the signed value
- File: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.state.ts`
- Change: revert to `origin/main` byte-for-byte. Delete `isNegative` from `AdjustBalanceSheetStateShape` and `INITIAL_STATE`, delete `setNegative`, delete the `input` doc comment, and `initialize` returns to `set({ input: String(currentBalance), error: '' })`, so an overdrawn account prefills `-1900` and step 1's parser reads it.
- Test: `__tests__/adjust_balance_sheet.state.test.ts` reverts to `origin/main` too: delete "starts positive", "setNegative flips the sign", the `isNegative` assertions in "sets input from current balance", "handles zero balance" and "returns to defaults", and "handles negative balance" goes back to `initialize(-50)` giving `input '-50'`.

### 4. The sign-control strings go
- File: `src/constants/strings.ts` (`:342-345`)
- Change: delete `adjustBalanceSignA11y`, `adjustBalanceSignPositiveA11y`, `adjustBalanceSignNegativeA11y` and the comment line above them; the file returns to `origin/main`.
- Test: none; `Strings` is data and no suite reads these keys.

### 5. The overdrawn prefill still saves unedited, through SQLite
- File: `__tests__/account.repository.test.ts` ("MA-030: an overdrawn prefill saves unedited", `:433`)
- Change: none in `src/`. This step pins the acceptance that the write path is untouched for a negative target.
- Test: the case reads `input` alone from the state — `useAdjustBalanceSheetState.getState().initialize(-1900)`, then `parseAdjustInput(input, AccountType.Bank)` is `{ ok: true, value: -1900 }` and `adjustedBalance(-1900)` resolves `-1900`. Drop the `isNegative` destructure. The `afterEach` reset stays, and "MA-030: a negative target clears the review flag and moves updated_at like any other" stays as it is.

## Screens
- Account detail → Adjust balance, on a bank or wallet account with a negative balance (record an expense larger than the balance; `applyAccountDelta` applies the delta unclamped and `transaction_policy.ts:288` skips a non-card, which is why the state is reachable): sheet open as prefilled, input `-1900`, no error, keyboard up with the pad's top-right `-` key in frame. Not `mqa db`. It pulls the database to a host scratch directory, runs the statement on that copy, and `rm -rf`s the copy at the start of the next call, so an UPDATE reports `{"changes":1}` and leaves the device untouched (`mqa.sh:437-461`).
- The same sheet after Save with the prefill untouched: the hero reading `−1,900 EGP`.
- Account detail → Adjust balance, on a positive bank account, with `-250` typed on the pad and saved: the hero reading `−250 EGP`. This is the shot the keypad measurement rests on; if the pad on the test device has no minus key, stop and report it rather than working around it.
- Not shot: any validation message, and the credit-card refusal. Step 1's suite asserts every rejection and the save-error suite asserts the message binding.

## Non-goals
- No clamp on the write path and no change to `applyAccountDelta`, `setAccountBalance`, `AccountRepository.adjustBalance`, or `account.store.ts`.
- No change to `parseNonNegativeDecimal`, `DECIMAL_PATTERN`, `add_account.schema.ts`, `budget.schema.ts`, or any other amount field; the minus stays refused there.
- No change to the hero, `formatAccountBalance`, the dashboard's overdrawn treatment, or the balance-review alert.
- No sign control and no `prefix` slot on the `Input` wrapper; the keyboard carries the sign.
- No `keyboardType` change; `decimal-pad` is what the sheet already had.
- No new message copy; `errBalanceInvalid` is the only rejection text.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gates that fail at base: `npx jest __tests__/screens/accounts/adjust_balance_validation.test.ts __tests__/adjust_balance_sheet.state.test.ts __tests__/account.repository.test.ts` (new cases and the changed signature fail to compile at base).

## Risks
- The minus key is Gboard's layout choice, not an Android guarantee. The ticket accepts that residual risk and puts its confirmation in device QA on the user's own handset; the render pass shoots the pad so the evidence is on the PR.
- A credit card with a negative `current_balance` in the database (unreachable through `transaction_policy.ts:291`) opens prefilled with `-1900`, and Save shows `errBalanceInvalid` until the user deletes the minus — which the pad can retype, so the card is no worse off than at base. The ticket's card rule applied to a state the app cannot produce; not handled.
- `String(-0)` is `'0'`, so a `-0` balance prefills as positive zero; no path writes `-0` today (`roundMoney` on `0`).
- `splitLeadingMinus` stays exported with one production caller. Not for the two-glyph rule, which `parseAdjustInput` asserts three times and step 1 keeps: `adjust_balance_validation.test.ts:93` reads `−5` as `-5` on a bank, `:97` refuses it on a card, `:101-102` refuse `−−5` and `−-5`. The export is there for the residual magnitude, the one output the parser cannot show. `splitLeadingMinus('−−5')` strips exactly one minus and hands `'−5'` on, and `parseAdjustInput` returns `{ ok: false }` either way, whether the second minus survived the strip or the pattern refused the whole string.
- Amended 2026-09-08 after a measurement on emulator-5556 falsified the plan's premise: `decimal-pad` does carry a minus key (top-right, first screen, Gboard 12.4.05), so the user's ruling removed the sign control and the sign returns to the input text. Steps 1 to 5 are rewritten as the deletions that take the branch there; the header's expected diff drops from ~85 to ~30. `splitLeadingMinus`'s two-glyph reading and the `-0` guard, both from the earlier review round, survive.
- Amended 2026-09-08 after review: step 2 now reads one leading `-` and inverts A-02 as Acceptance 7 and the ticket's "tests to move" state (the first plan kept it rejected); step 5 mirrors the strip in `onChangeText`; a commit order was added because steps 2, 5 and 6 do not typecheck apart. (Superseded by the amendment above; kept as the record of what the branch currently contains.)

## Self-assessment
The end state is the smaller design, and I am sure of the parsing contract in step 1 and of what has to be deleted to reach it: the reference for three of the five files is `origin/main`, so "did I get it right" is a diff, not a judgement. The part that carries real risk is not in the plan at all — it is the keypad. Every Acceptance line now leans on the pad's minus key: line 4 has no other way to enter a sign, and if the user's handset ships a keyboard without one, the ticket regresses to the state it was opened to fix, with no in-app control to fall back on. The plan puts that on the render pass and then on device QA rather than hedging it in code, which is the ruling; I would rather say plainly that it is the one thing this design cannot verify by test.
