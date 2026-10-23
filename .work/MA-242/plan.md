# MA-242 — Account detail links and Unarchive take a touch-floor slop
base: 0da351eb82ff4a80dc402db75d8b37c6b7833644 · verify: emulator · flags: none · expected diff: ~310 lines

Room convention for every step: a control takes all the empty space inside its own row or box, and half the drawn gap past that box to a neighbouring control. Toward a label, a card or a line of text it takes the whole gap (Decision 2026-10-22, /prep). This is the shipped search clear's shape, `touchFloorHitSlopWithin(Size.searchClearTrack, { top: inset, bottom: inset + SEARCH_ROW_MARGIN_BOTTOM })` (`search_filter_row.geometry.ts:105`). Every slop comes from `touchFloorHitSlop` or `touchFloorHitSlopWithin` (`theme.ts:305,317`), so the invariant pass reads it by its source (README line 76).

## Steps
### 1. Each sheet's close takes the touch-floor slop, bounded by the header row's top edge
- File: `src/constants/theme.ts` (`Size`, beside `monthYearStepTrack` `:161`), `src/components/ui/sheet.helpers.ts`, `src/components/ui/sheet.hook.ts`, `src/components/ui/sheet.tsx` (`:182-209`)
- Change:
  - `Size.sheetCloseTrack: 32`, raw, never `ms()`: HeroUI `close-button.css` `height: calc(var(--spacing) * 8)`.
  - `sheet.helpers.ts`: `SHEET_HEADER_PADDING_BOTTOM = Spacing.xs`, which the header View's `paddingBottom` reads (`sheet.tsx:188`).
  - `sheet.helpers.ts`: `resolveSheetCloseHitSlop(headerHeight: number | undefined): Required<Insets>`. The argument is optional in value (`undefined` before layout), never `null`.
    - `inset = headerHeight === undefined ? 0 : Math.max(0, (headerHeight − SHEET_HEADER_PADDING_BOTTOM − Size.sheetCloseTrack) / 2)`. The close is centred in the row (`alignItems: 'center'`).
    - Top and bottom are `touchFloorHitSlopWithin(Size.sheetCloseTrack, { top: inset, bottom: inset + SHEET_HEADER_PADDING_BOTTOM / 2 })`.
    - Left and right are `touchFloorHitSlop(Size.sheetCloseTrack).top`.
    - At 1.0 the row is the close's 32, so the close reads 0 above and `Spacing.xs / 2` below, 36 dp in all (Decision 2026-10-23). At 2.0 the title grows the row and the close reaches 44.
  - `sheet.hook.ts`: `useSheetCloseHitSlop(): { hitSlop: Required<Insets>; onHeaderLayout: (event: LayoutChangeEvent) => void }`, both fields required. It keeps the measured header height in `useState<number | undefined>`, skips `setState` when the height is unchanged, and returns `resolveSheetCloseHitSlop(height)`. The title is OS-scaled (`BottomSheet.Title`, `sheet.tsx:191-201`), so the height is measured, not computed.
  - `sheet.tsx`: `Sheet` calls the hook unconditionally. The header View takes `onLayout={onHeaderLayout}`. `BottomSheet.Close` takes `hitSlop`, `style={HIT_SLOP_UNCLIPPED_STYLE}`, `feedbackVariant="scale"` and `background={<PressHighlight radius={Size.sheetCloseTrack / 2} />}`. A passed `hitSlop` wins over HeroUI's 12 (`close-button.tsx:28` spreads rest props after it), and `BottomSheet.Close` forwards them (`bottom-sheet.tsx:278`). The radius follows the search clear (`search_filter_row.tsx:76-78`).
- Test: `first` · `__tests__/components/ui/sheet_close_hit_slop.test.ts` (new `.ts`):
  - `undefined` gives top 0, bottom `SHEET_HEADER_PADDING_BOTTOM / 2`, and `Size.sheetCloseTrack + top + bottom` under `TouchSize.min`.
  - A header of `SHEET_HEADER_PADDING_BOTTOM + Size.sheetCloseTrack` gives the same.
  - A header of `SHEET_HEADER_PADDING_BOTTOM + Size.sheetCloseTrack + 2·k`, with `k` the floor slop, gives a total ≥ `TouchSize.min`, top ≤ `k`, and bottom ≤ `k + SHEET_HEADER_PADDING_BOTTOM / 2`.
  - Left and right equal `touchFloorHitSlop(Size.sheetCloseTrack).top`.

  `first` · `__tests__/components/ui/sheet.hook.test.ts`, a `useSheetCloseHitSlop` case with `renderHook`: before layout `hitSlop` equals `resolveSheetCloseHitSlop(undefined)`. After `onHeaderLayout` with a layout of height `H`, it equals `resolveSheetCloseHitSlop(H)`.

