# Add commitment

Route `/commitments/add`. Screen `src/modules/commitments/screens/commitments/add_commitment/index.tsx`; the Recurrence and Duration groups (`components/recurrence_picker.tsx`, `components/duration_picker.tsx`) render the shared `SelectablePill` from `src/components/ui/chip.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-087 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Commitments` tab, then the add action in the header.
- Script: `adb shell am start -a android.intent.action.VIEW -d "moneyapp://commitments/add"`, or `$MQA tap 'Commitments'` then the add action (`commitments.md` § Outbound).

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| recurrence and duration pills, no adornment | no frame, MA-087 | the form as it mounts | every `SelectablePill` in the Recurrence and Duration groups is a clickable `button` node whose bounds ÷ 2.625 read 25 high (`lineHeightFor(msFont(11))` = 15, plus `py-1` and the 1 dp `border` pair), its label `TextView` 15, at every label length; one shot of the two groups |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back / cancel | `/commitments` | n/a |
| save | `/commitments`, the new row in the list | n/a |

## Gotchas

- `SelectablePill` is shared with the commitments and transactions filter sheets (`FilterOptionPillList`, `filter_accordion.tsx`). Its two container branches are measured once each: the adornment-free branch here (`px-3 py-1`, 25) and the adornment branch on `commitments.md` (`px-2.5 py-1.5`, 29). Both numbers include `SelectablePill`'s own 1 dp `border` pair, which the label-plus-padding arithmetic alone misses. A divergence is a caller override.
- The pill's `Chip` carries `accessibilityRole="button"`, so unlike a padded badge it reaches `ui.xml` and is measured directly.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
