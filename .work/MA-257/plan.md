# MA-257 — Shared list hero piece the transactions hero draws
base: 55706296c69fd941f5326c890c551a3998bb336f · verify: emulator · flags: none · expected diff: ~325 lines

Files outside tests, 7: `src/components/ui/list_text.geometry.ts` (~4), `src/components/ui/list_hero.tsx` (~230), `src/modules/transactions/screens/transactions/components/transactions_hero.tsx` (~50), `src/modules/transactions/screens/transactions/transactions.helpers.ts` (~28), `.claude/skills/emulator-verify/features/transactions.md` (~3), `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md` (~5), `docs/adr/2026-09-27-transactions-search-tally.md` (~2). The seventh, `transactions.helpers.ts`, holds the adapter, as `buildSearchTally` adapts to `SearchTallyModel` there (ADR 2026-10-18 §1, MA-207 extension).

## Steps
### 1. The hero geometry lives in the shared folder under list-hero names
- File: `src/modules/transactions/screens/transactions/components/transactions_text.geometry.ts` moved with `git mv` to `src/components/ui/list_text.geometry.ts`; readers `transactions_hero.tsx:15-18`.
- Change: rename the three exports and nothing else in the body: `TRANSACTIONS_HERO_MAX_FONT_SCALE` → `LIST_HERO_MAX_FONT_SCALE` (still `DISPLAY_HEADLINE_MAX_FONT_SCALE`, 1.3), `TransactionsHeroGeometry` → `ListHeroGeometry` (same eleven required `number` fields, none nullable), `resolveTransactionsHeroGeometry(fontScale: number): ListHeroGeometry` → `resolveListHeroGeometry`, same formula. `transactions_hero.tsx` imports the new path and names. No re-export at the old path (ADR 2026-10-18 §3). Make this its own commit, path, specifiers and the three names only, so `git log --follow` keeps the history.
- Test: `first` · `git mv __tests__/screens/transactions/transactions_text.geometry.test.ts __tests__/components/ui/list_text.geometry.test.ts`, imports from `@/components/ui/list_text.geometry`, describe `resolveListHeroGeometry`, its three cases unchanged (1.0 rows, the 1.3 cap, 2.0 capped); `__tests__/components/ui/scaled_line_box_sites.test.ts:41-44` imports the new path and names, the `SITES` key at :140 becomes `resolveListHeroGeometry`, its `expected` formula unchanged.

### 2. The shared hero piece draws the title and amount rows, the columns, the rail, the caption row and the skeleton
- File: `src/components/ui/list_hero.tsx` (new), its body cut from `transactions_hero.tsx:20-22,38-88,120-130,132-261` with the rows' closing tags (`:287-290`) and their one-line comments; `ChangeIcon`, `CHANGE_ICON`, `CHANGE_CLASS` (`:24-37`) and the caption content (`:262-286`) stay for step 4.
- Change: exports, every field required and none `null`:
  - `type ListHeroMode = 'skeleton' | 'loaded'`; `type ListHeroColumnAlign = 'left' | 'center' | 'right'`; `type ListHeroRailTone = 'success' | 'danger' | 'accent'` (`accent` is the gold MA-258's rail takes, per the ticket's Produces line).
  - `interface ListHeroColumnModel { label: string; value: string; align: ListHeroColumnAlign; polarity: PolaritySignal }`, the value coloured `FLOW_CLASS[polarity]` (`flow_polarity.ts`, `neutral` is `text-foreground`).
  - `interface ListHeroRailModel { pct: number; tone: ListHeroRailTone; accessibilityLabel: string }`, `pct` 0 to 100, fill `bg-success`, `bg-danger` or `bg-accent` by tone, plus `rounded-full`.
  - `interface ListHeroModel { mode: ListHeroMode; title: string; monthLabel: string; amount: string; currencyCode: string; amountAccessibilityLabel: string; columns: readonly ListHeroColumnModel[]; rail: ListHeroRailModel }`.
  - `function ListHero(props: { model: ListHeroModel; renderCaption: (geometry: ListHeroGeometry) => React.ReactNode; testID: string }): React.ReactElement`, all three props required.
  - Invariants: geometry resolved once, `resolveListHeroGeometry(useWindowDimensions().fontScale)`; one `HeroShell` in both modes, style `{ marginTop: 0, marginBottom: HERO_SHELL_MARGIN_BOTTOM }`; loaded body testID `testID`, skeleton body testID `` `${testID}-skeleton` ``, both `px-4 py-4` with `gap: Spacing.sm`. Loaded: the title row, the amount row (`accessible`, label `amountAccessibilityLabel`), a columns row (`flexDirection: 'row'`, `gap: Spacing.xs`, `height: geometry.columns`) of one `HeroColumn` per `model.columns` entry keyed by `label`, spoken `` `${label} ${value}` ``, the rail (`progressbar`, `accessibilityValue` min 0 max 100 now `pct`), and a caption row (`flexDirection: 'row'`, `alignItems: 'center'`, `gap: Spacing.xs`, `height: geometry.caption`) holding `renderCaption(geometry)`. Skeleton: the title bar (`w-2/5`, `geometry.header`), the amount bar (`w-1/2`, `geometry.amount`), a row with the columns row's direction and gap holding one `rounded-md` bar per `model.columns` entry, `flex: 1`, `geometry.columns` high, keyed by `label`, the rail bar (`w-full rounded-full`, `geometry.rail`) and the caption bar (`w-3/5`, `geometry.caption`). The piece imports nothing from a module, reads no rate and formats nothing.