### 2. The month picker's year arrows and month cells take their slop from the touch-floor rule
- File: `src/components/ui/month_filter.geometry.ts`, `src/components/ui/month_filter.state.ts`, `src/components/ui/month_filter.hook.ts`, `src/components/ui/month_filter.tsx` (`IconButton` `:18-50`, year row `:116-139`, grid `:141-155`)
- Change:
  - Geometry: delete `MONTH_STEP_HIT_SLOP` (`:10`). Add three constants:
    - `MONTH_PICKER_YEAR_ROW_GAP = Spacing.sm`, read by the year row's `marginBottom` (`:121`).
    - `MONTH_PICKER_CELL_GAP = Spacing.xs`, read by the grid's `gap` (`:141`).
    - `MONTH_PICKER_GRID_EDGE: TouchFloorRoom = { top: MONTH_PICKER_YEAR_ROW_GAP / 2 }`. The bottom row has no room bound: only the body's `paddingBottom: Spacing.lg` (`:115`) lies below it.
  - Geometry: `resolveMonthYearStepHitSlop(yearRowHeight: number | undefined, side: MonthStepSide): Required<Insets>`. `yearRowHeight` is `undefined` before layout, never `null`; `side` is required.
    - `inset = yearRowHeight === undefined ? 0 : Math.max(0, (yearRowHeight − Size.monthYearStepTrack) / 2)`.
    - Top and bottom are `touchFloorHitSlopWithin(Size.monthYearStepTrack, room)`, with `room.bottom = inset + MONTH_PICKER_YEAR_ROW_GAP / 2` toward the cells.
    - `next` sits under the close (both right-aligned in `Spacing.md` padding), so its `room.top` is `inset + SHEET_HEADER_PADDING_BOTTOM / 2`. That edge meets the close's bottom edge from step 1.
    - `previous` sits under the title, which is text, so its `room.top` is `inset + SHEET_HEADER_PADDING_BOTTOM`, the whole gap.
    - Left and right are `touchFloorHitSlop(Size.monthYearStepTrack).top`.
    - At 1.0 next reads about 42 dp, under 44 by the half-gap clause (Decision 2026-10-22, reviewer round 1), and previous about 46.
  - State: the store gains `yearRowHeight: number | undefined`, initially `undefined`, and `setYearRowHeight(height: number): void`.
  - Hook: `useMonthFilter` adds `state.yearStepHitSlop: Record<MonthStepSide, Required<Insets>>` from the resolver, and `onYearRowLayout(event: LayoutChangeEvent): void`, which writes the layout height.
  - Component:
    - `IconButton`'s `hitSlop` becomes required `Insets`, with no default.
    - The year row takes `testID="month-picker-year-row"` and `onLayout={monthFilter.onYearRowLayout}`. Each arrow takes `hitSlop={monthFilter.state.yearStepHitSlop[side]}` and `style={HIT_SLOP_UNCLIPPED_STYLE}` (MA-122).
    - `MonthFilter` calls `useTouchFloorGridHitSlop(MONTH_PICKER_CELL_GAP, MONTH_PICKER_GRID_EDGE)` once. Each cell takes `{...cellTouch.item(month.key)}` and style `{ width: '31.5%', ...HIT_SLOP_UNCLIPPED_STYLE }`. `month.key` is the short month label, stable across years (`month_filter.hook.ts`, `pickerMonths`).
    - Left and right are half the gap, so a tap in a gap lands on the cell on its side. A bare `PressableFeedback` draws no highlight layer, so unclipping it changes no pixel.
