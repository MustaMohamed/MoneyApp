# MA-260 — Detail hero with cadence badge
base: 55706296c69fd941f5326c890c551a3998bb336f · verify: emulator · flags: money path, user copy · expected diff: ~275 lines

## Steps
### 1. The hero tile's glyph contrast pick sits beside `resolveCategoryGlyph`
- File: `src/modules/transactions/components/transaction_row.helpers.ts` (`resolveCategoryGlyph`, `:288`); `src/modules/transactions/screens/transactions/detail/detail.helpers.ts` (`resolveHeroTileGlyphColor`, `:90`)
- Change: cut `resolveHeroTileGlyphColor(fill: string): string` from the detail helpers and paste it after `resolveCategoryGlyph`, body unchanged, with the `NON_TEXT_MIN_CONTRAST_RATIO` and `contrastRatio` import from `@/modules/accounts/constants/account_palette` (no cycle: that file imports only strings and tokens). The detail helpers import it back from the row helpers and drop their now-unused `CoreTokens`, `contrastRatio` and `NON_TEXT_MIN_CONTRAST_RATIO` imports. ADR 2026-10-18 §3: no re-export at the old path.
- Test: `none` · `__tests__/screens/transactions/detail/detail_helpers.test.ts:30` imports it from the row helpers; the `resolveHeroTileGlyphColor` case (`:1080`) passes with no assertion changed. A move with its body unchanged adds no case.

### 2. The hero geometry lives in shared UI
- File: new `src/components/ui/detail_hero.geometry.ts`; `src/modules/transactions/screens/transactions/detail/components/detail.geometry.ts` (`:18-27`, `:42-93`); `src/modules/transactions/screens/transactions/detail/components/detail_skeleton.tsx` (`:13-23`); `src/modules/transactions/screens/transactions/detail/components/detail_hero.tsx` (`:12-22`)
- Change: cut `DETAIL_HERO_AMOUNT_MAX_FONT_SCALE`, `DETAIL_HERO_SHELL_STYLE`, `DETAIL_HERO_PADDING`, `DETAIL_HERO_TILE_GAP`, `DETAIL_HERO_BADGE_GAP`, `DETAIL_HERO_OVERLINE_GAP`, `DETAIL_HERO_CAPTION_GAP`, `DETAIL_HERO_CODE_GAP`, `DETAIL_HERO_CODE_OPACITY`, `DETAIL_HERO_BADGE_CHROME`, `DetailHeroGeometry` and `resolveDetailHeroGeometry(fontScale: number): DetailHeroGeometry` into the new file, bodies unchanged, with the imports only they read (`DISPLAY_HEADLINE_MAX_FONT_SCALE`, `STATUS_BADGE_PADDING_VERTICAL`, `FITTED_LINE_SLACK`, `scaledFontSize`, `scaledTextStyle`). This is ADR 2026-10-18 §3's split form: `detail.geometry.ts` keeps the transfer, note and fact-slot code and imports nothing back. The skeleton and the hero import the hero names from `@/components/ui/detail_hero.geometry`. The new file imports nothing from a module or a screens folder (§2).
- Test: `none` · a cut with bodies unchanged; `__tests__/screens/transactions/detail/detail.geometry.test.ts:10-24`, `__tests__/screens/transactions/detail/detail_skeleton.test.tsx:12-15`, `__tests__/screens/transactions/detail/detail_hero.test.tsx:9` and `__tests__/components/ui/scaled_line_box_sites.test.ts:45-57` split their imports between the two paths and pass with no assertion changed.

