# ADR: the transfer flow card draws a cell for each side, whether or not its account resolved

- **Date:** 2026-10-17
- **Status:** accepted
- **Ticket:** MA-196 (#757), under MA-094 (#550), epic #543
- **Applies to:** `src/modules/transactions/screens/transactions/detail/detail.helpers.ts`, `detail/detail.state.ts`, `detail/detail.hook.ts`, `detail/components/transfer_flow_card.tsx` and `detail/index.tsx`

The detail's flow card drew only once both accounts of a transfer or a card payment resolved, on gold tiles, and held its skeleton until then. A side whose account the lookup never found kept the skeleton for as long as the screen stood. The To cell formatted what arrived in EGP when the destination did not resolve. Frames C3, C4 and C7 draw each account on its own tile, and audit L27 asks for `Unknown account` in place of a hole.

## 1. Each cell comes from its account or its absence

`buildTransactionDetailPresentation` returns `transferFlow: { from, to }` exactly when `requiresDestination(tx.type)` holds, and `null` on an expense or an income. Each `TransferFlowCell` takes its `name` from `resolveAccountName` and its `tile` from `resolveDetailAccountRow`, the Account row's own function: the account's colour on a filled tile, or the graphite hollow tile for an archived, deleted or unknown account. A cell carries no `Archived` label; the notice names the account.

The From cell prints `tx.amount` in `tx.currency`, signed `−`, whether or not its account resolved. The To cell prints `tx.to_amount ?? tx.egp_amount` in the destination's currency, signed `+`, only when the destination resolved, since that currency is the account's. An unresolved destination prints no amount, as the list row prints no arrived amount without one (`transaction_row.helpers.ts:212-219`). This departs from the EGP fallback ADR 2026-09-15 §4 describes for the detail.

## 2. A cell opens only an account that resolved and is not deleted

A cell carries `open: { accountId, accessibilityLabel }` only when its account resolved and `is_deleted === 0`. The card draws such a cell as a `PressableFeedback` that calls `onOpenAccount(accountId)`, and every other cell as a plain `View` with no role. A deleted account takes no tap, because the account detail reads a deleted id as not found (`accounts/screens/accounts/detail/account_detail.helpers.ts:21`, `accounts/repositories/archived_account_detail.repository.ts:43`). An archived account keeps its tap. Both wrappers stretch to the card's inner height, and the content view inside each stands `resolveTransferCellHeight(fontScale)` high from the top, so the two cells' labels, tiles and names sit level when one prints no amount.

## 3. The skeleton waits on this copy's lookup alone

The account store keeps no flag for a lookup in flight, so a lookup that settled without an id reads the same as one still running. The detail's UI entry gains `accountLookupSettled`, set by `settleAccountLookup(owner, id)` once this copy's lookup fulfils, rejects or throws, and only while the entry's `activeId` is `id`. A refresh whose read fails settles the entry too, since it runs no lookup of its own. `resolveTransferFlowView` gives the screen one value: `pending` while the presentation has a flow, an account id of the transaction is missing from the merged accounts, and the entry has not settled; `cells` with the flow otherwise; `none` with no flow. The screen draws `TransferFlowSkeletonCard` on `pending` and the card on `cells`.

`beginLoad` clears the flag on a fresh load and keeps it on a refresh (`preserveData`), so a reload never swaps drawn cells back to the skeleton. A lookup that a newer `loadAccounts` overtakes resolves without writing (`account.store.ts:121`, `:133`). When an id is still missing after the first lookup fulfils or rejects, the hook asks once more before it settles, so a deleted side does not read `Unknown account` because of a race with the lists. An overtaken lookup that rejects sets no `accountLookupError` (`account.store.ts:142-145`), so the rejection alone does not end the wait.

**Amended 2026-10-18, MA-200 (#766).** The hook asks the lookup once and settles when it fulfils or rejects. The store now keeps an overtaken lookup's rows and sets `accountLookupError` on an overtaken failure (`docs/adr/2026-09-15-account-lookup-keyed-by-id.md` §3), so the skeleton holds until the overtaken accounts draw.

## What this does not decide

`loadAccountLookup`, its generation guard and `accountLookupError` do not change. A second `loadAccounts` that overtakes the repeated lookup still leaves that side reading `Unknown account` until the next reload. An id no row holds is asked twice per load, a refresh included, and the store keeps the race for its other callers; moving the repeat into the store is MA-200. The card's height, its border, its arrow and `TransferFlowSkeletonCard` do not change.

**Amended 2026-10-18, MA-200 (#766).** MA-200 removed the hook's repeated lookup and the generation guard on `loadAccountLookup`. The store keeps an overtaken read (`docs/adr/2026-09-15-account-lookup-keyed-by-id.md` §3, amendment of 2026-10-18), an overtaken failure sets `accountLookupError`, and an id no row holds is read once per ask.
