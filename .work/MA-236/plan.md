# MA-236 — Pressables under the 44 dp floor take a touch-floor slop
base: 084a35487231bd135cf5d23b3c3668b5cd9819bd · verify: emulator · flags: none · expected diff: ~370 lines

## Steps
### 1. One touch-floor rule bounds a slop by its neighbours
- File: `src/constants/theme.ts` (`touchFloorHitSlop` `:299`, `Size.headerActionSlop` `:167`)
- Change: Add `interface TouchFloorRoom { top?: number; bottom?: number }`. Each side is the room a slop may take: half the drawn gap to the neighbour on that side. An absent side, optional and never `null`, means no neighbour.
  - Add `touchFloorHitSlopWithin(height: number, room: TouchFloorRoom): TouchFloorHitSlop`. With `s = touchFloorHitSlop(height).top`, `top = min(room.top ?? ∞, s + max(0, s − (room.bottom ?? ∞)))` and `bottom` mirrors it. A side stopped short hands its shortfall to the other side, which stops at its own room. This is the uneven floor slop of `transactions_rail.geometry.ts:27`.
  - Add `touchFloorHitSlopInGap(height: number, gap: number): Required<Insets>`, for rows of like controls `gap` apart. Top and bottom are `touchFloorHitSlopWithin(height, { top: gap / 2, bottom: gap / 2 })`. Left and right are `gap / 2`, the horizontal rule of `ACCOUNT_STRIP_HIT_SLOP` (`form_sheet.geometry.ts:61-66`).
  - Add two raw tokens, never `ms()`: `Size.sheetCloseTrack: 32` (HeroUI `close-button.css:1-3`, `h-8`) and `Size.searchClearTrack: 24` (HeroUI `search-field.css:39-43`, `w-6 h-6`).
  - Add `HIT_SLOP_UNCLIPPED_STYLE = { overflow: 'visible' } as const`. HeroUI's pressable root clips, and RNGH drops a slop outside a clipping view on Android (MA-122, `account_strip.tsx:162-163`), so every slopped HeroUI pressable in steps 3 to 6 takes it, and their render tests bind to it.
  - Re-scope the `headerActionSlop` comment to the native back button's drawn padding, the one reader left after step 5 (`stack_header.geometry.ts:31-35`).
- Test: `first` · `__tests__/constants/touch_floor_slop.test.ts`. Cases:
  - `touchFloorHitSlopWithin(h, {})` equals `touchFloorHitSlop(h)`.
  - `(17, { top: 8, bottom: 12 })` gives `{ top: 8, bottom: 12 }`.
  - `(33, { top: 8, bottom: 12 })` gives equal sides that reach `TouchSize.min + 2·TOUCH_SLOP_PIXEL_MARGIN`.
  - `(36, { top: 0 })` gives `{ top: 0, bottom: 10 }`.
  - `touchFloorHitSlopInGap(29, 6)` gives 3 on every side.
  - `touchFloorHitSlopInGap(41, 6)` gives top and bottom equal to `touchFloorHitSlop(41).top`, with left and right 3.

### 2. A list of like controls takes a measured slop: half the gap inside, the list's edge room on its outer rows
- File: `src/components/ui/touch_floor.geometry.ts` (new), `src/components/ui/touch_floor.hook.ts` (new)
- Change:
  - `interface GridItemBox { y: number; height: number }`.
  - `resolveGridItemHitSlop(box: GridItemBox | undefined, rows: { minY: number; maxY: number } | undefined, gap: number, edge: TouchFloorRoom): Required<Insets>`:
    - An unmeasured box (`undefined`) returns `touchFloorHitSlopInGap(0, gap)`.
    - A box neither in the top row nor in the bottom row returns `touchFloorHitSlopInGap(box.height, gap)`.
    - The top row is a box whose `y` equals `rows.minY`; it takes `edge.top` as its top room. The bottom row is a box whose `y` equals `rows.maxY`; it takes `edge.bottom` as its bottom room. Each comparison allows one device pixel, `1 / PixelRatio.get()`. An `undefined` edge side has no neighbour. Every other side's room is `gap / 2`. Top and bottom come from `touchFloorHitSlopWithin(box.height, rooms)`, and left and right are `gap / 2`.
    - This is `ACCOUNT_STRIP_HIT_SLOP`'s rule (`form_sheet.geometry.ts:58-66`): the floor on a side with no near neighbour, and half the gap between like controls.
  - `useTouchFloorGridHitSlop(gap: number, edge: TouchFloorRoom): { item: (key: string) => { hitSlop: Required<Insets>; onLayout: (event: LayoutChangeEvent) => void } }`:
    - It keeps each item's measured `{ y, height }` by key and skips `setState` when they are unchanged. It derives `minY` and `maxY` from the measured items. Boxes are measured, not computed, because Android scales an OS-scaled label's line nonlinearly (`message_glyph.hook.ts:16`).
    - `y` is relative to the list. Every list this plan passes has no padding, so its top row reads `y` 0.
  - `SelectablePill` is unchanged: it already forwards `hitSlop`, `onLayout` and `style` (`chip.tsx:37-43,89-91`).
