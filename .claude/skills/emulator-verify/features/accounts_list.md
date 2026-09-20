# Accounts list

Route `/accounts`. Screen `src/modules/accounts/screens/accounts/list/index.tsx`, rows in `list/components/`, archived card in `list/components/archived_card.tsx`. Frames B1 (`Main.dc.html`), B2 to B7, F1, G3, entry A1.

## Reach it

- User path: Dashboard, Accounts segment, `See all` (A1). The segment and the link disappear at zero active accounts.
- Script: `$MQA tap 'See all'` from the dashboard, or the deep link `moneyapp://accounts` when the dashboard hides the segment.
- Header title `Accounts`, section label `Your accounts`, `+` in the header opens the add form.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| populated, all five types | B1 | seed with one bank, cash, wallet, savings and card | `mqa ui \| grep -c` each name = 1; one shot for row geometry |
| zero active, archived present | B2 | seed: every account `is_archived = 1` | `Your accounts` absent, `Archived` card present; shot |
| no accounts at all | B3 | `mqa reset`, finish onboarding with one account, delete it | empty title from `strings.ts` `accountsList*Empty*`; `+` present in header; shot |
| archived card collapsed | B4 | one archived account, fresh mount | `Archived` present, the archived row absent |
| archived card expanded | B5 | `$MQA tap 'Archived'` | archived row present with `type · balance` caption and `Unarchive` |
| filtered to one type | B7 | `$MQA tap '<type>'` on the rail | rows of other types absent; the archived card follows the filter (MA-048): only archived rows of the selected type, no card when none |
| filtered to zero | no frame, ruled MA-022 | filter to a type with no active account | the shipped filtered empty state; no `+` change |
| load error | F1 | source force in the list resolver | `Couldn't load your accounts` and `Try again`; shot |
| after unarchive | G3 | B5 then `$MQA tap 'Unarchive'` | toast `<name> restored.`; row lands last among active rows; `mqa db "select is_archived from accounts where name='<n>'"` is 0 |
| unarchive name clash | no frame, MA-046 | an active account with the archived name | toast `An active account already has this name. Rename it first.`; db unchanged |
| row lifted mid-drag | B6 | device QA only | gesture feel is not emulator evidence |
| blank-named row | no frame, MA-059 | seed push `name = ''` | row reads `Unnamed account` |
| grip on every active row | B6, MA-084 | seed with n active accounts, All selected | `mqa ui \| grep -c 'content-desc="Reorder '` equals the visible row count (the active count when every row fits); one shot of a row for the glyph |
| grip tap absorbed | B6, MA-084 | All selected | tap the grip by `mqa find 'Reorder <name>'`, never by coordinates: the screen stays on `/accounts` (the `content-desc="Reorder ` nodes are still in `mqa ui`); then tap the row: the account detail opens; one shot per tap |
| after a drop | no frame, MA-085 | All selected, three or more active rows; grip bounds by `mqa find 'Reorder <first name>'` and `mqa find 'Reorder <third name>'`; `adb shell input motionevent DOWN <grip x> <grip y>`, hold 0.9 s, `input motionevent MOVE <grip x> <y>` in steps to the third grip's y, then `input motionevent UP` there. Not `input draganddrop`: its hold reads the default 400 ms whatever `long_press_timeout` says, under the 500 ms lift, so nothing lifts | `mqa db "select name, sort_order from accounts where is_archived = 0 order by sort_order"` shows the first name at index 2; `am force-stop` and relaunch, same query, and the three grips' `mqa find` y order matches it; no toast |
| filtered, reorder off | B7, MA-084 | `$MQA tap '<type>'` on the rail with at least one row of that type | `mqa ui \| grep -c 'content-desc="Reorder '` is 0; `Reorder is off while a filter is on.` present once the card's end is on screen; shot |
| section count badge | B1, MA-086 | seed push one savings, ten bank and one hundred cash accounts, all `is_archived = 0`, All selected | each section badge's `mqa ui` bounds ÷ 2.625 read height 20 ± 1 and width ≥ height at `1`, `10` and `100`; one shot of the `Your accounts` header row, judged against B1 for the title, the action link and the header margins |
| drop after an edge scroll | B6, MA-083 | seed push of twelve active accounts on All, `sort_order` 0 to 11 and `is_archived = 0`, no other active account (eight show on Pixel_2_API_34's 411 by 731 dp viewport, four sit below). Then the MA-085 recipe: grip bounds by `mqa find 'Reorder <first name>'`, `adb shell input motionevent DOWN <x> <y>`, hold 0.9 s, MOVE in steps to a y inside the bottom zone (the scroll's bottom edge minus 32 dp; the edge is the screen bottom minus the bottom inset, no tab bar on `/accounts`), hold 3 s, then UP at the same point | a shot taken during the hold shows rows that were below the fold and the dashed slot under the copy; `mqa db "select name, sort_order from accounts where is_archived = 0 order by sort_order"` puts the first name where the slot showed it, past index 7, and `am force-stop` plus relaunch reads the same; no toast. One shot, one query |

Per-type captions (MA-024) are one row each in B1; a caption check is `mqa ui`, not a shot.

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| row tap | `/accounts/[id]` on the `(app)` stack | this list |
| `+` | `/accounts/add_account` | this list |
| `Try again` on F1 | this list, reloaded | n/a |
| Back | Dashboard, Overview segment (ruled MA-023) | n/a |

## Gotchas

- The dashboard drops the Accounts segment at zero active accounts; use the deep link for B2 and B3.
- Toasts clear the tab bar and the `+` button (MA-077); a toast shot is judged for that inset.
- The archived card collapses on mount only; a filter change does not reset it.
- The rail scrolls sideways: at 411dp `Credit Card` sits off-screen and `mqa tap` on it does nothing; tap a visible chip.
- `input draganddrop` cannot hold, and a MOVE that stops inside an edge zone keeps the list scrolling until UP, so the mid-hold shot of `drop after an edge scroll` is taken with the finger down.
- A 132 px first MOVE after the hold left the copy about 50 dp above the finger (MA-083, logged `fingerTranslationY` against `absoluteY`). Make the first MOVE a few px when the shot judges the copy against the finger.
