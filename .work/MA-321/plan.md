# MA-321 — Category detail: header and states
base: 53fcda1155c40a8e6d494dbf5e7bda3e8c5d48c8 · verify: emulator · flags: user copy · expected diff: ~160 lines

## Steps
### 1. The screen's copy and its view-state resolver exist
- File: `src/constants/strings.ts` (beside `budgetLoadRetry`, `:471`); `src/modules/budget/screens/budget/category_detail/category_detail.helpers.ts` (new)
- Change: strings adds `budgetCategoryDetailNotFoundTitle`, `budgetCategoryDetailNotFoundBody`, `budgetCategoryDetailLoadErrorTitle`, `budgetCategoryDetailLoadErrorDescription`, `budgetCategoryDetailRefreshErrorTitle`, the ticket's Copy text; `budgetLoadError` stays for the tab. Helpers exports `type CategoryDetailViewState = 'loading' | 'notFound' | 'firstLoadError' | 'refreshErrorWithData' | 'ready'`; `resolveCategoryDetailViewState(input: { hasLoaded: boolean; hasCategory: boolean; loadError: boolean }): CategoryDetailViewState`, all three fields required and never `null`, checked in this order: not loaded gives `firstLoadError` on an error, else `loading`; no category gives `firstLoadError` on an error, else `notFound` (an error with nothing to show draws flat, as `commitments/detail/detail.helpers.ts:82`); an error gives `refreshErrorWithData`; else `ready`. `categoryDetailShowsBody(viewState: CategoryDetailViewState): boolean`, true for `ready` and `refreshErrorWithData`. `BUDGET_CATEGORY_DETAIL_LOAD_ERROR_COPY: DetailLoadErrorCopy` (`detail_load_error.helpers.ts:3`) from the three new load keys and `budgetLoadRetry`; `BUDGET_CATEGORY_DETAIL_LOAD_ERROR_TEST_ID = 'budget-category-detail-load-error'`; `BUDGET_CATEGORY_DETAIL_NOT_FOUND_TEST_ID = 'budget-category-detail-not-found'`.
- Test: `first` · `__tests__/screens/budget/category_detail.helpers.test.ts`: one case per branch of the resolver, the loaded-but-no-category-with-error input reading `firstLoadError`; `categoryDetailShowsBody` over all five states. No case compares the copy constant with literal text.

### 2. The hook reports every load outcome as one view state, and Try again reloads what failed
- File: `src/modules/budget/screens/budget/category_detail/category_detail.hook.ts` (`useCategoryDetail`, `:65-66`, `:123`, `:126-131`)
- Change: `state` adds `viewState: CategoryDetailViewState`, required, from `resolveCategoryDetailViewState({ hasLoaded, hasCategory: category !== undefined, loadError: loadError || categoryLoadError })`, the error no longer masked by `!hasLoaded`. `retry` reloads categories when the category store reads `!hasLoaded || loadError`, then `load(month)`. The four `.catch(() => undefined)` sites (`:59, 61, 128, 130`) stay: each store sets `loadError` before it settles (`category.store.ts:55`, `budget.store.ts:211`) and the resolver turns it into a drawn state (Invariant 10). The old fields stay until step 4 so `index.tsx` compiles.
- Test: `first` · `__tests__/screens/budget/budget_month_rollover.hook.test.ts` § `useCategoryDetail`: the category store mock gains `loadError`; the cases at `:312` and `:326` assert `viewState` `loading` and `firstLoadError`; new cases: loaded month with no `cat-1` in `categoriesState` reads `notFound`; loaded month, `cat-1` present, `budgetLoadErrorState` true reads `refreshErrorWithData`; categories loaded with their `loadError` true reads `refreshErrorWithData`, and `retry()` calls `loadCategoriesMock` once and `loadBudgetMock` with the month; categories loaded with no `loadError` and `budgetLoadErrorState` true: `retry()` calls `loadBudgetMock` with the month and never calls `loadCategoriesMock`.

