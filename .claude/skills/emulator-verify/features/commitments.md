# Commitments

Route `/commitments`, a tab. Screen `src/modules/commitments/screens/commitments/index.tsx`, summary `components/summary_header.tsx`, search and filter row `components/search_row.tsx`, filter sheet `filter/index.tsx` over the shared `src/components/ui/filter_accordion.tsx`, month pill from `src/components/ui/filter_rail.tsx`. Not redesigned by #378; drawn as it is today. This file carries only the pill states MA-086 needs — add the rest when a ticket reaches them.

## Reach it

- User path: the `Commitments` tab.
- Script: `mqa open /commitments`, or the tab bar's exact content-desc from `mqa ui`; the bare `$MQA tap 'Commitments'` is refused under the uiautomator engine.
- The filter sheet opens from the tune icon beside the search field: `$MQA tap` by its accessibility label `Filter` (`Filter, N active` once a filter is on).

## States

| State | Frame | Force | Proof |
|---|---|---|---|
| summary percentage pill | no frame, MA-086 | any seeded commitment, so the summary header leaves its skeleton | the `%` label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(13))` = 18 ± 1 high, so the pill is 18 + 4 (`py-0.5`) = 22; one shot of the summary card |
| filter accordion count pill | no frame, MA-086 | open the filter sheet, expand one accordion, select two options | the count label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(10))` = 14 ± 1 high — the pill has no vertical padding, so that is the pill — and label width + 12 (`px-1.5`) clears the `min-w-[18px]` floor; one shot of the accordion header row |
| row status pill | no frame, MA-087 | seed payments in the five statuses (`Overdue`, `Due`, `Upcoming`, `Paid`, `Skipped`, `commitment_status.ts:23-29`); `Paid` and `Skipped` may need the status filter to show | each status label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(10))` = 14 ± 1, so the pill is 14 + 4 (`py-0.5`) = 18, and the five pills are equal on one shot of the list |
| filter sheet option pill, with adornment | no frame, MA-087 | open the filter sheet, expand `Category` | each option label's `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(11))` = 15 ± 1; the pill is the clickable `button` node (`accessibilityRole="button"`), 29 high (15 + `py-1.5` + the 1 dp `border` pair) at every label length; one shot of the expanded accordion |
| row glyph, recoloured | no frame, MA-103 | the MA-103 seed (`categories.md` § Seeding and forcing states): `Walk Rent` on Housing | one shot of the row: the glyph in `#5C7FC4` on its tint box |
| add button clearance, populated | no frame, MA-125 | a seed with enough commitments this month that the list scrolls; the `Font scale` force (README) at 1.0 and 2.0 | scrolled to its end (`mqa scroll down --until` its last row), at both scales, the last text node's bottom from `mqa bounds` is at or above the top of `fab-button`; one shot at 2.0. Not a regression: at 1.0 the in-list empty states (`commitmentsMonth`, `filtered`) centre about 38 dp higher than on `main`, from the list's raised bottom padding |
| add button clearance, empty | no frame, MA-125 | an empty database: the commitments empty state with its add button; the `Font scale` force (README) at 1.0 and 2.0 | at both scales no text node's box from `mqa bounds` intersects `fab-button`'s; one shot at 2.0 |
| add button clearance, load error | no frame, MA-125 | source force: `throw new Error('forced')` as the first line of the `try` in `loadMonthSnapshot` (`commitment.store.ts`, the loader `commitments.hook.ts` calls), reverted after; the `Font scale` force (README) at 1.0 and 2.0 | `commitments-load-error` shows; at both scales no text node's box from `mqa bounds` intersects `fab-button`'s; one shot at 2.0 |
| date header | no frame, MA-092 | any seeded commitment | each group header holds the label alone, its `TextView` bounds ÷ 2.625 read 14 ± 1 high; one shot |
| search field, large font | no frame, MA-126 | a seeded database; the `Font scale` force (README) at 1.0 and 2.0 | `mqa bounds 'label="Search commitments…"'` reads `ms(36)`, 38 ± 1 dp high on `Pixel_2_API_34`, at 1.0 and `resolveSearchFilterRowGeometry(2).input.height` ± 1 at 2.0, and the `Filter` button beside it reads the same height; three crops of the field at 2.0: the placeholder whole, then `fill` the word `rent` and the word whole, then `fill` a query longer than the field, its glyphs cut at neither the top nor the bottom; tap `Clear search` between fills, since the field answers to its placeholder only while empty |
| filter badge, large font | no frame, MA-126 | a seeded database with one sheet filter applied (open `Filter`, expand one accordion, pick one option, `Apply (1)`); the `Font scale` force (README) at 1.0 and 2.0 | `mqa bounds 'id="commitment-filter-badge"'` reads `ms(16)`, 17 ± 1 dp high on `Pixel_2_API_34`, at 1.0 and `resolveSearchFilterRowGeometry(2).badge.height` ± 1 at 2.0, its box inside the `Filter, 1 active` button's; a crop of the button at 2.0: the `1` whole inside the badge, cut at neither the top nor the bottom |
| status rail, large font | no frame, MA-126 | a seeded database; the `Font scale` force (README) at 1.0 and 2.0; at each scale walk the rail one segment at a time: `mqa tapxy` on the visible part of each segment in turn (`mqa tap` on an off-screen segment does nothing); `scrollAlign="visible"` scrolls the tapped segment fully in, so read it right after the tap; then drag the rail left by about half a segment along its centre line from `mqa bounds` with `adb -s <serial> shell input swipe`, since `mqa scroll` moves only up and down | each segment's clickable node reads 28 ± 1 dp high at 1.0 and `resolveSegmentedTabsGeometry(2).compact.triggerHeight` ± 1 at 2.0, its label `TextView` box inside it; a crop of each segment at 2.0 once fully in: its label whole or ending in a whole `…` inside the segment, no glyph cut at the top or bottom; every segment read while selected, since a selected label is bold and shrinks further: from `mqa bounds`, each segment reads twice its 1.0 width ± 1 dp at 2.0, and from its crop, its label's capitals at 2.0 are at least twice their ink height at 1.0, less 2 px |
| month pill, large font | no frame, MA-126 | a seeded database, the rail as it mounts; the `Font scale` force (README) at 1.0 and 2.0 | the clickable `<label>, open month picker` node reads 32 ± 1 dp high at 1.0 and `resolveMonthPillGeometry(2).height` ± 1 at 2.0, its label `TextView` box inside it; a crop of the pill at 2.0: the month label cut at neither the top nor the bottom |
| empty-state button, large font | no frame, MA-126 | an empty database with onboarding complete: the commitments empty state; the `Font scale` force (README) at 1.0 and 2.0 | `mqa bounds 'label="Add Commitment"'` reads 48 ± 1 dp high at 1.0 and at 2.0 (HeroUI `md`, fixed), its label `TextView` box inside it; a crop of the button at 2.0: the label whole or ending in a whole `…` inside the button, no glyph cut at the top or bottom |
| list walk, large font | no frame, MA-127 | the `Font scale` force (README) at 2.0, once on an empty database and once on the `row status pill` seed | crops of the summary card and every row, scrolled to the end: no text cut at the top or bottom, and no text box from `mqa bounds` crossing another node's box |
| skeletons, large font | no frame, MA-127 | source force `await new Promise<never>(() => undefined);` as the first line of the `try` in `loadMonthSnapshot` (`commitment.store.ts`), reverted after; the `Font scale` force (README) at 1.0 and 2.0; a temporary `onLayout` on the first row's title bar, its status pill and its icon square in `commitment_rows_skeleton.tsx` that logs `e.nativeEvent.layout.height`, read with `mqa logs --info` at each scale and reverted with `git status` clean after | the title bar and the pill at 2.0 read twice their 1.0 height ± 1 dp, the icon square its 1.0 height ± 1; a shot at each scale and one loaded at 2.0; the 1.0 shot matches `main` |
| filter sheet footer, large font | no frame, MA-130 | the filter sheet; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on the footer buttons in `sheet-footer`; one crop of the footer at 2.0 |
| filtered empty clear link, large font | no frame, MA-130 | a search that matches no commitment; the `Font scale` force (README) at 1.0 and 2.0 | the clear link's label box inside its pressable and the screen, one line, whole or ending in a whole `…`; one crop at 2.0 |
| load error retry, large font | no frame, MA-130 | the force of `add button clearance, load error`; the `Font scale` force (README) at 1.0 and 2.0 | the `Button proof` (README) on `Try again` in `commitments-load-error`; one crop at 2.0 |
| add button clearance, filtered empty | no frame, MA-144 | a seed with one active monthly commitment whose `start_date` is the last day of the device's current month, so this month's payment is never `Overdue` and the month before has none; `mqa tapxy` on the visible part of the `Overdue` segment of the status rail, the second, as `status rail, large font` taps one; no search; the `Font scale` force (README) at 1.0 and 2.0 | `No results` and `Clear Filters` show; scrolled to its end (`mqa scroll down --until` a node that is not there), at both scales no text node's box from `mqa bounds`, the `Clear Filters` pressable's included, intersects `fab-button`'s; one shot at 2.0 at the list's end |
| add button clearance, empty month | no frame, MA-144 | the `add button clearance, filtered empty` seed, the status rail on `All`; `mqa tap 'id="month-filter-previous"'` once; the `Font scale` force (README) at 1.0 and 2.0 | `Nothing this month` shows; scrolled to its end (`mqa scroll down --until` a node that is not there), at both scales no text node's box from `mqa bounds` intersects `fab-button`'s; one shot at 2.0 at the list's end |

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
- This list's group headers are `DateHeader`, not the shared `section_header.tsx` (`index.tsx:127-131`), and read 14 — the `section title` state belongs to `dashboard.md` and `accounts_list.md`.
- The row status pill is a `View` with no touch handler: it is flattened out of the accessibility tree, so read the label `TextView` and add `py-0.5`, or measure the painted pill on the shot.
- `FilterOptionPillList` renders the shared `SelectablePill` and is the same component the transactions filter sheet renders; the adornment branch is measured here and the adornment-free branch on `add_commitment.md`, one read each.
- A deep link does not dismiss an open bottom sheet: the filter sheet stays mounted over the next screen and its nodes answer the reads. `am force-stop` before the next state.
- The tab bar's clickable node carries the icon glyph before the label (`B, Budget` on Budget), so `$MQA tap 'Commitments'` matches only the non-clickable text and is refused; tap the exact content-desc from `mqa ui`, or use the deep link.

## Seeding and forcing states

See `README.md` § Seeding and forcing states.