- Test: `first` · `__tests__/components/ui/month_filter.geometry.test.ts` drops the `MONTH_STEP_HIT_SLOP` case (`:59-61`) and adds:
  - With `undefined`, `next`'s top is `SHEET_HEADER_PADDING_BOTTOM / 2`, its bottom ≤ `MONTH_PICKER_YEAR_ROW_GAP / 2`, and its total is under `TouchSize.min`. `previous`'s total is ≥ `TouchSize.min`.
  - With `yearRowHeight = Size.monthYearStepTrack + 2·k`, both totals are ≥ `TouchSize.min` and no side passes its room.
  - `MONTH_PICKER_GRID_EDGE.top` plus `next`'s bottom with `undefined` is ≤ `MONTH_PICKER_YEAR_ROW_GAP`.

  `after` · `__tests__/components/ui/month_filter.test.tsx`, the MA-109 case (`:99-145`), past its `fireEvent.press`:
  - The year arrows carry `resolveMonthYearStepHitSlop(undefined, side)` and hold `HIT_SLOP_UNCLIPPED_STYLE`. This replaces `:135-143`, which assert the constant and no overflow.
  - After `fireEvent(getByTestId('month-picker-year-row'), 'layout', …)` with a layout of height `H = Size.monthYearStepTrack + 2·k`, each arrow's `hitSlop` equals `resolveMonthYearStepHitSlop(H, side)`. This proves the row's `onLayout` reaches the arrows through the store. Precedent for the event: `filter_accordion.test.tsx:210`.
  - A cell's `hitSlop` before layout is `MONTH_PICKER_CELL_GAP / 2` on every side, and it holds `HIT_SLOP_UNCLIPPED_STYLE`.

### 3. Account detail's See all and Add a transaction take the touch-floor slop
- File: `src/components/ui/section_header.geometry.ts` (new), `src/components/ui/section_header.tsx` (`:13-18`, `:26`, `:55-66`), `src/components/ui/detail_rows_card.geometry.ts` (new), `src/components/ui/detail_rows_card.tsx` (`:18`), `src/modules/accounts/screens/accounts/detail/components/account_detail_touch.geometry.ts` (new), `src/modules/accounts/screens/accounts/detail/components/account_activity_card.tsx` (`:39-47`), `src/modules/accounts/screens/accounts/detail/components/activity_empty_block.tsx` (`:19`, `:46-59`)
- Change: Raw constants name today's classes in unscaled CSS px, the convention of `filter_accordion.geometry.ts:7-10`. Each class becomes `style` from its constant at the same value, so nothing moves on the dashboard, accounts list, transaction detail or commitment detail, which mount these pieces too.
  - `section_header.geometry.ts`: `SECTION_HEADER_MARGIN_TOP = 16` and `SECTION_HEADER_MARGIN_BOTTOM = 8` (`mt-4 mb-2`).
  - `detail_rows_card.geometry.ts`: `DETAIL_ROWS_CARD_MARGIN_TOP = 16` (`mt-4`).
  - `SectionHeaderProps`' action arm becomes `{ label: string; onPress: () => void; hitSlop?: TouchFloorHitSlop }`. `hitSlop` is optional and never `null`. When it is set, `LinkButton` takes `hitSlop` and style `{ flexShrink: 1, ...HIT_SLOP_UNCLIPPED_STYLE }`; unset, the button renders as today. `LinkButton` turns its highlight off (`link-button.tsx`, `highlight: false`), so unclipping draws nothing new.
  - `account_detail_touch.geometry.ts`:
    - `resolveActivitySeeAllHitSlop(fontScale: number, body: Extract<ActivityCardBody, 'rows' | 'error'>): TouchFloorHitSlop`. Both arguments are required. It is `touchFloorHitSlopWithin(scaledTextStyle(Type.caption, fontScale).lineHeight, room)`:
      - `room.top` is `SECTION_HEADER_MARGIN_TOP / 2`, half the gap to Adjust balance and Archive (`detail/index.tsx:174-195`).
      - Over `'rows'`, `room.bottom` is `(SECTION_HEADER_MARGIN_BOTTOM + DETAIL_ROWS_CARD_MARGIN_TOP) / 2`: the first row is a control at the card's top edge (`list_card.tsx:21`, `p-0`).
      - Over `'error'`, `room.bottom` is `SECTION_HEADER_MARGIN_BOTTOM + DETAIL_ROWS_CARD_MARGIN_TOP`: the inline alert (`load_error_alert.tsx:205`, `px-4 py-3`) is a card, not a control, so the slop takes the whole gap.
      - At 1.0 that is about 36 dp over rows (Decision 2026-10-22) and about 46 over the error.
    - `ACTIVITY_EMPTY_BLOCK_PADDING_Y = 20` (`py-5`).
    - `resolveActivityEmptyLinkHitSlop(fontScale: number): TouchFloorHitSlop` is `touchFloorHitSlopWithin(caption line, { top: Spacing.sm, bottom: ACTIVITY_EMPTY_BLOCK_PADDING_Y })`. Above lies the body text, a whole gap of the link's own `marginTop: Spacing.sm`. Below lies the block's padding to the card's edge. Both labels are JS-scaled with `allowFontScaling={false}`, so the line is computed.
  - `account_activity_card.tsx` reads `useWindowDimensions().fontScale` and passes `hitSlop: resolveActivitySeeAllHitSlop(fontScale, body === 'error' ? 'error' : 'rows')`. `showSeeAll` holds only for those two bodies (`account_activity.helpers.ts:34`).
  - `activity_empty_block.tsx`: `py-5` becomes `paddingVertical: ACTIVITY_EMPTY_BLOCK_PADDING_Y`. The `LinkButton` takes `hitSlop={resolveActivityEmptyLinkHitSlop(fontScale)}` and style `{ marginTop: Spacing.sm, ...HIT_SLOP_UNCLIPPED_STYLE }`.