### 3. The skeleton draws the hero and chart shapes under the screen's header
- File: `src/modules/budget/screens/budget/category_detail/components/category_detail_skeleton.tsx` (`CategoryDetailSkeleton`); its call site `category_detail/index.tsx:44`
- Change: signature becomes `CategoryDetailSkeleton(): React.ReactElement`, no props; the header row with its `BackButton`, the live-month card, the three tiles and the three ledger rows go. It draws frame S05's hero as the shared hero skeleton does (`commitments/detail/components/detail_skeleton.tsx:63-111`: `HeroShell glowOpacity={0}`, `DETAIL_HERO_*` gaps, item heights from `resolveDetailHeroGeometry(fontScale)`, standing at `hero.height`), then the chart shape: a `ScaledBar` for the `Monthly result` title and a block `Size.budgetMonthlyBarMaxHeight` tall inside a card. The used bar S05 draws in the hero waits for MA-322, which adds the bar slot to the shared hero geometry once (parent Rules, "lands once in the shared piece"). The skeleton rows under the chart are MA-293's.
- Test: `after` · `__tests__/screens/budget/fifty_thirty_twenty_ledger.test.tsx`, the case at `:355`: rendered with no props, the scaled bars in the new render order, and the hero shape's height equal to `resolveDetailHeroGeometry(fontScale).height` by a testID the step adds (token-bound, Render-suite policy; Acceptance names the S05 shape).

