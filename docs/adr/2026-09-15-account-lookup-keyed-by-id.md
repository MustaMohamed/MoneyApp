# ADR: The account lookup is a by-id cache the active and archived lists override

- **Date:** 2026-09-15
- **Status:** accepted
- **Ticket:** #441 (MA-043), under epic #378; closes audit L27
- **Applies to:** `src/modules/accounts/store/account.store.ts`, `src/modules/accounts/store/account_lookup.helpers.ts`, `src/modules/accounts/store/use_accounts_by_id.hook.ts`, and its seven readers: `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts`, `src/modules/commitments/screens/commitments/commitments.hook.ts`, `src/modules/commitments/screens/commitments/components/commitment_form_body.hook.ts`, and under `src/modules/transactions/screens/transactions/`: `transactions.hook.ts`, `detail/detail.hook.ts`, `transaction_form/edit_transaction.hook.ts`, `transaction_form/transaction_form_prerequisites.helpers.ts`

The account store resolves the accounts the active list does not carry into `accountLookupById`, a map keyed by account id. A load adds to it, and nothing removes from it until `reset`. Every reader merges it under the archived and active lists through `mergeAccountsById`.

## 1. Keyed by id, not by owner

The slot used to be one array that every load replaced. The transactions list, the transaction detail and the edit form each wrote it, so one screen's load dropped the rows another had resolved. The row read "Unknown account", the detail lost its transfer block, and a USD leg formatted as EGP.

An owner-keyed slot, the shape `src/utils/keyed_entries.ts` gives the commitment detail, fixes a current-item slot. This one is not a current-item slot. The same id yields the same row for every reader, so the union is the right value for all of them and no reader has anything to release. State rule 5 is met by removing the shared slot, not by keying it per mount.

## 2. The cache only grows, and the lists win

A load queries only the ids absent from the active list, the archived list and the cache at that moment (`account.store.ts:79-82`). The two lists hold every non-deleted account, so the cache in practice holds deleted accounts, whose rows never change. There is no eviction, no refresh on an account write, and no cache of misses: an id with no row is unreachable through the foreign key.

`mergeAccountsById` (`account_lookup.helpers.ts:4`) builds the map from the cache, then the archived list, then the active list, and a later entry replaces an earlier one. A restored account shows its current name even when a lookup cached its archived copy, and a lookup that lands before `loadAccounts` publishes costs nothing.

## 3. One guard and one error field

A load stamps the account reload generation, `loadRequestId`, and drops its result when a reload started since (`account.store.ts:78`, `:90`). The separate lookup counter is gone. A failed load sets `accountLookupError` under the same guard, adds the ids it queried to `failedLookupIds`, a set in the store's closure beside `loadRequestId` (`:46`), and rethrows, so the edit form's prerequisite still turns the failure into its own error state. A successful load removes the ids it queried from the set, and `reset` empties it. A load clears the field before it queries only when its ids include every failed id the lists and the cache still lack (`:83-86`), so one screen's successful lookup cannot hide another screen's outstanding failure. A load that queries nothing leaves the field as it was.

The field is shared, so a screen shows it only while something it displays is unresolved. The list shows it while a visible row's account is missing (`transactions.hook.ts:316`), as its floating banner with `transactionsAccountLookupError`, and its Retry re-runs the lookup. The detail shows it while its transaction's account or counterparty is missing (`detail.hook.ts:166`), as its floating refresh error, and its Retry is `reload`.

**Amended 2026-10-18, MA-200 (#766).** A reload no longer drops a lookup's result. A load stamps `lifecycleGeneration` in place of `loadRequestId`, so only `reset` discards a load in flight (`account.store.ts:130`, `:142`). An overtaken load publishes every row it read except an `is_deleted = 0` copy of an id the store deleted. `refreshDeletedLookup` adds the id to `deletedAccountIds` before it drops the cached copy (`:84`), and `dropCopiesReadBeforeDelete` (`account_lookup.helpers.ts:34`) leaves that copy out. A failed read adds its ids to `failedLookupIds` and sets `accountLookupError` whether or not a reload overtook it. The transaction detail and the edit sheet each ask the lookup once per load.

**Amended 2026-10-24, MA-251 (#850).** Every reader names accounts through one shared read. `readAccountsById` (`account_lookup.helpers.ts`) builds the map from a store state through `mergeAccountsById`, and `loadAccountLookup` and the edit sheet's readiness check call it. `useAccountsById` (`use_accounts_by_id.hook.ts`) returns that map, memoised on the active list, the archived list and the cache alone, beside `lookupFailed`, which is `accountLookupError`; it loads nothing. The hook lives in `src/modules/accounts/store/`, beside the store it selects from, because it is a selector hook that other modules read. The account detail, the commitments list, the commitment add and edit sheet's account strip, the transaction detail, the edit sheet and the transactions list read it. A screen decides whether to show the shared error through `lookupLeavesUnresolved`, true only while the lookup failed and an id the screen names is missing from the map, so each screen shows it as it did before. The transaction detail still asks the lookup once per load. §4 holds: the read feeds names and a transfer leg's currency, and computes no amount.

## 4. Display only

The lookup feeds account names and the currency a transfer leg formats with. Nothing computes or writes an amount from it. An unresolved destination still falls back to EGP at `transaction_row.helpers.ts:111` and `detail.helpers.ts:147`; the banner is what tells the user why the row reads "Unknown account".

**Amended 2026-10-17, MA-196 (#757).** Neither the list row nor the detail's flow card prints an arrived amount for an unresolved destination (`docs/adr/2026-10-17-transfer-flow-cells.md` §1).