- Test: `first` · `__tests__/components/ui/touch_floor.geometry.test.ts` (new `.ts`):
  - an unmeasured box gives `gap / 2` on every side;
  - an inner 29 dp pill with gap 6 gives 3 on every side;
  - in a two-row list with edge `{ top: 0, bottom: 12 }`, a top-row 29.33 dp pill gives top 0 and bottom 3, and a bottom-row pill gives top 3 and bottom 12;
  - in a one-row list (`minY` = `maxY`) with the same edge, a pill gives top 0 and bottom 12;
  - a bottom-row 25 dp pill with gap 8 and no `edge.bottom` gives top 4, and its total reaches `TouchSize.min + 2·TOUCH_SLOP_PIXEL_MARGIN`.

  `first` · `__tests__/components/ui/touch_floor.hook.test.ts` (`renderHook`): before layout every side is `gap / 2`. After items lay out at `y` 0 and `y` 35, the first takes `edge.top` above it and the second takes `edge.bottom` below it.

### 3. The filter sheets' option pills and the form's pickers take it, and a wrapped option pill stays inside the card
- File: `src/components/ui/chip.geometry.ts`, `src/components/ui/filter_accordion.geometry.ts`, `src/components/ui/filter_accordion.tsx` (`:65`, `:111`, `FilterOptionPillList` `:120-139`), `src/modules/commitments/screens/commitments/components/recurrence_picker.tsx` (`:36-50`, `:85-94`), `src/modules/commitments/screens/commitments/components/duration_picker.tsx` (`:57-69`)
- Change: Add four raw constants to `chip.geometry.ts`:
  - `FILTER_OPTION_PILL_GAP = 6`: frame B1FilterSheet `.facc .pl`, today's `gap-1.5`.
  - `FORM_PICKER_PILL_GAP = 8`: today's `gap-2` on each picker's container and pill rows.
  - `WRAPPING_PILL_STYLE = { maxWidth: '100%' }` and `WRAPPING_PILL_LABEL_STYLE = { flexShrink: 1 }`.

  `filter_accordion.geometry.ts` adds raw constants for the card's classes: `FILTER_ACCORDION_CARD_BORDER = 1` (`border`, `:65`), `FILTER_ACCORDION_CARD_MARGIN_BOTTOM = 8` (`mb-2`, `:65`) and `FILTER_ACCORDION_CONTENT_PADDING_BOTTOM = 14` (`pb-3.5`, `:111`). It also adds `FILTER_OPTION_LIST_EDGE: TouchFloorRoom = { top: 0, bottom: (FILTER_ACCORDION_CONTENT_PADDING_BOTTOM + 2·FILTER_ACCORDION_CARD_BORDER + FILTER_ACCORDION_CARD_MARGIN_BOTTOM) / 2 }`, which is 12:
  - The bottom room is half the gap to the next card's trigger, and it stays inside the content's 14 dp clip.
  - The top room is 0, below.

  Those classes and every pill row's and picker container's gap class become `style` from their constants, at the same values, so nothing moves.
  - `FilterOptionPillList` calls `useTouchFloorGridHitSlop(FILTER_OPTION_PILL_GAP, FILTER_OPTION_LIST_EDGE)`. Each pill takes `{...touch.item(option.id)}`, `style={[WRAPPING_PILL_STYLE, HIT_SLOP_UNCLIPPED_STYLE]}` and `labelStyle={WRAPPING_PILL_LABEL_STYLE}`. The label wraps inside the pill, and the pill never exceeds its line, so its rounded right end stays inside the card. That is the #824 render-lens finding at 2.0.
  - Each picker row calls `useTouchFloorGridHitSlop(FORM_PICKER_PILL_GAP, edge)`, and each pill takes `{...touch.item(key)}` and `style={HIT_SLOP_UNCLIPPED_STYLE}`. The label text above a row is not a control, so no row has a top edge room except the period row.
    - The recurrence presets row's edge is `{ bottom: FORM_PICKER_PILL_GAP / 2 }` while `Custom` shows the custom row, else `{}`.
    - The period row's edge is `{ top: FORM_PICKER_PILL_GAP / 2 }`, with the presets row above it.
    - The duration row's edge is `{ bottom: FORM_PICKER_PILL_GAP / 2 }` while the count row or the end-date control shows, else `{}`.

  The top pill row takes no touch above its top edge. `Accordion.Content` clips at its `pt-0` edge, and the trigger draws over it (`.accordion__trigger` `z-index: 10`, HeroUI `accordion.css:35-44`), so the trigger keeps its whole box (probe-1: a tap 2 dp above the top row collapsed `Accounts`). Rule 1 gives the same answer, because the gap to the trigger is 0.
