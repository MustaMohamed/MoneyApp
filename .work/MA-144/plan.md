# MA-144 — Filtered empty states on the tab screens clear the add button at a 2.0 font scale
base: ddef743bbd88108c177b80efae88731f778535de · verify: emulator · flags: none · expected diff: ~5 lines

Facts the steps lean on, cited once:

- No file under `src/` changes. Each list's bottom padding is past the + button's 86 dp reach on the 411 dp emulator: `Size.tabScreenBottomClearance`, 101 dp, on Commitments (`src/modules/commitments/screens/commitments/index.tsx:269`) and Budget (`src/modules/budget/screens/budget/index.tsx:164`, `:205`), held by `__tests__/screens/navigation/tabs.helpers.test.ts:63-72`; `LIST_BOTTOM_CLEARANCE`, 169 dp, on Transactions (`src/modules/transactions/screens/transactions/index.tsx:61`, `:242`).
- At a list's end the empty block sits that padding above the viewport. An in-list `EmptyState` root is a direct child of the list's content container (`node_modules/@react-native/virtualized-lists/Lists/VirtualizedList.js:898-920` clones the element and adds no wrapper). The scroll measures that container with no height, so the `flex: 1` root counts at its content height and the container grows to header + block + padding (`node_modules/react-native/ReactCommon/yoga/yoga/algorithm/CalculateLayout.cpp:101-102`, `:140-143`); the fixed-height pass then gives the one flex child the rest (`:588-603`, `:623-625`). Budget's two blocks sit in `min-h` wrappers that grow with their content (`budget/index.tsx:198`, `src/modules/budget/screens/budget/components/spending_plans_lens.tsx:52`) inside a `flexGrow: 1` scroll (`src/components/ui/screen.tsx:74`).
- PR #633's walk saw the Commitments list at rest. At 2.0 the list header and the block exceed the viewport, so the button lies over the block until the list scrolls. Acceptance line 1 measures the list's end.
- `clearsFab` on an in-list mount is not the fix. It would put `resolveStateScreenBottomReserve` (`src/components/ui/state_screen.geometry.ts:127-129`) under the block on top of the list's padding: 202 dp below the content on Commitments above scale 1.0 against 101 at 1.0, which Rules line 2 forbids. Where the list scrolls it moves nothing at rest, since the block starts under the list header either way.
- The budget empty-state button draws 48 dp like every other mount, and the short read was the fold (issue #638, Context). At 1.0 at rest on the empty database the node read 35.81 dp high at y 598.5, ending at the viewport's bottom, 634.3: the 12 dp top pad plus the 24 dp label. Budget is the one `EmptyState` mount inside a `ScreenScroll`, under the summary card and the tool rail (`budget/index.tsx:198-200`), and Android's accessibility bounds clip to the visible box, so `mqa bounds` read the part above the fold. `resolveButtonRootStyle` gives `md` no height (`src/components/ui/button.geometry.ts:36-45`) and the root class fixes 48 (`node_modules/heroui-native/src/styles/components/button.css:50-51`). The fix is the row's recipe; the mount and the skeleton's mirror box (`src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx:125`) stay.

## Steps
### 1. `commitments.md` proves the two in-list empty states at the list's end
- File: `.claude/skills/emulator-verify/features/commitments.md` (States table, two rows appended after `:33`)
- Change: Both rows take Frame `no frame, MA-144` and one seed: one active monthly commitment whose `start_date` is the last day of the device's current month, so this month's payment is never `Overdue` (`src/modules/commitments/repositories/commitment_housekeeping.helpers.ts:58-63`) and the month before has none.
  - `add button clearance, filtered empty`. Force: `mqa tapxy` on the `Overdue` segment of the status rail, the second, as `status rail, large font` (`:26`) taps a segment; no search; the `Font scale` force (README) at 1.0 and 2.0. Proof: `No results` and `Clear Filters` show; scrolled to its end (`mqa scroll down --until` a node that is not there), at both scales no text node's box from `mqa bounds`, the `Clear Filters` pressable's included, intersects `fab-button`'s; one shot at 2.0 at the list's end. The cell also records where the block rests before the scroll at 2.0, as `transactions.md:52` does at 1.0.
  - `add button clearance, empty month`. Force: the rail on `All`, `month-filter-previous` once; the same font-scale force. Proof: `Nothing this month` shows; the same read and shot at the list's end.
- Test: `none` · a features file is a walk recipe with no Jest layer, and `.claude/rules/tests.md:13` bars a test over file contents; the Screens walk runs the rows

### 2. `transactions.md` proves the filtered empty state at the list's end
- File: `.claude/skills/emulator-verify/features/transactions.md` (States table, one row appended after `:79`)
- Change: Row `add button clearance, filtered empty`, Frame `no frame, MA-144`. Force: a seed with one expense this month and no income; tap the `Income` type tab; never the search (Gotchas, `:105`); the `Font scale` force (README) at 1.0 and 2.0. Proof: scrolled to its end (`mqa scroll down --until` a node that is not there), `No results` and `Clear Filters` show, and at both scales no text node's box from `mqa bounds`, the `Clear Filters` pressable's included, intersects `fab-button`'s; one shot at 2.0 at the list's end. The strings are read after the scroll: at 2.0 at rest the block is below the fold, `No results` starting 8.0 dp above the list's bottom edge and `Clear Filters` off screen, where a wait on it times out (probe, `t3_filtered_rest_2.png`).
- Test: `none` · as step 1

### 3. `budget.md` proves the Plans lens at the screen's end, and its empty-state button row reads the button in view
- File: `.claude/skills/emulator-verify/features/budget.md` (row `empty-state button, large font`, `:26`, rewritten; one row appended after `:39`)
- Change: Two edits.
  - Appended row `add button clearance, plans empty`, Frame `no frame, MA-144`. Force: the force of `plans empty create, large font` (`:34`), the lens tapped with `mqa tapxy` at the centre `mqa bounds 'label="Plans"'` reads; the `Font scale` force (README) at 1.0 and 2.0. Proof: scrolled to its end, at both scales no text node's box and not the `Create plan` button's intersects `fab-button`'s; one shot at 2.0.
  - Row `empty-state button, large font`: the Frame cell gains `, MA-144`. Force becomes: an empty database with onboarding complete, cold-launched with `mqa seed` before `mqa open /budget` (Gotchas, `:61`), the `Categories` lens; `mqa scroll down --until` a node that is not there, so the screen rests at its end; no tap on the screen, since one that lands on `fab-button` opens the add sheet (Gotchas, `:62`); the `Font scale` force (README) at 1.0 and 2.0. Proof becomes: a full shot at each scale shows the budget empty state with no sheet over it; `mqa bounds 'label="Set up your budget"'` reads 48 ± 1 dp high at 1.0 and at 2.0 (HeroUI `md`, fixed), its bottom at or above the top of `fab-button`, its label `TextView` box inside it; a crop of the button at 2.0, the label whole or ending in a whole `…` inside the button, no glyph cut at the top or bottom.
- Test: `none` · as step 1

## Screens
- `emulator-verify/features/commitments.md`: add button clearance, filtered empty · `new`, step 1
- `emulator-verify/features/commitments.md`: add button clearance, empty month · `new`, step 1
- `emulator-verify/features/transactions.md`: add button clearance, filtered empty · `new`, step 2
- `emulator-verify/features/transactions.md`: add button clearance, empty
- `emulator-verify/features/budget.md`: add button clearance, empty
- `emulator-verify/features/budget.md`: add button clearance, plans empty · `new`, step 3
- `emulator-verify/features/budget.md`: empty-state button, large font · force and proof rewritten in step 3

The walk needs two device states, each at 1.0 and 2.0: step 1's seed with step 2's expense added (the first three entries), and an empty database with onboarding complete (the last four).

## Non-goals
- `clearsFab` on the in-list mounts (`commitments/index.tsx:195`, `:197`, `transactions/index.tsx:164`, `budget/index.tsx:199`), and any change to `EmptyState`, `resolveStateScreenBottomReserve`, `Size.tabScreenBottomClearance` or `LIST_BOTTOM_CLEARANCE`.
- Lifting the block clear of the button at rest at 2.0 where the list header and the block exceed the viewport: it needs a change to the screen's layout, and no Acceptance line asks for one.
- The clear link's label, and `transactions.md`'s `filtered empty clear link, large font` row, which stays `unreached` (MA-130, #609).
- The list states' copy and layout (MA-093, #549); rows, cards and skeletons (MA-127, #605).
- The `min-h-80` and `min-h-[300px]` wrappers on Budget.
- The `empty-state button, large font` rows of `dashboard.md`, `transactions.md`, `commitments.md` and `accounts_list.md`.
- A Jest case or a `.tsx` suite: nothing under `src/` changes.

## Untested inputs
- Font scale 1.0 and 2.0 on the seven states: no Jest case; the walk of steps 1 to 3 measures them.
- A font scale between 1.0 and 2.0, or above 2.0: not walked.
- `LIST_BOTTOM_CLEARANCE` against the + button's reach: no Jest case holds it, unlike `Size.tabScreenBottomClearance` (`tabs.helpers.test.ts:63-72`); step 2's row measures it on the device.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- A text node, the clear link or a button under `fab-button` at a list's end in any of the seven states: the second fact is wrong for that state, and the plan needs a source step for it.
- `emulator-verify/features/commitments.md` · add button clearance, filtered empty: at rest at 2.0 the + button still lies over the block, as PR #633's walk saw; the row proves the list's end.
- No source line changes, so every proof reads the same at base and at head; the walk's bounds and shots are the evidence the PR carries.
- MA-093 (#549) may append to `transactions.md`'s States table: a rebase conflict on the appended row, no logic edge.
- not probed: `emulator-verify/features/transactions.md` · add button clearance, empty
- not probed: `emulator-verify/features/budget.md` · add button clearance, empty
- not probed: `emulator-verify/features/budget.md` · add button clearance, plans empty
- not probed: `emulator-verify/features/budget.md` · empty-state button, large font

## Self-assessment
Step 3 is the one I am least sure about, because none of Budget's three states was probed. The probe read the two lists' blocks ending their padding above the list's bottom edge at 2.0, 101.0 and 101.3 dp on Commitments and 169.1 dp on Transactions, each clear of the + button. Budget's blocks sit in `min-h` wrappers inside a `ScreenScroll`, not directly in a list's content container, so the same clearance there rests on the code until the walk. Issue #638 measured the button at 1.0 at rest only; its 48 dp read at the screen's end, at 1.0 and at 2.0, is also the walk's to make.
