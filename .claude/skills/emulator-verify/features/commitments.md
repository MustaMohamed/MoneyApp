# Commitments

Route `/commitments`, a tab. Screen `src/modules/commitments/screens/commitments/index.tsx`, summary `components/summary_header.tsx`, search and filter row `components/search_row.tsx`, filter sheet `filter/index.tsx` over the shared `src/components/ui/filter_accordion.tsx`, month pill from `src/components/ui/filter_rail.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-086 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Commitments` tab.
- Script: `adb shell am start -a android.intent.action.VIEW -d "moneyapp://commitments"`, or the tab bar's exact content-desc from `mqa ui`; the bare `$MQA tap 'Commitments'` is refused.
- The filter sheet opens from the tune icon beside the search field: `$MQA tap` by its accessibility label `Filter` (`Filter, N active` once a filter is on).

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| summary percentage pill | no frame, MA-086 | any seeded commitment, so the summary header leaves its skeleton | the `%` label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(13))` = 18 ± 1 high, so the pill is 18 + 4 (`py-0.5`) = 22; one shot of the summary card |
| filter accordion count pill | no frame, MA-086 | open the filter sheet, expand one accordion, select two options | the count label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(10))` = 14 ± 1 high — the pill has no vertical padding, so that is the pill — and label width + 12 (`px-1.5`) clears the `min-w-[18px]` floor; one shot of the accordion header row |
| row status pill | no frame, MA-087 | seed payments in the five statuses (`Overdue`, `Due`, `Upcoming`, `Paid`, `Skipped`, `commitment_status.ts:23-29`); `Paid` and `Skipped` may need the status filter to show | each status label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(10))` = 14 ± 1, so the pill is 14 + 4 (`py-0.5`) = 18, and the five pills are equal on one shot of the list |
| filter sheet option pill, with adornment | no frame, MA-087 | open the filter sheet, expand `Category` | each option label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11))` = 15 ± 1; the pill is the clickable `button` node (`accessibilityRole="button"`), 29 high (15 + `py-1.5` + the 1 dp `border` pair) at every label length; one shot of the expanded accordion |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| commitment row tap | `/stacked/commitments/[id]`, above the tabs | this list |
| `Filter` | the filter sheet over this screen | this list |
| the month pill | the month picker sheet | this list |
| the FAB (`Add`), then `Add Commitment` | `/commitments/add` | this list |
| Back | the previous tab | n/a |

## Gotchas

- The count pill draws only at `count > 0`: an accordion with nothing selected has no pill to measure.
- `filter_accordion.tsx` is shared with the transactions filter sheet; a height read here holds there, and a divergence is a caller override.
- The accordion pill has no vertical padding, so its height is the line box alone — 14, not 18 like the padded pills.
- The month pill in the rail is the shared `month_filter.tsx`, measured once as `month filter pill` in `transactions.md` § States; that read holds here, so do not re-measure it — a divergence is a caller override.
- This list's group headers are `DateHeader`, not the shared `section_header.tsx` (`index.tsx:123-127`), and read 14 — the `section title` state belongs to `dashboard.md` and `accounts_list.md`.
- The row status pill is a `View` with no touch handler: it is flattened out of `ui.xml`, so read the label `TextView` and add `py-0.5`, or measure the painted pill on the shot.
- `FilterOptionPillList` renders the shared `SelectablePill` and is the same component the transactions filter sheet renders; the adornment branch is measured here and the adornment-free branch on `add_commitment.md`, one read each.
- A deep link does not dismiss an open bottom sheet: the filter sheet stays mounted over the next screen and its nodes answer the reads. `am force-stop` before the next state.
- The tab bar's clickable node carries the icon glyph before the label (`B, Budget` on Budget), so `$MQA tap 'Commitments'` matches only the non-clickable text and is refused; tap the exact content-desc from `mqa ui`, or use the deep link.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
