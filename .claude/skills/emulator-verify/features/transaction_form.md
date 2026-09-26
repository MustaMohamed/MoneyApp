# Transaction form

The add and edit sheet, over any tab. Host `src/modules/transactions/screens/transactions/transaction_form/index.tsx`, mounted once at `src/app/(app)/_layout.tsx`; body `transaction_form_body.tsx`, type tabs `components/type_tabs.tsx` over the shared `src/components/ui/tabs.tsx`, skeleton `components/transaction_form_loading.tsx`, footer status track `src/components/ui/status_track.tsx`. Frames D1 to D4, D6 to D8 and D15 come from the transactions canvas (https://claude.ai/artifact/7QJH3AFeoQAXtWmx5vAP2s, epic #543), not `~/.ship/MoneyApp/canvas/`, whose D frames are the edit-account screen.

## Reach it

- Add: the FAB on the Transactions or Dashboard tab, `$MQA tap 'Add'` (`fab.tsx:213`), then the menu pill `$MQA tap 'Add Transaction'`.
- Add from an account: the account detail's add path (`account_detail.hook.ts:381`, `openAdd({ accountId })`) opens the sheet after a jump to the Transactions tab, the account preselected.
- Edit: a transaction row on the list (`transactions.md` § Outbound), then the detail header's edit icon, `$MQA tap 'Edit transaction'` (`detail_header.tsx:34`, `Strings.detailEditAccessibility`).

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| add expense | D1, MA-110, MA-105 | the FAB on the Transactions tab, one bank account seeded | `mqa read` greps `Add transaction` once; the four type tab triggers' bounds read 28 ± 1 high inside the 36 track, each with its glyph in its type colour; `from-account-row`, `category-row` and `date-row` bounds read 44 ± 1 high (115 or 116 px); `transaction-form-fact-group` holds `category-row` and `date-row` 17 dp in from its edge (16 inset, 1 border), and its top sits 8 ± 1 below the bottom of `from-account-row`, which sits above it, flat; `transaction-form-status` reads one track line high, empty, no glyph, 8 above Save (18.29 ± 1 on `Pixel_2_API_34`, where `STATUS_TRACK_LINE_HEIGHT` is 18, the height a one-line message reads); after one `mqa scroll down`, `note-row` and the Note `EditText` (`text="Add a note (optional)"`) read 44 or more high, the last row of the card with no hairline under it; the Save node reads 48 ± 1 high on a single accent fill; one shot of the sheet |
| add income | D2, MA-110 | from `add expense`, tap the `Income` tab | `mqa read` finds no `Budget`; the amount in the success colour; one shot of the tabs and the amount |
| add income, card credit | D2, as shipped | the `Income` tab, a credit card picked in the From picker | the Income tab reads `Card credit`, the supporting line `Reduces card debt and offsets spending.`; one shot of the tabs and the supporting line |
| add transfer, To row | D3, MA-110 | the `Transfer` tab | `to-account-row` bounds read 44 or more high; its picker lists the non-card accounts without the From account (`mqa read`); one shot of the rows |
| add card payment, To row | D4, MA-110 | the `CC Payment` tab | the `to-account-row` picker lists credit cards only (`mqa read`); one shot of the rows |
| edit | D8, MA-110 | a seeded expense's detail, the header edit icon | `mqa read` greps `Edit transaction` twice (the sheet title and the detail's icon label under it); the tab triggers read `enabled=false` with their glyphs; Save reads `Save changes`; `from-account-row` reads `enabled=false`; on a Midnight rich account (#1B2B4B, the seed default) the From row's bank glyph reads light on the sheet, not near-invisible; one shot of the sheet |
| loading | D15, MA-110, MA-105 | source force: in `transaction_form_host.state.ts:93` (`getOpeningState`) replace the `prerequisiteStatus` ternary with `'loading' as const`, `mqa up` for a cold launch, then open `add expense`; revert with `git status` clean after | shots only, the only proof (Gotchas): under the amount's separator one full-width account bar, then 8 below it one bordered group card holding four rows each 44 or more high (115 px), a hairline between rows, a short key bar left and a longer value bar right; the footer holds the disabled Save alone, no status track (D15); after one `mqa scroll down`, the fourth row and the card's bottom border sit above the footer's top hairline |
| budget lookup failed | no frame; D1 as shipped, MA-110, MA-105 | source force: in `add_transaction.hook.ts:391` append `.then(() => Promise.reject(new Error('forced')))` to the `getBudgetsForCategoryMonth(...)` call, `mqa up`, open `add expense`, `$MQA tap 'id="category-row"'`, `$MQA tap 'Food & Dining'`; revert with `git status` clean after | `budget-row` reads 48 high, labelled `Retry matching budget lookup`; the value `Could not load matching budgets. Try again.` reads 32 high (two caption lines) and ends `Try again.`; the reload glyph sits right of it; nothing clipped; no ring on `budget-row`, and `transaction-form-status` stays empty; one shot of the sheet |
| validation | D6, MA-105 | from `add expense`, pick the bank account in the From picker, leave the amount and Category empty, `mqa bounds` on `category-row`, `date-row` and Save, then `$MQA tap 'Save'` | `mqa read` finds `Fix the 2 fields marked above.` and `Enter an amount`; the three bounds unchanged ± 1 px; the shot shows the danger ring round the amount (32 from the sheet edge, radius 12) and round the Category cell, and the alert glyph left of the track's line; one shot of the sheet |
| save failed | D7, MA-105 | source force: `throw new Error('forced');` as the first statement inside `onValid`'s `try` at `add_transaction.hook.ts:441`, `mqa up`; `fill` an amount, pick the bank account and `Food & Dining`, `mqa bounds` on Save, `$MQA tap 'Save'`; revert with `git status` clean after | `mqa read` finds `Couldn't save this transaction. Nothing was changed. Try again.`; the amount and `Food & Dining` still shown; `transaction-form-status` reads two track lines high (36.57 ± 1 on `Pixel_2_API_34`), grown upward; Save bounds unchanged; one shot of the sheet |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Save | the caller, the sheet closed | n/a |
| Cancel, or pan down | the caller, nothing written | n/a |
| `Add Account`, from the no-accounts block | `/accounts/add_account`, after the sheet closes | the caller |

## Gotchas

- The detail's edit icon label (`Strings.detailEditAccessibility`) equals the sheet title in edit, so `grep -c 'Edit transaction'` over `mqa read` on the detail counts one before the sheet opens and two after. The FAB menu pill reads `Add Transaction` (title case, `fab.tsx:143`), the sheet title `Add transaction`: grep the sheet title case-sensitively.
- The compact `SegmentedTabs` is shared with the list's type tabs and the accounts-list rail (`transactions.md` § Gotchas); one read of a trigger holds on all three, and a divergence is a caller override.
- The fact rows are `ListGroup.Item` pressables: they are the clickable nodes, so `mqa bounds` on the row's testID, not on its key or value text. A 44 dp row reads 43.81 or 44.19 (115 or 116 px): one device pixel of rounding, not a short row.
- The skeleton's containers are not in the tree: the root's `Loading transaction` label folds them. With the skeleton on screen the agent-device snapshot does not settle either: a `tap` or `read` fails after 30 s (`Android snapshot helper failed`) and `bounds` then reads `no match` even for `Save`. Prove the loading state from the shot, close the sheet with `tapxy` on its close button, and for layout numbers log `e.nativeEvent.layout` from a temporary `onLayout` and read it with `mqa logs`.
- The form's scroll offset survives a type-tab switch: close and reopen the sheet before shooting a later state, or the To row sits above the viewport and reads 0 by 0.
- The skeleton needs the opening status forced, not the loader: once the account and category stores have loaded (any tab does it), `getOpeningState` opens the sheet `ready` and `loadPrerequisites` never runs, so a never-settling loader shows nothing.
- Never `mqa ime-down` with the sheet open under the agent-device engine: the keyboard is headless, the key is Back, and Back closes the sheet. `fill` the amount and tap on.
- The type tab triggers share their labels with the list's filter rail behind the sheet (`Income`, `Transfer`), so `tap 'Income'` is ambiguous; tap the sheet's trigger by its position (`tapxy`, from `mqa bounds 'label="Income"'`, the match at y 259).

## Seeding and forcing states

Per `README.md` § Seeding and forcing states. The To picker states need one bank account, one second non-card account and one credit card; the edit state needs one expense on the bank account.
