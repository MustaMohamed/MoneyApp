# Add commitment

Route `/commitments/add`. Screen `src/modules/commitments/screens/commitments/add_commitment/index.tsx`; the Recurrence and Duration groups (`components/recurrence_picker.tsx`, `components/duration_picker.tsx`) render the shared `SelectablePill` from `src/components/ui/chip.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-087 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Commitments` tab, then the FAB (`Add`) and its `Add Commitment` item.
- Script: `mqa open /commitments/add`, or the `Commitments` tab by its exact content-desc from `mqa ui`, then the FAB's `Add Commitment` (`commitments.md` § Outbound); the bare `$MQA tap 'Commitments'` is refused under the uiautomator engine.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| recurrence and duration pills, no adornment | no frame, MA-087 | the form as it mounts | every `SelectablePill` in the Recurrence and Duration groups is a clickable `button` node whose bounds ÷ 2.625 read 25 high (`lineHeightFor(msFont(11))` = 15, plus `py-1` and the 1 dp `border` pair), its label `TextView` 15, at every label length; one shot of the two groups |
| save button, large font | no frame, MA-130 | the add form, then edit from a seeded commitment's detail; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the save button on each; one crop at 2.0 on each |
| amount half-typed | no frame, MA-115 | `$MQA open /commitments/add`, `$MQA tap 'label="Save Commitment"'` with the form empty; the amount has no testID and reads `field "0.00"` while empty and `field "<its text>"` after, taken by its `@ref`; `fill` it with `0`, `0.`, `0.0`, `0.05`, `0.001` | `Amount is required for fixed commitments` after Save; no line under the amount at the first four, `Amount must be at least 0.01` at the last; `Save Commitment` 379.4 by 48.00 at y 562.3 throughout; one shot at `0.` |
| account picker, overdrawn account | no frame, MA-156 | the overdrawn seed (`accounts_list.md` § States, `overdrawn bank row`); `$MQA open /commitments/add`, `$MQA scroll down --until 'label="Default Account"'`, since the field sits below the fold on the 411 by 731 dp viewport, then `$MQA tap 'label="Default Account"'` (`commitment_form_body.tsx:386`) | `account-picker-row-<Walk Overdrawn's id>` reads `−1,900 EGP` with U+2212; `grep -c -- '-1,900'` over `mqa read` is 0; no shot, the row is the `AccountRowContent` shot on `commitment_detail.md` § States, `pay sheet, overdrawn account` |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back / cancel | `/commitments` | n/a |
| save | `/commitments`, the new row in the list | n/a |

## Gotchas

- `SelectablePill` is shared with the commitments and transactions filter sheets (`FilterOptionPillList`, `filter_accordion.tsx`). Its two container branches are measured once each: the adornment-free branch here (`px-3 py-1`, 25) and the adornment branch on `commitments.md` (`px-2.5 py-1.5`, 29). Both numbers include `SelectablePill`'s own 1 dp `border` pair, which the label-plus-padding arithmetic alone misses. A divergence is a caller override.
- The pill's `Chip` carries `accessibilityRole="button"`, so unlike a padded badge it reaches the accessibility tree and is measured directly.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
