# MA-168 — Converted amount under the amount, in the rate's direction on all four currency pairs (M40)
base: 880cbe154cb344ad0fb7a77c10c2e070fb2935f1 · verify: emulator · flags: money path, user copy · expected diff: ~205 lines

## Steps

### 1. The two converted amount strings exist
- File: `src/constants/strings.ts` (beside `addTxEgpPreview`, `:1354`), ~3 lines
- Change: add `addTxConvertedAmount: (amountWithCode: string) => string`, one required argument, never `null`, returning `≈ ` and the argument, and `addTxConvertedAmountNone: string`, `≈ —`. `addTxEgpPreview` keeps its text, since `exchange_rate_row.tsx:138` reads it for the pay sheet.
- Test: `first` · `__tests__/screens/transactions/transaction_form/transaction_form_copy.test.ts`: `Strings.addTxConvertedAmount('735 EGP')` is `≈ 735 EGP` and `('102.04 USD')` is `≈ 102.04 USD`; `Strings.addTxConvertedAmountNone` is `≈ —`; `Strings.addTxEgpPreview` is `≈ {amount} EGP`.

### 2. One resolver gives the leg in the rate's direction and one formatter prints it
- File: `src/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers.ts` (beside `resolveDestinationFloorError`, `:189-225`), ~50 lines
- Change:
  - Export `interface ConvertedAmount { amount: number; currency: Currency }`, both fields required, neither `null`.
  - Export `resolveConvertedAmount(input: { type: TransactionType; amountText: string; sourceCurrency: Currency | undefined; destinationCurrency: Currency | undefined; exchangeRateText: string }): ConvertedAmount | undefined`. One argument; its five fields are required and never `null`; the two currencies may be `undefined`. It returns `undefined`, never `null`.
  - It parses with `parsePositiveDecimal` and `parseRateText`, applies the gates `transaction_rate_preview.hook.ts:30-43` applies today, and calls `resolveTransactionAmounts` once with the arguments the save passes (`add_transaction.hook.ts:470-476`). A USD source returns `{ amount: egpAmount, currency: EGP }`. An EGP source with a USD destination returns `{ amount: toAmount, currency: USD }`. No USD side returns `undefined`, as does every input a gate refuses and every `TransactionAmountError`; any other error is rethrown (`transaction_rate_preview.hook.ts:53-57`). No arithmetic on the result.
  - Export `formatConvertedAmount(converted: ConvertedAmount | undefined): string`, one required argument that may be `undefined`: `Strings.addTxConvertedAmount(formatDisplayAmount(converted.amount, converted.currency))`, and `Strings.addTxConvertedAmountNone` for `undefined`.
- Test: `first` · `__tests__/screens/transactions/transaction_form/transaction_form.helpers.test.ts`, at rate text `49`:
  - USD 15 expense and USD 15 income: `{ amount: 735, currency: EGP }`, printed `≈ 735 EGP`.
  - EGP 5,000 transfer and EGP 5,000 card payment to USD: `{ amount: 102.04, currency: USD }`, printed `≈ 102.04 USD`.
  - USD 100 transfer to EGP: `{ amount: 4900, currency: EGP }`, printed `≈ 4,900 EGP`.
  - USD 100 transfer to USD: `{ amount: 4900, currency: EGP }`, beside `resolveTransactionAmounts` returning `toAmount` 100 and `egpAmount` 4900 for the pair.
  - EGP expense and EGP to EGP transfer: `undefined`.
  - USD 0.01 expense prints `≈ 0.49 EGP`.
  - EGP 1.005 to USD at rate 40 is 0.02, where one division gives 0.03 (the case at `__tests__/screens/commitments_pay_sheet.hook.test.ts:1250-1252`).
  - `undefined`, printed `≈ —`, for each of: amount `''`, `1,23`, `0.004`; rate `''`, `49.`, `0`, `abc` with a USD side; no source currency; a USD transfer with no destination; 0.2 EGP to USD at 50; an amount of 20 digits.
- Test: `first` · `__tests__/screens/transactions/transaction_form/edit_transaction.hook.test.ts`: `useEditTransaction` on a 10 USD expense saved at rate 49, on the archived USD account the suite keeps in `accountLookupById` (`:49-55`, `:94`), stored rate 50. `resolveConvertedAmount` fed `state.type`, the edit store's `amountStr`, `state.selectedAccount?.currency`, `state.selectedToAccount?.currency` and `state.exchangeRate` returns `{ amount: 490, currency: EGP }`, and `{ amount: 500, currency: EGP }` after `setExchangeRate('50')`. A second case, fed the same five values: a 4,900 EGP transfer saved at rate 49 from `a1` (`:37-41`) whose `to_account_id` is that archived USD account returns `{ amount: 100, currency: USD }`.