- Test: `none` · render-only; no existing `.tsx` suite renders the hero and `.claude/rules/tests.md` bars a new one; the bar heights are step 1's geometry, the bars and nodes are the four Screens rows.

### 3. The transactions hero model adapts to the piece's model
- File: `src/modules/transactions/screens/transactions/transactions.helpers.ts` (new `buildListHeroModel`, beside `buildTransactionsHeroModel` at :217).
- Change: `buildListHeroModel(model: TransactionsHeroModel): ListHeroModel`, pure, `model` required. `mode`: `skeleton` → `skeleton`, `dashes` and `figures` → `loaded`; `title`, `monthLabel`, `currencyCode` copied; `amount` = `model.out`; `amountAccessibilityLabel` = `model.outAccessibilityLabel`; `columns`, in order: `{ label: Strings.transactionsHeroIn, value: model.in, align: 'left', polarity: model.inPolarity }`, `{ label: Strings.transactionsHeroNet, value: model.net, align: 'center', polarity: model.netPolarity }`, `{ label: Strings.transactionsHeroLeftOfIncome, value: model.leftOfIncome, align: 'right', polarity: 'neutral' }`; `rail` = `{ pct: model.railPct, tone: model.railDanger ? 'danger' : 'success', accessibilityLabel: model.railAccessibilityLabel }`. `TransactionsHeroModel` and `buildTransactionsHeroModel` do not change. Type imports from `@/components/ui/list_hero`, as `SearchTallyModel` is imported at :3.
- Test: `first` · `__tests__/screens/transactions/transactions_helpers.test.ts`, `describe('buildListHeroModel')` over `buildTransactionsHeroModel` outputs: the A1 figures input gives `mode: 'loaded'`, amount `9,400`, the three columns with the labels, aligns and the source polarities above, `rail` `{ pct: 42, tone: 'success', accessibilityLabel: Strings.totalsExpenseShareA11y(42) }`; an over-income input gives `rail.tone: 'danger'`; `mode: 'skeleton'` gives `skeleton` with three columns; `mode: 'dashes'` gives `loaded`, every column value `—` and the rail label `Strings.transactionsTotalsLoadError`.

### 4. The transactions hero draws the shared piece and keeps only its caption content
- File: `src/modules/transactions/screens/transactions/components/transactions_hero.tsx` (`TransactionsHero` :132).
- Change: `TransactionsHero({ model }: { model: TransactionsHeroModel })` keeps its signature and returns `<ListHero model={buildListHeroModel(model)} testID="transactions-hero" renderCaption={…} />`; `renderCaption` returns a fragment of the share caption text, the caption text and `LastMonthChange`, cut from :262-286 without the row `View` the piece now draws. `HeroColumn`, `HeroSkeleton`, `COLUMN_ALIGN`, `ColumnAlign`, `HERO_ROW_GAP`, `HERO_SHELL_STYLE`, `HERO_BODY_STYLE` and their unused imports go; `ChangeIcon`, `CHANGE_ICON`, `CHANGE_CLASS` and `LastMonthChange` stay, `LastMonthChange` typed `ListHeroGeometry`. The memo at `transactions/index.tsx:131` is untouched.
- Test: `none` · render wiring; step 3's test covers the figures it passes, and the Screens rows read every node.

### 5. The transactions feature file names the piece and the seven skeleton bars
- File: `.claude/skills/emulator-verify/features/transactions.md` (:3, :40, :42).
- Change: :3, after "hero `components/transactions_hero.tsx`", add "drawing the shared `src/components/ui/list_hero.tsx`, its geometry `src/components/ui/list_text.geometry.ts`". :40 `hero, skeleton`: Frame cell adds `MA-257`; "five bars in the hero shell at the loaded height" becomes "seven bars in the hero shell: the title, the amount, one per column side by side (In, Net, Left of income), the rail and the caption, each bar's height on the shot equal to its row's on the `hero, current month` shot ± 1 dp (five before MA-257, one bar spanning the three columns)". :42 `hero, across a scope change`: Frame cell adds `MA-257`; "five bars in the hero shell at the loaded height" becomes "the seven bars of `hero, skeleton` in the hero shell". :31 and :51 keep their text; the piece keeps the nodes, the `transactions-hero` testID and the 8 dp margin :43 and :100 read.
- Test: `none` · a doc; `npm run lint` (`validate:agent-assets`) fails on a `src/` path that does not exist, so this step follows step 2.