- Test: `after` · `__tests__/components/ui/filter_accordion.test.tsx`, in a `FilterOptionPillList` case. Each pill's `hitSlop` before layout equals `touchFloorHitSlopInGap(0, FILTER_OPTION_PILL_GAP)`, and its style holds `WRAPPING_PILL_STYLE` and `HIT_SLOP_UNCLIPPED_STYLE`. This is render-only wiring bound to named constants, per the Render-suite policy. `first` · `__tests__/components/ui/filter_accordion.geometry.test.ts`: `FILTER_OPTION_LIST_EDGE.top` is 0, and `.bottom` is under `FILTER_ACCORDION_CONTENT_PADDING_BOTTOM`, inside the clip. The pickers have no suite: the geometry and hook tests and the `add_commitment.md` row cover them.

### 4. The month row steps, year arrows and month cells take their slop from the touch-floor rule
- File: `src/components/ui/month_filter.geometry.ts`, `src/components/ui/month_filter.tsx`, `src/modules/transactions/screens/transactions/components/transactions_rail.geometry.ts` (`:21-24`)
- Change: Delete `MONTH_STEP_HIT_SLOP`. Add `type MonthStepSide = 'previous' | 'next'`.
  - `resolveMonthStepHitSlop(rowHitSlop: MonthRowHitSlop | undefined, height: number, side: MonthStepSide): Required<Insets>`.
    - Top and bottom are `rowHitSlop`, else `touchFloorHitSlop(height)`.
    - Outward is `touchFloorHitSlop(height).top`. Inward is `min(that, Spacing.xxs / 2)`, half the row gap to the pill (`month_filter.tsx:57`). Previous takes outward on the left, next on the right.
  - `resolveMonthYearStepHitSlop(side: MonthStepSide): Required<Insets>` is `touchFloorHitSlopWithin(Size.monthYearStepTrack, room)`, with left and right `touchFloorHitSlop(Size.monthYearStepTrack).top`.
    - `room.bottom = Spacing.sm / 2`: half the year row's `marginBottom` to the grid (`:117`).
    - `next` adds `room.top = Spacing.xs / 2`: half the sheet header's `paddingBottom` to the close button above it (`sheet.tsx:188`).
    - At 1.0 previous reads about 46 dp and next about 42 dp. Next stops at half the gap, which #822's year-arrow Acceptance line ("or as far as half the gap to each neighbour where that is nearer") and the Decision of 2026-10-22 at /prep reviewer round 1 ("every slop stops at half the drawn gap to its neighbour, whatever that neighbour takes") both state.
  - `MONTH_PICKER_CELL_GAP = Spacing.xs`, which the grid's `gap` (`:137`) reads. `MONTH_PICKER_GRID_EDGE: TouchFloorRoom = { top: Spacing.sm / 2 }`: the other half of the year row's `marginBottom`, since the arrows take the half above it. The bottom row has no room bound, because only the body's `paddingBottom: Spacing.lg` (`:111`) lies below it. `MonthFilter` calls `useTouchFloorGridHitSlop(MONTH_PICKER_CELL_GAP, MONTH_PICKER_GRID_EDGE)` once, and every cell takes `{...cellTouch.item(month.key)}`.
  - `IconButton`'s `hitSlop` becomes required with no default. Each `IconButton` and each cell adds `HIT_SLOP_UNCLIPPED_STYLE` (MA-122).
  - In `transactions_rail.geometry.ts`, `monthRowHitSlop.top` becomes `TouchSize.min − Size.monthPillTrack − space / 2 + TOUCH_SLOP_PIXEL_MARGIN`. It equals today's `space + margin` at `space` 8 and now reads from `TouchSize.min`, the shape of `tabsHitSlop.bottom`. `bottom` is unchanged.
- Test: `first` · `__tests__/components/ui/month_filter.geometry.test.ts`, which drops the `MONTH_STEP_HIT_SLOP` cases and adds:
  - With no row slop, steps take `touchFloorHitSlop(32)`, and each inward side is `Spacing.xxs / 2`.
  - With a row slop, steps take the row's top and bottom.
  - The year arrows' rooms as stated, with next's total under `TouchSize.min` asserted.
  - `MONTH_PICKER_GRID_EDGE.top` plus the arrows' bottom room equals `Spacing.sm`.

  `first` · `__tests__/screens/transactions/transactions_rail.geometry.test.ts`: `Size.monthPillTrack + top + bottom = TouchSize.min + 2·TOUCH_SLOP_PIXEL_MARGIN` for each `scaledSpace` case.

  `after` · `__tests__/components/ui/month_filter.test.tsx`, the MA-109 case:
  - steps carry `resolveMonthStepHitSlop(…, side)`;
  - the year arrows carry `resolveMonthYearStepHitSlop(side)`;
  - a cell's `hitSlop` before layout is `touchFloorHitSlopInGap(0, MONTH_PICKER_CELL_GAP)`;
  - each step, year arrow and cell holds `HIT_SLOP_UNCLIPPED_STYLE`.

