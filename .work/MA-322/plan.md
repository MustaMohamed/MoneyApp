# MA-322 — Shared detail hero: overline, lead tag, bar row and optional code slots
base: 7bd12748 · verify: emulator · flags: money path, user copy · expected diff: ~130 lines

## Steps
### 1. The detail hero geometry can drop the overline line and add a bar row, off by default
- File: `src/components/ui/detail_hero.geometry.ts` (`resolveDetailHeroGeometry`, `:38`; the height sum `:50-57`)
- Change: the signature becomes `resolveDetailHeroGeometry(fontScale: number, layout: DetailHeroLayout = {})`, arguments in that order. New exported `DetailHeroLayout = { hidesOverline?: boolean; bar?: boolean }`: both optional, neither nullable, absent reads as `false`. The returned `DetailHeroGeometry` keeps its fields and values; at today's call sites (`detail_hero.tsx:53`, `src/modules/transactions/screens/transactions/detail/components/detail_skeleton.tsx:71`, `src/modules/commitments/screens/commitments/detail/components/detail_skeleton.tsx:50`, `src/modules/budget/screens/budget/category_detail/components/category_detail_skeleton.tsx:25`) nothing moves. `hidesOverline: true` drops one `micro.lineHeight` from `height` and keeps `DETAIL_HERO_OVERLINE_GAP`, which then sits above the amount. `bar: true` adds `DETAIL_HERO_BAR_GAP + DETAIL_HERO_BAR_HEIGHT` and swaps `DETAIL_HERO_CAPTION_GAP` for `DETAIL_HERO_BAR_CAPTION_GAP`. New exported constants, from frame B1 (`MixB1CategoryDetail.dc.html:637-641`, `.pace` and `.hero .pace`; its badge row `display:flex;gap:6px` and caption `margin-top:8px`, `:809`): `DETAIL_HERO_BADGE_ROW_GAP = ms(6)`, `DETAIL_HERO_BAR_GAP = Spacing.sm` (12), `DETAIL_HERO_BAR_HEIGHT = ms(3)`, `DETAIL_HERO_BAR_RADIUS = Radius.xs` (2), `DETAIL_HERO_BAR_TICK_WIDTH = ms(2)`, `DETAIL_HERO_BAR_TICK_OVERHANG = ms(3)` (B1's `top:-3px` on a 9 dp tick over a 3 dp track), `DETAIL_HERO_BAR_TICK_RADIUS = ms(1)`, `DETAIL_HERO_BAR_CAPTION_GAP = Spacing.xs` (8). The lead tag adds no height: `tagMd` and `md` share `STATUS_BADGE_PADDING_VERTICAL` and `Type.micro` (`status_badge.tsx:27-33`, `:71-75`), so the top row stays `badgeHeight` tall. New exported `resolveDetailHeroBarShare(share: number): number`: one required argument, not nullable; returns `share` clamped to 0–1, and 0 for a non-finite `share` (`Math.min(Math.max(NaN, 0), 1)` is `NaN`, so the finite check comes first); never `null`.
- Test: `first` · `__tests__/screens/transactions/detail/detail.geometry.test.ts`, `describe('resolveDetailHeroGeometry')`, a new `it.each([0.85, 1, 1.3, 2, 3])`: the call with no layout and the call with `{}` both equal `heroHeightAt(fontScale)` (`:61`); `{ hidesOverline: true }` stands `lineBox(Type.micro, fontScale)` shorter; `{ bar: true }` stands `DETAIL_HERO_BAR_GAP + DETAIL_HERO_BAR_HEIGHT + DETAIL_HERO_BAR_CAPTION_GAP − DETAIL_HERO_CAPTION_GAP` taller; both together sum the two. A new `describe('resolveDetailHeroBarShare')` with `it.each` over -0.2 → 0, 0 → 0, 0.38 → 0.38, 1 → 1, 1.13 → 1, `NaN` → 0, `Infinity` → 0. The pinned values in `__tests__/components/ui/scaled_line_box_sites.test.ts:209` stay green untouched.