- Test: `first` · `__tests__/screens/accounts/account_detail_touch.geometry.test.ts` (new `.ts`):
  - See all over rows at 1.0: top `SECTION_HEADER_MARGIN_TOP / 2`, bottom `(SECTION_HEADER_MARGIN_BOTTOM + DETAIL_ROWS_CARD_MARGIN_TOP) / 2`, total under `TouchSize.min`.
  - See all over the error at 1.0: total ≥ `TouchSize.min`, and the bottom is under its room.
  - See all at 2.0 over both bodies: total ≥ `TouchSize.min`.
  - The empty link at 1.0 and 2.0: total ≥ `TouchSize.min`, top ≤ `Spacing.sm`, bottom ≤ `ACTIVITY_EMPTY_BLOCK_PADDING_Y`.

### 4. Unarchive on the archived account and on the archived row takes the touch-floor slop and draws its press inside its corners
- File: `src/components/ui/button.content.ts` (`FlatButtonStyle` `:12-16`, accent arm `:41-49`), `src/components/ui/button.geometry.ts` (`ButtonRootStyle` `:31-34`, `resolveButtonRootStyle` `:37-45`), `src/components/ui/button.tsx` (`:119-135`), `src/modules/accounts/screens/accounts/detail/components/account_detail_touch.geometry.ts`, `src/modules/accounts/screens/accounts/detail/components/archived_detail_body.tsx` (`:67-88`), `src/modules/accounts/screens/accounts/list/accounts_list.geometry.ts` (`ACCOUNTS_LIST_ARCHIVED_ROW_STYLE` `:76-84`, `SECTION_HEADER_MARGIN_TOP` `:86-87`, `ACCOUNTS_LIST_TYPE_TRIGGER_HIT_SLOP` `:156-162`), `src/modules/accounts/screens/accounts/list/components/archived_account_row.tsx` (`:92-102`)
- Change:
  - `FlatButtonStyle.style`, `ButtonRootStyle` and `resolveButtonRootStyle`'s third parameter each gain `overflow?: 'visible'`, optional and never `null`. The compact accent arm's style adds `...HIT_SLOP_UNCLIPPED_STYLE`. It is the only `tone="accent"` caller pair, these two Unarchives, so no other button moves. `rule_bucket_row.tsx:176` calls `resolveButtonRootStyle` with two arguments and is unaffected.
  - `button.tsx`, last branch: when `flatStyle?.style.overflow === 'visible'`, `HButton` takes a conditional spread `{ feedbackVariant: 'scale', background: <PressHighlight radius={flatStyle.style.borderRadius} /> }`. HeroUI then draws no square highlight (`heroui-native button.tsx:302-305`), and the press draws inside `Radius.cta`, per Rule "A slopped Button draws its pressed highlight inside its own corners". The `LoadErrorAlert` flat retry (`load_error_alert.tsx:146-156`) has no `tone`, so it keeps today's highlight.
  - `button.geometry.ts`: `resolveCompactCtaHitSlop(size: ButtonSize, fontScale: number, room: TouchFloorRoom): TouchFloorHitSlop` is `touchFloorHitSlopWithin(resolveCompactCtaHeight(size, fontScale), room)`. All three arguments are required.
  - `account_detail_touch.geometry.ts`:
    - `ARCHIVED_UNARCHIVE_MARGIN_TOP = 16` (`mt-4`) and `ARCHIVED_DELETE_MARGIN_TOP = 8` (`mt-2`), which the two Boxes' `marginTop` read in place of those classes.
    - `ARCHIVED_UNARCHIVE_ROOM: TouchFloorRoom = { top: ARCHIVED_UNARCHIVE_MARGIN_TOP, bottom: ARCHIVED_DELETE_MARGIN_TOP / 2 }`. Above is the facts card, a card: account facts carry no `press` (`account_facts.helpers.ts`), so `FactRow` renders no `onPress`. Below is Delete, a control.
  - `archived_detail_body.tsx` reads `fontScale` and passes `hitSlop={resolveCompactCtaHitSlop('md', fontScale, ARCHIVED_UNARCHIVE_ROOM)}`. `Button` forwards it through `...props` (`button.tsx:125`).
  - `accounts_list.geometry.ts`: `ACCOUNTS_LIST_ARCHIVED_ROW_PADDING_Y = Spacing.xs`, read by the row style's `paddingVertical`. `ACCOUNTS_LIST_ARCHIVED_UNARCHIVE_ROOM: TouchFloorRoom = { top: ACCOUNTS_LIST_ARCHIVED_ROW_PADDING_Y, bottom: ACCOUNTS_LIST_ARCHIVED_ROW_PADDING_Y }` keeps the slop inside the row, the button's parent, which clips as a HeroUI pressable (MA-122).
  - `accounts_list.geometry.ts`: the private `SECTION_HEADER_MARGIN_TOP` (`:86-87`) goes. `ACCOUNTS_LIST_TYPE_TRIGGER_HIT_SLOP` (`:160`) imports it from `@/components/ui/section_header.geometry` (step 3), so `SectionHeader`'s `mt-4` has one source (Rule 4).
  - `archived_account_row.tsx` passes `hitSlop={resolveCompactCtaHitSlop('sm', fontScale, ACCOUNTS_LIST_ARCHIVED_UNARCHIVE_ROOM)}`.
