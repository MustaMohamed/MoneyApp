# ADR: Editing an account writes its credit columns through the add form's check and rounding

- **Date:** 2026-09-16
- **Status:** accepted
- **Ticket:** #503 (MA-074), under #385 and epic #378; the edit screen that calls it is MA-075
- **Applies to:** `src/modules/accounts/database/accounts.ts`, `src/modules/accounts/repositories/account.repository.ts`, `src/modules/accounts/utils/credit_fields.schema.ts`, `src/modules/accounts/utils/add_account.schema.ts`, `src/modules/accounts/utils/edit_account.schema.ts`, `src/modules/accounts/components/account_form/account_form.helpers.ts`

The account update writes name, colour and the five credit columns in one statement. Add and edit validate the credit fields through one function that differs only in its comparand, and the edit maps to the update through the add form's rounding layer.

## 1. One `UPDATE`, eight columns

`updateAccount` (`accounts.ts:105`) sets `name`, `color`, `credit_limit`, `minimum_payment`, `statement_due_day`, `interest_tracking`, `apr` and `updated_at` under `WHERE id = ?`, and names no other column. `UpdateAccountInput` is the entity `Pick` of the first seven, so a caller has no field to pass a balance in. Type, currency and opening balance are never editable (epic #378). `current_balance` and `revolving_balance` keep the three writers ADR 2026-09-09 §4 lists, `applyAccountDelta`, `setAccountBalance` and `addAccount`, and the current balance moves through Adjust balance only.

Turning Track interest off maps to `interest_tracking = 0` and `apr = NULL` in the same object, so one statement cannot store tracking off beside a stale APR.

`AccountRepository.update` stamps the time and writes, with no rounding and no guard, as `add` does. Refusal belongs to the schema (§2) and rounding to the mapper (§3). There is no migration: the columns exist since `001_create_accounts.ts`.

## 2. One credit-field check, two comparands

`addCreditFieldIssues` (`utils/credit_fields.schema.ts`) holds every credit rule the add schema held: credit limit required, numeric and positive; minimum payment numeric and not above what is owed; due day an integer from 1 to 31; APR required and from 0 to 100 while tracking is on. Both schemas call it, so the faults and their lines cannot drift apart. The comparand is the only difference.

| Schema | Card gate | Minimum payment compared against |
|---|---|---|
| `createAddAccountSchema` | selected type | typed opening balance, skipped while it does not parse |
| `createEditAccountFormSchema` | stored type | stored `current_balance` at validation time |

The edit gate reads the stored type because type is never editable, so a form value could only repeat the row or contradict it. A card whose current balance is 0 refuses any positive minimum payment. A non-card raises no credit fault on either path, and the mapper writes its five credit columns empty with tracking off.

The edit schema's name check reads the active and the archived lists, taken as two parameters so a caller cannot leave the archived one out, and excludes the edited account. The add schema's check still reads the active list until MA-076 (#505) widens it. `createEditAccountSchema`, name and colour over the active list, stays beside the new export until MA-075 retires the detail's inline edit; until then that edit passes the row's stored credit values through the widened update.

## 3. The edit rounds where the add rounds

`toUpdateAccountInput` (`account_form.helpers.ts:87`) reuses `optionalAmount`, `optionalDay` and `optionalPercent`: credit limit and minimum payment are parsed and rounded half-even to 2dp, APR is quantized to 2dp, and due day is kept only as an integer. This extends ADR 2026-08-22 §5's form-layer exception to a second mapper and adds no `roundMoney` call site, so §6 check 1 stays clean. §5's named follow-up, moving that rounding into `AccountRepository`'s write methods, now covers `update` beside `add`.

## 4. An edit changes later payments only

A card payment reads the card's `minimum_payment` when it is written, into `minimum_payment_snapshot` and its revolving-balance move (`transaction.repository.ts:299-302`). The account update touches no transaction row, so payments recorded before an edit keep their snapshot and payments recorded after it use the new minimum. Editing an existing payment re-reads the card's minimum at that edit (`:405-408`), a rule this record leaves unchanged.