### 5. Header actions, the search row's Filter and clear buttons and each sheet's close button take their slop from the touch-floor rule
- File: `src/components/ui/stack_header.geometry.ts` (`:24-29`), `src/components/ui/header_action_box.tsx`, `src/components/ui/search_filter_row.geometry.ts`, `src/components/ui/search_filter_row.tsx` (`:45`, `:60`, `:63-70`), `src/components/ui/sheet.helpers.ts`, `src/components/ui/sheet.tsx` (`:203`), `src/components/ui/press_highlight.tsx` (new)
- Change:
  - `HEADER_ACTION_HIT_SLOP` is `touchFloorHitSlop(Size.headerActionTrack).top` on all four sides. The box is 36 dp at 1.0 and 2.0 (`resolveHeaderTextActionGeometry`), so the target reads about 46 dp. `HeaderActionBox` adds `HIT_SLOP_UNCLIPPED_STYLE`, and the back button moves with it.
  - `SearchFilterRowGeometry` gains `filterHitSlop: Required<Insets>` and `clearHitSlop: Required<Insets>`, plus `filterButton.overflow: 'visible'` from `HIT_SLOP_UNCLIPPED_STYLE`. Two raw constants name today's classes: `SEARCH_ROW_GAP = 8` (`gap-2`, `:45`) and `SEARCH_ROW_MARGIN_BOTTOM = 8` (`mb-2`, `:45`). The row's `gap-2` and `mb-2` classes become `style` from them, at the same values.
  - Filter is `touchFloorHitSlopWithin(inputHeight, { top: 0, bottom: SEARCH_ROW_MARGIN_BOTTOM })`, with `left: SEARCH_ROW_GAP / 2` and `right: touchFloorHitSlop(COMPACT_CONTROL_SIZE).top`.
  - Clear is `touchFloorHitSlopWithin(Size.searchClearTrack, { top: inset, bottom: inset + SEARCH_ROW_MARGIN_BOTTOM })`, with `inset = (inputHeight − Size.searchClearTrack) / 2`.
    - `left` is `touchFloorHitSlop(Size.searchClearTrack).top`.
    - `right` is `min(touchFloorHitSlop(Size.searchClearTrack).top, (SEARCH_CLEAR_INSET_END + SEARCH_ROW_GAP) / 2)`, which is 10. Raw `SEARCH_CLEAR_INSET_END = 12` is HeroUI's `inset-inline-end: calc(var(--spacing) * 3)` (`search-field.css:39-43`). The right side stops at half the 20 dp gap to Filter's box, per Decision 2026-10-22 ("every slop stops at half the drawn gap to its neighbour, whatever that neighbour takes").
  - Both stop at the row's top edge, because the account chips row above holds its slop to its own bottom edge (`account_chips.geometry.ts:13-15`). Both also stop at the row's `mb-2` edge. Below it the tally (`transactions/index.tsx:149-159`, `search_tally.tsx:21-25`, no top margin), or the list's first section, takes every touch inside its box, since Android searches the later sibling first (`TouchTargetHelper.kt:213-246`).
  - On `Pixel_2_API_34`, `ms(36)` reads 38.10 dp (probe-1). Filter reads 46.0 dp (0 above, 7.9 below), and clear reads 46.0 dp on its 24.00 dp box (7.05 above, 14.95 below). Where `ms(36)` is 36, the bottom room binds and both read 44.0 dp.
  - `SearchField.ClearButton` and the Filter `PressableFeedback` take these slops with `HIT_SLOP_UNCLIPPED_STYLE`. A passed `hitSlop` wins over HeroUI's 8 (`search-field.tsx:199`).
  - `src/components/ui/press_highlight.tsx` (new) implements #822's Rule "A slopped Button draws its pressed highlight inside its own corners." (Decision 2026-10-22, /prep reviewer round 2).
    - `PressHighlight({ radius }: { radius: number })`, where `radius` is required and never `null`. It renders HeroUI's `PressableFeedback.Highlight` with `style={{ borderRadius: radius }}`.
    - Its `animation` is `{ backgroundColor: { value: useThemeColor('default-hover') }, opacity: { value: [0, 1] } }`, the colour and opacity HeroUI's Button gives its secondary and tertiary variants (`heroui-native/src/components/button/button.tsx:86-190`).
    - A slopped Button takes `feedbackVariant="scale"`, so HeroUI renders no square highlight of its own (`button.tsx:302-305`). It takes `background={<PressHighlight radius={…} />}`, which HeroUI renders inside the pressable before the content (`button.tsx:274-301`), so the icon stays HeroUI's.
  - The clear takes `feedbackVariant="scale"` and `background={<PressHighlight radius={Size.searchClearTrack / 2} />}`. An icon-only HeroUI Button is square (`button.css:66-69`), and its `--radius-3xl` is 24 dp (`theme.css:115`), so it draws a circle.
  - `sheet.helpers.ts` exports `SHEET_CLOSE_HIT_SLOP: Required<Insets>`: `touchFloorHitSlopWithin(Size.sheetCloseTrack, { top: 0, bottom: Spacing.xs / 2 })`, with left and right `touchFloorHitSlop(Size.sheetCloseTrack).top`.
    - Top room 0: the close's top is the sheet content's top edge (`sheet.tsx:136-144,182-189`). gorhom clips that container (`BottomSheetContent.tsx:224-229`), and its handle is searched before it (`BottomSheet.tsx:1827-1856`).
    - Bottom room: half the header's `paddingBottom` to the body's first control.
    - At 1.0 the close takes 0 above and 4 below, 36 dp in all. #822's close Acceptance line ("or as far as half the gap to each neighbour where that is nearer") and the Decision of 2026-10-22 at /prep reviewer round 1 both state that.
  - `BottomSheet.Close` takes it with `style={HIT_SLOP_UNCLIPPED_STYLE}`, `feedbackVariant="scale"` and `background={<PressHighlight radius={Size.sheetCloseTrack / 2} />}`. A passed `hitSlop` wins over HeroUI's 12 (`close-button.tsx:28`), which forwards its rest props to `Button`.