### 6. ADR 2026-10-18 records the piece and retires the screen geometry file
- File: `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md` (Applies to :6, §1 after :32, §3 after :44).
- Change: Applies to adds `src/components/ui/list_hero.tsx`, `src/components/ui/list_text.geometry.ts`. §1 takes **Extended 2026-10-24 (#858, MA-257).**: the list hero the transactions tab draws, and the commitments tab draws under MA-258 (#859), lives in `list_hero.tsx` (`ListHero`: title and amount rows, columns, rail, skeleton, one `HeroShell` with `HERO_SHELL_MARGIN_BOTTOM` under it); it takes the ui-owned `ListHeroModel`, columns with a `PolaritySignal`, a rail with a `ListHeroRailTone` (success, danger, accent), and a `renderCaption` slot handed the geometry; it reads no rate and formats no money; its skeleton draws one bar per column; its geometry is `resolveListHeroGeometry` in `list_text.geometry.ts`, capped at `LIST_HERO_MAX_FONT_SCALE` (1.3, ADR 2026-09-27 §7); `buildListHeroModel` in `transactions.helpers.ts` adapts `TransactionsHeroModel`, and `transactions_hero.tsx` keeps the caption text and `LastMonthChange`. §3 takes **Extended 2026-10-24 (#858, MA-257).**: `transactions_text.geometry.ts` moved whole to `list_text.geometry.ts` with `git mv`, its three exports renamed, so the split at :42 names a file that no longer exists; no re-export remains.
- Test: `none` · a doc; `npm run lint` runs the unslop certification grep over it.

### 7. ADR 2026-09-27 names the moved geometry
- File: `docs/adr/2026-09-27-transactions-search-tally.md` (:36, :38).
- Change: :36 "`components/transactions_text.geometry.ts` for the hero" becomes "`src/components/ui/list_text.geometry.ts` for the hero"; :38 `TRANSACTIONS_HERO_MAX_FONT_SCALE` becomes `LIST_HERO_MAX_FONT_SCALE`. In place, as MA-207 rewrote :36's tally path.
- Test: `none` · a doc.

## Screens
- `.claude/skills/emulator-verify/features/transactions.md`: `hero, current month`
- `.claude/skills/emulator-verify/features/transactions.md`: `hero, skeleton`
- `.claude/skills/emulator-verify/features/transactions.md`: `hero, across a scope change`
- `.claude/skills/emulator-verify/features/transactions.md`: `search tally, large font`
- The invariant pass (`features/README.md` § Invariant pass) on transactions.md, #802 Rule 4.

## Non-goals
- The commitments hero on the piece, its four columns, five counters, caption and gold rail (MA-258); the `accent` rail tone has no caller here.
- The month row, status rail, account chips and search tally (MA-241); the list states and their skeletons (MA-214).
- No change to `TransactionsHeroModel`, `buildTransactionsHeroModel`, `resolveTransactionsHeroMode`, `transactions.hook.ts`, `transactions/index.tsx`, `HeroShell` or `hero_shell.geometry.ts`.
- No geometry change: no new row, size or cap in `list_text.geometry.ts`.
- No re-export at the old geometry path, no `index.ts` in `src/components/ui/`.
- No new `.tsx` test file, no case in an existing `.tsx` suite.

## Untested inputs
- The skeleton's bar count, seven for three columns, and its column bars' row: step 2, proven by `hero, skeleton` and `hero, across a scope change`.
- `renderCaption`'s placement in the caption row and the change node beside it: steps 2 and 4, proven by `hero, current month`.
- The `accent` rail tone: step 2, no caller until MA-258.
- The piece's `danger` rail fill and a `bad` column value: step 2, read on `transactions.md · hero, over income`, not a Screens row.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- `test -f __tests__/components/ui/list_text.geometry.test.ts` before citing it as a jest path.
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `transactions.md · hero, skeleton`: a column bar row whose gap or height differs from the loaded columns row moves the list under the hero when the figures land.
- `transactions.md · hero, across a scope change`: the skeleton testID becomes `` `${testID}-skeleton` ``; any reader of `transactions-hero-skeleton` breaks if the prefix differs (none in the tree at base).
- `transactions.md · search tally, large font`: a slip in the renamed geometry moves the hero off 188.19 dp at 1.0 and 217.9 at 2.0.
- `transactions.md · hero, current month`: a column polarity or align mapped wrong in step 3 recolours In, Net or Left of income; step 3's test pins the mapping.
- not probed: transactions.md · search tally, large font
- Git rename detection: renaming three exports in a 44-line file keeps similarity well above 50%, but a body edit beyond them in the move commit could split the history.

## Self-assessment
Least sure about step 2's caption slot as a render function, `renderCaption(geometry)`. It gives the caller the piece's capped geometry without a second `useWindowDimensions` read, and MA-258's caption, a left percent and a right segment with a danger part, fits it. If MA-258 wants a shared caption text style, though, that lands in the piece then and both tabs move. The 7-file count is one over the ticket's `Size:` line because the adapter goes in `transactions.helpers.ts` for a logic test; the sum stays near the ticket's ~325.