### 3. One hero both details draw, in shared UI
- File: `git mv src/modules/transactions/screens/transactions/detail/components/detail_hero.tsx src/components/ui/detail_hero.tsx`; `src/modules/transactions/screens/transactions/detail/detail.helpers.ts` (`TransactionDetailHero`, `:104-118`; `TransactionDetailPresentation.hero`, `:121`; builder, `:384-400`); `src/modules/transactions/screens/transactions/detail/index.tsx` (`:11`, `:57`)
- Change: the moved file declares and exports `DetailHeroModel`, every field required and non-null: `title: string`, `badgeLabel: string`, `badgeIcon: IconName`, `badgeFill: string`, `badgeForeground: string`, `tileColor: string`, `tileGlyph: IconName`, `tileGlyphColor: string`, `amountValue: string`, `amountCode: string`, `amountColor: string`, `amountAccessibilityLabel: string`, `caption: string` (`IconName` = `React.ComponentProps<typeof MaterialCommunityIcons>['name']`). It also exports `type DetailHeroBadge = Pick<DetailHeroModel, 'badgeLabel' | 'badgeIcon' | 'badgeFill' | 'badgeForeground'>`, the badge slot MA-262 fills with `Stopped` and `Ended`. Props in order: `hero: DetailHeroModel` (required), `testID: string` (required, on the body `View` that carries `transaction-detail-hero` today), `entering?: HeroShellProps['entering']` (optional, passed to `HeroShell`). The badge draws from `badgeLabel`/`badgeIcon`/`badgeFill`/`badgeForeground`, the amount and code from `amountColor`; layout and geometry are unchanged, so `resolveDetailHeroGeometry(scale).height` still pins the body. `TransactionDetailHero` is deleted; `TransactionDetailPresentation.hero` is `DetailHeroModel`, and the builder renames `typeLabel` to `badgeLabel`, `typeIcon` to `badgeIcon` and `typeColor` to `amountColor`, values unchanged. The transactions screen imports `DetailHero` from `@/components/ui/detail_hero` and passes `testID="transaction-detail-hero"`. One commit holds the move and the model: a move-only commit would import the screens type into `src/components/` and fail `moneyapp/screens-import-boundary`.
- Test: `first` · `__tests__/screens/transactions/detail/detail_helpers.test.ts` renames the three keys in its hero expectations at `:251`, `:399-401`, `:419-421`, `:432-434`, `:447-449`, `:462-464` and `:511`, values unchanged (`toMatchObject` and `toEqual` take no typed shape, so tsc names none of them and jest fails on each); `__tests__/screens/transactions/detail/detail_hero.test.tsx` imports from `@/components/ui/detail_hero` and mounts with `testID="transaction-detail-hero"` (`:38`, `:76`), no case added; `__tests__/screens/transactions/transactions_shared_copy.test.ts` adds the row `['detailAmountOverline', 'components/ui/detail_hero.tsx, drawn by both details', Strings.detailAmountOverline, 'Amount']`.

