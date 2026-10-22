# Add commitment

Route `/commitments/add`. Body `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx`; the Recurrence and Duration groups (`components/recurrence_picker.tsx`, `components/duration_picker.tsx`) render the shared `SelectablePill` from `src/components/ui/chip.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-087 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Commitments` tab, then the FAB (`Add`) and its `Add Commitment` item.
- Script: `mqa open /commitments/add`, or the `Commitments` tab by its exact content-desc from `mqa ui`, then the FAB's `Add Commitment` (`commitments.md` § Outbound); the bare `$MQA tap 'Commitments'` is refused under the uiautomator engine.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| recurrence and duration pills, no adornment | no frame, MA-087 | the form as it mounts | every `SelectablePill` in the Recurrence and Duration groups is a clickable `button` node whose bounds ÷ 2.625 read 25 high (`lineHeightFor(msFont(11))` = 15, plus `py-1` and the 1 dp `border` pair), its label `TextView` 15, at every label length; one shot of the two groups; the pill's corners read `SOLID_GOLD_SELECTED_RADIUS` (`Radius.md` − `TABS_LIST_PADDING`, 9 at the 390 baseline) on a crop, not a full round (MA-206) |
| save button, large font | no frame, MA-130 | the add form, then edit from a seeded commitment's detail; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the save button on each; one crop at 2.0 on each |
| amount half-typed | no frame, MA-115 | `$MQA open /commitments/add`, `$MQA tap 'label="Save Commitment"'` with the form empty; the amount has no testID and reads `field "0.00"` while empty and `field "<its text>"` after, taken by its `@ref`; `fill` it with `0`, `0.`, `0.0`, `0.05`, `0.001` | `Amount is required for fixed commitments` after Save; no line under the amount at the first four, `Amount must be at least 0.01` at the last; `Save Commitment` 379.4 by 48.00 at y 562.3 throughout; one shot at `0.` |
| account picker, overdrawn account | no frame, MA-156 | the overdrawn seed (`accounts_list.md` § States, `overdrawn bank row`); `$MQA open /commitments/add`, `$MQA scroll down --until 'label="Default Account"'`, since the field sits below the fold on the 411 by 731 dp viewport, then `$MQA tap 'label="Default Account"'` (`commitment_form_body.tsx:386`) | `account-picker-row-<Walk Overdrawn's id>` reads `−1,900 EGP` with U+2212; `grep -c -- '-1,900'` over `mqa read` is 0; no shot, the row is the `AccountRowContent` shot on `commitment_detail.md` § States, `pay sheet, overdrawn account` |
| header title, large font | no frame, MA-163 | the add form (`/commitments/add`), then the edit form from a seeded commitment's detail; the `Font scale` force (README) at 1.0 and 2.0 | `mqa bounds` on the title and on `label="Go back"`: the title one line, whole or ending in a whole `…`, where `main` wraps it to two lines at 2.0; its box inside a `StackHeader` `resolveStackHeaderGeometry(scale).height` ± 1 high on both forms, the account detail's header height (MA-173), centred on the screen ± 1 dp and at `Type.title`, larger than `main`'s `Type.emptyTitle` at 1.0, overlapping neither the back button's box nor the right spacer's by more than 1 dp; one crop of the header at 1.0 and one at 2.0 on each form |
| second commitment by deep link on the mounted screen | no frame, MA-188 | two active commitments made through `/commitments/add`: `Walk Gym`, fixed 900 EGP, and `Walk Cloud`, fixed 15 USD, any category, no default account, each filled with `$MQA fill 'e.g. Rent' <name>` and `$MQA fill '0.00' <amount>`; a Save on an add form reached by `mqa open` goes back to the screen open before the link (Home after `mqa up`), not to `/commitments`, so wait on no list row after it; read `Walk Cloud`'s id with `mqa db "select id from commitments where name = 'Walk Cloud'"`; `$MQA open /commitments` first, so the list's focus load fills the store, since a cold deep link to an edit route leaves at once (`edit_commitment.hook.ts:53-55`); `$MQA tap '~Walk Gym'`, `$MQA tap 'Edit'`, which opens the tabbed `/commitments/<id>/edit`; take the Name by the `@ref` of its `field "Walk Gym"` line, `$MQA tap <@ref>`, `$MQA clear`, `$MQA type 'Typed draft'`; `$MQA tap 'label="Deactivate Commitment"'`, `$MQA wait 'text="Deactivate this commitment?"'`; then `$MQA open /commitments/<Walk Cloud's id>/edit`, the tabbed twin, with no relaunch between | `mqa read` holds `field "Walk Cloud"`, `field "15"` and `group "USD" [selected]`; `grep -c 'Deactivate this commitment?'` over the read is 0; one `mqa back` lands on `Walk Gym`'s detail, not on an edit form; at base the same walk leaves `Deactivate this commitment?` open over `Walk Cloud`'s fields, and one `mqa back` only closes the sheet; `grep -c 'Typed draft'` reads 0 at head and at base, since base re-drafts when the commitment object changes, so only the dialog count and the `mqa back` landing tell head from base; one shot after the link |
| save failed | `E6AddFailed`, MA-205; its layout and wording are the redesign's and MA-222's | `throw new Error('forced');` as the first statement inside `onValid`'s `try` in `add_commitment/add_commitment.hook.ts`, reverted after with `git status` clean of it; `mqa up`, `$MQA open /commitments/add`, `$MQA fill 'e.g. Rent' 'Walk Rent'`, `$MQA fill '0.00' 8000`, any category, `$MQA tap 'label="Save Commitment"'` | `mqa read` finds `Could not save this commitment. Please try again.` (`Strings.commitmentsSaveError`), `field "Walk Rent"` and `field "8000"`; the add form's title still shows and no list row does; the error draws with `numberOfLines={1}` at `Type.micro` (`commitment_form_body.tsx`), so it may end in `…` on the 411 dp viewport, and its fit is MA-222's; one shot of the footer |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back / cancel | `/commitments` | n/a |
| save | `/commitments`, the new row in the list | n/a |

## Gotchas

- `SelectablePill` is shared with the commitments and transactions filter sheets (`FilterOptionPillList`, `filter_accordion.tsx`). Its two container branches are measured once each: the adornment-free branch here (`px-3 py-1`, 25) and the adornment branch on `commitments.md` (`px-2.5 py-1.5`, 29). Both numbers include `SelectablePill`'s own 1 dp `border` pair, which the label-plus-padding arithmetic alone misses. A divergence is a caller override.
- The pill's `Chip` carries `accessibilityRole="button"`, so unlike a padded badge it reaches the accessibility tree and is measured directly.
- MA-188: a deep link to the tabbed /commitments/<id>/edit of a second commitment keeps the mounted screen and re-drafts every field from the new id (edit_commitment.hook.ts); one frame may still draw the first commitment's fields. The stacked link /stacked/commitments/<id>/edit pushes a fresh stacked edit screen over it instead.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
