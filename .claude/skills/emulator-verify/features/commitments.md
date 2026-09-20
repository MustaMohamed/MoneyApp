# Commitments

Route `/commitments`, a tab. Screen `src/modules/commitments/screens/commitments/index.tsx`, summary `components/summary_header.tsx`, search and filter row `components/search_row.tsx`, filter sheet `filter/index.tsx` over the shared `src/components/ui/filter_accordion.tsx`, month pill from `src/components/ui/filter_rail.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-086 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Commitments` tab.
- Script: `$MQA tap 'Commitments'` on the tab bar, or `adb shell am start -a android.intent.action.VIEW -d "moneyapp://commitments"`.
- The filter sheet opens from the tune icon beside the search field: `$MQA tap` by its accessibility label `Filter` (`Filter, N active` once a filter is on).

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| summary percentage pill | no frame, MA-086 | any seeded commitment, so the summary header leaves its skeleton | the `%` label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(13))` = 18 ± 1 high, so the pill is 18 + 4 (`py-0.5`) = 22; one shot of the summary card |
| filter accordion count pill | no frame, MA-086 | open the filter sheet, expand one accordion, select two options | the count label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(10))` = 14 ± 1 high — the pill has no vertical padding, so that is the pill — and label width + 12 (`px-1.5`) clears the `min-w-[18px]` floor; one shot of the accordion header row |
| month filter pill | no frame, MA-086 | the rail as it mounts | the pill is the clickable `<label>, open month picker` node: its bounds ÷ 2.625 read 32 high (`h-8`), and the label `TextView` inside sits centred within ± 1 (8.4 above, 8.4 below, at `lineHeightFor(msFont(11))` = 15); one shot of the rail |

## Outbound

| Action | Lands on | Back lands on |
|---|---|---|
| commitment row tap | `/stacked/commitments/[id]`, above the tabs | this list |
| `Filter` | the filter sheet over this screen | this list |
| the month pill | the month picker sheet | this list |
| Back | the previous tab | n/a |

## Gotchas

- The count pill draws only at `count > 0`: an accordion with nothing selected has no pill to measure.
- `filter_accordion.tsx` is shared with the transactions filter sheet; a height read here holds there, and a divergence is a caller override.
- The accordion pill has no vertical padding, so its height is the line box alone — 14, not 18 like the padded pills.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