### 4. The commitment detail builds its hero: cadence badge, amount, caption
- File: `src/modules/commitments/screens/commitments/detail/detail.helpers.ts`; `src/constants/strings.ts` (beside `commitmentsDetailHeader`, `:1136`)
- Change: strings add `commitmentsCadenceVaries: (recurrence: string) => \`${recurrence} · varies\``, `commitmentsDetailCaptionSince: (category: string, date: string) => \`${category} · since ${date}\`` and `commitmentsDetailCaptionStarts: (category: string, date: string) => \`${category} · starts ${date}\``. The helpers add:
  - `resolveCommitmentCadenceBadge(commitment: Pick<Commitment, 'amount_type' | 'recurrence_every' | 'recurrence_period'>): DetailHeroBadge`. `badgeLabel` is `buildRecurrenceLabel(commitment)` (`src/modules/commitments/utils/recurrence_label.ts:13`), wrapped in `commitmentsCadenceVaries` when `amount_type === AmountType.Variable`. `badgeIcon` is `'clock-outline'` (frame C1 `x-clock`). `badgeFill` and `badgeForeground` come from a module constant `resolveBadgeColors({ tone: CoreTokens.text2, backdrop: HERO_GRADIENT_COLORS[1], fillShare: 0.22, ink: CoreTokens.text1, inkShare: 1 })`: frame C1 `.badge` is `rgba(107,127,153,.22)` (`text2`) with `#F0EBE3` (`text1`), read as a fill share the way `commitment_row.helpers.ts:96-115` reads A1 `.stag`, over the hero gradient's middle stop as `account_badge_color.ts:13` does. The hook's `recurrenceLabel` never takes the suffix.
  - `interface CommitmentDetailHeroInput { commitment: Commitment; payment: CommitmentPayment | undefined; category: Category | undefined; today: string }`, every key required, `today` a local `YYYY-MM-DD`, and `buildCommitmentDetailHero(input: CommitmentDetailHeroInput): DetailHeroModel`. `title` is `commitment.name`. The badge fields are `resolveCommitmentCadenceBadge(commitment)`. `tileColor`/`tileGlyph` are `resolveCategoryGlyph(category)`, and `tileGlyphColor` is `resolveHeroTileGlyphColor(tileColor)` (step 1). The amount reads `resolveDisplayAmount(payment, commitment)` (`commitment_status.ts:54`) in `payment?.currency ?? commitment.currency`, through `formatDisplayAmountParts`. With an amount, `amountValue` is its `text` and `amountAccessibilityLabel` its `withCode`, each wrapped in `Strings.commitmentRowEstimate` when `showTilde`. With no amount it is `commitmentRowNoEstimate` / `commitmentRowNoEstimateLabel(code)` when `showTilde`, else `commitmentRowUnavailable` / `commitmentRowUnavailableLabel(code)`, as `commitment_row.helpers.ts:164-188` does. A paid cycle takes `amount_paid` and no `~` through `resolveDisplayAmount`. `amountCode` is `CURRENCY_CONFIG[currency].code`. `amountColor` is `CoreTokens.text1`, neutral, since frame C1 `.id-bal` sets no colour and ADR 2026-08-27 keeps red for actionable states. `caption` takes the category name, `category?.name ?? Strings.uncategorized` (the transaction detail's fallback, `transactions/.../detail.helpers.ts:333`), and the date `formatWeekdayDate(commitment.start_date)`: `commitmentsDetailCaptionStarts` while `commitment.start_date > today`, else `commitmentsDetailCaptionSince`.
- Test: `first` · `__tests__/screens/commitments_detail.helpers.test.ts` adds, with `makeTestCommitment`/`makeTestPayment`/`makeTestCategory`:
  - the badge reads `Every month` on a fixed monthly commitment and `Every month · varies` on a variable one, with icon `clock-outline` and `contrastRatio(fill, foreground) >= BADGE_TEXT_MIN_CONTRAST`;
  - unpaid fixed EGP 8000 reads `8,000` / `EGP`, colour `CoreTokens.text1`;
  - unpaid variable with `amount_due` 600 reads `~ 600` and label `~ 600 EGP`;
  - variable with `amount_due` and `amount` null reads `~` and label `~ EGP`;
  - fixed with `amount` and `amount_due` null reads `—` and label `— EGP`;
  - a paid variable cycle with `amount_paid` 640 reads `640`, with no `~`;
  - USD fixed 12.5 reads `12.50` / `USD`;
  - no payment reads the commitment's amount;
  - on a variable commitment, neither `caption` nor `amountValue` contains `· varies`;
  - caption month-end: start `2026-01-31` reads `Bills · starts Sat 31 Jan 2026` at today `2026-01-30` and `Bills · since Sat 31 Jan 2026` at `2026-01-31`;
  - caption across the end of a 30-day month: start `2026-05-01` reads `Bills · starts Fri 1 May 2026` at today `2026-04-30` and `Bills · since Fri 1 May 2026` at `2026-05-01`;
  - caption leap day: start `2028-02-29` reads `starts Tue 29 Feb 2028` at `2028-02-28` and `since` at `2028-02-29`;
  - no category reads `Uncategorized · since …`.

### 5. The commitment detail draws the shared hero
- File: `src/modules/commitments/screens/commitments/detail/detail.hook.ts` (`:169-172`, state `:225-240`); `src/modules/commitments/screens/commitments/detail/index.tsx` (`:9`, `:49-59`); `git rm src/modules/commitments/screens/commitments/detail/components/detail_hero.tsx`
- Change: the hook adds `hero: DetailHeroModel | undefined` to `state`, memoised on `[commitment, payment, category, today]`: `buildCommitmentDetailHero({ commitment, payment, category, today })` when `commitment` and `today` are defined, else `undefined`. `recurrenceLabel` is unchanged and still feeds `DetailsCard`. The screen's body condition adds `state.hero !== undefined` and mounts `DetailHero` from `@/components/ui/detail_hero` with `hero={state.hero}`, `testID="commitment-detail-hero"` and `entering={heroEntering}` (`detail.anim.ts`), which keeps today's fade. The commitment hero component is deleted. Its only mount is `index.tsx:54` (LSP), and `formatCommitmentAmount` keeps its other callers.
- Test: `first` · `__tests__/screens/commitments_detail.hook.test.ts` adds: with `setSystemTime(new Date(2026, 0, 30, 10))` and a variable monthly commitment starting `2026-01-31`, `state.hero.badgeLabel` reads `Every month · varies`, `state.hero.caption` reads `… · starts Sat 31 Jan 2026`, and `state.recurrenceLabel` reads `Every month`.

### 6. The commitment skeleton's hero reads the shared hero geometry
- File: `src/modules/commitments/screens/commitments/detail/components/detail_skeleton.geometry.ts`
- Change: `COMMITMENT_DETAIL_SKELETON_SHELL_STYLE`, `_HERO_PADDING`, `_TILE_GAP`, `_BADGE_GAP`, `_OVERLINE_GAP` and `_CAPTION_GAP` become the shared `DETAIL_HERO_*` constants. `resolveCommitmentDetailSkeletonHero(fontScale: number)` returns the same five fields (`titleLineHeight`, `badgeHeight`, `overlineLineHeight`, `amountHeight`, `captionLineHeight`), all `number`, picked from `resolveDetailHeroGeometry(fontScale)`. `detail_skeleton.tsx` keeps its imports (MA-261 edits it), and its unpinned stack sums to the loaded hero's height.
- Test: `first` · `__tests__/screens/commitments_detail_skeleton.geometry.test.ts` keeps its three cases unchanged and adds `it.each([1, 1.3, 2])`: `2 * COMMITMENT_DETAIL_SKELETON_HERO_PADDING + max(Size.detailHeroTile, titleLineHeight + COMMITMENT_DETAIL_SKELETON_BADGE_GAP + badgeHeight) + COMMITMENT_DETAIL_SKELETON_OVERLINE_GAP + overlineLineHeight + amountHeight + COMMITMENT_DETAIL_SKELETON_CAPTION_GAP + captionLineHeight` equals `resolveDetailHeroGeometry(scale).height`, the stack `detail_skeleton.tsx:41-85` lays out.

### 7. The feature files name the shared hero and its states
- File: `.claude/skills/emulator-verify/features/commitment_detail.md`; `.claude/skills/emulator-verify/features/transaction_detail.md` (`:3`, `:23`, `:33`)
- Change: `transaction_detail.md` names the hero `src/components/ui/detail_hero.tsx` and `resolveDetailHeroGeometry` in `src/components/ui/detail_hero.geometry.ts`, values unchanged. `commitment_detail.md` changes as follows:
  - `:3` names the shared hero, frames C1 to C5.
  - `hero amount, neutral` gets a new proof: the tile filled in `#5C7FC4` with the contrast-picked glyph, and the amount in the foreground colour.
  - `skeleton, large font` adds: the skeleton hero stands as tall as the loaded hero in a shot pair at 1.0 and at 2.0.
  - It appends four rows. `hero, variable estimate` (C3): a variable commitment with an unpaid cycle and an estimate, where the amount reads `~ <n>` and the badge `Every month · varies`. `hero, variable with no estimate` (no frame): a seeded variable commitment with `amount` and the cycle's `amount_due` NULL, where the amount reads `~`. `hero, start after today` (no frame): a commitment whose start is after today, where the caption reads `{category} · starts {date}`. `hero, large font` (no frame, C1 at 1.0): at the `Font scale` force 1.0, 1.3 and 2.0, `mqa bounds 'id="commitment-detail-hero"'` reads `resolveDetailHeroGeometry(scale).height` ± 1, which is 179.05 / 212.19 / 266.29 on `Pixel_2_API_34`, and at 2.0 each text is whole or ends in a whole `…`.
- Test: `none` · documentation; the implementer and the render lens run these rows.

### 8. ADRs 2026-10-18 and 2026-09-26 name the shared hero
- File: `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md` (Applies-to `:6`, §1, §3, §4); `docs/adr/2026-09-26-category-colour-contrast-floor.md` (Applies to `:6`, §5 `:28-32`)
- Change: in 2026-09-26, Applies to names `src/components/ui/detail_hero.tsx` in place of the deleted `src/modules/commitments/screens/commitments/detail/components/detail_hero.tsx`, and §5 adds, after the MA-180 amendment, `**Amended 2026-10-24 (#861, MA-260).**`: the commitment detail hero fills its 48 tile in the category colour with the contrast-picked glyph through the shared hero, `src/components/ui/detail_hero.tsx`, and `resolveHeroTileGlyphColor` sits in `transaction_row.helpers.ts`. In 2026-10-18, Applies-to adds `src/components/ui/detail_hero.tsx` and `src/components/ui/detail_hero.geometry.ts`. Dated extensions `2026-10-24 (#861, MA-260)`:
  - §1: `DetailHero` and `DetailHeroModel` live in shared UI with a badge slot, `DetailHeroBadge`; both details mount it (epic #777 R25); `resolveHeroTileGlyphColor` moved to `transaction_row.helpers.ts`; the commitments hero component was deleted.
  - §3: `detail_hero.tsx` moved with `git mv` in one commit with its model, since a move-only commit fails `moneyapp/screens-import-boundary`; `detail.geometry.ts` was split a second time and imports nothing back.
  - §4: the commitment hero amount derives from `resolveDisplayAmount` and `formatDisplayAmountParts`, with the row's `~` strings, and adds no rounding.
- Test: `none` · documentation.

## Screens
- `.claude/skills/emulator-verify/features/commitment_detail.md`: hero amount, neutral (proof rewritten in step 7)
- `.claude/skills/emulator-verify/features/commitment_detail.md`: hero, variable estimate (new, C3, step 7 adds it)
- `.claude/skills/emulator-verify/features/commitment_detail.md`: hero, variable with no estimate (new, no frame, step 7 adds it)
- `.claude/skills/emulator-verify/features/commitment_detail.md`: hero, start after today (new, no frame, step 7 adds it)
- `.claude/skills/emulator-verify/features/commitment_detail.md`: hero, large font (new, no frame, step 7 adds it)
- `.claude/skills/emulator-verify/features/commitment_detail.md`: skeleton, large font (proof extended in step 7)
- `.claude/skills/emulator-verify/features/transaction_detail.md`: hero, large font
- `.claude/skills/emulator-verify/features/transaction_detail.md`: skeleton, large font
- Invariant pass (`features/README.md` § Invariant pass) on `commitment_detail.md` and `transaction_detail.md`, #802 Rule 4

## Decision record
- `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md`: the hero both details draw lives in `src/components/ui/`, and the commitment hero amount derives from `resolveDisplayAmount` with no new rounding; step 8 adds the dated extension.

## Non-goals
- Fact rows, the note card, Amount in EGP (MA-261); the This cycle card, Payments, the bottom Edit, the stopped and ended badge text (MA-262); See all, the pay sheet, Stop and Skip dialogs (MA-213, MA-218, MA-224).
- No edit to `detail_skeleton.tsx` in either module beyond step 2's import split, and no pinned height on the commitment skeleton hero (MA-261 owns that file).
- No change to `formatCommitmentAmount`, to `amountFor` in `commitment_row.helpers.ts`, or to `buildRecurrenceLabel` and the hook's `recurrenceLabel`.
- No new `.tsx` test file and no new case in an existing `.tsx` suite.

## Untested inputs
- The commitment hero's `entering` fade, step 5: render-only, and no Acceptance line names it.
- The `testID` placement on the shared hero body, step 3: `mqa bounds` in `hero, large font` on both files reads it.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-252 (#851) edits the transactions `detail/index.tsx` and extends ADR 2026-10-18; MA-261 edits the commitments `detail.helpers.ts`, `detail.hook.ts`, `index.tsx`, `detail_skeleton.tsx`, `strings.ts` and `commitment_detail.md`. The second to merge rebases.
- Step 3 changes about 30 of the moved file's 156 lines in the move commit. If git stops pairing the rename, the PR counts the whole file as added, about 130 more lines.
- `commitment_detail.md · skeleton, large font`: the commitment skeleton hero holds the loaded height only by its unpinned stack; a bar that rounds differently shows a jump of 1 dp or more.
- `commitment_detail.md · hero, large font`: `Every month · varies` at 2.0 in the title column may truncate; the proof accepts only a whole `…`.
- `commitment_detail.md · hero amount, neutral`: the MA-103 proof reads a tinted tile with a category-coloured glyph today; left unrewritten, it fails on the filled tile.
- `transaction_detail.md · hero, large font`: 179.05 / 212.19 / 266.29 hold only if step 2's cut leaves `resolveDetailHeroGeometry` unchanged.
- not probed: commitment_detail.md · hero, start after today
- not probed: commitment_detail.md · hero, large font
- not probed: commitment_detail.md · skeleton, large font
- not probed: transaction_detail.md · hero, large font
- not probed: transaction_detail.md · skeleton, large font
- REBUILD: none, no native file changes.

## Self-assessment
Step 6 is the one I am least sure about. The commitment skeleton holds the loaded hero's height through the natural sum of its stack, not through a pinned `height`, because `detail_skeleton.tsx` belongs to MA-261 and is not on this ticket's file list. The geometry test proves the sum of the formula, and only the emulator shot pair proves the device layout matches it. Step 4's badge fill share of 0.22 reads the frame's decimal alpha as the row tags do. If the frame author meant the transaction hero's hex `22` alpha, the fill is darker than intended, and the render lens will see it against C1.
