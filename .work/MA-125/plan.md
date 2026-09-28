# MA-125 — Tab labels hold at a 2.0 font scale, and tab screens scroll clear of the add button
base: 10b1540f · verify: emulator · flags: none · expected diff: ~180 lines

## Steps

### 1. `scaledFontSize` lives in shared UI
- File: `src/components/ui/text_scale.geometry.ts` (new), `src/modules/transactions/screens/transactions/components/transactions_text.geometry.ts` (`scaledFontSize`, `:7-14`), `components/date_header.tsx:7`, `components/search_tally.tsx:8`
- Change: move `scaledFontSize(fontSize: number, fontScale: number, maxFontScale = Infinity): number` and its one-line comment to the new file, body unchanged. `transactions_text.geometry.ts` imports it and no longer exports it; `date_header.tsx` and `search_tally.tsx` import it from `@/components/ui/text_scale.geometry`.
- Test: `first` · `__tests__/components/ui/text_scale_geometry.test.ts` takes the `scaledFontSize` describe from `__tests__/screens/transactions/transactions_text_geometry.test.ts:9-14`; that file's other import at `:6` moves to the new path.

### 2. Tab labels stop growing at a font scale of 1.3
- File: `src/modules/navigation/screens/tabs/tabs.helpers.ts`, `tabs.hook.ts`, `index.tsx:40-49`
- Change: the label's size is `Type.pillLabel` (`msFont(10)`, `src/constants/theme.ts:90`); no token is added. `tabs.helpers.ts` exports `TAB_LABEL_MAX_FONT_SCALE = 1.3` and `resolveTabLabelStyle(fontScale: number): { fontSize: number; lineHeight: number }`, where `fontSize = scaledFontSize(Type.pillLabel, fontScale, TAB_LABEL_MAX_FONT_SCALE)` and `lineHeight = lineHeightFor(fontSize)`. `tabs.hook.ts` exports `useTabBarLabelStyle()`, which reads `useWindowDimensions().fontScale` and returns that style; it is a separate hook, so `useTabsLayout`'s focus effect still runs once. `TabsLayout` sets `tabBarAllowFontScaling: false` and `tabBarLabelStyle` from the hook. `tabBarStyle` gets no height.
- Test: `first` · `__tests__/screens/navigation/tabs.helpers.test.ts`: at 1.0 `fontSize` is `Type.pillLabel`; at 1.3, 1.5 and 2.0 it is `Type.pillLabel * 1.3`; `lineHeight` is `lineHeightFor(fontSize)` at each.

### 3. Home and Commitments lists end below the add button
- File: `src/constants/theme.ts` (`Size`), `tabs.helpers.ts`, `src/modules/commitments/screens/commitments/index.tsx:264`, `src/modules/dashboard/screens/dashboard/index.tsx:220,248`, `src/modules/budget/screens/budget/index.tsx:148,164,205,229`
- Change: `Size.tabScreenBottomClearance = ms(96)`. `tabs.helpers.ts` exports `BUNDLED_TAB_BAR_HEIGHT = 49` and `resolveAddButtonReach(): number`, equal to `Size.tabBarHeight + Spacing.md + Size.fab - BUNDLED_TAB_BAR_HEIGHT`. Commitments' `paddingBottom: 24` and both Home spacers' `Spacing.xxl` become the token; Budget's four `ms(96)` become the token at the same value. `resolveTabsGeometry` and `LIST_BOTTOM_CLEARANCE` stay.
- Test: `first` · `__tests__/screens/navigation/tabs.helpers.test.ts`: `Size.tabScreenBottomClearance >= resolveAddButtonReach()`, and `resolveTabsGeometry(34)` returns what it returns at base.

