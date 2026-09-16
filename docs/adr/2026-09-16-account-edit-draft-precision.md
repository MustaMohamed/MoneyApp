# ADR: The account edit form drafts stored money at 2dp and every save sends the full editable set

- **Date:** 2026-09-16
- **Status:** accepted
- **Ticket:** #514 (MA-078), under #504; MA-079 extends this record when it renders the credit draft
- **Applies to:** `src/modules/accounts/screens/accounts/edit_account/edit_account.helpers.ts`, `src/modules/accounts/screens/accounts/edit_account/edit_account.hook.ts`, `src/modules/accounts/components/account_form/account_form.helpers.ts`

The Edit account screen seeds its form from the stored row and saves through `toUpdateAccountInput`. The form holds the credit columns as text, so the text it seeds decides what a save writes back.

## 1. The draft formats at `EDIT_ACCOUNT_DRAFT_DECIMALS` = 2

`buildEditAccountDraft` formats `credit_limit`, `minimum_payment` and `apr` through `formatAmount(value, EDIT_ACCOUNT_DRAFT_DECIMALS)`, the named-constant override review.md item 3 allows (M22). The constant is `roundMoney`'s persisted precision (`money.ts`), not the currency's display decimals from `CURRENCY_CONFIG`.

At EGP's 0 display decimals, a stored limit of 1500.5 would draft as `1,501`, and a colour-only save would write 1501 back. At 2dp it drafts as `1,500.50`, which `optionalAmount` parses and rounds back to 1500.5. `DECIMAL_PATTERN` (`parse_decimal.ts`) admits the formatter's grouping commas, so 8450 drafts as `8,450.00` and parses to 8450. APR is not money, but it is stored at 2dp by `optionalPercent` and drafts the same way. Due day drafts as `String(day)`. A null column drafts as empty text.

The draft is built here and not rendered. The edit schema still reads it: a card's stored credit values pass or fail `addCreditFieldIssues` as they stand, so a paid-down card refuses a name change until MA-079 renders the fields that fix it.

## 2. Every save sends the full editable set

A save sends name, colour and the five credit columns through `toUpdateAccountInput`, unchanged values included. The update is one `UPDATE` over those seven columns (ADR 2026-09-16 account-edit-credit-columns §1), so it never reads a partial object and never needs to know which fields the user touched. A non-card sends its credit columns empty with tracking off, which is what they already hold.

## 3. MA-079

MA-079 renders the credit block over this draft and extends this record with its suffixes and the shared strings it changes.
