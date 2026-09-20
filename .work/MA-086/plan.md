# MA-086 — Section header count badge renders taller than the canvas
base: 7e4bad5d31523d975a01a730fddc7fd23f794cd5 · verify: emulator · flags: none · expected diff: ~110 lines (6 source files ~30, 7 feature files ~80)

## Invariant
Every pill label carries no `text-[Npx]` class. Its `style` is one object literal holding both `fontSize: Type.<x>` and `lineHeight: lineHeightFor(Type.<x>)`, so `moneyapp/font-size-pairs-line-height` (`scripts/oxlint-plugin-moneyapp.js:59-75`, object literals only) reads the pair. `className` keeps the family and colour classes; the container's classes are untouched. Not `leading-[N]`: the ticket's Rules forbid a hand-written line-height literal, a class is invisible to the lint rule, and only `lineHeightFor(msFont(n))` scales the pair together on other widths (`src/utils/responsive.ts`). Precedents on the same components: `src/components/ui/section_header.tsx:52` (`LinkButton.Label`), `src/components/ui/chip.tsx:107` (`Chip.Label`), `src/modules/transactions/screens/transactions/components/totals_strip.tsx:331-337` (the `@/components/ui/text` wrapper, whose `body` variant's `text-[15px]` the inline `style` overrides: Uniwind appends `style` after the className styles).

## Steps
### 1. A 10 pt label token exists
- File: `src/constants/theme.ts` (`Type`, line 86-105)
- Change: add `pillLabel: msFont(10)` to `Type` between `compactBadge` and `overline`. Two sites render at 10 px (`filter_accordion.tsx:76`, `status_badge.tsx:18` sm) and no token holds 10; `overline` is 10.5 and Acceptance keeps the font unchanged.
- Test: `first` · `__tests__/geometry_tokens.test.ts`, one case: `Type.pillLabel` is `msFont(10)` and `lineHeightFor(Type.pillLabel)` is at least `Type.pillLabel` (the existing "locks the authored values" shape). The file imports `ms` only; add `msFont` to its `@/utils/responsive` import.

### 2. Section header count badge holds its line box
- File: `src/components/ui/section_header.tsx` (`SectionHeader`, lines 35-40)
- Change: the count `Typography` drops `text-[12px]`; its `style` becomes `{ color: Colors.shared.cairoGold, fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }`. Container `rounded-full px-2 py-0.5` unchanged; `Type` and `lineHeightFor` are already imported. Height on Pixel_2_API_34: 2 + `lineHeightFor(msFont(12))` = 16 + 2 = 20. Consumers unchanged: `accounts/list/index.tsx:111`, `dashboard/index.tsx:232`, `account_activity_card.tsx:46,51`, the dashboard re-export.
- Test: `none` · pixel height is render-only; no render suite is added (`.claude/rules/tests.md`); the emulator row in Screens is the net.

### 3. Commitments summary percentage pill
- File: `src/modules/commitments/screens/commitments/components/summary_header.tsx` (lines 103-110)
- Change: the `%` `Text` drops `text-[13px]`; `style` becomes `{ color: GoldTokens[500], fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }`. Import `Type, lineHeightFor` from `@/constants/theme` alongside `Colors`. Container unchanged.
- Test: `none` · same reason as step 2; `__tests__/screens/commitments/summary_header.test.tsx` asserts text and skeleton geometry only and keeps passing.

### 4. Filter accordion count pill
- File: `src/components/ui/filter_accordion.tsx` (`FilterAccordionShell`, line 76)
- Change: the count `Text` drops `text-[10px]` and takes `style={{ fontSize: Type.pillLabel, lineHeight: lineHeightFor(Type.pillLabel) }}`. Import `Type, lineHeightFor` from `@/constants/theme`. `min-w-[18px] items-center rounded-full px-1.5` unchanged; the pill's height is the line box, `lineHeightFor(msFont(10))`.
- Test: `none` · same reason; `__tests__/components/ui/filter_accordion.test.tsx` asserts presence and error-slot heights only.

### 5. Month filter label centred in its fixed track
- File: `src/components/ui/month_filter.tsx` (`MonthFilter`, line 57), `__tests__/components/ui/month_filter.test.tsx` (line 39-42)
- Change: the label `Text` drops `text-[11px]` and takes `style={{ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }}`; import `Type, lineHeightFor` next to `Colors, Spacing`. `h-8 ... items-center justify-center rounded-full px-2.5` unchanged. Every consumer (`filter_rail.tsx:36`, `budget/index.tsx:115`, `budget_copy_sheet.tsx:118`) is untouched.
- Test: `after` · the existing case at `month_filter.test.tsx:39-42` binds to the `text-[11px]` className (an M35 assertion, `.claude/rules/tests.md` prune list). Replace it with the token-bound form: `toHaveStyle({ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) })` on `getByText('August 2026')`. No new suite.

### 6. Status badge at both sizes
- File: `src/components/ui/status_badge.tsx` (`LABEL_CLASS`, line 18; `Typography`, line 33)
- Change: replace `LABEL_CLASS` with `LABEL_STYLE = { sm: { fontSize: Type.pillLabel, lineHeight: lineHeightFor(Type.pillLabel) }, md: { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) } } as const` (two object literals, each self-paired for the lint rule); the `Typography` takes `className="font-inter"` and `style={{ color: foreground, ...LABEL_STYLE[size] }}`. Import `Type, lineHeightFor` from `@/constants/theme`. Container `gap-0.5 rounded-full px-1.5 py-0.5` and `ICON_SIZE` unchanged. Only `balance_hero.tsx:62` renders it, at `sm`; `md` has no live site.
- Test: `none` · render-only; no suite imports `status_badge`.

### 7. Feature files carry the pill states
- File: `.claude/skills/emulator-verify/features/accounts_list.md`, `account_detail.md`, `README.md` (Files table); new `dashboard.md`, `commitments.md`, `transactions.md`, `budget.md` in the `add_account.md` shape (Reach it, States, Outbound, Gotchas; `not redesigned by #378` in the lead).
- Change: append the rows named in Screens. The new files carry only what the recipe needs: the route, the script to reach it, the pill state rows, Back's landing. README's Files table gets one row per new file. Proof column everywhere: `mqa ui` bounds ÷ 2.625, never PNG pixels.
- Test: `none` · skill documentation.

## Screens
Measurement on Pixel_2_API_34: badge height from the `ui.xml` bounds of the pill node ÷ 2.625. Expected height = `lineHeightFor(msFont(n))` + vertical padding (4 for `py-0.5`, 0 for the accordion pill), with `msFont(n)` = `roundToNearestPixel(n × 411/390)` at density 2.625 (`src/utils/responsive.ts:10,19`): `msFont(10)` = 10.667 → line 14; `msFont(12)` = 12.571 → 16; `msFont(13)` = 13.714 → 18.

- `emulator-verify/features/accounts_list.md`: `populated, all five types` (B1, existing) for the walk; new row `section count badge` (B1, MA-086): seed push one savings, ten bank and one hundred cash accounts, All selected; proof: each section badge's bounds ÷ 2.625 reads height 20 ± 1 and width ≥ height at `1`, `10`, `100`; one shot of the `Your accounts` header row. Title, action link and header margins unchanged against the B1 shot.
- `emulator-verify/features/account_detail.md`: `bank with recent activity` (C1) and `credit card, under limit` (C2, existing); new row `status badge line box` (C1/C2, MA-086): the hero `StatusBadge` bounds ÷ 2.625 reads `lineHeightFor(msFont(10))` + 4 = 18 ± 1 high on both accounts; `md` has no live site and is covered by the lint pair only.
- `emulator-verify/features/dashboard.md` (new): `section count badges` (no frame, MA-086): same seed as the accounts row; the dashboard section headers' badges read 20 ± 1 high, width ≥ height.
- `emulator-verify/features/commitments.md` (new): `summary percentage pill` (no frame, MA-086): any seeded commitment; the `%` pill reads `lineHeightFor(msFont(13))` + 4 = 22 ± 1 high. `filter accordion count pill` (no frame, MA-086): open the filter sheet, select two options in one accordion; the count pill reads `lineHeightFor(msFont(10))` = 14 ± 1 high and ≥ 18 wide. `month filter pill` (no frame, MA-086): the rail pill reads 32 high and the label's bounds sit centred within ± 1.
- `emulator-verify/features/transactions.md` (new): `month filter pill` (no frame, MA-086): as on commitments.
- `emulator-verify/features/budget.md` (new): `month filter pill` (no frame, MA-086) on the screen and `copy sheet month filter` (no frame, MA-086) in the copy sheet: as on commitments.

## Non-goals
- Pinning line height on any other `text-[Npx]` label (the accordion summary line, the `Text` wrapper's own variants, `tabs.tsx`, `type_badge.tsx`): outside the five-site class the ticket names.
- Changing the pill containers: padding, radius, colours, `h-8`, `min-w-[18px]`.
- Extending `moneyapp/font-size-pairs-line-height` to read `text-[Npx]` classes.
- A render suite for any pill.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `Type.pillLabel` is a name the ticket does not give; if the reviewer wants `Type.overline` (10.5) instead, steps 4 and 6 change one identifier and the font grows half a point.
- Step 7 names seven documentation files on top of six source files; the 12-file gate counts source, and the feature files are the walk's recipe the README requires in the same PR.
- The three-digit seed (111 accounts) is a seed push; if the render pass finds it too slow, `100` on one section with `1` on another still proves the pill at one and three digits.
- The inline `style` override over the `Text` wrapper's `text-[15px]` rests on Uniwind's style order; `totals_strip.tsx:331` already depends on it, so a regression would show there first.

## Self-assessment
Step 7 is the least certain: the four new feature files are written from the routes and the pill sites, not from a walk, so a `Reach it` script (the commitments filter sheet's opener, the budget copy sheet's entry) may name a control by the wrong label and cost the render pass a discovery round; the state rows and their expected heights are derived from `responsive.ts` and hold regardless.