### 3. The preview hook returns that leg and the form's card prints no converted amount
- File: `src/modules/transactions/screens/transactions/transaction_form/components/transaction_rate_preview.hook.ts` (`useTransactionRatePreview`, `:25`), ~12 lines; `src/modules/transactions/screens/transactions/transaction_form/components/transaction_exchange_rate_row.tsx` (`TransactionExchangeRateRow`, `:16`), ~8 lines; `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx` (`:368-379`), deletions only
- Change:
  - `useTransactionRatePreview(input: RatePreviewInput): ConvertedAmount | undefined`, where it returned `number | undefined`. `RatePreviewInput` keeps its five required fields (`:15-22`). Its memo is one call to `resolveConvertedAmount` with the amount from `useTransactionAmount(mode)`.
  - Its one consumer in `src`, `transaction_exchange_rate_row.tsx:23`, stops calling it. The wrapper's props become `Omit<ComponentProps<typeof ExchangeRateRow>, 'previewEgpAmount' | 'previewHidden'>`: `value`, `onChange`, `overrideEnabled`, `onToggleOverride` required; `rateUpdatedAt` required, `string | null`; `purposeCaption` and `error` optional. It passes `previewHidden` and `previewEgpAmount={undefined}`.
  - The body drops `mode`, `type`, `sourceCurrency` and `destinationCurrency` from the wrapper's call. `ExchangeRateRow`'s props and its preview block (`exchange_rate_row.tsx:133-145`) do not change; its other consumer is `pay_sheet.tsx:203`.
- Test: `first` · `__tests__/screens/transactions/transaction_form/transaction_rate_preview.hook.test.ts`, at the suite's rate `49.06`: the case at `:37-46` reads `{ amount: 101.92, currency: USD }`; the two at `:48-55` and the edit-store case at `:115-129` read `{ amount: 4906, currency: EGP }`; the case at `:57-61` reads `undefined`; the cases at `:64-113` stay `undefined`; a rerender with rate `50` reads `{ amount: 5000, currency: EGP }` for the USD 100 expense; on that expense at `49.06`, after `renderHook`, `act(() => useAddTransactionStore.getState().setAmountStr('200'))` reads `{ amount: 9812, currency: EGP }`.
- Test: `first` · `__tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx`: the suite's `ExchangeRateRow` mock (`:50-53`) records its props as the `AmountHero` mock does (`:28-41`); with `requiresRate` the body hands it `previewHidden: true` and `previewEgpAmount: undefined`.

### 4. The line under the amount shows the converted amount in the amount's message slot
- File: `src/modules/transactions/screens/transactions/transaction_form/components/converted_amount_line.tsx` (new, `ConvertedAmountLine`), ~45 lines; `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx` (`ValidationSlot`, `:103-119`, mounted at `:239`), ~22 lines
- Change:
  - `ConvertedAmountLine(props: { mode: TransactionFormMode; type: TransactionType; sourceCurrency: Currency | undefined; destinationCurrency: Currency | undefined; exchangeRate: string })`, five required props, none `null`. It reads `useTransactionRatePreview(props)` itself, so a keystroke re-renders the line alone, as `AmountHero` does (`amount_hero.tsx:53`), and prints `formatConvertedAmount` of the result in one `Text` with `testID="converted-amount-line"`.
  - The text is `font-inter text-muted` (frame D5 `.rate .p`; `exchange_rate_row.tsx:135`), centred, at the slot's own size `Type.micro` (`transaction_form_body.tsx:115`), so the error and the line share a line box. It takes `resolveOneLineTextProps(scaledTextStyleAboveOne(Type.micro, fontScale))`, the shape of the supporting line at `transaction_form_body.tsx:177` and `:196-204`.
  - In the body, `amount-error-slot` stays the always-mounted View with `minHeight: TRANSACTION_FORM_ERROR_SLOT_HEIGHT` and loses `accessibilityLiveRegion`. Inside it a View with `testID="amount-error-live"` and `accessibilityLiveRegion="polite"` stays mounted and holds `FormErrorText` alone. `ConvertedAmountLine` is that View's sibling, mounted only while `requiresRate` holds and `amountError` is `undefined`, fed `formMode`, `type`, `selectedAccount?.currency`, `selectedToAccount?.currency` and `exchangeRate`.
  - The `testID` on the live region View is load-bearing: Fabric flattens a View whose only prop is the live region (`node_modules/react-native/ReactCommon/react/renderer/components/view/ViewShadowNode.cpp:50-75`).