- Test: `first` · `__tests__/components/ui/stack_header.geometry.test.ts`: `HEADER_ACTION_HIT_SLOP` replaces the 8 literal case, and `Size.headerActionTrack + top + bottom ≥ TouchSize.min`.

  `first` · `__tests__/components/ui/search_filter_row.geometry.test.ts`, at 1.0 and 2.0:
  - Filter: top 0, bottom ≤ `SEARCH_ROW_MARGIN_BOTTOM`, `height + bottom ≥ TouchSize.min`, left `SEARCH_ROW_GAP / 2`.
  - Clear: top equals the inset, bottom ≤ `inset + SEARCH_ROW_MARGIN_BOTTOM`, and `Size.searchClearTrack + top + bottom ≥ TouchSize.min`.
  - Clear: right equals `(SEARCH_CLEAR_INSET_END + SEARCH_ROW_GAP) / 2`, and left equals `touchFloorHitSlop(Size.searchClearTrack).top`.

  `after` · `__tests__/components/ui/search_filter_row.test.tsx`, one case under the Render-suite policy. The Filter's and the clear's `hitSlop` equal `resolveSearchFilterRowGeometry(fontScale).filterHitSlop` and `.clearHitSlop`, both hold `HIT_SLOP_UNCLIPPED_STYLE`, and the clear's `feedbackVariant` is `'scale'`.

  `first` · `__tests__/components/ui/sheet_close_hit_slop.test.ts` (new `.ts`): top 0, bottom `Spacing.xs / 2`, and `Size.sheetCloseTrack + top + bottom` under `TouchSize.min`, the ruled 36 dp. `detail_screen_actions.test.tsx:100` keeps comparing to the constant.

### 6. Account detail's See all and Add a transaction links take the touch-floor slop
- File: `src/components/ui/section_header.geometry.ts` (new), `src/components/ui/section_header.tsx` (`:26`, `:55-66`), `src/components/ui/detail_rows_card.geometry.ts` (new), `src/components/ui/detail_rows_card.tsx` (`:18`), `src/modules/accounts/screens/accounts/detail/components/account_detail_touch.geometry.ts` (new), `src/modules/accounts/screens/accounts/detail/components/account_activity_card.tsx` (`:44-47`), `src/modules/accounts/screens/accounts/detail/components/activity_empty_block.tsx` (`:46-59`)
- Change: Raw constants sit beside their components in `src/components/ui`, and each class becomes `style` from its constant at the same value, as step 3 does for the pill gaps:
  - `section_header.geometry.ts`: `SECTION_HEADER_MARGIN_TOP = 16` and `SECTION_HEADER_MARGIN_BOTTOM = 8`. `section_header.tsx:26` drops `mt-4 mb-2` for `marginTop` and `marginBottom` from them.
  - `detail_rows_card.geometry.ts`: `DETAIL_ROWS_CARD_MARGIN_TOP = 16`. `detail_rows_card.tsx:18` drops `mt-4` for `marginTop` from it, beside `DETAIL_ROWS_CARD_CORNER`.

  `account_detail_touch.geometry.ts` imports them and holds two resolvers:
  - `resolveActivitySeeAllHitSlop(fontScale: number): TouchFloorHitSlop` is `touchFloorHitSlopWithin(scaledTextStyle(Type.caption, fontScale).lineHeight, { top: SECTION_HEADER_MARGIN_TOP / 2, bottom: (SECTION_HEADER_MARGIN_BOTTOM + DETAIL_ROWS_CARD_MARGIN_TOP) / 2 })`.
    - At font scale 1.0 the touch-floor rule computes the slop and caps it at each half-gap: 8 dp above, toward Adjust balance and Archive, and 12 dp below, toward the first activity row. That is about 37 dp in all.
    - At 2.0 it reaches 44 dp.
    - Sources: #822 Rule 1 ("A slop lifts a control to the touch floor and stops at half the gap to a neighbour"), Rule 7 ("its slop stops there and still comes from the touch-floor rule"), Decision 2026-10-22 ("the slop stops at half the gap, the drawn gaps stay"), and the See all Acceptance line ("or as far as half the gap to each neighbour where that is nearer").
  - `resolveActivityEmptyLinkHitSlop(fontScale: number): TouchFloorHitSlop` is `touchFloorHitSlop(scaledTextStyle(Type.caption, fontScale).lineHeight)`. No control sits within reach: the circle and two texts are above, and the card's `py-5` is below.

  Both labels use `allowFontScaling={false}` and a JS-scaled caption, so the line is computed, not measured.
  - `SectionHeaderProps.action` gains `hitSlop?: TouchFloorHitSlop`, optional and never `null`. `LinkButton` takes it and, when it is set, `HIT_SLOP_UNCLIPPED_STYLE`. Today `SectionHeader` takes an `action` only from `account_activity_card.tsx`, and with nothing passed it behaves as today.
  - The card reads `useWindowDimensions().fontScale` and passes `hitSlop: resolveActivitySeeAllHitSlop(fontScale)`.
  - `ActivityEmptyBlock`'s `LinkButton` takes `hitSlop={resolveActivityEmptyLinkHitSlop(fontScale)}` and adds `HIT_SLOP_UNCLIPPED_STYLE` to its style.
