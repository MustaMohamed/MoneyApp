# ADR: the form's converted amount is the resolver's leg in the rate's direction, under the amount

- **Date:** 2026-10-13
- **Status:** accepted
- **Ticket:** MA-168 (#695), under MA-096 (#552), epic #543
- **Applies to:** `src/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers.ts`, `components/converted_amount_line.tsx`, `components/transaction_rate_preview.hook.ts`, `components/transaction_exchange_rate_row.tsx`, `components/transaction_form.geometry.ts` and `transaction_form_body.tsx` in the same folder; `src/modules/transactions/components/exchange_rate_row.tsx`
- **Supersedes in part:** `docs/adr/2026-08-25-pay-sheet-conversion-preview.md` §3 and §4

The add and edit sheet printed `≈ {amount} EGP` inside the rate card, from `egpAmount` alone. For EGP 5,000 paid into a USD account at 49 it printed `≈ 5,000.00 EGP`, the source amount under another label, which is the half of audit M40 that was still open. The user ruled on 2026-10-08 that the converted amount sits under the amount, in the amount's message slot, as the amount and its code alone on every currency pair.

## 1. The form's card hides its own preview

`TransactionExchangeRateRow` passes `previewHidden` and `previewEgpAmount={undefined}` to `ExchangeRateRow` on every add and edit sheet. Its props are `Omit<ComponentProps<typeof ExchangeRateRow>, 'previewEgpAmount' | 'previewHidden'>`, so no caller on the form can turn the card's preview back on. `ExchangeRateRow`, its props and its preview block do not change, and the commitments pay sheet still draws `≈ {amount} EGP` from them.

**Amended 2026-10-14, MA-169 (#696).** `TransactionExchangeRateRow` now names its own props, `ownerId`, `value`, `overrideEnabled`, `onToggleOverride` and `rateUpdatedAt`, in place of the `Omit` above, and still takes neither preview prop: it passes `previewHidden` and `previewEgpAmount={undefined}` as before. The card opens the rate editor through `openRateEditor` and holds no editor state. The editor mounts apart from the card, in `TransactionRateEditor` from `components/rate_editor_sheet.tsx`, which `TransactionFormBody` renders outside its `requiresRate` gate.

**Amended 2026-10-14, MA-170 (#697).** `TransactionExchangeRateRow` is removed and the form draws no card: the Rate row opens the editor, whose converted amount is `ConvertedAmountLine` at the draft. See `docs/adr/2026-10-14-rate-row.md` §1, §5 and §7.

## 2. The converted amount is one leg of `resolveTransactionAmounts`

`resolveConvertedAmount(input: { type: TransactionType; amountText: string; sourceCurrency: Currency | undefined; destinationCurrency: Currency | undefined; exchangeRateText: string }): ConvertedAmount | undefined` parses the two texts with `parsePositiveDecimal` and `parseRateText` and calls `resolveTransactionAmounts` once, with the arguments the save passes. It returns a leg of that result and does no arithmetic on it.

| Source | Destination | Returns | At rate 49 |
|---|---|---|---|
| USD | none, EGP or USD | `{ amount: egpAmount, currency: EGP }` | USD 15 gives 735 EGP, USD 100 gives 4,900 EGP |
| EGP | USD | `{ amount: toAmount, currency: USD }` | EGP 5,000 gives 102.04 USD |
| EGP | none or EGP | `undefined` | no line |

A USD to USD transfer shows the EGP value the ledger stores, 4,900 for USD 100, while `toAmount` is 100. It returns `undefined` for a missing source currency, a transfer or card payment with no destination, an amount or a rate the parsers refuse, and every `TransactionAmountError`, the zero destination leg and the unstorable amount included. Any other error is rethrown.

## 3. It prints at the currency's decimals

`formatConvertedAmount(converted: ConvertedAmount | undefined): string` is `Strings.addTxConvertedAmount(formatDisplayAmount(converted.amount, converted.currency))`, and `Strings.addTxConvertedAmountNone`, `≈ —`, for `undefined`. `formatDisplayAmount` prints EGP at 0 dp and USD at 2 dp and never prints an amount above zero as zero, so USD 0.01 at 49 reads `≈ 0.49 EGP`. `RATE_PREVIEW_AMOUNT_DECIMALS` stays in `exchange_rate_row.tsx` and keeps the pay sheet's preview at 2 dp, as `docs/adr/2026-08-25-pay-sheet-conversion-preview.md` §6 records.

## 4. `ConvertedAmountLine` is the amount's subscriber on the form

`useTransactionRatePreview(input): ConvertedAmount | undefined` is one memoised call to `resolveConvertedAmount` with the amount from `useTransactionAmount(mode)`. `ConvertedAmountLine` is its one caller in `src`. The typed amount lives in the add and edit stores and the form hooks do not re-render on a keystroke, so the line subscribes in a child of its own, as `AmountHero` does, and a keystroke re-renders the line alone. The rate card's wrapper no longer reads the amount.

## 5. The line sits outside the slot's live region

`amount-error-slot` is always mounted at `minHeight: TRANSACTION_FORM_ERROR_SLOT_HEIGHT` and no longer carries `accessibilityLiveRegion`. Inside it the View `amount-error-live` is the polite live region and holds `FormErrorText` alone. `ConvertedAmountLine` is that View's sibling, mounted while a rate is required and the amount has no error, so an amount error is announced and the converted amount is not, on any keystroke. The line and the error read one style, `AMOUNT_MESSAGE_TEXT_STYLE` in `components/transaction_form.geometry.ts`, `Type.micro` over `lineHeightFor(Type.micro)`, each on one line, and the OS scales both. So the two have the same line box at every font scale and a swap moves nothing: on `Pixel_2_API_34` the slot reads 16.76 dp at 1.0 and 27.05 dp at 2.0 with the line and with `Enter an amount`. A line the app scales (`scaledTextStyle(Type.micro, fontScale)` with `allowFontScaling` off) read 30.10 dp at 2.0 against the error's 27.05 and moved the form 3.1 dp on the swap, so the line does not take that shape while the error is OS-scaled.

`amount-error-live` carries `collapsable={false}`, the prop that keeps it a native view; `src/components/ui/sheet.tsx` states the same constraint with the same prop. Its `testID` is for the tests and the walks. Fabric flattens a View whose only prop is the live region (`node_modules/react-native/ReactCommon/react/renderer/components/view/ViewShadowNode.cpp:50-75`), and a flattened View has no native view to carry the live region.

## 6. The rate row speaks no label once its value is a field

`ExchangeRateRow` passes `accessibilityLabel` `''` on its row while the override is on, where it passed `undefined`. React Native Android writes a content description only for a non-null label, so `undefined` left `Use a custom exchange rate` on the pressable around the input. The same line serves the pay sheet, by the 2026-10-08 Decisions on #695.

**Amended 2026-10-14, MA-169 (#696).** A row given `onOpenEditor` never draws the field: the press opens the rate editor in every state, so the row is a button that speaks `Strings.addTxRateEditAccessibility` with the override on as with it off. The pay sheet's row takes no `onOpenEditor` and keeps `''` while its override is on.

**Amended 2026-10-14, MA-170 (#697).** `onOpenEditor` and its branch are removed with the form's card, and `ExchangeRateRow` has one props shape again; the pay sheet's row keeps `''` while its override is on. See `docs/adr/2026-10-14-rate-row.md` §7.

## What this does not decide

The rate editor sheet is MA-169 (#696). The Rate row in place of the card, the converted amount inside the editor and the removal of `transaction_exchange_rate_row.tsx` are MA-170 (#697).