### 4. A state that does not scroll keeps its text above the add button past 1.0
- File: `src/components/ui/state_screen.geometry.ts`, `src/components/ui/empty_state.tsx`, `src/components/ui/load_error_alert.tsx`, and the callers: `src/modules/goals/screens/goals/index.tsx:20`, `dashboard/index.tsx:136`, `dashboard/components/dashboard_load_error.tsx:22`, `commitments/components/empty_state.tsx:8`, `commitments/index.tsx:237`, `budget/index.tsx:138`
- Change: `resolveStateScreenBottomReserve(fontScale: number): number` returns `0` at `fontScale <= 1` and `Size.tabScreenBottomClearance` above it. `EmptyStateProps` (both arms) and `LoadErrorAlert`'s `fill` arm take `clearsAddButton?: boolean`. Both components read `useWindowDimensions().fontScale` on every render at the top of the function, in `LoadErrorAlert` above the `inline` and `floating` returns (`:80`, `:88`), and add the reserve as `paddingBottom` on the `flex: 1` root only when `clearsAddButton` is set, so the content centres in the space above the button. `inline` placement and the `inline` and `floating` modes ignore it. The six callers pass `clearsAddButton`; no other caller changes.
- Test: `first` · `__tests__/components/ui/state_screen_geometry.test.ts`: reserve is `0` at 0.85 and 1.0, `Size.tabScreenBottomClearance` at 1.15, 1.3 and 2.0. No test on the two components, render tests are not added.

### 5. The five tab screens carry their font-scale states in the feature map
- File: `.claude/skills/emulator-verify/features/goals.md` (new), `features/README.md` (§ Files), `features/dashboard.md`, `features/commitments.md`, `features/budget.md`, `features/transactions.md`
- Change: `goals.md` in the four-section shape, route `/goals`, frames `not redesigned`, with its README row. Each States table gains the rows named under Screens, every one `no frame, MA-125`. Force for a large-font row is the `font_scale` recipe at `transactions.md:50`, at 1.0 and 2.0, a cold launch after each, back to 1.0 after. Proof for a clearance row: scrolled to its end, the last text node's bottom from `mqa bounds` is at or above the top of `fab-button`; for a state that does not scroll, no text node's box intersects `fab-button`'s. Load errors are source forces, one throw in the screen's own loader (`dashboard.store.ts`, `commitments.hook.ts`, `budget.hook.ts`). On Transactions the throw sits before `repo.getAll` in `replaceSnapshot` (`src/modules/transactions/store/transaction.store.ts:96`), reached on a cold launch, which sets `state.showFirstLoadError` and draws the `fill` alert `transaction-load-error` in `ListEmptyComponent` (`index.tsx:149`); the floating alert of `hero, figures failed` is that row's second proof. `goals.md`'s `empty, large font` proof, at 2.0 from `mqa bounds`: the boxes of `Goals`, `No goals set` and `Goals will appear here.` intersect neither each other nor `fab-button`; each box is at least twice its height at 1.0, less 1 dp; a crop shows no glyph cut at the top or bottom. `toast, large font` is a source force: one `toast.show` in `dashboard.hook.ts` through `useToast`, reverted, because no tab screen shows a toast at this base. Its proof, at 2.0 from `mqa bounds` taken while the toast shows: the toast's bottom is at or above the top of `fab-button`, and its box intersects neither `fab-button`'s nor any of the five tab cells' clickable nodes; one shot.
- Test: `none` · markdown; `npm run lint` covers its banned phrases.

## Screens
- `emulator-verify/features/dashboard.md`: tab bar labels, large font; add button clearance, populated; add button clearance, empty; add button clearance, load error; toast, large font
- `emulator-verify/features/commitments.md`: add button clearance, populated; add button clearance, empty; add button clearance, load error
- `emulator-verify/features/budget.md`: add button clearance, populated; add button clearance, empty; add button clearance, load error
- `emulator-verify/features/transactions.md`: add button clearance, populated; add button clearance, empty; add button clearance, load error; search tally, large font
- `emulator-verify/features/goals.md`: empty; empty, large font
- None of these states is in a file at base, except `search tally, large font`; step 5 appends them, all `no frame`.
- The walk runs twice, on an empty database and on a seeded one. The empty walk covers the `empty` rows and Goals, the seeded walk the rest. `add button clearance, populated` on Home covers both segments.
- `tab bar labels, large font` proof: at 2.0 each of the five label `TextView` boxes sits inside its cell's clickable node, 18 ± 1 dp high, and a crop shows each label whole or ending in a whole `…`; at 1.0 `fab-button` and the five label boxes' tops and bottoms read the same ± 1 dp as on `main`, and each label box is at most 7% wider.

