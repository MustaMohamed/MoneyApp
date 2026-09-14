# ADR: The account lookup is a by-id cache the active and archived lists override

- **Date:** 2026-09-15
- **Status:** accepted
- **Ticket:** #441 (MA-043), under epic #378; closes audit L27
- **Applies to:** `src/modules/accounts/store/account.store.ts`, `src/modules/accounts/store/account_lookup.helpers.ts`, and its four readers under `src/modules/transactions/screens/transactions/`: `transactions.hook.ts`, `detail/detail.hook.ts`, `transaction_form/edit_transaction.hook.ts`, `transaction_form/transaction_form_prerequisites.helpers.ts`

The account store resolves the accounts the active list does not carry into `accountLookupById`, a map keyed by account id. A load adds to it, and nothing removes from it until `reset`. Every reader merges it under the archived and active lists through `mergeAccountsById`.

## 1. Keyed by id, not by owner

The slot used to be one array that every load replaced. The transactions list, the transaction detail and the edit form each wrote it, so one screen's load dropped the rows another had resolved. The row read "Unknown account", the detail lost its transfer block, and a USD leg formatted as EGP.

An owner-keyed slot, the shape `src/utils/keyed_entries.ts` gives the commitment detail, fixes a current-item slot. This one is not a current-item slot. The same id yields the same row for every reader, so the union is the right value for all of them and no reader has anything to release. State rule 5 is met by removing the shared slot, not by keying it per mount.

## 2. The cache only grows, and the lists win

A load queries only the ids absent from the active list, the archived list and the cache at that moment (`account.store.ts:77-80`). The two lists hold every non-deleted account, so the cache in practice holds deleted accounts, whose rows never change. There is no eviction, no refresh on an account write, and no cache of misses: an id with no row is unreachable through the foreign key.

`mergeAccountsById` (`account_lookup.helpers.ts:4`) builds the map from the cache, then the archived list, then the active list, and a later entry replaces an earlier one. A restored account shows its current name even when a lookup cached its archived copy, and a lookup that lands before `loadAccounts` publishes costs nothing.

## 3. One guard and one error field

A load stamps the account reload generation, `loadRequestId`, and drops its result when a reload started since (`account.store.ts:76`, `:85`). The separate lookup counter is gone. A failed load sets `accountLookupError` under the same guard and rethrows, so the edit form's prerequisite still turns the failure into its own error state. A load that queries clears the field before it does, so a retry is what clears it; a load that queries nothing leaves the field as it was.

The field is shared, so a screen shows it only while something it displays is unresolved. The list shows it while a visible row's account is missing (`transactions.hook.ts:317`), as its floating banner with `transactionsAccountLookupError`, and its Retry re-runs the lookup. The detail shows it while its transaction's account or counterparty is missing (`detail.hook.ts:164`), as its floating refresh error, and its Retry is `reload`.

## 4. Display only

The lookup feeds account names and the currency a transfer leg formats with. Nothing computes or writes an amount from it. An unresolved destination still falls back to EGP at `transaction_row.helpers.ts:111` and `detail.helpers.ts:147`; the banner is what tells the user why the row reads "Unknown account".