- Test: `first` · `__tests__/components/ui/button_content.test.ts`: the accent row of `flatRows` (`:148-157`) gains `overflow: 'visible'`, and no other row holds `overflow`.

  `first` · `__tests__/components/ui/button.geometry.test.ts`:
  - `resolveCompactCtaHitSlop` with `{}` equals `touchFloorHitSlop(resolveCompactCtaHeight(size, scale))` at 1.0 and 2.0.
  - `resolveButtonRootStyle('md', 1, { borderRadius: Radius.cta, overflow: 'visible' })` keeps the `overflow`.

  `first` · `__tests__/screens/accounts/account_detail_touch.geometry.test.ts`: the detail Unarchive at 1.0 and 2.0 has bottom ≤ `ARCHIVED_DELETE_MARGIN_TOP / 2` and total ≥ `TouchSize.min`.

  `first` · `__tests__/screens/accounts/accounts_list.geometry.test.ts`: `ACCOUNTS_LIST_ARCHIVED_ROW_STYLE.paddingVertical` equals `ACCOUNTS_LIST_ARCHIVED_ROW_PADDING_Y`. The row Unarchive at 1.0 and 2.0 has total ≥ `TouchSize.min` and neither side past the room. The existing `ACCOUNTS_LIST_TYPE_TRIGGER_HIT_SLOP` cases (`:421-431`) run unchanged over the imported constant.

