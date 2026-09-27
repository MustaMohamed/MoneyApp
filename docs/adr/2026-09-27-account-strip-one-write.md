# ADR: The account strip writes the account through one function

- **Date:** 2026-09-27
- **Status:** accepted
- **Ticket:** #577 (MA-111), under #566
- **Applies to:** `src/modules/transactions/screens/transactions/transaction_form/components/account_strip.tsx`, `src/modules/transactions/screens/transactions/transaction_form/transaction_form_body.tsx`, `src/modules/transactions/screens/transactions/transaction_form/add_transaction.hook.ts`, `src/modules/transactions/screens/transactions/transaction_form/add_transaction_session.tsx`, `src/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers.ts`

The add sheet's From account is a horizontal strip of account chips instead of a picker row and its sheet. The account choice feeds the money path: it sets the amount's currency, seeds the exchange rate, and clears a category and budget whose semantics no longer fit. This record fixes how the strip and its preselect reach that write.

## 1. The strip mirrors the form and holds no state

`AccountStrip` renders `accounts`, rings the chip whose id is `selectedId`, and reports a press through `onSelect`. It reads no store and keeps no state. `selectedId` is `resolveStripSelectedId(accountsForFrom, accountId)` over RHF `accountId`, so the ring is always the form's value.

## 2. `selectAccount` is the only writer

A chip press and the preselect both call `selectAccount`, the function the picker sheet called before. It clears the category and budget when the semantics change, writes `accountId`, and seeds `exchangeRate` from the stored rate when the pair needs one and the user has not typed an override. Nothing else writes `accountId` on add, so the currency, the rate seed and the semantics clear follow every account change.

## 3. The preselect fires once per session

At the first render where the form's data status is `ready`, a seeded `accountId` (the account detail's add path, through `openAdd`) settles the guard with no write. With no seeded account, `resolveAccountPreselect` returns the first eligible account, the guard is set, and `selectAccount` runs. The guard is a ref on the hook, so a later type switch cannot pass it; nothing re-preselects.

## 4. A type switch that excludes the account keeps it

Switching to Transfer or CC Payment with a credit card selected leaves `accountId` on the card. The strip shows no ring, because the card is not in the eligible list. Save reports the fault through the schema's existing card refusal on `accountId`, which the footer status counts; the form never clears the field.

## 5. The eligible list is the active list, filtered by type

`resolveEligibleFromAccounts(type, accounts)` drops credit cards for Transfer and CC Payment and keeps every account for Expense and Income, in the order given. `accounts` is the account store's active list, read `WHERE is_archived = 0 AND is_deleted = 0 ORDER BY sort_order ASC, created_at ASC`, so the strip never offers an archived or deleted account, and its order is the accounts list's.

## 6. The fault message is every chip's hint

On an account fault the strip draws one danger ring round its scroll area and each chip carries the message as its `accessibilityHint`. The strip's container is not a focus stop, so a hint on it would never be read; the chips are the focus stops a screen reader lands on.
