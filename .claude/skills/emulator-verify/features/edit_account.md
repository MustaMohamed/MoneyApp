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
| validation error, zero shift | D3 | clear the name, `$MQA tap 'Save'` | error under the field, no layout shift against D1 in `mqa bounds`; the status track reads `Fix the 1 field marked above.` (MA-105); shot |
| duplicate name including archived | no frame, ruled MA-074 | type an archived account's name | refusal copy; db unchanged |
| whitespace or invisible name | no frame, MA-054 and MA-064 | `$MQA type '   '` | refused; `mqa db` name unchanged |
| save failure | F3 | source force on the update | `Couldn't save your changes. Nothing was changed. Try again.` in the status track; db unchanged; shot |
| saved, reload failed | no frame, MA-075 ruling | source force on the reload | dismisses to the accounts list, not the detail; db updated |
| keyboard up on Android | no frame, MA-078 | tap a field | disabled rows keep their disabled look; `Save` reachable |
| footer, large font | no frame, MA-130 | the edit form; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the footer buttons; one crop of the footer at 2.0 |
| credit card, amounts half-typed | no frame, MA-115 | `$MQA open /accounts/<a card's id>/edit`; the limit has no testID and reads `field "<its stored text>"`, then `field "Credit limit"` once empty, taken by its `@ref`: `$MQA tap <@ref>`, `$MQA clear`, `$MQA tap 'label="Save changes"'`; then the limit `0`, `0.`, `48.`, `0.001`, each typed after a settled clear (`$MQA tap <@ref>`, `$MQA clear`, `$MQA type <text>`) | `Credit limit is required for credit cards` under the limit after Save, no line there at `0`, `0.` and `48.`, `Numbers only.` at `0.001`; the status track is not in `mqa read`, so its line is read off the shots: `Fix the 1 field marked above.` after Save and at `0.001`, the footnote `Changes apply everywhere this account appears.` at `48.`; no layout shift in `mqa bounds`, as `validation error, zero shift` reads it: `Due day, optional` y 475.8 to 476.2, `Track interest` y 563.0 to 563.4, `Save changes` y 651.4; shots after Save, at `48.` and at `0.001` |
| bank overdrawn, locked opening balance | no frame, MA-156 | the overdrawn seed (`accounts_list.md` § States, `overdrawn bank row`): `$MQA open /accounts/<Walk Overdrawn's id>/edit` | the locked `Opening balance` field reads `−1,900` with U+2212; `grep -c -- '-1,900'` over `mqa read` is 0; one shot of the locked row, `--crop '~−1,900'` (the field; `~Opening balance` crops to the label alone) |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| `Save` | detail, updated | accounts list |
| `Cancel` or Back | detail, unchanged | n/a |

## Gotchas

- The credit draft always carries two decimals (MA-078 ruling).
- Three shared credit strings changed to the canvas copy on MA-074; the add form and N2 show the same strings.