### 5. The filter sheets' Amount currency segments take the touch-floor slop
- File: `src/constants/theme.ts` (`Size`, beside `compactSegmentTrack` `:157`), `src/components/ui/tabs.geometry.ts` (beside `resolveDefaultTriggerHeight` `:89-94`), `src/components/ui/filter_accordion.geometry.ts`, `src/components/ui/filter_accordion.tsx` (`AmountRangeFilterContent` `:172-199`)
- Change:
  - `Size.defaultSegmentTrack: 36`, raw, never `ms()`: HeroUI's default `.tabs__trigger` at scale 1, `--text-base--line-height` 24 plus `padding-block` 6 on each side (`heroui-native/src/styles/components/tabs.css:55-67`). At 1.0 `defaultLabel` is `undefined` (`tabs.geometry.ts:70`, `tabs.tsx:99,152`), so HeroUI sizes the label, not `lineHeightFor`.
  - `tabs.geometry.ts`: `resolveDrawnDefaultTriggerHeight(fontScale: number, maxFontScale = Infinity): number`. `fontScale` is required; `maxFontScale` is optional, never `null`. It returns `Size.defaultSegmentTrack` when `fontScale <= 1`, the condition `scaledTextStyleAboveOne` keys on, else `resolveDefaultTriggerHeight(fontScale, maxFontScale)`. `resolveDefaultTriggerHeight` stays as it is: `COMMITMENT_FORM_TABS_SLOP` reads it (`commitment_form.geometry.ts:16-18`).
  - `FILTER_AMOUNT_TABS_MARGIN_BOTTOM = 12`, the list's `mb-3`.
  - `resolveFilterAmountCurrencyHitSlop(fontScale: number): TabsTriggerHitSlop` is `touchFloorHitSlopWithin(resolveDrawnDefaultTriggerHeight(fontScale), { top: TABS_LIST_PADDING, bottom: TABS_LIST_PADDING + FILTER_AMOUNT_TABS_MARGIN_BOTTOM })`. At 1.0 that is 3 above and about 7 below, about 46 dp.
    - Above the list is the content's clipped `pt-0` edge, with the trigger drawn over it, the reason `FILTER_OPTION_LIST_EDGE.top` is 0 (`:15-23`).
    - Below is the `Min` label, text, so the slop takes the whole gap.
    - It follows `COMMITMENT_FORM_TABS_SLOP` (`commitment_form.geometry.ts:16-18`), with the drawn trigger height in place of `resolveDefaultTriggerHeight(1)`.
  - `mb-3` leaves `listClassName` for a wrapping View's `marginBottom: FILTER_AMOUNT_TABS_MARGIN_BOTTOM`, the same value. `SegmentedTabs` takes `triggerHitSlop={resolveFilterAmountCurrencyHitSlop(fontScale)}`, using the `fontScale` read at `:183`.
  - Transactions and Commitments both mount it through `filter_amount_accordion.tsx:48`.
- Test: `first` · `__tests__/components/ui/tabs.geometry.test.ts`, a `resolveDrawnDefaultTriggerHeight` case: at 1.0 it is `Size.defaultSegmentTrack`. At 2.0, with `maxFontScale` unset and at 1.3, it equals `resolveDefaultTriggerHeight(2, maxFontScale)`.

  `first` · `__tests__/components/ui/filter_accordion.geometry.test.ts`, at 1.0 and 2.0: top ≤ `TABS_LIST_PADDING`, bottom ≤ `TABS_LIST_PADDING + FILTER_AMOUNT_TABS_MARGIN_BOTTOM`, and `resolveDrawnDefaultTriggerHeight(scale) + top + bottom ≥ TouchSize.min`.

  `after` · `__tests__/components/ui/filter_accordion.test.tsx`, an `AmountRangeFilterContent` case. The `SegmentedTabs` mock surfaces `triggerHitSlop`, which equals `resolveFilterAmountCurrencyHitSlop(Dimensions.get('window').fontScale)`. This is render-only wiring under the Render-suite policy.

### 6. The add-account form's currency segments take the touch-floor slop inside their box
- File: `src/modules/accounts/components/account_form/account_form.geometry.ts` (`resolveCurrencyTabsBoxHeight` `:84-90`), `src/modules/currency/components/currency_selector.tsx`, `src/modules/accounts/components/account_form/account_form.tsx` (`:108-113`)
- Change:
  - `resolveCurrencyTabsHitSlop(fontScale: number): TabsTriggerHitSlop`:
    - `trigger = resolveDrawnDefaultTriggerHeight(fontScale, CURRENCY_TABS_MAX_FONT_SCALE)` (step 5) and `room = (resolveCurrencyTabsBoxHeight(fontScale) − trigger) / 2`. The drawn height sizes both the slop and the room, so neither edge crosses the box toward the `Currency` label, which `FormLabelText` draws flush on the box (`account_form.tsx:99-103`).
    - It returns `touchFloorHitSlopWithin(trigger, { top: room, bottom: room })`. At 1.0 the box is `Size.fieldHeight` 48, the room 6 and the slop about 5 each side, about 46 dp.
    - The label above and the empty rail below are text, so the slop takes the whole gap: the box around the tabs.
  - `CurrencySelectorProps` gains `triggerHitSlop?: TabsTriggerHitSlop`, optional and never `null`, passed to `SegmentedTabs` unchanged. `AccountForm` is its one caller (LSP) and passes `triggerHitSlop={resolveCurrencyTabsHitSlop(fontScale)}`.
  - The form mounts on onboarding's N2 (`onboarding/add_account/index.tsx:50`) and on the accounts add form (`accounts/add_account/index.tsx:27`), so both move.
