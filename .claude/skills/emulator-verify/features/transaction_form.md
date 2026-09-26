# Transaction form

The add and edit sheet, over any tab. Host `src/modules/transactions/screens/transactions/transaction_form/index.tsx`, mounted once at `src/app/(app)/_layout.tsx`; body `transaction_form_body.tsx`, type tabs `components/type_tabs.tsx` over the shared `src/components/ui/tabs.tsx`, skeleton `components/transaction_form_loading.tsx`. Frames D1 to D4, D8 and D15 come from the transactions canvas (https://claude.ai/artifact/7QJH3AFeoQAXtWmx5vAP2s, epic #543), not `~/.ship/MoneyApp/canvas/`, whose D frames are the edit-account screen.

## Reach it

- Add: the FAB on the Transactions or Dashboard tab, `$MQA tap 'Add'` (`fab.tsx:213`), then the menu pill `$MQA tap 'Add Transaction'`.
- Add from an account: the account detail's add path (`account_detail.hook.ts:381`, `openAdd({ accountId })`) opens the sheet after a jump to the Transactions tab, the account preselected.
- Edit: a transaction row on the list (`transactions.md` § Outbound), then the detail header's edit icon, `$MQA tap 'Edit transaction'` (`detail_header.tsx:34`, `Strings.detailEditAccessibility`).

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| add expense | D1, MA-110 | the FAB on the Transactions tab, one bank account seeded | `mqa read` greps `Add transaction` once; the four type tab triggers' bounds read 28 ± 1 high inside the 36 track, each with its glyph in its type colour; `from-account-row`, `category-row` and `date-row` bounds read 44 or more high; the Save node reads 48 ± 1 high on a single accent fill; one shot of the sheet |
| add income | D2, MA-110 | from `add expense`, tap the `Income` tab | `mqa read` finds no `Budget`; the amount in the success colour; one shot of the tabs and the amount |
| add income, card credit | D2, as shipped | the `Income` tab, a credit card picked in the From picker | the Income tab reads `Card credit`, the supporting line `Reduces card debt and offsets spending.`; one shot of the tabs and the supporting line |
| add transfer, To row | D3, MA-110 | the `Transfer` tab | `to-account-row` bounds read 44 or more high; its picker lists the non-card accounts without the From account (`mqa read`); one shot of the rows |
| add card payment, To row | D4, MA-110 | the `CC Payment` tab | the `to-account-row` picker lists credit cards only (`mqa read`); one shot of the rows |
| edit | D8, MA-110 | a seeded expense's detail, the header edit icon | `mqa read` greps `Edit transaction` twice (the sheet title and the detail's icon label under it); the tab triggers read `enabled=false` with their glyphs; Save reads `Save changes`; `from-account-row` reads `enabled=false`; one shot of the sheet |
| loading | D15, MA-110 | source force: in `transaction_form_prerequisites.hook.ts:56` replace the `loadPrerequisites(mode, editingTx)` call with `new Promise<void>(() => {})`, then open `add expense`; revert with `git status` clean after | content-desc `Loading transaction` present; Save reads `enabled=false`; under the amount's separator one full-width account bar, then four rows each 44 or more high with a hairline, a short key bar left and a longer value bar right; one shot of the sheet |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Save | the caller, the sheet closed | n/a |
| Cancel, or pan down | the caller, nothing written | n/a |
| `Add Account`, from the no-accounts block | `/accounts/add_account`, after the sheet closes | the caller |

## Gotchas

- The detail's edit icon label (`Strings.detailEditAccessibility`) equals the sheet title in edit, so `grep -c 'Edit transaction'` over `mqa read` on the detail counts one before the sheet opens and two after. The FAB menu pill reads `Add Transaction` (title case, `fab.tsx:143`), the sheet title `Add transaction`: grep the sheet title case-sensitively.
- The compact `SegmentedTabs` is shared with the list's type tabs and the accounts-list rail (`transactions.md` § Gotchas); one read of a trigger holds on all three, and a divergence is a caller override.
- The fact rows are `ListGroup.Item` pressables: they are the clickable nodes, so `mqa bounds` on the row's testID, not on its key or value text.

## Seeding and forcing states

Per `README.md` § Seeding and forcing states. The To picker states need one bank account, one second non-card account and one credit card; the edit state needs one expense on the bank account.
