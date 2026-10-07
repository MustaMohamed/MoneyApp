# Transaction detail

Route `/transactions/detail/[id]`, and its `/stacked` twin when reached from a stacked screen. Screen `src/modules/transactions/screens/transactions/detail/index.tsx`, hero `detail/components/detail_hero.tsx` over the shared `src/components/ui/type_badge.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-087 needs — add the rest when a ticket reaches them.

## Reach it

- User path: a transaction row on the `Transactions` tab (`transactions.md` § Outbound).
- Script: `$MQA tap '<transaction title>'` on the list.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| type badge, md | no frame, MA-087 | open the commitment-owned transaction from `transactions.md` § States (`type badge, sm`) | the hero badge label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11))` = 15 ± 1, so the badge is 25 (15 + `py-1` + the 1 dp `border` pair); one shot of the hero |
| hero pill, category tone | no frame, MA-103 | the MA-103 seed (`categories.md` § Seeding and forcing states): open the Housing expense | one shot of the hero pill: the glyph and the `Housing` label in `#5C7FC4` on the pill, readable on the hero gradient |
| saved toast after edit, tabs copy | A15, MA-106 | `mqa open /transactions/detail/<id>` on a seeded expense, `$MQA tap 'Edit transaction'`, `$MQA wait 'label="Save changes"'`, `$MQA tap 'label="Save changes"'` | `mqa wait 'Transaction saved.'`; `label="Add"` reads `no match`; the toast's bottom sits level (± 1) with where `fab-button`'s bottom sits on the Transactions tab, read in the same walk, `safeAreaBottom + Size.tabBarHeight + Spacing.md` above the screen's bottom, so its gap to the tab bar's drawn top hairline equals the FAB's; absolute y moves with the device inset between launches, so the example is not a check: on one `Pixel_2_API_34` run the toast label at y 599.6 against 523.8 over the FAB, 75.8 lower (the FAB's 59.05 plus `Spacing.md`), the toast's bottom at 639.2 from the shot against the FAB's 639.65, 26.7 above the hairline at 665.9; one shot |
| saved toast after edit, stacked twin | A15, MA-106 | the same on `mqa open /stacked/transactions/detail/<id>` | `mqa wait 'Transaction saved.'`; `~Transactions` reads `no match`, no tab bar; the toast's bottom below where it sits on the tabs copy (no tab-bar clearance) and above the gesture handle; example on one `Pixel_2_API_34` run, not a check: the toast label at y 663.6, its bottom 28.5 above the screen's bottom edge; one shot |
| action row, large font | no frame, MA-130 | a seeded expense, then the commitment-owned transaction of `type badge, md`; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on `Delete`, and on `View commitment` beside it; one crop of the row at 2.0 on each |
| load error retry, large font | no frame, MA-130 | source force: `getById(id)` in `src/modules/transactions/screens/transactions/detail/detail.hook.ts` becomes `Promise.reject(new Error('forced'))`; reverted after; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the retry button; one crop at 2.0 |
| header title, large font | no frame, MA-159 | a seeded expense by `mqa open /transactions/detail/<id>`; on the empty database an id no transaction has, which draws the not-found state under the same header; the `Font scale` force (README) at 1.0 and 2.0 | the `Header proof` (README) on `Transaction`, the edit pencil (`label="Edit transaction"`) as the right action on the seeded pass |
| detail rows and transfer card, large font | no frame, MA-159 | a seeded USD expense with a budget and an exchange rate, so all seven rows draw, and a transfer between two accounts, each by `mqa open /transactions/detail/<id>`; at 2.0 `mqa scroll down --until 'DATE & TIME'`, then `mqa scroll down --until 'SOURCE'`; `mqa bounds '~CATEGORY'` prints the row's node, a group labelled with its joined texts, and the label's `TextView`, and `mqa bounds '~open account detail'` the two transfer cells; the `Font scale` force (README) at 1.0 and 2.0 | each row's node reads `resolveDetailRowHeight(scale)` ± 1 dp high, 61 at 1.0 and 94 at 2.0 on the 411 dp emulator, the account row `resolveDetailRowHeight(scale, true)`, 74 and 122, with its label, value and sublabel `TextView` boxes inside it. Each transfer cell reads `resolveTransferCellHeight(scale)` ± 1, 92 and 136, from the top of its label, `FROM` or `TO`, to the bottom of its amount. The cell's clickable node is taller: the `flex-1` pressable takes the card's inner height, `resolveTransferCardHeight(scale)` less 30 for `p-3.5` twice and the border, 103 and 147, with the three texts at its top, their boxes inside it and clear of the tile. Crops at 2.0 of the rows card and the transfer card: each line whole or ending in a whole `…`, none cut at the top or bottom. On the whole screen, seeded and on the empty database's not-found state, no text box from `mqa bounds` crosses another node's box. The 1.0 shots match `main` |
| skeleton, large font | no frame, MA-159 | source force: `getById(id)` in `src/modules/transactions/screens/transactions/detail/detail.hook.ts` becomes `new Promise<never>(() => undefined)`, reverted after. The skeleton's hint is the transaction's row in the month the Transactions list has loaded: `mqa open /transactions`, `id="month-filter-previous"` tapped until the list shows the month the USD expense and the transfer are dated in, then `mqa open /transactions/detail/<id>` for the expense, and the same deep link for the transfer straight from that skeleton, with no return to the list, where `mqa open /transactions` can time out. Once by a deep link to an id no transaction has, which carries no hint, for the neutral loader. A temporary `onLayout` logs `e.nativeEvent.layout.height` on the hero box, one row and the transfer card, each on the element's own view, reverted with `git status` clean; no bar takes one, since HeroUI `Skeleton` sets its own `onLayout` and a passed one replaces it. `mqa logs --info` reads the lines, called again when a mount's are missing. The `Font scale` force (README) at 1.0 and 2.0 | each row reads the loaded row's height at that scale. The transfer card reads the loaded card's, 133 and 177. The hero box reads 200 at 1.0 and 238 ± 1 at 2.0, the doubled bars and their gaps plus `py-4` and the border, and its pill and last bar stand clear of its border in the 2.0 shot. A shot pair at 2.0, skeleton and loaded: the skeleton's transfer cells stand as tall as the loaded cells. The neutral loader's 2.0 shot matches its 1.0 shot. The 1.0 shots match `main`. The skeleton never goes idle, so each proof is a `shot` or a log line |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back | `/transactions` | n/a |
| edit | the transaction form; after `Save changes`, the toast `Transaction saved.` over this detail (`saved toast after edit, *`) | this detail |
| view commitment | `/stacked/commitments/[id]`, above the tabs (MA-072) | this detail |

## Gotchas

- `TypeBadge` is shared with the transaction row, which renders it at `sm`. The two sizes are measured once each, `sm` on `transactions.md` and `md` here; a divergence is a caller override.
- The badge wrapper carries `accessibilityRole="text"`, so it reaches the accessibility tree: read the label `TextView` for the line box and the wrapper for the padded height.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