### 2. `DetailHero` draws the new slots only when its model sets them
- File: `src/components/ui/detail_hero.tsx` (`DetailHeroModel` `:24`, `DetailHeroBadge` `:40`, `DetailHero` `:51`)
- Change: `DetailHeroModel` gains, each optional and none nullable: `overline?: string` (absent draws `Strings.detailAmountOverline`, as `:118` does), `hidesOverline?: boolean` (true drops the overline line; the amount row takes `marginTop: DETAIL_HERO_OVERLINE_GAP`), `tag?: DetailHeroBadge` (the second badge, drawn before the existing one), `bar?: DetailHeroBar`. `badgeIcon` becomes optional (`badgeIcon?: IconName`; `StatusBadge`'s `icon` already is, `status_badge.tsx:16`; B1's group badge has none); both producers still pass one. `amountCode` becomes optional (`amountCode?: string`, not nullable; CLAUDE.md § Conventions: absent is `undefined`); the code `Typography` (`:146-158`) draws only when it is defined, so leaving the field out is the off value. Both producers still pass a string (`src/modules/transactions/screens/transactions/detail/detail.helpers.ts:318`, `src/modules/commitments/screens/commitments/detail/detail.helpers.ts:462`), so both heroes draw the code as today. New exported `DetailHeroBar = { share: number; color: string; tickShare?: number }`: `share` and `color` required, `tickShare` optional, none nullable; `share` and `tickShare` are drawn through `resolveDetailHeroBarShare` (step 1).
  - Badge row: the wrapper at `:95` gains `flexDirection: 'row'` and `gap: DETAIL_HERO_BADGE_ROW_GAP`, keeps `alignSelf: 'flex-start'` and `marginTop: DETAIL_HERO_BADGE_GAP`; given `tag`, a `StatusBadge size="tagMd" fontScale={fontScale}` from its fields comes first (B1: `.stag.md` then `.badge`). Both badges pass `fontScale`, so each holds one line, shrinks (`status_badge.tsx:105`, `:115`, `:120`) and ends in `…` at 2.0.
  - Bar row, given `bar`, between the amount row and the caption: a track `DETAIL_HERO_BAR_HEIGHT` tall at `marginTop: DETAIL_HERO_BAR_GAP`, radius `DETAIL_HERO_BAR_RADIUS`, class `bg-foreground/12` (B1 `.hero .pace` at 0.12, review round 1 finding 4; no hex, `.claude/rules/ui.md` § Design System); a fill at `share` width, full height, same radius, `backgroundColor: bar.color`; given `tickShare`, a `bg-foreground/80` tick `DETAIL_HERO_BAR_TICK_WIDTH` wide, radius `DETAIL_HERO_BAR_TICK_RADIUS`, absolutely placed with its left edge at `tickShare` (B1 `left:47%` at day 14 of 30), `top: -DETAIL_HERO_BAR_TICK_OVERHANG`, `DETAIL_HERO_BAR_HEIGHT + 2 × DETAIL_HERO_BAR_TICK_OVERHANG` tall. The track does not clip (no `overflow: 'hidden'`), so the tick overhangs it; the hero's padding keeps it inside `HeroShell`'s clip (`hero_shell.tsx:57`). The caption's `marginTop` becomes `DETAIL_HERO_BAR_CAPTION_GAP` when `bar` is set.
  - Geometry is read as `resolveDetailHeroGeometry(fontScale, { hidesOverline: hero.hidesOverline, bar: hero.bar !== undefined })`.
  - The bar is three `View`s inside the hero, not a component: heroui-native ships no progress primitive (`node_modules/heroui-native/lib/module/components`), and `BudgetBar` sits under the budget module and clips with `overflow-hidden` (`src/modules/budget/screens/budget/components/budget_bar.tsx:23`).
