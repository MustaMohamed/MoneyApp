# MA-334 — Budget limit rows: one shared row body, ring label width and tag table
base: cc1acbd7cd5e2fe46f00090f710cc235a4db20e6 · verify: emulator · flags: none · expected diff: ~185 lines

## Steps
### 1. One tag table keyed by status, with the limit-tag type, lives in the budget utils
- File: `src/modules/budget/utils/budget_hero.ts` (beside `LIMIT_TAG_FILL_SHARE` `:12` and `heroStatusTag` `:14-26`)
- Change: add four exports, all fields required and never `null`. `BudgetLimitTag { label: string; icon: 'trending-up' | 'alert-circle'; fill: string; foreground: string }`, the shape of `SpendingPlanLimitTagVM` (`spending_plans.types.ts:97-102`). `BudgetTagStatus = 'onTrack' | 'watch' | 'over'`. `BUDGET_STATUS_TAG_STYLE`, `as const satisfies Record<BudgetTagStatus, { icon: DetailHeroBadge['badgeIcon']; tone: string }>`, holding the pairs of `PLAN_STATUS_TAG_STYLE` (`spending_plans.helpers.ts:106-113`): onTrack `check-circle`/`Colors.dark.positive`, watch `trending-up`/`Colors.dark.gold`, over `alert-circle`/`Colors.dark.negative`. `budgetStatusHeroTag(label: string, status: BudgetTagStatus): DetailHeroBadge` returns `heroStatusTag(label, style.icon, style.tone)`. `BUDGET_LIMIT_TAGS: Record<'watch' | 'over', BudgetLimitTag>` builds each entry once from `resolveBadgeColors({ tone, backdrop: CoreTokens.surface, fillShare: LIMIT_TAG_FILL_SHARE, inkShare: 1 })`, with labels `Strings.budgetCategoriesStatusWatch` and `Strings.budgetCategoriesStatusOver` (`strings.ts:526-527`, the same text as `budgetPlansStatusWatch`/`Over` at `:699-700`). The file stays free of `screens/` imports (`moneyapp/screens-import-boundary`, `docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md` §4 amendment).
- Test: `none` · the table has no reader until steps 2 and 3, whose identity cases and existing value cases pin it.

### 2. The plan detail's limit-row tags and hero tags read the shared table
- File: `src/modules/budget/screens/budget/spending_plans.helpers.ts` (`PLAN_STATUS_TAG_STYLE` `:104-113`, `limitTag`/`LIMIT_TAGS` `:133-149`, `planHeroTag`/`PLAN_HERO_TAGS`/`PLAN_WITHIN_LIMIT_HERO_TAG` `:151-167`, `buildDetailCategoryRow` `:540`)
- Change: delete `PlanTagStyleStatus`, `PLAN_STATUS_TAG_STYLE`, `LimitTagStatus`, `limitTag`, `LIMIT_TAGS` and `planHeroTag`. `:540` picks `BUDGET_LIMIT_TAGS.over` / `.watch`. `PLAN_HERO_TAGS` onTrack, watch and over become `budgetStatusHeroTag(PLAN_STATUS_PRESENTATION[status].label, status)`; `upcoming` keeps its direct `heroStatusTag(..., 'calendar-outline', Colors.dark.text2)`, a plan-only status. `PLAN_WITHIN_LIMIT_HERO_TAG` becomes `budgetStatusHeroTag(Strings.budgetPlansHeroWithinLimit, 'onTrack')`. Drop the now unused `resolveBadgeColors`, `LIMIT_TAG_FILL_SHARE` and `SpendingPlanLimitTagVM` imports; `mixHex` stays.
- Test: `first` · `__tests__/spending_plans.helpers.test.ts`: add case "a limit row's Over and Watch tags are the shared limit tags", building an over row and an active watch row as the cases at `:926-943` do, and asserting `limitRow(row, id).tag` `toBe(BUDGET_LIMIT_TAGS.over)` and `toBe(BUDGET_LIMIT_TAGS.watch)`. The tag and hero cases at `:559-1292` and `:1403-1749` pass unchanged.

