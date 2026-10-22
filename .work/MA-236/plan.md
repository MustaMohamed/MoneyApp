# MA-236 — Pressables under the 44 dp floor take a touch-floor slop
base: d09b253f9f3ab9c75e6d689448abd8a26f9a37b8 · verify: emulator · flags: none · expected diff: ~360 lines

## Steps
### 1. One touch-floor rule bounds a slop by its neighbours
- File: `src/constants/theme.ts` (`touchFloorHitSlop` `:303`, `Size.headerActionSlop` `:167`)
- Change: Add `interface TouchFloorRoom { top?: number; bottom?: number }`. Each side is the room a slop may take toward the neighbour on that side: half the drawn gap to a control, the whole gap to a label, a card or a line of text (#822 Rule 1). An absent side, optional and never `null`, means no neighbour.
  - Add `touchFloorHitSlopWithin(height: number, room: TouchFloorRoom): TouchFloorHitSlop`. With `s = touchFloorHitSlop(height).top`, `top = min(room.top ?? ∞, s + max(0, s − (room.bottom ?? ∞)))`, and `bottom` mirrors it. A side stopped short hands its shortfall to the other side, which stops at its own room. This is the uneven floor slop of `transactions_rail.geometry.ts:27`.
  - Add `touchFloorHitSlopInGap(height: number, gap: number): Required<Insets>`, for rows of like controls `gap` apart. Top and bottom are `touchFloorHitSlopWithin(height, { top: gap / 2, bottom: gap / 2 })`; left and right are `gap / 2`, the horizontal rule of `ACCOUNT_STRIP_HIT_SLOP` (`form_sheet.geometry.ts:61-66`).
  - Add one raw token, never `ms()`: `Size.searchClearTrack: 24` (HeroUI `search-field.css:39-43`, `w-6 h-6`).
  - Add `HIT_SLOP_UNCLIPPED_STYLE = { overflow: 'visible' } as const`. HeroUI's pressable root clips, and RNGH drops a slop outside a clipping view on Android (MA-122, `account_strip.tsx:163`), so every slopped HeroUI pressable in steps 3 to 6 takes it.
  - Re-scope the `headerActionSlop` comment to the native back button's drawn padding, its one reader after step 6 (`stack_header.geometry.ts:31-35`).
- Test: `first` · `__tests__/constants/touch_floor_slop.test.ts`, new cases:
  - `touchFloorHitSlopWithin(h, {})` equals `touchFloorHitSlop(h)`.
  - `(17, { top: 8, bottom: 12 })` gives `{ top: 8, bottom: 12 }`.
  - `(33, { top: 8, bottom: 12 })` gives equal sides whose total reaches `TouchSize.min + 2·TOUCH_SLOP_PIXEL_MARGIN`.
  - `(36, { top: 0 })` gives top 0 and bottom `2 · touchFloorHitSlop(36).top`.
  - `touchFloorHitSlopInGap(29, 6)` gives 3 on every side; `touchFloorHitSlopInGap(41, 6)` gives top and bottom `touchFloorHitSlop(41).top`, left and right 3.

### 2. A list of like controls takes a measured slop: half the gap inside, the list's edge room on its outer rows, never past a room
- File: `src/components/ui/touch_floor.geometry.ts` (new), `src/components/ui/touch_floor.hook.ts` (new)
- Change:
  - `interface GridItemBox { y: number; height: number }` and `interface GridRows { minY: number; maxY: number }`.
  - `resolveGridItemHitSlop(box: GridItemBox | undefined, rows: GridRows | undefined, gap: number, edge: TouchFloorRoom, minSlop?: TouchFloorHitSlop): Required<Insets>`. `minSlop` is optional and never `null`.
    - An unmeasured box (`box` or `rows` `undefined`) returns `touchFloorHitSlopInGap(0, gap)`.
    - Rooms: the top row (`box.y` within one device pixel, `1 / PixelRatio.get()`, of `rows.minY`) takes `edge.top` as its top room; the bottom row (`box.y` within one pixel of `rows.maxY`) takes `edge.bottom` as its bottom room. Every other side's room is `gap / 2`. An `undefined` edge side has no neighbour.
    - `w = touchFloorHitSlopWithin(box.height, rooms)`. Top is `min(rooms.top ?? ∞, max(w.top, minSlop?.top ?? 0))`; bottom mirrors it. The room is the one cap, so `minSlop` raises a side only up to its room. Left and right are `gap / 2`.
  - `useTouchFloorGridHitSlop(gap: number, edge: TouchFloorRoom, minSlop?: TouchFloorHitSlop): { item: (key: string) => { hitSlop: Required<Insets>; onLayout: (event: LayoutChangeEvent) => void } }`:
    - It keeps each item's measured `{ y, height }` by key in `useState`, skips `setState` when they are unchanged, and derives `GridRows` from the measured items. Boxes are measured, not computed, because Android scales an OS-scaled label's line nonlinearly (`message_glyph.hook.ts:16`); `message_glyph.hook.ts:21` is the precedent for measured state in a shared hook.
    - `y` is relative to the list's own `View`. Every list steps 3 and 4 pass has no padding, so its top row reads `y` 0.
  - `SelectablePill` is unchanged: it already forwards `hitSlop`, `onLayout` and `style` (`chip.tsx:37-43,89-91`).
- Test: `first` · `__tests__/components/ui/touch_floor.geometry.test.ts` (new `.ts`):
  - an unmeasured box gives `gap / 2` on every side, with or without `minSlop`;
  - an inner 29 dp pill with gap 6 gives 3 on every side;
  - in a two-row list with edge `{ top: 0, bottom: 12 }`, a top-row 29.33 dp pill gives top 0 and bottom 3, and a bottom-row pill gives top 3 and bottom 12;
  - in a one-row list (`minY` = `maxY`) with the same edge, a pill gives top 0 and bottom 12;
  - a bottom-row 25 dp pill with gap 8 and no `edge.bottom` gives top 4, and its total reaches `TouchSize.min + 2·TOUCH_SLOP_PIXEL_MARGIN`;
  - in a one-row list with edge `{}`, a 37 dp pill with `minSlop` `touchFloorHitSlop(25)` takes `minSlop` on top and bottom; an inner pill with that `minSlop` still takes `gap / 2`; a bottom-row pill with `edge.bottom` 4 takes 4 below.

  `first` · `__tests__/components/ui/touch_floor.hook.test.ts` (`renderHook`): before layout every side is `gap / 2`. After items lay out at `y` 0 and `y` 35, the first takes `edge.top` above it and the second takes `edge.bottom` below it.

### 3. The filter sheets' option pills take the grid slop, and a wrapped option pill stays inside the card
- File: `src/components/ui/chip.geometry.ts`, `src/components/ui/filter_accordion.geometry.ts`, `src/components/ui/filter_accordion.tsx` (`:65`, `:111`, `FilterOptionPillList` `:120-139`)
- Change: `chip.geometry.ts` adds `FILTER_OPTION_PILL_GAP = 6` (raw, frame B1FilterSheet `.facc .pl`, today's `gap-1.5`), `WRAPPING_PILL_STYLE = { maxWidth: '100%' }` and `WRAPPING_PILL_LABEL_STYLE = { flexShrink: 1 }`.
  - `filter_accordion.geometry.ts` adds raw constants for the card's classes: `FILTER_ACCORDION_CARD_BORDER = 1` (`border`, `:65`), `FILTER_ACCORDION_CARD_MARGIN_BOTTOM = 8` (`mb-2`, `:65`) and `FILTER_ACCORDION_CONTENT_PADDING_BOTTOM = 14` (`pb-3.5`, `:111`). It adds `FILTER_OPTION_LIST_EDGE: TouchFloorRoom = { top: 0, bottom: (FILTER_ACCORDION_CONTENT_PADDING_BOTTOM + 2·FILTER_ACCORDION_CARD_BORDER + FILTER_ACCORDION_CARD_MARGIN_BOTTOM) / 2 }`, which is 12: half the gap to the next card's trigger, inside the content's 14 dp clip.
  - The top room is 0. `Accordion.Content` clips at its `pt-0` edge and the trigger draws over it (`.accordion__trigger` `z-index: 10`, HeroUI `accordion.css:35-44`), so the trigger keeps its whole box (probe-1: a tap 2 dp above the top row collapsed `Accounts`). Rule 1 gives the same answer: the gap to the trigger is 0.
  - The card's `mb-2` and `border`, the content's `pb-3.5` and the list's `gap-1.5` become `style` from these constants, at the same values, so nothing moves.
  - `FilterOptionPillList` calls `useTouchFloorGridHitSlop(FILTER_OPTION_PILL_GAP, FILTER_OPTION_LIST_EDGE)`. Each pill takes `{...touch.item(option.id)}`, `style={[WRAPPING_PILL_STYLE, HIT_SLOP_UNCLIPPED_STYLE]}` and `labelStyle={WRAPPING_PILL_LABEL_STYLE}`. The label wraps inside the pill and the pill never exceeds its line, so its rounded right end stays inside the card (#824's render-lens finding at 2.0; probe-1 state 2 read it whole).
  - The structural guard on `filter_accordion.tsx` (`scripts/validate-structural-guards.js:240-259`) bans `useState`, `useCallback`, `useEffect`, `useMemo` and `useReducer` there, so the measured state stays in `touch_floor.hook.ts` and the list calls only that hook.
- Test: `after` · `__tests__/components/ui/filter_accordion.test.tsx`, in a `FilterOptionPillList` case with two options. The suite's `SelectablePill` mock (`:48-68`) forwards `hitSlop`, `onLayout` and `style` to its `Pressable`. Before layout each pill's `hitSlop` equals `touchFloorHitSlopInGap(0, FILTER_OPTION_PILL_GAP)`, and its style holds `WRAPPING_PILL_STYLE` and `HIT_SLOP_UNCLIPPED_STYLE`. Then `layout` fires on the first pill at `y` 0 and on the second at `y` 35, each 29.33 dp high: the first pill's `hitSlop.top` equals `FILTER_OPTION_LIST_EDGE.top`, and the second's `hitSlop.bottom` equals `FILTER_OPTION_LIST_EDGE.bottom`. This is render-only wiring bound to named constants, per the Render-suite policy. `first` · `__tests__/components/ui/filter_accordion.geometry.test.ts`: `FILTER_OPTION_LIST_EDGE.top` is 0, and `.bottom` is half of the padding, two borders and margin, and under `FILTER_ACCORDION_CONTENT_PADDING_BOTTOM`.

### 4. The form's recurrence and duration pills take the grid slop from `COMMITMENT_FORM_PILL_SLOP`, and both form slops read their heights from the shared geometry
- File: `src/components/ui/chip.geometry.ts`, `src/components/ui/tabs.geometry.ts` (`resolveSegmentedTabsGeometry` `:65-87`), `src/modules/commitments/screens/commitments/components/commitment_form.geometry.ts` (`:1-25`), `src/modules/commitments/screens/commitments/components/recurrence_picker.tsx` (`:39`, `:44-53`, `:90-99`), `src/modules/commitments/screens/commitments/components/duration_picker.tsx` (`:60`, `:63-72`)
- Change:
  - `chip.geometry.ts` exports `SELECTABLE_PILL_BARE_HEIGHT: number = lineHeightFor(SELECTABLE_PILL_LABEL_FONT_SIZE) + 2 * SELECTABLE_PILL_PADDING_BLOCK + 2 * PILL_BORDER_WIDTH`: the bare pill's height at scale 1, its shortest, 25 dp (`add_commitment.md:15`).
  - `tabs.geometry.ts` adds `resolveDefaultTriggerHeight(fontScale: number, maxFontScale?: number): number`. `fontScale` is required; `maxFontScale` is optional, default `Infinity`; neither is `null`. It returns `scaledTextStyle(HEROUI_TEXT_TYPE.base, fontScale, maxFontScale).lineHeight + 2 * TABS_TRIGGER_PADDING_BLOCK`, never `undefined`. `defaultListHeight` (`:82-85`) becomes `resolveDefaultTriggerHeight(fontScale, maxFontScale) + 2 * TABS_LIST_PADDING` where `defaultLabel` is set, and stays `undefined` where it is not.
  - `commitment_form.geometry.ts`: `COMMITMENT_FORM_PILL_SLOP = touchFloorHitSlop(SELECTABLE_PILL_BARE_HEIGHT)` and `COMMITMENT_FORM_TABS_SLOP = touchFloorHitSlop(resolveDefaultTriggerHeight(1))`; at scale 1 `scaledTextStyle(base, 1).lineHeight` is `lineHeightFor(base)` (`text_scale.geometry.ts:26-33`), so both keep today's values and the two `SegmentedTabs` sites (`commitment_form_body.tsx:317,387`) stay as they are. The file drops its imports of the three pill parts, `HEROUI_TEXT_TYPE`, `TABS_TRIGGER_PADDING_BLOCK` and `lineHeightFor`. It adds raw `COMMITMENT_FORM_PICKER_GAP = 8`, today's `gap-2` on each picker's container and pill rows.
  - Each picker calls `useTouchFloorGridHitSlop(COMMITMENT_FORM_PICKER_GAP, edge, COMMITMENT_FORM_PILL_SLOP)` once per pill row, at the top of the component, so the conditional period row never skips a hook. Each pill drops `hitSlop={COMMITMENT_FORM_PILL_SLOP}` (`recurrence_picker.tsx:51,97`, `duration_picker.tsx:70`) for `{...touch.item(key)}` and `style={HIT_SLOP_UNCLIPPED_STYLE}`. The slop starts from `COMMITMENT_FORM_PILL_SLOP` and stops at half the gap to each neighbour (#822 Acceptance, the pills and constants lines; Links, Found at #832, "so those sites start from its constants").
  - The label text above a row is not a control, so it bounds no room: toward it the slop takes the whole gap, per #822 Rule 1 ("a neighbour is a control: toward a label, a card or a line of text, a slop takes the whole gap"). Edges:
    - recurrence presets row: `{ bottom: COMMITMENT_FORM_PICKER_GAP / 2 }` while `Custom` shows the custom row, else `{}`;
    - period row: `{ top: COMMITMENT_FORM_PICKER_GAP / 2 }`, the presets row or the `Every` input above it;
    - duration row: `{ bottom: COMMITMENT_FORM_PICKER_GAP / 2 }` while the count row or the end-date control shows, else `{}`.
  - Each picker's container `gap-2` and each pill row's `gap-2` become `style` from `COMMITMENT_FORM_PICKER_GAP`, at the same value.
- Test: `first` · `__tests__/components/ui/tabs.geometry.test.ts`: `resolveDefaultTriggerHeight(1)` equals `lineHeightFor(HEROUI_TEXT_TYPE.base) + 2 * TABS_TRIGGER_PADDING_BLOCK`; at 2, and at 2 capped at 1.3, `defaultListHeight` equals `resolveDefaultTriggerHeight` at the same arguments plus `2 * TABS_LIST_PADDING`. `first` · `__tests__/screens/commitments/commitment_form.geometry.test.ts` (new `.ts`): `COMMITMENT_FORM_PILL_SLOP` equals `touchFloorHitSlop(SELECTABLE_PILL_BARE_HEIGHT)` and `touchFloorHitSlop(lineHeightFor(SELECTABLE_PILL_LABEL_FONT_SIZE) + 2 * SELECTABLE_PILL_PADDING_BLOCK + 2 * PILL_BORDER_WIDTH)`, today's value; `COMMITMENT_FORM_TABS_SLOP` equals `touchFloorHitSlop(resolveDefaultTriggerHeight(1))` and `touchFloorHitSlop(lineHeightFor(HEROUI_TEXT_TYPE.base) + 2 * TABS_TRIGGER_PADDING_BLOCK)`, today's value. No suite renders either picker; the step 2 tests and the `add_commitment.md` row cover them.

### 5. The month row's step buttons take their slop from the touch-floor rule
- File: `src/components/ui/month_filter.geometry.ts` (`:6-23`), `src/components/ui/month_filter.tsx` (`IconButton` `:17-47`, `:53`, `:59-66` and the next step button), `src/modules/transactions/screens/transactions/components/transactions_rail.geometry.ts` (`:21-24`)
- Change: Add `type MonthStepSide = 'previous' | 'next'`.
  - `resolveMonthStepHitSlop(rowHitSlop: MonthRowHitSlop | undefined, height: number, side: MonthStepSide): Required<Insets>`, arguments in that order, all three required; `rowHitSlop` may be `undefined`, none is `null`. Top and bottom are `rowHitSlop`, else `touchFloorHitSlop(height)`. Outward is `touchFloorHitSlop(height).top`; inward is `min(that, Spacing.xxs / 2)`, half the row gap to the pill (`:57`). Previous takes outward on the left, next on the right. `MonthFilter` calls it once per side with `pill.height`.
  - `MONTH_STEP_HIT_SLOP` stays, as `IconButton`'s default, which only the picker's year arrows take now (`:120-134`); its comment names the year arrows.
  - `IconButtonProps` gains `style?: ViewStyle`, optional, never `null`, applied after the size. The two step buttons pass `HIT_SLOP_UNCLIPPED_STYLE` (MA-122). The year arrows pass none, so their slop and clip stay as at head.
  - In `transactions_rail.geometry.ts`, `monthRowHitSlop.top` becomes `TouchSize.min − Size.monthPillTrack − space / 2 + TOUCH_SLOP_PIXEL_MARGIN`. At `space` 8 it equals today's `space + margin`, and it now reads from `TouchSize.min`, the shape of `tabsHitSlop.bottom`. `bottom` is unchanged.
- Test: `first` · `__tests__/components/ui/month_filter.geometry.test.ts`, replacing the `resolveMonthStepHitSlop` cases (`:24-36`):
  - with no row slop, steps take `touchFloorHitSlop(32)` top and bottom, outward `touchFloorHitSlop(32).top`, and inward `Spacing.xxs / 2`;
  - with a row slop, steps take the row's top and bottom;
  - `MONTH_STEP_HIT_SLOP` is still 8.

  `first` · `__tests__/screens/transactions/transactions_rail.geometry.test.ts`: `Size.monthPillTrack + top + bottom = TouchSize.min + 2·TOUCH_SLOP_PIXEL_MARGIN` for each `scaledSpace` case.

  `after` · `__tests__/components/ui/month_filter.test.tsx`, the MA-109 case (`:98-126`): with and without the row slop, each step carries `resolveMonthStepHitSlop(…, side)` at the pill's height and holds `HIT_SLOP_UNCLIPPED_STYLE`; the year arrows keep `MONTH_STEP_HIT_SLOP` and no `overflow`.

### 6. Header actions and the search row's Filter and clear buttons take their slop from the touch-floor rule, up to the room #822 Rule 1 gives above the row
- File: `src/components/ui/stack_header.geometry.ts` (`:24-29`), `src/components/ui/header_action_box.tsx` (`:22-29`), `src/components/ui/search_filter_row.geometry.ts` (`:14`, `:24-31`), `src/components/ui/search_filter_row.tsx` (`:14-24`, `:45`, `:60`, `:63-70`), `src/components/ui/account_chips.geometry.ts` (`:15`), `src/modules/transactions/screens/transactions/components/search_row.tsx`, `src/modules/commitments/screens/commitments/components/search_row.tsx`, `src/modules/commitments/screens/commitments/components/summary_header.geometry.ts` (new), `src/modules/commitments/screens/commitments/components/summary_header.tsx` (`:110`), `src/components/ui/press_highlight.tsx` (new)
- Change:
  - `HEADER_ACTION_HIT_SLOP` is `touchFloorHitSlop(Size.headerActionTrack).top` on all four sides. The box is 36 dp at 1.0 and 2.0 (`resolveHeaderTextActionGeometry`), so the target reads about 46 dp. `HeaderActionBox` adds `HIT_SLOP_UNCLIPPED_STYLE`, and the back button moves with it. `NATIVE_HEADER_BACK_PADDING` stays at `Size.headerActionSlop`.
  - The room above the row follows #822 Rule 1, "a neighbour is a control: toward a label, a card or a line of text, a slop takes the whole gap":
    - `account_chips.geometry.ts` exports `CHIP_ROW_ROOM_BELOW = ROW_PADDING_BOTTOM / 2`. The chips are controls, so the room is half the gap (Rule 1; Decision 2026-10-22 at /prep reviewer round 1). The gap from a chip's box to the search row is the chips `ScrollView`'s `paddingBottom` (`account_chips.tsx:128`); neither side has a margin.
    - `summary_header.geometry.ts` (new) exports raw `SUMMARY_HEADER_MARGIN_BOTTOM = 8`, the card's `mb-2` (`summary_header.tsx:110`). The card drops `mb-2` for `style={{ marginBottom: SUMMARY_HEADER_MARGIN_BOTTOM }}`, the same 8 dp. The card holds no control (`summary_header.tsx` has no pressable), so under Rule 1 the room is the whole gap.
  - `SearchFilterRowProps` gains `topRoom: number`, required, never `null`. Its two callers pass it: transactions' `SearchRow` passes `CHIP_ROW_ROOM_BELOW`, and commitments' `CommitmentSearchRow` passes `SUMMARY_HEADER_MARGIN_BOTTOM` (`commitments/index.tsx:182-193`). The five renders in `__tests__/components/ui/search_filter_row.test.tsx` pass `topRoom` in the same commit, so typecheck stays green.
  - `search_filter_row.geometry.ts` adds raw `SEARCH_ROW_GAP = 8` (`gap-2`, `:45`) and `SEARCH_ROW_MARGIN_BOTTOM = 8` (`mb-2`, `:45`); the row's classes become `style` from them at the same values. `filterButton` gains `overflow: 'visible'` from `HIT_SLOP_UNCLIPPED_STYLE`. `resolveSearchFilterRowGeometry(fontScale)` keeps its signature.
  - It adds `resolveSearchRowHitSlop(inputHeight: number, topRoom: number): { filter: Required<Insets>; clear: Required<Insets> }`. Both arguments are required, in that order, never `null`. It is pure, so a case can pass the 31 dp that `ms(36)` gives at the 0.85 width clamp, which jest's 750 dp window never reaches.
    - Filter is `touchFloorHitSlopWithin(inputHeight, { top: topRoom, bottom: SEARCH_ROW_MARGIN_BOTTOM })`, with `left: SEARCH_ROW_GAP / 2` and `right: touchFloorHitSlop(COMPACT_CONTROL_SIZE).top`.
    - Clear is `touchFloorHitSlopWithin(Size.searchClearTrack, { top: inset + topRoom, bottom: inset + SEARCH_ROW_MARGIN_BOTTOM })`, with `inset = (inputHeight − Size.searchClearTrack) / 2`. `left` is `touchFloorHitSlop(Size.searchClearTrack).top`. `right` is `min(touchFloorHitSlop(Size.searchClearTrack).top, (SEARCH_CLEAR_INSET_END + SEARCH_ROW_GAP) / 2)`, which is 10; raw `SEARCH_CLEAR_INSET_END = 12` is HeroUI's `inset-inline-end: calc(var(--spacing) * 3)` (`search-field.css:39-43`). The right side stops at half the 20 dp gap to Filter's box.
    - `SearchFilterRow` calls it with `geometry.input.height` and `topRoom`.
  - Above the row, the search row follows the chips, and Android searches the later sibling first (`TouchTargetHelper.kt:213-246`). So the chips keep the upper half of their bottom band over Filter and the clear. Below the row both stop at its `mb-2` edge, the whole gap under Rule 1: below it the tally (`transactions/index.tsx:149-160`, `src/components/ui/search_tally.tsx:21-25`, no top margin) or the list's first section, whose `DayHeader` (`src/components/ui/day_header.tsx`) holds no control, takes every touch inside its box.
  - Figures. On `Pixel_2_API_34` (411 dp: `ms(36)` 38, drawn 38.10; `ROW_PADDING_BOTTOM` 8) both lists read the same: Filter 4 above and 4 below, about 46 dp; clear 11 above and 11 below its 24 dp box, 46 dp, about 4 dp past each row edge. Where `ms(36)` is 31 (windows under about 341 dp), transactions reads 44.5 dp, its 5.5 dp `CHIP_ROW_ROOM_BELOW` full. Commitments reads about 46 dp there: the Filter's top slop of about 7.4 dp fits inside the card's whole 8 dp gap, and the clear's of about 10.9 dp inside that gap plus its 3.5 dp inset.
  - `SearchField.ClearButton` and the Filter `PressableFeedback` take these slops with `HIT_SLOP_UNCLIPPED_STYLE`. A passed `hitSlop` wins over HeroUI's 8 (`search-field.tsx:199`). The guard on `search_filter_row.tsx` (`validate-structural-guards.js:240-259`) admits no new React hook, and this step adds none.
  - `press_highlight.tsx` (new) implements #822's Rule "A slopped Button draws its pressed highlight inside its own corners." (Decision 2026-10-22, /prep reviewer round 2):
    - `PressHighlight({ radius }: { radius: number })`, `radius` required and never `null`. It renders HeroUI's `PressableFeedback.Highlight` with `style={{ borderRadius: radius }}` and `animation={{ backgroundColor: { value: useThemeColor('default-hover') }, opacity: { value: [0, 1] } }}`, the colour HeroUI's Button gives its tertiary variant (`heroui-native/src/components/button/button.tsx:86-96`). `useThemeColor` comes from `heroui-native`.
    - A slopped Button takes `feedbackVariant="scale"`, so HeroUI draws no square highlight of its own (`button.tsx:302-305`), and `background={<PressHighlight radius={…} />}`, which HeroUI renders inside the pressable before the content (`button.tsx:274-281`), so the icon stays HeroUI's.
  - The clear takes `feedbackVariant="scale"` and `background={<PressHighlight radius={Size.searchClearTrack / 2} />}`: an icon-only HeroUI Button is square (`button.css:66-69`), so it draws a circle.
- Test: `first` · `__tests__/components/ui/stack_header.geometry.test.ts`: `HEADER_ACTION_HIT_SLOP` replaces the literal-8 case (`:79-83`), with four equal sides and `Size.headerActionTrack + top + bottom ≥ TouchSize.min`. `detail_screen_actions.test.tsx:100` keeps comparing to the constant.

  `first` · `__tests__/components/ui/search_filter_row.geometry.test.ts`, `resolveSearchRowHitSlop`:
  - At 1.0 and 2.0, with `resolveSearchFilterRowGeometry(f).input.height` and each list's room (`CHIP_ROW_ROOM_BELOW`, `SUMMARY_HEADER_MARGIN_BOTTOM`):
    - Filter: top ≤ the room, bottom ≤ `SEARCH_ROW_MARGIN_BOTTOM`, `height + top + bottom ≥ TouchSize.min`, left `SEARCH_ROW_GAP / 2`.
    - Clear: top ≤ inset + room, bottom ≤ `inset + SEARCH_ROW_MARGIN_BOTTOM`, `Size.searchClearTrack + top + bottom ≥ TouchSize.min`, right `(SEARCH_CLEAR_INSET_END + SEARCH_ROW_GAP) / 2`, left `touchFloorHitSlop(Size.searchClearTrack).top`.
  - At `inputHeight` 31, with `SUMMARY_HEADER_MARGIN_BOTTOM` and with room 5.5, the clamp's `ROW_PADDING_BOTTOM` of 11 halved: Filter and clear each total at least `TouchSize.min`. The case title names Rule 1: with half the card's gap, 4, both would total 43.

  `after` · `__tests__/components/ui/search_filter_row.test.tsx`, one case under the Render-suite policy: the Filter's and the clear's `hitSlop` equal `resolveSearchRowHitSlop(geometry.input.height, topRoom)`'s `.filter` and `.clear` for the `topRoom` the case passes, both hold `HIT_SLOP_UNCLIPPED_STYLE`, and the clear's `feedbackVariant` is `'scale'`.

  `after` · `__tests__/screens/transactions/search_row.test.tsx` and `__tests__/screens/commitments/search_row.test.tsx`, one case each under the Render-suite policy. Each suite mocks `@/components/ui/search_filter_row` so the mock records `SearchFilterRow`'s props and renders the actual row, the props capture of `__tests__/screens/transactions.screen.test.tsx:48-56`. The case asserts `topRoom` is `CHIP_ROW_ROOM_BELOW` on transactions and `SUMMARY_HEADER_MARGIN_BOTTOM` on commitments. The suites' other cases still render the actual row.

### 7. The feature files carry the new hit-area states and the wrapped option pill, and the MA-194 tap bands follow the new header slop
- File: `.claude/skills/emulator-verify/features/transactions.md`, `commitments.md`, `add_commitment.md`, `account_detail.md`, `categories.md` (`:25`), `budget_category_detail.md` (`:18`), `spending_plan_detail.md` (`:20`)
- Change: Append each `new` state of § Screens to its file's States table, with frame `B1, MA-236` for the filter sheets and `no frame, MA-236` elsewhere.
  - Force: the reach, then one `mqa bounds` call on the controls, at 1.0, and under the `Font scale` force at 2.0 where the row's risk names a font scale.
  - Proof: the Band proof method (README § Band proof). A `tapxy` 1 dp inside each slop edge, as dp × 2.625 rounded from bounds, takes the tap; a tap 1 dp past it does not, or lands on the neighbour on that side. The edges are the figures steps 3 to 6 state.
  - `filter sheet hit areas` proves the 3 dp band between two pill rows, on a middle row's top edge and a row's bottom edge, and between two pills in a row. A tap 1 dp above the top row lands on the section trigger and collapses the section. A selected checkable pill widens by its check icon and moves its row neighbour (probe-1: 154.7 to 174.1 dp at 1.0), so the row reads `mqa bounds` again after each tap that toggles a pill. On a list of two or more rows, a tap 1 dp inside the 12 dp below the last row's bottom edge selects the pill above the tap; the last row then reads `29.33 + 3 + 12` dp at 1.0. The `commitments.md` row cites these proofs.
  - `search row hit areas` takes its edges from `mqa bounds` and step 6's figures: on `Pixel_2_API_34`, Filter 4 above and 4 below, and the clear 11 above and 11 below its box, about 4 dp past each row edge. A tap 1 dp inside Filter's top edge, under the chips' bottom band, opens the filter sheet: the chips keep only the upper half of their bottom band over Filter and the clear. A tap 1 dp past each edge takes neither control. The `commitments.md` row (no frame, MA-236) cites these proofs. Its top neighbour is the summary card, which holds no control, so under #822 Rule 1 the row's slops may take the card's whole `mb-2`; on `Pixel_2_API_34` neither reaches the card, and a tap 1 dp past each top edge takes neither control. Its bottom edge is the first section header's top, since commitments draws no tally (`commitments/index.tsx:180-195`).
  - `recurrence and duration pill hit areas` picks `Custom` so the period pills show, and proves the 4 dp band between the presets and period rows and between two pills in a row, and `COMMITMENT_FORM_PILL_SLOP` above the presets row.
  - `header action hit area` on `account_detail.md` reads `Edit` and the back button at 1.0: a tap 1 dp inside each edge's `HEADER_ACTION_HIT_SLOP` lands, one 1 dp past it does not.
  - The clear adds one shot held mid-press, proving #822's Rule "A slopped Button draws its pressed highlight inside its own corners.". If `mqa` cannot hold a press, that proof reads `unread`.
  - The transactions `filter sheet walk, large font` force adds an account named `Visa Gold Platinum Rewards Card`; its proof adds each option pill's box inside the card's, and a pill whose label wraps draws its rounded right end. `commitments.md`'s row inherits the proof through its citation, and its force (`commitments.md:48`) adds the same account; the commitments sheet lists every account from the store (`commitments/filter/filter.hook.ts:45`).
  - The three MA-194 rows tap 19 px (7.2 dp) outside a 36 dp header box, past the new `HEADER_ACTION_HIT_SLOP` of 4 dp plus `TOUCH_SLOP_PIXEL_MARGIN`. Each is rewritten to tap 1 dp inside that edge, which lands as the row says today, and 1 dp past it, which lands nothing: on `categories.md:25` the back button inside `NATIVE_HEADER_BACK_PADDING`, and the left tap still stays on `Categories`; on `budget_category_detail.md:18` the pencil and the back box; on `spending_plan_detail.md:20` the pencil, where the 24 px tap becomes the 1 dp-past tap.
- Test: `none` · docs, not code.

## Screens
- `transactions.md`: `filter sheet hit areas` (new, step 7). Risks: a clipped or rounded container, a height that is not a whole number of dp, a font scale above 1.0.
- `transactions.md`: `filter sheet walk, large font` (step 7 adds the long account name and the pill-inside-card proof). Risks: a font scale above 1.0, a clipped or rounded container.
- `transactions.md`: `search row hit areas` (new, step 7). Risks: a clipped or rounded container, a height that is not a whole number of dp.
- `transactions.md`: `rail hit areas`. Risk: a clipped or rounded container.
- `commitments.md`: `filter sheet hit areas` (new, step 7). Risks: a clipped or rounded container, a height that is not a whole number of dp, a font scale above 1.0.
- `commitments.md`: `filter sheet walk, large font` (step 7 adds the long account name to its force). Risks: a font scale above 1.0, a clipped or rounded container.
- `add_commitment.md`: `recurrence and duration pill hit areas` (new, step 7). Risks: a clipped or rounded container, a height that is not a whole number of dp, a font scale above 1.0.
- `account_detail.md`: `header action hit area` (new, step 7). Risks: a clipped or rounded container, a height that is not a whole number of dp.
- `commitments.md`: `search row hit areas` (new, step 7). Not a Screen checks row: it proves the Acceptance line "On both lists, the search field's clear button…". Risks: as the transactions row.
- Rule 4, each other module whose screen steps 5 and 6 move, by the state it reads:
  - `budget.md`: `month pill, large font` (the step buttons, step 5).
  - `categories.md`: `header back button tap band` (rewritten, step 7), which also reads the settings stack's `NativeHeaderBackButton` (`back_button.tsx:28-35`).
  - `settings`: no feature file and no state. Settings and About mount the same `NativeHeaderBackButton` (`src/app/(app)/settings/_layout.tsx:22,37`), which `categories.md · header back button tap band` reads.
  - `currency.md`: none. The currency screen mounts the same `NativeHeaderBackButton` (`src/app/(app)/settings/_layout.tsx:28`), which `categories.md · header back button tap band` reads.
  - `onboarding.md`: `progress rail and header title, large font` (the `StackHeader` back button, `onboarding_header.tsx:18`).
  - `budget_category_detail.md`: `header back and edit tap band` (rewritten, step 7).
  - `spending_plan_detail.md`: `header edit tap band` (rewritten, step 7).
- The invariant pass runs on Rule 5's six files: `transactions.md`, `commitments.md`, `add_commitment.md`, `account_detail.md`, `archived_account.md`, `accounts_list.md`. It excepts the commitments month pill and status rail (MA-211, Rule 6). It reports as MA-242 (#835)'s, per both `Seam:` Rules: account detail's `See all` and `Add a transaction`, both `Unarchive` buttons, each sheet's close button, and the month picker's year arrows and month cells.

## Non-goals
- The commitments month pill and status rail, and `filter_rail.tsx`, `segment_filter.hook.ts` and `tabs.tsx`: MA-211 (#785) owns them (Decision 2026-10-22). `tabs.geometry.ts` changes only by the step 4 export. The commitments step buttons take the step 5 default inside today's clipped rail.
- Account detail's `See all` and `Add a transaction` links and both `Unarchive` buttons: MA-242 (#835). `section_header.tsx`, `activity_empty_block.tsx`, `archived_detail_body.tsx`, `archived_account_row.tsx` and `button.*` stay as at head.
- Each sheet's close button and the month picker's year arrows and month cells: MA-242 (#835). `sheet.tsx`, `sheet.helpers.ts` and `sheet.hook.ts` stay as at head; the year arrows keep `MONTH_STEP_HIT_SLOP` as `IconButton`'s default with no `overflow` change; the month cells keep no slop.
- Review round 1 findings 2 (the close's and the next year arrow's rooms at font scale 2.0) and 3 (the month picker row read at 2.0): MA-242 (#835)'s, with the controls they name.
- Any drawn gap, box size or class value. Every class moved to a constant keeps its value.
- The account chips' and account strip's slops (`account_chips.tsx:136`, `account_strip.tsx:117`), the month pill's own slop and overflow (`month_filter.tsx:68-76`), and `NATIVE_HEADER_BACK_PADDING`.
- The form's `SegmentedTabs` sites (`commitment_form_body.tsx:317,387`): they keep passing `COMMITMENT_FORM_TABS_SLOP`.
- The budget, categories, currency and dashboard sites the ticket's Grep excludes, per the 2026-10-18 ruling.
- The Currency segment's ellipsis on the commitment form at 2.0: MA-221 (#795).

## Untested inputs
- Measured pill heights at font scale 2.0 under Android's nonlinear scaling: the hook test uses fixed layouts. Steps 2 to 4 meet it, and the emulator rows read it.
- The wrapped option pill's drawing at 2.0 (step 3): only the emulator row reads it.
- The recurrence and duration rows' `useTouchFloorGridHitSlop` wiring, edges and `minSlop` (step 4): no suite renders `RecurrencePicker` or `DurationPicker`, so only the `add_commitment.md` row proves it.
- That `COMMITMENT_FORM_TABS_SLOP` and `defaultListHeight` read `resolveDefaultTriggerHeight`, and `COMMITMENT_FORM_PILL_SLOP` reads `SELECTABLE_PILL_BARE_HEIGHT`, rather than restate their sums (step 4): a value test passes on a restatement, so /ship's conformance lens reads the source.
- The commitments step buttons inside the clipped `FilterRail` surface (step 5).
- Which control takes a tap in the band above the search row where Filter's and the clear's slops overlap the chips' bottom band (step 6): the geometry test reads numbers only, and the `search row hit areas` row proves the tap.
- `HeaderActionBox`'s `HIT_SLOP_UNCLIPPED_STYLE` and the clear's `PressHighlight` drawing (step 6): only the emulator rows and the mid-press shot read them.
- The search row at a window under about 341 dp (step 6): the geometry case passes 31 dp; no emulator slot runs that width.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `transactions.md · filter sheet hit areas`, `add_commitment.md · recurrence and duration pill hit areas`: a slop capped at a half-gap carries no pixel margin. Android truncates it to whole pixels, so a pill held at the half-gap reads a fraction of a dp under its sum.
- `transactions.md · search row hit areas`: probe-1 read the clear 6.8 dp under the group's top and 7.3 over its bottom, not the 7 the inset computes; the band taps take their edges from `mqa bounds`.
- Step 6's bottom room is the whole `mb-2`, not half, under #822 Rule 1: the tally or first section below holds no control and takes every touch inside its own box. A review that halves it there drops the Filter and the clear to 43 dp on commitments and 40.5 on transactions where `ms(36)` is 31; at the device's 38 both still read 46.
- Rule 5 names `archived_account.md` and `accounts_list.md`, whose under-floor nodes in Context are the two `Unarchive` buttons Out of scope sends to MA-242; the pass reports them as MA-242's, not as findings here. So too the month picker's and every sheet's close nodes on `transactions.md`.
- not probed: `transactions.md` · search row hit areas, the band above the row's top edge (probe-1 ran with a top room of 0)
- not probed: `transactions.md` · rail hit areas
- not probed: `commitments.md` · filter sheet hit areas
- not probed: `commitments.md` · filter sheet walk, large font
- not probed: `add_commitment.md` · recurrence and duration pill hit areas
- not probed: `account_detail.md` · header action hit area

## Self-assessment
I am least sure about steps 2 and 4: whether an `onLayout`-measured height on a HeroUI `Chip` settles in one extra render, and whether RN's Pressable slop under `overflow: 'visible'` takes the tap inside the commitment form's sheet scroll view. Probe-1 proved the filter option pills and the search clear under `overflow: 'visible'`; MA-122 proved the account strip. The picker pills are proved only by their emulator row. Second is step 6's band above the search row: Filter's top slop now reaches into the chips `ScrollView`'s bottom padding, and the later-sibling order says the search row takes it, but no probe has tapped above that row's top edge.