## Non-goals
- The search field, filter badge, rails, month pill, budget lens tabs and buttons (MA-126), rows, cards and skeleton heights (MA-127).
- The tab bar's height, `Size.tabBarHeight`, `resolveTabsGeometry`, the add button's position and `toastClearance`.
- `src/components/ui/fab.tsx` and `src/modules/transactions/screens/transactions/index.tsx`: no change, and `LIST_BOTTOM_CLEARANCE` stays `ms(160)`.
- The tab screens' headings, Goals' included: `Typography.Heading` in a `minHeight` box, left as it is.
- The `floating` load error's `bottom-24` offset.
- `clearsAddButton` on any screen outside the tabs, and a scroll view around the states that do not scroll.
- Replacing `TRANSACTIONS_HERO_MAX_FONT_SCALE` or `DISPLAY_HEADLINE_MAX_FONT_SCALE` with a shared cap.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- Amended after review round 1: step 2 takes `Type.pillLabel` in place of a raw 10 (Rule 1); step 4 reads `fontScale` unconditionally; step 5 forces the Transactions `fill` load error and states the Goals proof; the label figures below and under Screens follow the new size.
- `Type.pillLabel` reads 10.67 at 411 dp against the bundled raw 10, so at 1.0 each tab label draws about 7% larger than today. Decided, not open: the ticket's Rules line "User ruling 2026-09-28" gives the tab label `Type.pillLabel` and allows up to 7% larger at 1.0, the one exception to Acceptance 5's "render as today". A review lens that reads the 7% as a regression is answered by that line. Amended after review round 2 to cite the ruling.
- The bundled label has no `lineHeight` today. If `lineHeightFor(Type.pillLabel)`, 14 dp, moves the label box at 1.0 by more than 1 dp, step 2 needs the pairing lint disabled on that line with its reason.
- The cell holds 39 dp (49 less 5 dp padding each side) and the icon plus an 18 dp label line is 42 dp. If the label clips at the bottom at 1.3 and above, step 2 is wrong about the cap fitting the bar, and the bar's height is fixed by Rule.
- If the add button covers text in a state that does not scroll at 1.0, Acceptance 2 and the Rule "changes only above 1.0" conflict, and step 4 cannot satisfy both.
- If the render pass shows the Goals heading or its empty state cut or overlapping at 2.0 after step 4, the cause is outside this plan and amends it.
- `Screen`'s default bottom inset on Goals and Budget adds to the reserve and the padding; a reserve that pushes text off the top on the 731 dp device amends step 4.
- MA-092 (#548) rebases over step 1's import line in `date_header.tsx`.
- Files the ticket's `Size:` line missed: `src/components/ui/load_error_alert.tsx`, `src/components/ui/state_screen.geometry.ts`, `src/modules/dashboard/screens/dashboard/components/dashboard_load_error.tsx`, `src/modules/commitments/screens/commitments/components/empty_state.tsx`. Files it lists that this plan leaves alone: `src/components/ui/fab.tsx`, `src/modules/transactions/screens/transactions/index.tsx`.

## Self-assessment
Step 4 is the one I am least sure about. The ticket leaves four facts to the device: whether the button reaches each state outside a scroll view, what `Screen`'s bottom inset adds, whether the capped label fits the bar, and what is cut on Goals at 2.0. I sized the reserve from the code, where the button's top is about 86 dp above the bar at 411 dp wide and an empty state with a button is about 350 dp tall at 2.0, and that arithmetic says the reserve fits on a 731 dp screen with under 50 dp to spare on Commitments. A shorter device or a longer description breaks it, and the only fix then is a scroll view, which this plan rules out. The Goals line in Acceptance names cut and overlapping text, and I found no mechanism for either in `goals/index.tsx` or `empty_state.tsx`, so the plan changes Goals only through the reserve.
