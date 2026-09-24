# Transactions

Route `/transactions`, a tab. Screen `src/modules/transactions/screens/transactions/index.tsx`, month pill from `src/components/ui/filter_rail.tsx`, filter sheet `filter/index.tsx` over the shared `src/components/ui/filter_accordion.tsx`. Frames B1 and B2 come from the transactions canvas (https://claude.ai/artifact/7QJH3AFeoQAXtWmx5vAP2s, epic #543), not `~/.ship/MoneyApp/canvas/`, whose B1 and B2 are the accounts list.

## Reach it

- User path: the `Transactions` tab, or `See all` in an account detail's activity card.
- Script: `adb shell am start -a android.intent.action.VIEW -d "moneyapp://transactions"`, or the tab bar's exact content-desc from `mqa ui`; the bare `$MQA tap 'Transactions'` is refused.
- The filter sheet opens from the tune icon beside the search field: `$MQA tap` by its accessibility label `Filter` (`Strings.filterSearchButtonAccessibility`; `Filter, N active`, `Strings.filterAccessibilityWithActiveCount`, once a filter is on).

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| month filter pill | no frame, MA-086 | the rail as it mounts | the pill is the clickable `<label>, open month picker` node: its bounds ÷ 2.625 read 32 high (`h-8`), and the label `TextView` inside sits centred within ± 1 (8.4 above, 8.4 below, at `lineHeightFor(msFont(11))` = 15); one shot of the rail |
| type badge, sm | no frame, MA-087 | a transaction owned by a commitment payment (`commitment_payment_id` set — pay a commitment, or seed push) | the row badge label (`Strings.typeBadgeCommitment`) `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(9.5))` = 13 ± 1, so the badge is 19 (13 + `py-[2px]` + the 1 dp `border` pair), and the row height is unchanged from base (`TRANSACTION_ROW_HEIGHT`); one shot of the row |
| compact tab label | no frame, MA-087 | the rail as it mounts, one segment selected | the selected and an unselected segment label `TextView` both read `lineHeightFor(msFont(11))` = 15 ± 1, centred in the 28 trigger (`h-7`) within ± 1; one shot of the rail |
| filter sheet footer, flat | B1, B2, MA-100 | open the filter sheet, expand `Accounts`, select two options | the Reset and Apply button nodes' bounds ÷ 2.625 read 48 ± 1 high (HeroUI `md`, not `Size.ctaHeight` 52); Apply reads `Apply (1)` (the count is `countActiveFilters`, one per active dimension, so two accounts count once) on a single accent fill with no gradient stop, Reset a foreground label on the secondary fill; one shot of the footer |
| filter sheet footer, disabled | B2, MA-100 | open the filter sheet with an empty draft | Reset and Apply nodes read `enabled=false` at 48 ± 1 high; Apply is the flat accent fill under HeroUI's disabled opacity, no gradient; one shot of the footer |
| page two after a detail round-trip | no frame, MA-089 | seed push 45 or more expenses dated in the current month, each with a distinct note; open the tab and scroll until a row past the 30th is on screen | before the tap, `mqa ui` records the topmost fully visible row's note and bounds; tap a row, Back, and let the focus refresh settle, with no refresh spinner shown: the same row sits at the same bounds ± 1 dp and a row past the 30th is still on screen; two shots, before the tap and after Back |
| row, expense | A1, MA-090 | a categorised EGP expense with a note | the title `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(15))` = 21 ± 1 on the 411 dp Pixel_2 (SCALE 1.055), the caption `lineHeightFor(msFont(11))` = 15 ± 1, the row `ms(60)` = 63; `mqa ui` reads `<note> · <h:mm AM\|PM>`, and `−<amount>` and `EGP` as separate nodes; one shot of the row: the 28 account tile in the account colour, the 14 category glyph in the category colour before the title |
| row, USD expense | A1, MA-090 | seed push a USD expense with `exchange_rate` set | `mqa ui` reads `≈ <egp> EGP @ <rate>` as its own node under `−<amount>` with two decimals |
| row, transfer | A1, MA-090 | an EGP → USD transfer | `mqa ui` reads `<from> → <to> · <time>` and an unsigned amount over `→ <to_amount> USD`; one shot of the two overlapped 24 tiles, the second 16 in, ringed in the background, the amount info blue |
| row, card payment | A1, MA-090 | a card payment from a bank to a card | as the transfer, the caption `<from> → <card> · <time>`; one shot, the glyph and the amount in the card accent (plum) |
| row, card credit | no frame, C13 caption, MA-090 | an income on a credit card | one shot: the tile in the card's colour, the `credit-card-refund` glyph and `+<amount>` in info blue |
| row, deleted counterparty | no frame, Finding 11, MA-090 | soft-delete an account that has a transaction (`archived_account.md` E4) | one shot of the hollow graphite tile; the row's content-desc in `mqa ui` reads `Deleted Account` |
| row, archived account | no frame, MA-090 | archive an account that has a transaction | one shot: the tile filled in its colour, no archived treatment; the row's content-desc in `mqa ui` reads the account name |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| transaction row tap | `/transactions/detail/[id]`, or the `/stacked` twin when reached from a stacked screen | this list |
| `Filter` | the filter sheet over this screen | this list |
| the month pill | the month picker sheet | this list |
| Back | the previous tab | n/a |

## Gotchas

- `month_filter.tsx` is shared with commitments and budget; a height read here holds there, and a divergence is a caller override.
- This list's group headers are `DateHeader`, not the shared `section_header.tsx` (`index.tsx:82-86`); the `section title` state belongs to `dashboard.md` and `accounts_list.md`.
- `TypeBadge` renders at `sm` in the row and `md` in the detail hero; `md` is measured on `transaction_detail.md`.
- The compact `SegmentedTabs` is shared with the accounts-list rail and the transaction form's type tabs; one read holds on all three, and a divergence is a caller override.
- `adjustsFontSizeToFit` with a 0.85 floor can shrink a long compact label below 11 px — read a short label for the line box, and judge a shrunk one against the 28 track only.
- The pill's `h-8` is a fixed track: its height does not move with the label, so the pill state is about the label sitting centred in the track, not about the track growing.
- A deep link does not dismiss an open bottom sheet: the filter sheet stays mounted over the next screen and its nodes answer the reads. `am force-stop` before the next state.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