- Test: `first` · `__tests__/screens/accounts/account_detail_touch.geometry.test.ts` (new `.ts`).
  - See all at 1.0: `{ top: 8, bottom: 12 }`, and line + 20 is under `TouchSize.min`, the ruled ~37 dp.
  - See all at 2.0: equal sides, and line + top + bottom ≥ `TouchSize.min`.
  - The empty link at 1.0 and 2.0: line + top + bottom = `TouchSize.min + 2·TOUCH_SLOP_PIXEL_MARGIN`.

### 7. Unarchive on the archived account and the archived row takes the touch-floor slop
- File: `src/components/ui/button.content.ts` (`:41-47`), `src/components/ui/button.geometry.ts` (`ButtonRootStyle`, `resolveButtonRootStyle`), `src/components/ui/button.tsx` (`:111-134`), `src/modules/accounts/screens/accounts/detail/components/account_detail_touch.geometry.ts`, `src/modules/accounts/screens/accounts/detail/components/archived_detail_body.tsx` (`:67-77`), `src/modules/accounts/screens/accounts/list/components/archived_account_row.tsx` (`:92-101`)
- Change: The compact accent arm's style adds `overflow: 'visible'`. `FlatButtonStyle.style`, `ButtonRootStyle` and `resolveButtonRootStyle`'s `flatStyle` parameter gain `overflow?: 'visible'`, optional.
  - In `Button`'s flat secondary branch (`button.tsx:111-134`), an unclipped flat style (`flatStyle?.style.overflow === 'visible'`) gives `HButton` `feedbackVariant="scale"` and `background={<PressHighlight radius={flatStyle.style.borderRadius} />}` from step 5, which is `Radius.cta` on the accent arm. Under #822's Rule "A slopped Button draws its pressed highlight inside its own corners.", a press draws inside the rounded box as it does today. Every other arm renders as today.
  - Add `resolveCompactCtaHitSlop(size: ButtonSize, fontScale: number, room: TouchFloorRoom): TouchFloorHitSlop` = `touchFloorHitSlopWithin(resolveCompactCtaHeight(size, fontScale), room)`.
  - `account_detail_touch.geometry.ts` adds raw `ARCHIVED_UNARCHIVE_MARGIN_TOP = 16` and `ARCHIVED_DELETE_MARGIN_TOP = 8`, and `ARCHIVED_UNARCHIVE_ROOM = { top: ARCHIVED_UNARCHIVE_MARGIN_TOP / 2, bottom: ARCHIVED_DELETE_MARGIN_TOP / 2 }`. The Unarchive box's `mt-4` below the facts card (`:67`) and the Delete box's `mt-2` (`:79`) drop those classes for `marginTop` from the constants, at the same values. At 1.0 that gives about 6 above and 4 below on the 36 dp box: 46 dp.
  - `archived_detail_body.tsx` reads `fontScale` and passes `hitSlop={resolveCompactCtaHitSlop('md', fontScale, ARCHIVED_UNARCHIVE_ROOM)}`.
  - `archived_account_row.tsx` passes `hitSlop={resolveCompactCtaHitSlop('sm', fontScale, {})}`. The button sits inside its own row, and that row is the slop's only vertical surround. `Button` already forwards `hitSlop` through `...props`.
