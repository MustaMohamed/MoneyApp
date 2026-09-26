# Account detail, active

Route `/accounts/[id]`. Screen `src/modules/accounts/screens/accounts/detail/index.tsx`, hero `detail/components/balance_hero.tsx`, facts `account_fact_row.tsx`, activity `account_activity_card.tsx`, sheet `adjust_balance_sheet.tsx`, dialog `archive_confirmation_dialog.tsx`, alert `balance_review_alert.tsx`. Frames C1, C2, C2b, C3, F2, G1, G2.

## Reach it

- User path: accounts list row tap, or the dashboard account card.
- Script: `id=$($MQA db "select id from accounts where name='<n>'" | sed -n 's/.*"id": "\(.*\)".*/\1/p')` then `$MQA tap '<n>'` from the list. There is no deep link with an id in the recipes yet; add one here when `moneyapp://accounts/<id>` is confirmed.
- Header: title is the account name, `Edit` on the right. There is no `More`: `Archive` is a body button beside `Adjust balance` (`detail/index.tsx:199-206`).

## States

The canvas draws one account type per frame. Every state below is checked on a bank account and on a credit card unless the row says otherwise; the card variant is the one three tickets found missing.

| State | Frame | Force | Proof |
|---|---|---|---|
| bank with recent activity | C1 | seeded bank with 3+ transactions this month | hero balance, `This month in` / `This month out`, activity rows; shot |
| credit card, under limit | C2 (`CardsDetail`) | seeded card with limit, min payment, due day, APR | facts render limit, available, min, due, APR two decimals with `%`; shot |
| credit card, over limit | no frame, ruled MA-029 | seed `current_balance` past `credit_limit` | caption `Over limit` on hero, dashboard and list; `mqa ui` |
| bank overdrawn | no frame, ruled MA-027 | seed negative balance | sign is U+2212 on the hero; `mqa ui` |
| balance review alert | C2b | seed a card flagged for review | alert card with `Adjust balance`; shot |
| no transactions | C3 | seeded account with none | activity empty block, `Add a transaction`; shot |
| activity loading | F2 | source force on the activity resolver | skeleton in the activity card; shot |
| activity load error | no frame, ruled at `/boundaries 384` | source force | inline `LoadErrorAlert` in the activity card's place, `Try again` |
| adjust balance sheet, positive | G1 | `$MQA tap 'Adjust balance'` | sheet open, prefilled; shot |
| adjust balance sheet, overdrawn | no frame, MA-030 | on the overdrawn bank | prefill carries the sign; keyboard carries the minus; `mqa ui` |
| adjust balance sheet, keyboard up | no frame, MA-033 | tap the amount field | `Save` reachable above the keyboard; shot |
| archive dialog | G2 | `$MQA tap 'Archive'` on the body button | title `Archive <name>?`, body from `accountDetailArchiveBody`, flat buttons; shot |
| archive failure | no frame, MA-046 | source force on the write | error copy; db unchanged |
| status badge line box | C1/C2, MA-086 | the hero as it mounts on each account | the badge label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(10))` = 14 ± 1 high, so the pill is 14 + 4 (`py-0.5`) = 18, on both; one shot per account. The `md` size has no live site and rests on the lint pair alone |
| blank-named | no frame, MA-059 | seed push `name = ''` | header and hero read `Unnamed account` |
| activity row, tile off | no frame, MA-090 | the seeded bank's expense with a note, dated today | one shot: no account tile, the category glyph before the title, caption `<note> · Today, <time>`; the row's bounds ÷ 2.625 read `ms(60)` = 63 ± 1 on the 411 dp Pixel_2 |
| activity row, transfer | no frame, MA-090 | a transfer from the open account | one shot: the other account's single 28 tile, caption `<from> → <to> · <day label>` |
| activity row, card payment, paid card | no frame, MA-090 | open the card a bank paid | `mqa ui` reads `From <payer> · <day label>`; one shot of the payer's tile |
| activity row, glyph recoloured | no frame, MA-103 | the MA-103 seed (`categories.md` § Seeding and forcing states): open `Walk Bank`, whose activity card holds the Housing, Bills and Subscriptions expenses | one shot of the activity card: the glyphs in `#5C7FC4`, `#5C7FC4` and `#B264A7` on the card fill |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `See all` in the activity card | Transactions filtered to this account, current month (C5) | this detail |
| activity row tap | transaction detail, stacked twin above the tabs | this detail |
| `Add a transaction` (C3) | add form with this account preselected | this detail |
| `Edit` | `/accounts/[id]/edit` (MA-078; until it merges, the inline edit) | this detail |
| `Archive` confirmed | archived detail (C4) | accounts list |
| Back | accounts list, or the dashboard when opened from its card | n/a |

## Gotchas

- Every push from here into a tab screen needs the stacked twin (MA-040); a bare `(tabs)` href mounts a second tab bar and the shot shows two.
- A committed write whose reload fails must not read as a failed write (MA-069); a failure state shot is judged against `mqa db`, not the toast alone.
- The hero's `.id-bal` is 30 point with a 16 point `.cur` span at 80% opacity; measure with `mqa bounds`, which prints dp.
- The activity card's `Recent activity` title is the shared `section_header.tsx`, rendered on both branches (`account_activity_card.tsx:46,51`) and measured once as `section title` in `dashboard.md` § States (16); that read holds here and needs no state of its own.
