# Edit account

Route `/accounts/[id]/edit` (MA-078, open at 2026-09-17; until it merges the detail's inline edit is the surface). Screen `src/modules/accounts/screens/accounts/edit_account/index.tsx`, locked rows `edit_account/components/locked_field.tsx`, shared form `src/modules/accounts/components/account_form/`. Frames D1, D2, D3, F3.

## Reach it

- User path: detail, `Edit`.
- Script: from the detail `$MQA tap 'Edit'`.
- Locked: type, currency, opening balance, with the helper `Locked. Use Adjust balance for the current balance.`

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| bank, editable name and colour | D1 | open on a bank | name and colour tile editable, three locked rows; shot |
| credit card, credit block | D2 | open on a card | limit, min payment, due day, APR with currency and `%` suffixes (MA-079); shot |
| validation error, zero shift | D3 | clear the name, `$MQA tap 'Save'` | error under the field, no layout shift against D1 in `mqa bounds`; shot |
| duplicate name including archived | no frame, ruled MA-074 | type an archived account's name | refusal copy; db unchanged |
| whitespace or invisible name | no frame, MA-054 and MA-064 | `$MQA type '   '` | refused; `mqa db` name unchanged |
| save failure | F3 | source force on the update | `Couldn't save your changes. Nothing was changed. Try again.` in the status track; db unchanged; shot |
| saved, reload failed | no frame, MA-075 ruling | source force on the reload | dismisses to the accounts list, not the detail; db updated |
| keyboard up on Android | no frame, MA-078 | tap a field | disabled rows keep their disabled look; `Save` reachable |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `Save` | detail, updated | accounts list |
| `Cancel` or Back | detail, unchanged | n/a |

## Gotchas

- The credit draft always carries two decimals (MA-078 ruling).
- Three shared credit strings changed to the canvas copy on MA-074; the add form and N2 show the same strings.