### 4. The screen opens under the shared stack header and draws each view state
- File: `src/modules/budget/screens/budget/category_detail/index.tsx` (`CategoryBudgetDetailScreen`); `category_detail.hook.ts`; `components/category_detail_title.tsx` (deleted)
- Change: one `<Screen>` with `<StackHeader title={Strings.budgetTitle} onBack={goBack} />` above every state, no `right`, then on `state.viewState` as `transactions/detail/index.tsx:49-110`: `loading` draws `CategoryDetailSkeleton`; `notFound` draws `DetailNotFoundState` with the two not-found keys and its testID (S06's icon is not drawn, as `emulator-verify/features/commitment_detail.md:49` records for C7); `firstLoadError` draws `DetailLoadError` flat with `onRetry={retry}`; `categoryDetailShowsBody` keeps today's `ScreenScroll` body unchanged and, on `refreshErrorWithData`, adds `DetailLoadError floating` after it. The custom header, `styles.header`, `styles.icon` and the pencil go. The hook drops `name`, `icon`, `canEditLiveBudget`, `hasLoaded`, `loadError` from `state`, the `editBudget` action, `liveMonthBudgets`, `editableBudgetId` and the `set_budget_sheet.state` import (`:14-17`); `color` stays for `LiveMonthCard`. Invariant 9 then reads three sites: `category_detail.state.ts` is written only by this hook's `setMonth`, the budget store's data is keyed by `loadedMonth === month` and its request guard (`budget.store.ts:190-214`), and the category store holds one list.
- Test: `none` for the screen: no `.tsx` suite renders it and `tests.md` forbids a new one; the Screens rows below cover it. In `budget_month_rollover.hook.test.ts` the two edit cases (`:383-415`) go, with the `BUDGET_TAB_SHEET_OWNER` import if nothing else reads it, and cases still reading `state.hasLoaded` read `state.viewState`.

### 5. The features file carries this ticket's states
- File: `.claude/skills/emulator-verify/features/budget_category_detail.md`
- Change: rewrite `skeleton, large font` (hero and chart shapes under the `Budget` header, heights from `resolveDetailHeroGeometry` at 1.0 and 2.0), `load error retry, large font` (`id="budget-category-detail-load-error"` is the flat `ErrorState` with the ticket's title, description and `Try again`; the `Button proof`), `header back and edit tap band` (the header reads `Budget`, `label="Edit budget"` reads `no match`, the back box 36 ± 1 dp, the three taps inside `HEADER_ACTION_HIT_SLOP` leave the detail), `readable text, large font` (the header title whole at 2.0; from `mqa bounds` at 1.0 and 2.0, no text box in the header row, the title and the back glyph, crosses another by more than 1 dp; the category-name clauses leave with the title). Add `not found, S06` (`mqa open /budget/no-such-category`; `id="budget-category-detail-not-found"` with both lines, centred, under the header; 1.0 and 2.0) and `refresh failure alert` (source force: a module counter in `load` in `budget.store.ts` passes the first call and, after a `console.log('<tag>')`, throws on later ones; `mqa open /budget`, then the category's route, whose focus load is the failing refresh; the `Font scale` force (README) at 1.0 and 2.0; the floating alert with the refresh title and `Try again` over the loaded body; at 1.0 and 2.0 the `Alert proof` (README), and the `Button proof` and the `Band proof` (README) on `Try again`, as `transaction_detail.md:30`; reverted with `git status` clean). The Gotchas line on the old text-and-button load error goes; the intro line drops "the rest is drawn as today".
- Test: `none` · a verification recipe, no code.

## Screens
- `emulator-verify/features/budget_category_detail.md` · skeleton, large font: S05 (`MixS05DetailLoading`), rewritten by step 5
- `emulator-verify/features/budget_category_detail.md` · not found, S06: `MixS06DetailGone`, new, step 5 adds it
- `emulator-verify/features/budget_category_detail.md` · load error retry, large font: no frame, rewritten by step 5
- `emulator-verify/features/budget_category_detail.md` · refresh failure alert: no frame, new, step 5 adds it
- `emulator-verify/features/budget_category_detail.md` · header back and edit tap band: B1's header (`MixB1CategoryDetail`), rewritten by step 5
- `emulator-verify/features/budget_category_detail.md` · readable text, large font: no frame, rewritten by step 5

## Non-goals
- The hero, its glyph tile, name, state tag, group badge, used bar and caption (MA-322); the hero skeleton's bar slot with it.
- Monthly result's bars and figures (MA-320); the skeleton rows under the chart (MA-293).
- Editing a budget from the category detail (MA-294); no replacement for the removed pencil.
- A staleness gate on the focus load, the day-change recompute of `daysLeft`, and a month key on the budget store's `loadError`.
- Rewording the tab's `budgetLoadError` (MA-300).
- A shared hero-skeleton component; the skeleton copies the commitments pattern in place.

## Untested inputs
- A route with no `id`: `hasCategory` false reads `notFound`, step 2; the hook test's route mock fixes `id` to `cat-1`.
- Header at font scale 2.0, text-box overlap and the 44 dp touch areas: emulator only, step 5.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: `npm run ci:local`.

## Risks
- Between this merge and MA-322 the screen shows no category name or glyph: the header reads `Budget` and the hero is not drawn yet.
- The loaded body is today's live card, tiles and chart while the skeleton is S05's hero and chart, so the skeleton-to-body swap jumps until MA-322.
- The budget store's `loadError` has no month key; the hook relies on its own focus load being the latest request while it is focused (`budget.store.ts:190-214`).
- A failed category reload from another screen's mutation (`category.store.ts:76-82`) shows this screen's refresh alert; Try again clears it by reloading categories.
- `budget_category_detail.md` · refresh failure alert: the force needs the tab loaded first, or the failing load is a first load and draws the flat error instead.
- `budget_category_detail.md` · not found, S06: S06 draws an icon the shared `DetailNotFoundState` lacks; the render lens may read it as a miss.
- not probed: budget_category_detail.md · refresh failure alert
- not probed: budget_category_detail.md · header back and edit tap band
- not probed: budget_category_detail.md · readable text, large font

## Self-assessment
Step 3 is the least certain: S05 puts a used bar in the hero shape, but the shared hero geometry has no bar slot until MA-322, so the skeleton stands at today's `resolveDetailHeroGeometry` height without the bar. If the render lens holds S05 literally, the bar needs a slot now, and that is a change to the shared hero that MA-322 owns.