### 3. The category detail's budget-row tags and hero tags read the shared table, and the tag type leaves the plan types
- File: `src/modules/budget/screens/budget/category_detail/category_detail.helpers.ts` (`HERO_TAGS` `:81-94`, `budgetRowTag`/`BUDGET_ROW_TAGS` `:186-203`, `CategoryBudgetRingRowVM.tag` `:216`, `resolveBudgetRowTag` `:289-296`); `src/modules/budget/screens/budget/spending_plans.types.ts` (`SpendingPlanLimitTagVM` `:97-102`, the allocated row's `tag` `:119`)
- Change: `HERO_TAGS` entries become `budgetStatusHeroTag(<today's label>, 'onTrack' | 'onTrack' | 'watch' | 'over')` for onTrack, withinLimit, watch and over, labels unchanged. Delete `budgetRowTag` and `BUDGET_ROW_TAGS`; `resolveBudgetRowTag` returns `BUDGET_LIMIT_TAGS.over`, `BUDGET_LIMIT_TAGS.watch` or `undefined`, its branches unchanged. `CategoryBudgetRingRowVM.tag?: BudgetLimitTag`, optional, never `null`. Drop the `resolveBadgeColors`, `LIMIT_TAG_FILL_SHARE`, `heroStatusTag` and `SpendingPlanLimitTagVM` imports, which removes this file's budget-to-accounts deep import (audit M2). In `spending_plans.types.ts`, delete `SpendingPlanLimitTagVM` with no re-export (ADR 2026-09-28 §2) and type the allocated row's `tag?: BudgetLimitTag` through `import type` from `@/modules/budget/utils/budget_hero`.
- Test: `first` · `__tests__/screens/budget/category_detail.helpers.test.ts` `buildCategoryBudgetsCard`: add case "a Watch or Over budget row's tag is the shared limit tag", on the fixtures of the cases at `:401` and `:416`, asserting `row.tag` `toBe(BUDGET_LIMIT_TAGS.watch)` and `toBe(BUDGET_LIMIT_TAGS.over)`. The existing `watchTag()`/`overTag()` and hero `tagColors` cases pass unchanged.

### 4. One rule gives a ring label its width from the ring's hole
- File: `src/components/ui/budget_ring.geometry.ts` (new, beside `budget_ring.tsx`, the `<name>.geometry.ts` convention of `src/components/ui/detail_hero.geometry.ts`); `src/modules/budget/screens/budget/category_detail/components/category_budget_ring_row.tsx:15-16`; `src/modules/budget/screens/budget/components/named_budget_row.tsx:11-13`
- Change: export `budgetRingLabelMaxWidth(size: number, stroke: number = Size.budgetRingStroke): number`, both arguments numbers, `stroke` optional, returning `size - 2 * (stroke + Spacing.xxxs)`, with the one-line comment both sites carry today. `RING_LABEL_MAX_WIDTH = budgetRingLabelMaxWidth(Size.budgetDetailRing)` and `NAMED_RING_LABEL_MAX_WIDTH = budgetRingLabelMaxWidth(Size.budgetNamedRing)`; the two comments go.
- Test: `first` · `__tests__/components/ui/budget_ring.geometry.test.ts` (new): for `Size.budgetDetailRing` and `Size.budgetNamedRing`, the width is the hole `size - 2 * Size.budgetRingStroke` less `2 * Spacing.xxxs`, above 0; an explicit `stroke` argument replaces the default.

### 5. The shared limit-row body exists and the plan detail's rows draw from it
- File: `src/modules/budget/components/budget_limit_row_body.tsx` (new); `src/modules/budget/screens/budget/spending_plan_detail/components/spending_plan_detail_category_row.tsx` (body `:74-134`, `MICRO_TEXT`/`NAME_TEXT`/`BODY_STYLE` `:23-26`)
- Change: `BudgetLimitRowBody(props: { name: string; tag?: BudgetLimitTag; caption: string; amountLabel: string; amountCode: string; amountWord: string; amountWordColor: string; amountMinWidth?: number; children?: React.ReactNode })`, every field never `null`; `tag`, `amountMinWidth` and `children` optional. It renders the inner wrap row of `:74-134` verbatim: it reads `fontScale` itself for `resolveRowStacking` and `resolveUncappedLinesAboveOne`, draws the name and `StatusBadge size="xs"` when `tag` is set, the caption, then `children` under the caption in the name column, and the amount column with `minWidth` only when `amountMinWidth` is set. It owns `MICRO_TEXT`, `NAME_TEXT` and `BODY_STYLE` and imports nothing under `screens/`. The plan row keeps its outer `View` (accessibility, padding, min height), the glyph tile, `TICK_STYLE`/`tickAt`, and passes `categoryName`, `allocated ? row.tag : undefined`, `supportingLabel`, `amountLabel`, `amountCode`, `balanceLabel`, `balanceColor`, with the `BudgetBar` and tick as `children` when allocated.
- Test: `none` · `.claude/rules/tests.md` forbids a new `.tsx` test file and no Acceptance line names render-only wiring; the emulator states below cover the pixels.

### 6. The category detail's Budgets card rows draw from the shared body
- File: `src/modules/budget/screens/budget/category_detail/components/category_budget_ring_row.tsx` (body `:55-100`, `MICRO_TEXT`/`NAME_TEXT`/`BODY_STYLE` `:24-26`)
- Change: replace the inner wrap row with `<BudgetLimitRowBody name={row.name} tag={row.tag} caption={row.caption} amountLabel={row.amountLabel} amountCode={row.amountCode} amountWord={row.amountWord} amountWordColor={row.amountWordColor} amountMinWidth={Size.budgetDetailAmountColumn} />`. The outer `View`, `BudgetRing` and its centred label with `RING_LABEL_TEXT` stay; the three redeclared style constants and the `useWindowDimensions`/`text_scale.geometry` imports go.
- Test: `none` · same reason as step 5.

## Screens
- `spending_plan_detail.md`: Category limits card, D2 · a new component, a clipped or rounded container
- `spending_plan_detail.md`: ended plan's limit rows · a new component
- `spending_plan_detail.md`: Flexible card, D2 · a new component, a clipped or rounded container
- `spending_plan_detail.md`: detail status chip · none
- `spending_plan_detail.md`: readable text, large font · a new component, a font scale above 1.0
- `budget_category_detail.md`: budgets card, B1 · a new component, a clipped or rounded container
- `budget_category_detail.md`: budget at watch · a new component
- `budget_category_detail.md`: budget over its limit, S07 · a new component
- `budget_category_detail.md`: current month, B1 · none
- `budget_category_detail.md`: over the limit, S07 · none
- `budget_category_detail.md`: readable text, large font · a new component, a font scale above 1.0
- `budget.md`: lens walk, large font · a font scale above 1.0
- `budget.md`: summary cards, category rows, named budget rows and plan cards at a float tie, Categories and Plans lenses · none
- Every state exists in its file at the base; no step appends one. Each proof is held against `main`: pixels unchanged.

## Non-goals
- Any change to what a limit row shows, its copy, colour, size, order or money rules (MA-294, MA-305).
- The tab's category row expanding to show named budgets (MA-299), and the tab's `category_budget_row.tsx` and `unassigned_spending_row.tsx`.
- The Unassigned spending row on the shared body: MA-333 (#1008) draws it.
- A shared ring label component: the two labels differ in family, size and `Text` vs `Typography`; only the width rule is shared.
- Moving the plan's `upcoming` hero tag into the table, or merging the duplicate `Watch`/`Over`/`Within limit` string keys.
- Changing `BudgetRing` in `budget_ring.tsx`.

## Untested inputs
- Font scale 2.0 stacking of the body's name, tag and amount column: steps 5 and 6, emulator `readable text, large font` on both details.
- An unallocated plan row with no tag and no bar slot (Flexible card): step 5, emulator `Flexible card, D2`.
- The Budgets card row's amount-column minimum width: step 6, emulator `budgets card, B1`.
- The tab's named budget ring label at large font: step 4, emulator `budget.md · lens walk, large font`.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `spending_plan_detail.md · readable text, large font`: a slip in the slot order puts the bar or tick above the caption or outside the name column, shifting the Category limits rows.
- `budget_category_detail.md · budgets card, B1`: a dropped `amountMinWidth` narrows the amount column and moves the caption's wrap point.
- `spending_plan_detail.md · Category limits card, D2`: the plan row's tag label now reads `budgetCategoriesStatus*`; a later edit to one of the two duplicate keys would change one surface's text.
- The `Size:` line counted the three features files; with no state added they stay unchanged and are out of the figure.
- not probed: spending_plan_detail.md · readable text, large font
- not probed: budget_category_detail.md · budgets card, B1
- not probed: budget_category_detail.md · budget at watch
- not probed: budget_category_detail.md · budget over its limit, S07
- not probed: budget_category_detail.md · readable text, large font
- not probed: budget.md · lens walk, large font

## Self-assessment
Step 5 is the one I am least sure of. The body has to take the plan row's bar and tick as a slot inside the name column, and the tick's absolute position is measured against that column's bar wrapper, so a slot placed one `View` too high or low changes pixels with no test failing. Only the emulator states at 1.0 and 2.0 compared with `main` catch it.
