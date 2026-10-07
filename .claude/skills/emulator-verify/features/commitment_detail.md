# Commitment detail

Route `/stacked/commitments/[id]` from the list, `/commitments/[id]` on the tab stack. Screen `src/modules/commitments/screens/commitments/detail/index.tsx`, current-cycle card `detail/components/current_cycle_card.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-087 needs — add the rest when a ticket reaches them.

## Reach it

- User path: a commitment row on the `Commitments` tab (`commitments.md` § Outbound).
- Script: `$MQA tap '<commitment name>'` on the list; the row pushes the `/stacked` twin, so the detail sits above the tabs.

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| current-cycle status pill | no frame, MA-087 | open a commitment whose current payment is in each of `Overdue`, `Due`, `Upcoming`, then `Paid` after `Mark as paid` | the status label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11))` = 15 ± 1, so the pill is 15 + 4 (`py-0.5`) = 19 at every status; one shot per status of the current-cycle card |
| hero amount, neutral | no frame, MA-103 | the MA-103 seed (`categories.md` § Seeding and forcing states): open `Walk Rent` from its list row | `mqa read` carries the amount `TextView`; one shot of the hero: the amount in the foreground colour, not the category tone, and the glyph still in `#5C7FC4` |
| current cycle actions, large font | no frame, MA-130 | a seeded commitment with a cycle due, from the list: `$MQA open /commitments`, then `$MQA tap '~<name>'` (at 2.0 `mqa scroll down --until '~<name>'` first); a deep link to `/stacked/commitments/<id>` draws `Commitment not found`, since the list's store has not loaded; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the current cycle card's buttons, `Skip` beside its neighbour inside the card; one crop of the card at 2.0 |
| pay sheet, large font | no frame, MA-130 | the current cycle's pay action; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the sheet's footer buttons; one crop at 2.0 |
| load error retry, large font | no frame, MA-130 | source force: `commitmentRepository.getPaymentsByCommitment(commitmentId)` in `src/modules/commitments/screens/commitments/detail/detail.hook.ts` becomes `Promise.reject(new Error('forced'))`, then open the commitment from the list as `current cycle actions, large font` does, which draws `firstLoadError`; reverted after; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the retry button; one crop at 2.0 |
| pay sheet, amount and rate half-typed | no frame, MA-115 | a variable USD commitment and an EGP account; `$MQA open /commitments`, `$MQA tap '~<the commitment's name>'`, `$MQA tap 'label="Mark as Paid"'`, `$MQA tap 'id="exchange-rate-row"'` to override, `$MQA tap 'label="Confirm Payment"'` with the amount empty; the amount has no testID and is the sheet's first `field` in `mqa read`, `field "0.00"` while empty, taken by its `@ref`: `fill` it with `48.`, `0`, `0.0`, `0.001`; the rate is `id="exchange-rate-input"`: type `48.` after a settled clear (`$MQA tap`, `$MQA clear`, `$MQA type`), then `fill` `0` and `48x`. A `fill` sends the clear and the text back to back, and the first one on the rate left `Enter the exchange rate` under `48.` in two walks | `Amount is required` after Confirm Payment; no line under the amount at the first three, `Amount must be at least 0.01` at `0.001`; no rate line at `48.` and `0`, `Enter a valid rate greater than 0` at `48x`; `Confirm Payment` 377.1 by 48.00 at y 659.4 throughout; one shot per field at `48.` |
| pay sheet, overdrawn account | no frame, MA-156 | the overdrawn seed (`accounts_list.md` § States, `overdrawn bank row`): its commitment stays on the archived `Walk Old Overdrawn`, so the detail reads `DEFAULT ACCOUNT, None` and the sheet prefills the first active account by `sort_order` (`pay_sheet.hook.ts:277-283`), which the seed makes `Walk Overdrawn`. Open the commitment from the list (`$MQA open /commitments`, `$MQA tap '~<name>'`), then `$MQA tap 'label="Mark as Paid"'` | under `PAY FROM ACCOUNT` the account line reads `−1,900 EGP` as the sheet opens. The line has no label of its own and reads as its children's texts joined, so `$MQA tap '~Walk Overdrawn, −1,900 EGP'` opens the picker (`label="Walk Overdrawn"` is the name text, which takes no tap), where `id="account-picker-row-<Walk Overdrawn's id>"` reads `−1,900 EGP`. No pick: that row is already the selected one. `grep -c -- '-1,900'` over each read is 0; one shot of the account line and one of the picker row, the one shot of `AccountRowContent` that `transaction_form.md`, `add_commitment.md` and `archived_account.md` cite |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| Back | `/commitments` | n/a |
| edit | `/stacked/commitments/[id]/edit` | this detail |
| `Mark as paid` / `Skip` | this detail, the cycle card restated | n/a |

## Gotchas

- The pill is a `View` with no touch handler, so it is flattened out of the accessibility tree: read the label `TextView` and add `py-0.5` (2 dp each side), or measure the painted pill on the shot (`README.md` § The rule).
- A cold deep link to `/commitments/<id>` renders `Commitment not found`; open the detail from its list row (`$MQA tap 'label="<name>, <amount>, <status>"'`).
- `Mark as paid` is the only way to `Paid` without a seed push, and it does not come back — use one commitment per status, or re-push the seed.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