- Test: `first` · `__tests__/account_form.geometry.test.ts`, at 1.0 and 2.0, with `trigger = resolveDrawnDefaultTriggerHeight(scale, CURRENCY_TABS_MAX_FONT_SCALE)`: top equals bottom, `trigger + top + bottom ≥ TouchSize.min`, and `trigger + top + bottom ≤ resolveCurrencyTabsBoxHeight(scale)`, so the slop stays inside the box. At 1.0 `trigger` is `Size.defaultSegmentTrack`.

### 7. The seven feature files carry the ten new hit-area states
- File: `.claude/skills/emulator-verify/features/account_detail.md`, `archived_account.md`, `accounts_list.md`, `transactions.md`, `commitments.md`, `onboarding.md`, `add_account.md`
- Change: Append each state of § Screens to its file's States table, frame `no frame, MA-242`.
  - Force: the reach, `mqa bounds` on the controls and their neighbours at 1.0, and under the `Font scale` force (README) at 2.0.
  - Edges come from the resolver of steps 1 to 6, with the measured heights as `mqa bounds` reads them. Taps use `tapxy` at dp × 2.625 rounded.
  - Proof: a tap 1 dp inside each slop edge takes the control's action. A tap 1 dp past it takes nothing, or lands on the neighbour on that side.
  - Per state:
    - `activity see-all link hit area`: the transactions list opens. It runs over rows, and again under the force of `activity load error` (`account_detail.md:25`).
    - `activity empty link hit area`: from `no transactions` (`:23`), the add form opens with this account preselected (Outbound, `:64`).
    - `unarchive hit area`: the account restores. The seed is pushed again after each tap that restores, and one shot is held mid-press.
    - `archived row unarchive hit area`: a tap 1 dp past the slop, still inside the row, opens the archived account. One shot is held mid-press.
    - `month picker hit areas`: an arrow tap moves the year, and a cell tap picks its month. A tap 1 dp above `next`'s top edge closes the sheet, through the close's slop. A tap 1 dp either side of a gap's midline picks the cell on that side.
    - `sheet close hit area`: at 1.0 a tap 1 dp above the box lands on the handle and the sheet stays open. At 2.0 the edges come from `sheet-header`'s height. One shot is held mid-press.
    - `filter sheet amount currency hit area` and `add account currency segments hit area`: the segment selects.
    - The `commitments.md` and `add_account.md` rows cite the `transactions.md` and `onboarding.md` proofs on their own routes.
  - A held-press shot `mqa` cannot take reads `unread`.
- Test: `none` · docs, not code.

## Screens
- `account_detail.md`: `activity see-all link hit area` (new, step 7). Risks: a height that is not a whole number of dp, a font scale above 1.0, a clipped or rounded container.
- `account_detail.md`: `activity empty link hit area` (new, step 7). Risks: as above.
- `archived_account.md`: `unarchive hit area` (new, step 7). Risks: a font scale above 1.0, a clipped or rounded container.
- `accounts_list.md`: `archived row unarchive hit area` (new, step 7). Risks: as above.
- `transactions.md`: `month picker hit areas` (new, step 7). Risks: a height that is not a whole number of dp, a font scale above 1.0, a clipped or rounded container.
- `transactions.md`: `sheet close hit area` (new, step 7). Risks: a font scale above 1.0, a clipped or rounded container.
- `transactions.md`: `filter sheet amount currency hit area` (new, step 7). Risks: as above.
- `commitments.md`: `filter sheet amount currency hit area` (new, step 7). Risks: as above.
- `onboarding.md`: `add account currency segments hit area` (new, step 7). Risks: as above.
- `add_account.md`: `currency tabs hit area` (new, step 7). Risks: as above.