- Test: `after` · `__tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx`, with `requiresRate`, a USD `selectedAccount`, `exchangeRate` `49` and the add store's amount `15`:
  - `converted-amount-line` reads `≈ 735 EGP` inside `amount-error-slot` and outside `amount-error-live`; `amount-error-live` carries `accessibilityLiveRegion` `polite` and `amount-error-slot` carries none.
  - With `amountError` beside them the message sits inside `amount-error-live`, `converted-amount-line` is absent and the slot keeps `minHeight: TRANSACTION_FORM_ERROR_SLOT_HEIGHT`.
  - With `requiresRate` false no `converted-amount-line` mounts.
  - The line has `numberOfLines` 1 and the style `scaledTextStyle(Type.micro, fontScale)` at the suite's font scale, which is above 1 (`:427-428`).
  - On its own fixture, `formMode` `edit`, `type` Transfer, `requiresRate`, an EGP `selectedAccount`, a USD `selectedToAccount`, `exchangeRate` `49` and the edit store's amount `5000`: `converted-amount-line` reads `≈ 102.04 USD`.

### 5. The rate row speaks no stale label with the override on
- File: `src/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row.tsx` (`:75`), ~2 lines
- Change: the row's `PressableFeedback` takes `accessibilityLabel` `''` while `overrideEnabled`, where it took `undefined`, as `search_tally.tsx:97-99` does. `accessibilityRole` at `:74` does not change.
- Test: `first` · `__tests__/screens/transactions/transaction_form/transaction_form_body.test.tsx`: the real `ExchangeRateRow` through `jest.requireActual`, since the suite mocks the module: `exchange-rate-row` has `accessibilityLabel` `''` with `overrideEnabled` and `Strings.addTxRateEditAccessibility` without.