- Test: `first` · `__tests__/components/ui/button.geometry.test.ts`: `resolveCompactCtaHitSlop` at 1.0 and 2.0, with no room, equals `touchFloorHitSlop(resolveCompactCtaHeight(…))`. `first` · `__tests__/components/ui/button_content.test.ts`: the accent arm's style holds `overflow: 'visible'`. `first` · `__tests__/screens/accounts/account_detail_touch.geometry.test.ts`: the detail Unarchive's bottom is 4 at 1.0, and its total is ≥ `TouchSize.min`.

### 8. The six feature files carry the new hit-area states and the wrapped option pill
- File: `.claude/skills/emulator-verify/features/transactions.md`, `commitments.md`, `add_commitment.md`, `account_detail.md`, `archived_account.md`, `accounts_list.md`
- Change: Append each `new` state of § Screens to its file's States table. Each takes the frame (`B1, MA-236` for the filter sheets, `C4, MA-236` and `B5, MA-236` where a frame draws the control, else `no frame, MA-236`).
  - Force: the reach, then one `mqa bounds` call on the controls, at 1.0 and under the `Font scale` force at 2.0 where the row's risk names a font scale.
  - Proof: the Band proof method (README § Band proof). A `tapxy` 1 dp inside each slop edge, as dp × 2.625 rounded from bounds, takes the tap. A tap 1 dp past it does not, or lands on the neighbour on that side. The edges are the figures steps 3 to 7 state: the filter sheet's 3 dp between pill rows, See all's 8 above and 12 below at 1.0.
  - `filter sheet hit areas` proves the 3 dp band between two pill rows, on a middle row's top edge and a row's bottom edge, and between two pills in a row. A tap 1 dp above the top row lands on the section trigger and collapses the section. A selected checkable pill widens by its check icon and moves its row neighbour (probe-1: 154.7 to 174.1 dp at 1.0), so the row reads `mqa bounds` again after each tap that toggles a pill, before it computes the next `tapxy`. On a list of two or more rows, a tap 1 dp inside the 12 dp below the last row's bottom edge selects the pill above the tap. The last row then reads `29.33 + 3 + 12` dp at 1.0.
  - `filter sheet hit areas` on `commitments.md` cites the proofs of the transactions row.
  - `search row hit areas` on `commitments.md` (no frame, MA-236) cites the proofs of the transactions row. Its bottom edge is the first section header's top: commitments draws no tally (`commitments/index.tsx:167-181`). Its top neighbour is the summary header.
  - The clear, the close, the archived account's Unarchive and the archived row's Unarchive each add one shot held mid-press. The shot proves #822's Rule "A slopped Button draws its pressed highlight inside its own corners.": the tint draws inside the button's corners. If `mqa` cannot hold a press, that proof reads `unread`.
  - `search row hit areas` takes its edges from `resolveSearchFilterRowGeometry(1).input.height` as the device reads it (38.10 dp on `Pixel_2_API_34`), not from 36: Filter 0 above and 7.9 below, and clear 7.05 above and 14.95 below. A tap 1 dp past the row's `mb-2` edge lands on the tally.
  - `month picker hit areas` reads the close at 0 above and 4 below. A tap 1 dp above its box lands on the sheet's handle.
  - The transactions `filter sheet walk, large font` force adds an account named `Visa Gold Platinum Rewards Card`. Its proof adds: each option pill's box inside the card's, and a pill whose label wraps draws its rounded right end. `commitments.md`'s row inherits this proof through its citation, and its force (`commitments.md:44`) adds the same account. The commitments sheet lists every account from the store (`commitments/filter/filter.hook.ts:45`).
- Test: `none` · docs, not code.

## Screens
- `transactions.md`: `filter sheet hit areas` (new, step 8). Risks: a clipped or rounded container, a height that is not a whole number of dp, a font scale above 1.0.
- `transactions.md`: `filter sheet walk, large font` (step 8 adds the long account name and the pill-inside-card proof). Risks: a font scale above 1.0, a clipped or rounded container.
- `transactions.md`: `search row hit areas` (new, step 8). Risks: a clipped or rounded container, a height that is not a whole number of dp.
- `transactions.md`: `rail hit areas`. Risk: a clipped or rounded container.
- `transactions.md`: `month picker hit areas` (new, step 8: the year arrows, a middle-row cell, the close button). Risk: a clipped or rounded container.
- `commitments.md`: `filter sheet hit areas` (new, step 8). Risks: a clipped or rounded container, a height that is not a whole number of dp, a font scale above 1.0.
- `commitments.md`: `filter sheet walk, large font` (step 8 adds the long account name to its force). Risks: a font scale above 1.0, a clipped or rounded container.
- `commitments.md`: `search row hit areas` (new, step 8). This is not a Screen checks row: review round 2 added it for the Acceptance line "On both lists, the search field's clear button…". Risks: as the transactions row.
- `add_commitment.md`: `recurrence and duration pill hit areas` (new, step 8, `Custom` picked so the period pills show). Risks: a clipped or rounded container, a height that is not a whole number of dp, a font scale above 1.0.
- `account_detail.md`: `activity see-all link hit area` (new, step 8). Risks: a height that is not a whole number of dp, a font scale above 1.0.
- `account_detail.md`: `activity empty link hit area` (new, step 8). Risks: a height that is not a whole number of dp, a font scale above 1.0.
- `account_detail.md`: `header action hit area` (new, step 8: `Edit` and the back button). Risks: a clipped or rounded container, a height that is not a whole number of dp.
- `archived_account.md`: `unarchive hit area` (new, step 8). Risks: a clipped or rounded container, a font scale above 1.0.
- `accounts_list.md`: `archived row unarchive hit area` (new, step 8). Risks: a clipped or rounded container, a font scale above 1.0.

