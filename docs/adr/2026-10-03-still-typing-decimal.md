# ADR: A decimal the user is still typing is held, not validated

- **Date:** 2026-10-03
- **Status:** accepted
- **Ticket:** #584 (MA-115)
- **Applies to:** `src/utils/parse_decimal.ts`, `src/utils/use_zod_form.hook.ts`, and the thirteen decimal fields in the table under decision 3

Once Save had been pressed on a form that stayed open, each decimal field re-validated on every keystroke. A value on its way to a valid one, `48.` before `48.5` or `0.0` before `0.05`, failed the number check or the floor, so the field showed its fault until the next digit and a footer that counts faults moved with it. This record fixes what counts as still typing, where the exemption applies, and what it leaves alone.

## 1. One definition, in `parse_decimal.ts`

`isStillTypingDecimal(text, refusesZero)` is the only definition. A text is still being typed when, trimmed, it is not empty and starts or ends with the decimal point, or when the field refuses zero and `parseDecimalText` reads the text as `0`. Every other text is complete.

The function is a predicate over text. It changes no parser, pattern or floor, so `docs/adr/2026-08-26-parse-floor-money-only.md` §1 stands as written. The spending plan sheet's `PARTIAL_DECIMAL_PATTERN` was the first copy of this idea, and `validateAllocationText` now calls the predicate in the same branch. A second definition anywhere is a defect.

## 2. Only the field's own keystroke is held

`holdStillTypingDecimal(form, name, value, refusesZero, text?)` in `use_zod_form.hook.ts` is the one way a field applies the predicate to a react-hook-form field. When the typed text is still typing it stores the value with `setValue` and no validation, clears that field's fault, and returns `true`. Otherwise it returns `false` and writes nothing, and the caller makes the call it made before this change.

Every Save runs the schema unchanged, so Save refuses `48.` and, where zero is refused, `0` and `0.0`, with the shipped messages. A re-validation another field causes also runs the schema unchanged. On the transaction sheet a pick in another row flags a half-typed rate left behind, and a fault Save raised on the rate stays until the rate's text changes.

On the add and edit transaction sheets the rate re-validates through an effect, not through the keystroke. The effect is split in two. One runs on every pick and validates in full. The other runs on a rate change and skips only when the form's rate, read when the effect runs, is the text `setExchangeRate` last held. Seeds that write the stored rate never pass through `setExchangeRate`, so they validate.

## 3. The fields, and which refuse zero

| Field | Where the hold is called | Refuses zero |
|---|---|---|
| Transaction rate, add and edit sheet | `add_transaction.hook.ts`, `edit_transaction.hook.ts` | yes |
| Pay sheet amount | `pay_sheet.hook.ts` | yes |
| Pay sheet rate | `pay_sheet.hook.ts` | yes |
| Commitment amount, add and edit form | `commitment_form_body.tsx` | yes |
| Income amount | `income_sheet.hook.ts` | yes |
| Set-budget limit | `set_budget_sheet.hook.ts` | yes |
| Spending plan total | `spending_plan_sheet_fields.tsx` | yes |
| Spending plan category amount | `spending_plan_sheet.helpers.ts`, by the predicate alone | no |
| Opening balance | `account_form.tsx` | no |
| Credit limit | `credit_card_fields.tsx` | yes |
| Minimum payment | `credit_card_fields.tsx` | no |
| APR | `credit_card_fields.tsx` | no |
| Manual rate, currency settings | `currency.hook.ts` | yes |

The flag follows what Save does with zero on that field. The transaction sheet's amount is not in the table: it clears only its own fault as the user types and never showed the flash. The transactions filter's Min and Max, the adjust-balance sheet, due day and the count fields are not sites either.

## 4. A plan row is exempt only while it is the row last typed in

The spending plan's category amounts are not form fields. They show the incomplete fault from a flag a refused Save sets. `lastTypedAllocationId` in `spending_plan_sheet.state.ts` names the row the latest edit on the sheet was in, and an incomplete row stays silent while it is that row. A refused Save clears the name, and so does any edit elsewhere on the sheet: another row, the name, the total, a category toggle, the allocate switch, a date. A half-typed row the user has left is flagged as it was before this change. A complete value the row refuses, such as `0.005`, shows its fault on every keystroke.

## 5. The commitment amount passes its typed text

`DecimalAmountInput` hands the form a number, so `0`, `0.` and `0.0` all arrive as `0` and `48.` arrives as `48`. The predicate needs the text. The input's `onChange` now carries the typed text as a second argument on a keystroke and carries none on blur, so blur validates as it did.

## Consequence

A fault a complete value raised hides when a point is typed after it, and returns at the next digit: APR `101` shows its range fault, `101.` shows none, `101.5` shows it again. The definition in decision 1 reads the text, not the number before the point, and Save still refuses all three.
