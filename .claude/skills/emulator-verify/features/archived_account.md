# Archived account and the delete flow

Route `/accounts/[id]` when `archived_at` is set. Body `detail/components/archived_detail_body.tsx`, delete dialog `delete_confirmation_dialog.tsx`, replacement sheet `replacement_account_sheet.tsx`. Frames C4, E1, E2, E3, E4, F4, F5.

## Reach it

- User path: accounts list, `Archived` card, archived row tap. Or archive an active account from its detail (G2) and stay.
- Script: expand the card, `$MQA tap '<name>'`; or seed `archived_at` and open the row.
- Read-only: no `Edit`, no `Adjust balance`; banner `Archived` with `Hidden from your dashboard and totals. Its history stays.`

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| archived bank, read-only | C4 | seed `archived_at` on a bank with transactions | `Balance when archived`, `Transactions` count, `Commitments paid from it` count, `Unarchive`, `Delete account`; shot |
| archived credit card | no frame, ruled MA-049 and MA-056 | same on a card | the bank's three rows, no card facts; hero not dimmed; `mqa ui` |
| unarchive | G3 on the list | `$MQA tap 'Unarchive'` | lands on the list with the toast `<name> restored.`; `mqa db` archived_at null |
| unarchive name clash | no frame, MA-046 | active account with the same name | refusal copy; db unchanged |
| unarchive reload failure | no frame, MA-065 | source force on the reload | reads as restored, not failed; db archived_at null |
| delete warning, no transactions | E1 | archived account with none | `Nothing is recorded on this account.`; `Keep archived` and `Delete`, flat buttons; shot |
| delete warning, with history | E1 | archived account with transactions | `Its N transactions stay, labelled Deleted Account.`; shot |
| delete blocked by commitments | E2 | archived account paying 1+ active commitments | `Move 1 commitment first`, the replacement sheet with the account picker; shot |
| move and delete | E2, E3 | pick a replacement, `$MQA tap 'Move and delete'` | list with toast counting the moved commitments; `mqa db "select account_id from commitments where id in (...)"` = replacement |
| last archived, no active account | no frame, ruled MA-021 | only account, archived | delete proceeds and the toast says so; list shows B3 |
| delete busy | F4 | source force delay on the write | `Deleting…`, buttons disabled; shot |
| delete failure | F5 | source force on the write | failure copy, dialog stays, db unchanged; shot |
| after delete | E3 | complete a delete | list without the row, toast; shot |
| deleted account row | E4 | open Transactions after a delete with history | rows read `Deleted Account`; transfers keep one direction |
| body buttons, large font | no frame, MA-130 | an archived account's detail, `mqa open /accounts/<id>`; at 2.0 `Delete account` sits below the fold, so `mqa scroll down --until 'label="Delete account"'` first; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the body buttons; one crop at 2.0 |
| delete dialog, large font | no frame, MA-130 | the delete action on an archived account with no commitment; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the dialog's two buttons; one crop of the dialog at 2.0 |
| replacement sheet, large font | no frame, MA-130 | from `delete blocked by commitments`: `Delete account`, then the dialog's `Delete` (it names the commitment that needs another account), then the sheet; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the sheet's footer buttons; one crop of the footer at 2.0 |
| replacement sheet, overdrawn candidate | no frame, MA-156 | the overdrawn seed (`accounts_list.md` § States, `overdrawn bank row`); the path of `replacement sheet, large font` on `Walk Old Overdrawn`: `mqa open /accounts/<its id>`, `Delete account`, the dialog's `Delete`, then the sheet | `replacement-account-row-<Walk Overdrawn's id>` reads `−1,900 EGP` with U+2212; `grep -c -- '-1,900'` over `mqa read` is 0; no shot, the row is the `AccountRowContent` shot on `commitment_detail.md` § States, `pay sheet, overdrawn account` |
| header title, large font | no frame, MA-159 | an archived account's detail, `mqa open /accounts/<id>`, on the seeded database; the empty database holds no account, so it has no archived view; the `Font scale` force (README) at 1.0 and 2.0 | the `Header proof` (README) on the account's name, no right action |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `Unarchive` | accounts list, row last among active | n/a |
| `Delete` confirmed | accounts list (E3) | n/a |
| `Keep archived` | this screen | n/a |
| Back | accounts list, archived card expanded | n/a |

## Gotchas

- The soft delete is DML only, no ON DELETE migration (epic ruling 2026-09-07); assert on `deleted_at`, never on a missing row.
- Editing or deleting a transaction on an archived account is refused (MA-053); a transaction row from C4 shows no actions.
- The delete warning's closing sentence was dropped by ruling on MA-038; the canvas E1 still shows it. The app is right.