## Non-goals
- The commitments month pill and status rail, and `filter_rail.tsx`, `segment_filter.hook.ts`, `tabs.geometry.ts` and `tabs.tsx`, which the `Size:` line named: MA-211 (#785) owns them (Decision 2026-10-22). The commitments step buttons take the step 4 default inside today's clipped rail.
- Any drawn gap, box size or class value. Every class moved to a constant keeps its value.
- The account chips' and account strip's slops (`account_chips.tsx:136`, `account_strip.tsx:117`). They keep their own `hitSlop`.
- The month pill's own slop and overflow (`month_filter.tsx:68-76`).
- The budget, categories, currency and dashboard sites, per the 2026-10-18 ruling.
- The Currency segment's ellipsis on the commitment form at 2.0: MA-221 (#795).

## Untested inputs
- Measured pill and cell heights at font scale 2.0 under Android's nonlinear scaling: the hook test uses fixed layouts. Steps 2 to 4 meet it, and the emulator rows read it.
- The wrapped option pill's drawing at 2.0 (step 3): only the emulator row reads it.
- The commitments step buttons inside the clipped `FilterRail` surface (step 4).
- The slop and `HIT_SLOP_UNCLIPPED_STYLE` wiring of See all and the empty link (step 6), the sheet close and the header action box (step 5): no render suite covers them, so only the emulator rows read them.
- The recurrence and duration rows' `useTouchFloorGridHitSlop` wiring (step 3): no suite renders `RecurrencePicker` or `DurationPicker`, so only the `add_commitment.md` row proves it.
- The `hitSlop` the two Unarchive sites pass (step 7, `archived_detail_body.tsx:67-77`, `archived_account_row.tsx:92-101`): no suite renders either file, so only the `archived_account.md` and `accounts_list.md` rows prove it.
- The `feedbackVariant="scale"` and `PressHighlight` wiring of the close (step 5) and of `Button`'s unclipped arm (step 7): only the step 8 mid-press shots read them.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `transactions.md · filter sheet hit areas`, `add_commitment.md · recurrence and duration pill hit areas`, `transactions.md · month picker hit areas`: a slop capped at a half-gap carries no pixel margin. Android truncates it to whole pixels, so a cell at 36 + 4 + 4 dp reads about 43.6.
- `transactions.md · search row hit areas`: the clear's top room assumes HeroUI centres the clear in the `ms(36)` group (38.10 dp on `Pixel_2_API_34`). Read its bounds before writing the probe offsets.
- `accounts_list.md · archived row unarchive hit area`: the row must be at least 46 dp tall at 1.0 and 2.0, or the slop crosses into a neighbouring row.
- Rule 4: budget, categories and dashboard change touch areas with the shared pieces. Budget's month row and picker (`budget/index.tsx:114`, `budget_copy_sheet.tsx:131`) move with `MonthFilter`. Every titled sheet moves with the step 5 close, including `net_worth_breakdown_sheet.tsx`, `add_edit_category_sheet.tsx`, `category_picker_sheet.tsx`, `reassign_category_sheet.tsx`, `income_sheet.tsx`, `set_budget_sheet.tsx` and `spending_plan_sheet/index.tsx`. Every `HeaderIconAction` and `HeaderTextAction` moves with `HeaderActionBox`. None gets an emulator walk, per the 2026-10-18 ruling. Name them in the PR body.
- not probed: `transactions.md` · rail hit areas
- not probed: `transactions.md` · month picker hit areas
- not probed: `commitments.md` · filter sheet hit areas
- not probed: `commitments.md` · filter sheet walk, large font
- not probed: `add_commitment.md` · recurrence and duration pill hit areas
- not probed: `account_detail.md` · activity see-all link hit area
- not probed: `account_detail.md` · activity empty link hit area
- not probed: `account_detail.md` · header action hit area
- not probed: `archived_account.md` · unarchive hit area
- not probed: `accounts_list.md` · archived row unarchive hit area

## Self-assessment
I am least sure about steps 2 and 4: whether an `onLayout`-measured height on a HeroUI `Chip` and on `PressableFeedback` cells stabilises in one extra render, and whether RN's Pressable slop under `overflow: 'visible'` takes the tap inside the accordion and sheet scroll views. MA-122 proved `overflow: 'visible'` for the account strip, not for these parents. The emulator hit-area rows are the only proof.
