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
| zero active, archived present | B2 | seed: every account `archived_at` set | `Your accounts` absent, `Archived` card present; shot |
| no accounts at all | B3 | `mqa reset`, finish onboarding with one account, delete it | empty title from `strings.ts` `accountsList*Empty*`; `+` present in header; shot |
| archived card collapsed | B4 | one archived account, fresh mount | `Archived` present, the archived row absent |
| archived card expanded | B5 | `$MQA tap 'Archived'` | archived row present with `type · balance` caption and `Unarchive` |
| filtered to one type | B7 | `$MQA tap '<type>'` on the rail | rows of other types absent; the archived card ignores the filter |
| filtered to zero | no frame, ruled MA-022 | filter to a type with no active account | the shipped filtered empty state; no `+` change |
| load error | F1 | source force in the list resolver | `Couldn't load your accounts` and `Try again`; shot |
| after unarchive | G3 | B5 then `$MQA tap 'Unarchive'` | toast `<name> restored.`; row lands last among active rows; `mqa db "select archived_at from accounts where name='<n>'"` is null |
| unarchive name clash | no frame, MA-046 | an active account with the archived name | toast `An active account already has this name. Rename it first.`; db unchanged |
| row lifted mid-drag | B6 | device QA only | gesture feel is not emulator evidence |
| blank-named row | no frame, MA-059 | seed push `name = ''` | row reads `Unnamed account` |

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