### 6. The feature map carries the three new states and the changed proofs
- File: `.claude/skills/emulator-verify/features/transaction_form.md` (States `:14-68`, seeding `:104`), ~9 lines; `.claude/skills/emulator-verify/features/commitment_detail.md` (`:19`), ~1 line
- Change:
  - `add, USD account` (`:21`): the force gains, before any fill and with no field focused, the content description read, `$MQA tap 'id="exchange-rate-row"'` and the read again, and only then `$MQA fill 'id="amount-hero-value"' 15`: that tap sent after the amount took focus landed with the keyboard up and opened no input (`:48`). The proof gains: `converted-amount-line` reads `≈ —` before the fill and `≈ <15 × the rate the card shows, 0 dp> EGP` after; `mqa read 'id="transaction-form-fact-group"'` holds no `≈`; `amount-error-slot` reads the same bounds ± 1 px on the bank chip and on the USD chip, the line's box inside it; `exchange-rate-row`'s content description reads `Use a custom exchange rate` before the tap on the row and no longer holds it after. That read is `mqa ui` under `MQA_UI=uiautomator`, since agent-device reads a node with a text and a label as its text (`.claude/skills/emulator-verify/SKILL.md` § The tool, Selectors).
  - `amount, centred number` (`:57`): on the USD account `converted-amount-line`'s centre x reads the sheet's centre x ± 1 under each amount.
  - `add, note focused` (`:24`) and `edit, reach and lift` (`:49`): the travel figures the shorter card moves (`about 150 dp of travel`, `The list travels 189.7 dp`) are rewritten to what the walk reads. `edit, reach and lift` gains: `converted-amount-line` reads `≈ <egp_amount, 0 dp> EGP`, `egp_amount` from `mqa db` on the seeded USD expense.
  - New `add transfer, USD destination`, frame `D3 for the sheet, no frame for the line, MA-168`. Force: one EGP bank account and one USD non-card account; the `Transfer` trigger by position (Gotchas `:88`); the EGP chip; the USD chip, before any To pick; the EGP chip again; `to-account-row` and the USD account's `account-picker-row-<id>`; one 95 dp drag from `to-account-row`'s centre, since at rest the footer cuts `exchange-rate-row` (25.90 dp showing, y 598.9 against the footer's top at 624.8 on the probe's run); the rate overridden to `49` through `exchange-rate-row` and `exchange-rate-input`; and last `fill` the amount `5000`, after the drag, since a list drag with a field focused leaves the sheet stuck under agent-device (Gotchas `:89`). Proof: no `converted-amount-line` on the EGP chip before the pick; `≈ —` on the USD chip with no To picked; `≈ —` after the pick with no amount; `≈ 102.04 USD` at 49 and 5000, the text ending at the code; one shot. The USD chip is never tapped after the To pick: it keeps the To account, From and To the same, and the line then reads an EGP value (`≈ 245,000 EGP` on the probe's run).
  - New `validation, USD account`, frame `D6 for the slot, no frame for the line, MA-168`. Force: `add, USD account` with the amount empty, `mqa bounds` on `amount-error-slot`, `category-row`, `date-row` and Save, `$MQA tap 'label="Save"'`, then `fill` the amount `15`. Proof: `≈ —` before Save; after Save `Enter an amount` inside `amount-error-slot` and `converted-amount-line` at `no match`; after the fill the message gone and the line back; the four bounds unchanged ± 1 px at all three reads; one shot after Save and one after the fill.
  - New `converted amount, large font`, frame `no frame, MA-168`. Force: `add, USD account` with the amount `15`, then a 13-digit amount, then the amount cleared and Save; the `Font scale` force (README) at 1.0 and 2.0. Proof at 2.0: the line one line, whole or ending in a whole `…`, its box inside `amount-error-slot`'s, no glyph cut at the top or bottom, crossing neither `amount-hero-value`'s box nor `transaction-form-fact-group`'s; the slot reads the same height ± 1 dp with the line and with `Enter an amount`; at 1.0 it reads as `add, USD account`; one crop of the amount block at 2.0.
  - The seeding line (`:104`) names the two accounts `add transfer, USD destination` needs.
  - `commitment_detail.md`, `pay sheet, amount and rate half-typed` (`:19`): the proof gains the same content description read before and after `$MQA tap 'id="exchange-rate-row"'`, and the pay sheet's preview still reading `≈ — EGP`.
- Test: `none` · the two files are the recipes the emulator pass runs; no Jest layer reads them.

### 7. The decision record
- File: `docs/adr/2026-10-11-converted-amount.md` (new, dated the day it is written), ~45 lines; `docs/adr/2026-08-25-pay-sheet-conversion-preview.md` (§3 `:56-57`, §4 `:71-72`), ~4 lines
- Change:
  - The new record states: the add and edit forms set `previewHidden` on the card; the converted amount is `egpAmount` in EGP for a USD source and `toAmount` in USD for an EGP source with a USD destination, from `resolveTransactionAmounts` through `resolveConvertedAmount`; it prints through `formatDisplayAmount` at the currency's decimals while `RATE_PREVIEW_AMOUNT_DECIMALS` keeps the pay sheet's preview at 2 dp; `ConvertedAmountLine` is the amount's subscriber on the form; the line sits outside the slot's live region, whose View keeps a `testID`.
  - In the 2026-08-25 record, a `**Superseded in part <date> (#695).**` paragraph closes §3 and another closes §4, each naming the statement that no longer holds and the new record's section, in the form of `docs/adr/2026-09-07-list-caption-reads-card-rows.md:18`.
- Test: `none` · a decision record.

## Screens
- `emulator-verify/features/transaction_form.md`: add, USD account
- `emulator-verify/features/transaction_form.md`: add transfer, USD destination. New, frame D3 for the sheet and `no frame` for the line; step 6 adds it.
- `emulator-verify/features/transaction_form.md`: amount, centred number
- `emulator-verify/features/transaction_form.md`: validation, USD account. New, frame D6 for the slot and `no frame` for the line; step 6 adds it.
- `emulator-verify/features/transaction_form.md`: converted amount, large font. New, `no frame`; step 6 adds it.
- `emulator-verify/features/transaction_form.md`: add, note focused
- `emulator-verify/features/transaction_form.md`: edit, reach and lift
- `emulator-verify/features/commitment_detail.md`: pay sheet, amount and rate half-typed

## Decision record
- `docs/adr/2026-10-11-converted-amount.md`: the form's converted amount is the resolver's leg in the rate's direction, printed under the amount at the currency's decimals, and the form's card hides its own preview; step 7 adds the file.

## Non-goals
- The rate editor sheet and a bad rate caught at Done, MA-169 (#696).
- The Rate row in place of the card, the converted amount inside the editor, and the removal of `transaction_exchange_rate_row.tsx`, MA-170 (#697).
- The strip, the tabs, validation of other fields and the footer track, MA-095 (#551).
- Anything under `src/modules/transactions/domain/`: `resolveTransactionAmounts` is called, not changed.
- `pay_sheet.tsx`, `pay_sheet.hook.ts`, `RATE_PREVIEW_AMOUNT_DECIMALS`, `addTxEgpPreview` and the preview block at `exchange_rate_row.tsx:133-145`.
- A lint guard on `accessibilityLabel`, and the three coupled sites the ticket's Context names.
- The slot's floor `TRANSACTION_FORM_ERROR_SLOT_HEIGHT` and the amount error's own text scaling: no floor that grows with the font scale.
- An account name after the code, frame D3's `arrives in Payoneer`.
- The unread strings at `strings.ts:887-890`, the stored rate, `currency.store.ts` and the currency settings screen.

## Untested inputs
- What TalkBack says: step 4's case asserts where the line and the error sit against the live region View, and no `mqa` verb reads speech.
- Android's content description after the override: step 5's case asserts the prop; the device read is step 6's proof on `add, USD account` and on `pay sheet, amount and rate half-typed`.
- A USD expense whose EGP value rounds to 0.00, a rate under 0.5: step 2 hands the resolver's zero to `formatDisplayAmount`, which prints `≈ 0 EGP`, where the card prints `≈ 0.00 EGP` today (`exchange_rate_row.tsx:138-143`).
- A rate the add hook rewrites on an account pick or a To pick (`add_transaction.hook.ts:543`, `:571`): it reaches the line as the body's `exchangeRate` prop; step 3's rerender case covers a changed rate, not the pick.
- The line at a font scale of 2.0: step 6's `converted amount, large font`.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- No step edits `__tests__/screens/commitments/pay_sheet_rate_error.test.tsx` or `__tests__/screens/commitments/pay_sheet_converted_total.test.tsx`; both run in `npm test -- --ci`.

## Risks
- MA-109 (#574) and MA-140 (#632) write rows in `transaction_form.md`, and MA-140 also in `commitment_detail.md`: either merging first is a rebase of step 6.
- MA-169 (#696) and MA-170 (#697) build on `ConvertedAmountLine`, on `useTransactionRatePreview`'s return and on the wrapper staying in place; an interface that lands differently amends their plans.
- Step 5's case rests on `jest.requireActual` beside the suite's module mock. If the real row cannot mount there the case has no other home, since `.claude/rules/tests.md` allows no new `.tsx` file.
- `transaction_form.md` · `validation, USD account`: the live region View is empty and has no height until an error mounts; that the error is still announced from it waits for device QA.
- `transaction_form.md` · `converted amount, large font`: above font scale 1 the OS scales the error's line box and the app scales the line's, and rounding can leave them 1 dp apart.
- `transaction_form.md` · `edit, reach and lift`: the card is one `Type.caption` line and its `mt-2` shorter (`exchange_rate_row.tsx:133-145`), so the row's recorded travel no longer reads; its swipe caps hold.
- `transaction_form.md` · `add, note focused`: the same shorter card on the USD add sheet.
- `transaction_form.md` · `add transfer, USD destination`: at rest the footer can cut `exchange-rate-row`, so the override tap may need the list at its end first, as `validation, USD rate half-typed` drags it (`:46`).
- `not probed: transaction_form.md · validation, USD account`
- `not probed: transaction_form.md · converted amount, large font`
- `not probed: transaction_form.md · add, note focused`
- `not probed: transaction_form.md · edit, reach and lift`

## Self-assessment
Step 4 is the one I am least sure about. Two things in it are my reading of sources that do not draw the line under the amount. The live region moves from `amount-error-slot` to an inner View so the converted amount is outside it; that inner View is empty until an error mounts, and nothing on the emulator can show that TalkBack still announces the error from it. The line's size is `Type.micro`, the slot's own text size, chosen over the 12 px the frames give the card's preview so the error and the line share a line box and a swap moves nothing at any font scale; the frames give only its colour and family. Step 6's three new recipes are written from the code and the existing rows, and the probe has not run them.