- Test: `none` · no new case. One edit in `__tests__/screens/transactions/detail/detail_hero.test.tsx:61`: `hero.amountCode` is now `string | undefined`, which `screen.getByText` rejects and `npm run typecheck` reports (`tsconfig.json:10` includes `__tests__`); narrow it before the `scaledTexts` array with `expect(hero.amountCode).toBeDefined()` and a local `const`. Otherwise the existing cases stay green: they assert the default overline, the code, the caption and `geometry.height` from the no-layout call on a model with no new field, which is this ticket's Acceptance for transaction detail. The new slots carry no Acceptance line here, so the Render-suite policy (`.claude/rules/tests.md`) admits no case for them; MA-330 (#999) draws each one.

## Screens
- `emulator-verify/features/transaction_detail.md`: hero, large font
- `emulator-verify/features/transaction_detail.md`: skeleton, large font
- `emulator-verify/features/commitment_detail.md`: hero, large font
- `emulator-verify/features/commitment_detail.md`: skeleton, large font

The four rows exist (`transaction_detail.md:23`, `:34`; `commitment_detail.md:57`, `:47`) and read `resolveDetailHeroGeometry(scale).height`, 179.05 at 1.0, 212.19 at 1.3 and 266.29 at 2.0 on `Pixel_2_API_34`; that figure holds because the no-layout call is unchanged, so no step edits either file.

## Decision record
- none in this PR. The ticket's money path flag binds MA-330's content (Rules: "This ticket writes nothing"); `docs/adr/2026-11-24-category-detail-hero-figure.md` is in MA-330 (#999)'s file list. The bar row draws a share and a colour it is handed and computes no money.

## Non-goals
- The category hero, its builder, strings, ADR, hook, screen and skeleton: MA-330 (#999). `category_detail_skeleton.tsx` keeps its no-layout call.
- No change to `BudgetBar`, `StatusBadge`, `HeroShell`, the transaction or commitment hero builders, or their skeletons.
- No edit to `transaction_detail.md` or `commitment_detail.md`.
- No `DetailHero` caller sets a new slot in this PR.

## Untested inputs
- `overline` text and `hidesOverline: true` on the drawn hero, step 2; first drawn by MA-330's rows.
- `tag` beside the badge, and a badge with no `badgeIcon`, at 1.0 and 2.0, step 2; MA-330's `readable text, large font`.
- `bar` with `tickShare` at 0 and 1, the tick at the track's ends, step 2.
- `amountCode` absent, step 2; MA-330's `no budget this month`.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: `npm run ci:local`.

## Risks
- `not probed: transaction_detail.md · hero, large font`
- `not probed: transaction_detail.md · skeleton, large font`
- `not probed: commitment_detail.md · hero, large font`
- `not probed: commitment_detail.md · skeleton, large font`
- `transaction_detail.md · hero, large font` and `commitment_detail.md · hero, large font`: the badge wrapper turning into a row changes how a lone badge shrinks at 2.0; `Every month · varies` must still end in a whole `…` or read whole, as today.
- `bg-foreground/12` and `bg-foreground/80` are the first `bg-foreground/<n>` classes in `src/` (only `text-foreground/<n>` exist); if Uniwind does not emit them, the track or tick draws nothing, seen first on MA-330's `current month, B1`.
- S07 (`MixS07DetailOver`) is listed in `canvas.json` but its `.dc.html` is not in the canvas folder; the hidden-overline layout (the 16 dp gap kept above the amount) follows B1's `.id-over{margin-top:16px}` with the label gone, per Decision 2026-11-24 and the parent's over line.

## Self-assessment
Step 2's badge row is the least sure. Today the lone badge sits in a column wrapper with `alignSelf: 'flex-start'`; making that wrapper a row so a tag can lead should lay out the same in Yoga, but the commitment hero's long cadence badge at 2.0 is the case that would show a difference, and only the two `hero, large font` rows prove it, since no Jest case measures text width.