## Non-goals
- Every other MA-236 site: filter and picker pills, the month step buttons, header actions, the search row. The commitments month pill and status rail are MA-211's (#785).
- Budget's and categories' segments (`budget/index.tsx:117`, `settings/categories/index.tsx:90`, `add_edit_category_sheet.tsx:215`), per the 2026-10-18 ruling.
- The archived account's Delete, account detail's Adjust balance and Archive, and the `LoadErrorAlert` retry: no slop or highlight change.
- A left or right slop on the currency segments: `TabsTriggerHitSlop` is top and bottom only.
- `COMMITMENT_FORM_TABS_SLOP` and the commitment form's tabs.
- Any drawn gap, box size or class value: every class moved to a constant keeps its value.

## Untested inputs
- The slop and unclipped wiring of See all and the empty link (step 3): no suite renders `SectionHeader`, `AccountActivityCard` or `ActivityEmptyBlock`. The `account_detail.md` rows prove it.
- The close's wiring and the measured header height on device (step 1): no `Sheet` render suite exists. `transactions.md · sheet close hit area` proves it.
- Both Unarchives' `hitSlop`, `feedbackVariant` and `PressHighlight` (step 4): no suite renders `ArchivedDetailBody`, `ArchivedAccountRow` or the `Button` flat branch. The `archived_account.md` and `accounts_list.md` rows prove it.
- `AccountForm` passing `triggerHitSlop` (step 6): no suite renders it. The `onboarding.md` and `add_account.md` rows prove it.
- Measured year-row and cell heights at 2.0 under Android's nonlinear scaling (step 2): the render case fires one fixed layout, and the `transactions.md` row reads the device's heights.
- The drawn default trigger height at 1.0 (step 5): `Size.defaultSegmentTrack` mirrors HeroUI's `tabs.css`, which no test reads. The `transactions.md`, `onboarding.md` and `add_account.md` rows read it with `mqa bounds`.
- The Commitments filter sheet's Amount segments (step 5): its suite mocks `FilterAmountAccordion` (`filter_sheet.test.tsx:113`). `commitments.md` proves it.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- See all's drawn box may be taller than the caption line (#819's lens read 33.14 dp). The computed slop is then larger than needed, but the rooms still bound it.
  - `account_detail.md · activity see-all link hit area`: the totals differ from the resolver's line figure.
- The close and the year arrows take the 1.0 shape until their first `onLayout`. A tap in the first frame at 2.0 reaches less.
  - `transactions.md · month picker hit areas`: a tap taken before layout reads the 1.0 edges.
  - `transactions.md · sheet close hit area`: the same.
- The close's bottom room is half `SHEET_HEADER_PADDING_BOTTOM` on every sheet. On a sheet whose first body element is text, it stops short of the whole gap Rule 1 allows. It is the nearer side the Acceptance permits, and the 36 dp of Decision 2026-10-23.
- The invariant pass of Rule 5 runs over the whole of each named screen. A node outside this ticket that reads under 44 dp without a `touchFloorHitSlop` source is a finding this plan does not cover.
- `transactions.md · filter sheet amount currency hit area`: `Accordion.Content` clips at its top edge, so a tap above the list's top takes the trigger, by design.
- `accounts_list.md · archived row unarchive hit area`: a row taller than its minimum leaves more room than the padding, unused by design. The slop stays inside the row.
- `archived_account.md · unarchive hit area`: each tap that restores changes the db, so the walk pushes the seed again before the next tap.
- `not probed: account_detail.md · activity see-all link hit area`
- `not probed: account_detail.md · activity empty link hit area`
- `not probed: archived_account.md · unarchive hit area`
- `not probed: accounts_list.md · archived row unarchive hit area`
- `not probed: transactions.md · month picker hit areas`
- `not probed: transactions.md · sheet close hit area`
- `not probed: transactions.md · filter sheet amount currency hit area`
- `not probed: commitments.md · filter sheet amount currency hit area`
- `not probed: onboarding.md · add account currency segments hit area`
- `not probed: add_account.md · currency tabs hit area`

## Self-assessment
I am least sure of step 1's measured header. Computing the close's slop from `onLayout` of the header View assumes the title is the only child that grows the row, and that the close stays centred at 32 dp at 2.0, as `alignItems: 'center'` and HeroUI's fixed `h-8` say. If gorhom or HeroUI lays the title out at a scale the measurement misses, the 2.0 edges move and only the emulator row catches it. Step 2's `next` arrow and the close are also assumed to share a column: both sit right-aligned in `Spacing.md` padding, and the close is read 32 by 32 dp (#832's lens). If the close draws wider, the two edges no longer meet on the padding's midline.
