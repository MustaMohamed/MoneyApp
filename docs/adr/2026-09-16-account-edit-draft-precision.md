# ADR: The account edit form drafts stored money as the stored number and every save sends the full editable set

- **Date:** 2026-09-16
- **Status:** accepted
- **Ticket:** #514 (MA-078), under #504; MA-079 extends this record when it renders the credit draft
- **Applies to:** `src/modules/accounts/screens/accounts/edit_account/edit_account.helpers.ts`, `src/modules/accounts/screens/accounts/edit_account/edit_account.hook.ts`, `src/modules/accounts/components/account_form/account_form.helpers.ts`

The Edit account screen seeds its form from the stored row and saves through `toUpdateAccountInput`. The form holds the credit columns as text, so the text it seeds decides what a save writes back.

## 1. The draft is `formatStoredMoneyText`

`buildEditAccountDraft` drafts `credit_limit`, `minimum_payment` and `apr` through `formatStoredMoneyText` (`src/utils/money_text.ts`): the stored number as text, with no rounding and no grouping. It is the same text every other edit field seeds, the transaction edit's rate (`edit_transaction.helpers.ts`) and the budget limit (`set_budget_sheet.hook.ts`) among them.

The currency's display decimals would move the value. At EGP's 0 from `CURRENCY_CONFIG`, a stored limit of 1500.5 would draft as `1,501`, and a colour-only save would write 1501 back. `formatStoredMoneyText` drafts `1500.5`, which `optionalAmount` parses back to 1500.5. APR is not money, but it drafts the same way and `optionalPercent` parses it back. Due day drafts as `String(day)`. A null column drafts as empty text.

The draft is built here and not rendered. The edit schema still reads it: a card's stored credit values pass or fail `addCreditFieldIssues` as they stand, so a paid-down card refuses a name change until MA-079 renders the fields that fix it.

## 2. Every save sends the full editable set

A save sends name, colour and the five credit columns through `toUpdateAccountInput`, unchanged values included. The update is one `UPDATE` over those seven columns (ADR 2026-09-16 account-edit-credit-columns §1), so it never reads a partial object and never needs to know which fields the user touched. A non-card sends its credit columns empty with tracking off, which is what they already hold.

## 3. MA-079

MA-079 renders the credit block over this draft and extends this record with its suffixes and the shared strings it changes.
