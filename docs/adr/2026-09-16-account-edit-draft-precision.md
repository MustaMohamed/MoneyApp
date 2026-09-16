# ADR: The account edit form drafts stored money as the stored number and every save sends the full editable set

- **Date:** 2026-09-16
- **Status:** accepted
- **Ticket:** #514 (MA-078), under #504; extended by #515 (MA-079), which renders the credit draft
- **Applies to:** `src/modules/accounts/screens/accounts/edit_account/edit_account.helpers.ts`, `src/modules/accounts/screens/accounts/edit_account/edit_account.hook.ts`, `src/modules/accounts/screens/accounts/edit_account/index.tsx`, `src/modules/accounts/components/account_form/account_form.helpers.ts`, `src/modules/accounts/components/account_form/account_form.geometry.ts`, `src/modules/accounts/components/account_form/field_message_rail.tsx`, `src/modules/accounts/components/account_form/credit_card_fields.tsx`, `src/constants/strings.ts`

The Edit account screen seeds its form from the stored row and saves through `toUpdateAccountInput`. The form holds the credit columns as text, so the text it seeds decides what a save writes back.

## 1. The draft is the stored precision

`buildEditAccountDraft` drafts `credit_limit` and `minimum_payment` through `formatAmount` at `CREDIT_DRAFT_MONEY_DECIMALS` (2), the precision `roundMoney` writes: a limit of 8450 drafts as `8,450.00` and 1500.5 as `1,500.50`. The text re-parses to the stored number. `DECIMAL_PATTERN` (`src/utils/parse_decimal.ts:3`) admits the grouping, and the only two writers, `toNewAccountInput` and `toUpdateAccountInput`, round to 2dp in `optionalAmount`, so no stored value carries a third decimal for the draft to drop.

The currency's display decimals would move the value. At EGP's 0 from `CURRENCY_CONFIG`, a stored limit of 1500.5 would draft as `1,501`, and a colour-only save would write 1501 back.

APR is not money and keeps `formatStoredMoneyText` (`src/utils/money_text.ts`), the stored number as text with no rounding and no grouping, which `optionalPercent` parses back: 24.5 drafts as `24.5`. Due day drafts as `String(day)`. A null column drafts as empty text.

The cost, accepted 2026-09-16 in /prep: the credit inputs are unmasked, so deleting one digit of `8,450.00` leaves `8,40.00`, which `DECIMAL_PATTERN` refuses and the save marks "Numbers only.".

The grouped draft also rules out the house mask, since `maskMoneyFieldText` (`src/utils/money_text.ts`) refuses any one-character insert or delete that leaves a comma, so `maskFieldText('amount', …)` wired onto these inputs as `set_budget_sheet.tsx` wires it would refuse typing and backspace in `8,450.00`, and masking them means moving the two money fields' draft to ungrouped text in the same change.

## 2. Every save sends the full editable set

A save sends name, colour and the five credit columns through `toUpdateAccountInput`, unchanged values included. The update is one `UPDATE` over those seven columns (ADR 2026-09-16 account-edit-credit-columns §1), so it never reads a partial object and never needs to know which fields the user touched. A non-card sends its credit columns empty with tracking off, which is what they already hold.

## 3. The credit block

On a card, the screen renders `CreditCardFields` below Type and Currency, over this draft. It edits the five credit columns through the §2 save. The `UPDATE` names no balance column, so a save never moves the current or the revolving balance.

- **Suffixes.** The `CURRENCY_CONFIG` code on credit limit and minimum payment, `%` on APR.
- **Helperless rails.** No helper under credit limit, minimum payment or APR, as D2 draws them. Each of those rails reserves its error lines through `fieldMessageRailStyle`: two under limit and minimum, because "Credit limit is required for credit cards" and "Enter a limit greater than zero." wrap in a half-width cell, and one under APR at full width. No field moves when an error appears. Due day keeps its helper.
- **Shared strings.** The add form and onboarding N2 read the three changed strings too: the due-day helper "Day of the month, 1 to 31.", the due-day error "Between 1 and 31." and the interest helper "Estimate interest from the APR on the revolving balance.".

Both new props on `CreditCardFields` are optional and the add slot passes neither, so the add form keeps its helpers, its rail geometry and its unsuffixed inputs.

After a save:

- the detail hero's available credit and over-limit line, the detail facts, and the accounts list caption's limit and available figures read the store row that `writeThenReload` reloads, so they show the new values on return.
- the dashboard account card's limit, available or over-limit line and due date, and the net-worth breakdown's due date, read the dashboard snapshot. The dashboard's blur calls `invalidate()` (`dashboard.hook.ts:95`), so the snapshot reloads on its next focus. That reload rides audit L26's blur `invalidate()`, so the L26 fix must also refresh the dashboard after an account write, as `transactionMutationVersion` does for transactions (`dashboard.hook.ts:100-106`).
