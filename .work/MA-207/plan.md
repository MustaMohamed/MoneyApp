# MA-207 — List pieces move to ui
base: f8c1eb5f225550285d0e0bf3f0b3071d34b9ac35 · verify: emulator · flags: none · expected diff: ~160 lines

Order: steps 1 to 3 cut every back import from the pieces while they still sit in the screens folders, step 4 moves them with nothing but import specifiers changed, step 5 changes the chips in their new home. A moved file edited past git's 50% similarity reads as added whole in the PR's file list, so no step rewrites a moved file wholesale.

## Steps
### 1. The tally and header text geometry, and the hero's bottom margin, sit where a shared piece can read them
- File: new `src/components/ui/list_text.geometry.ts`; `src/modules/transactions/screens/transactions/components/transactions_text.geometry.ts:8-19`; `day_header.tsx:15`; `search_tally.tsx:9`; `account_chips.geometry.ts`; `account_chips.tsx:17`; `transactions_hero.tsx:26`
- Change: `INTER_SEMIBOLD_ELLIPSIS_RESERVE_SCALE` (`number`, 1.45, its comment kept), `interface SearchTallyGeometry { slotHeight: number; lineHeight: number }` and `resolveSearchTallyGeometry(fontScale: number): SearchTallyGeometry` move verbatim from `transactions_text.geometry.ts` to `list_text.geometry.ts`; the hero geometry stays. `HERO_SHELL_MARGIN_BOTTOM` (`number`, `Spacing.xs`) moves from `transactions_hero.tsx:26` to `account_chips.geometry.ts` with a one-line comment that the chip row under the list hero cancels it; the hero and `account_chips.tsx` import it from `./account_chips.geometry`. `day_header.tsx` and `search_tally.tsx` import from `@/components/ui/list_text.geometry`.
- Test: `first` · `__tests__/screens/transactions/transactions_text.geometry.test.ts` imports `resolveSearchTallyGeometry` from `@/components/ui/list_text.geometry`; its cases stay unchanged.

### 2. The day header takes a ui-owned section shape
- File: `src/modules/transactions/screens/transactions/components/day_header.tsx:14,33-35`; `src/modules/transactions/screens/transactions/transactions.helpers.ts:409-420`
- Change: `day_header.tsx` exports `type DayHeaderFigures = { mode: 'skeleton' } | { mode: 'failed'; net: string } | { mode: 'figures'; net: string; count: string }` (moved verbatim from `transactions.helpers.ts:409`) and `interface DayHeaderSection { label: string; figures: DayHeaderFigures; accessibilityLabel: string }`, every key required, none `null`. `Props` becomes `{ section: DayHeaderSection }` and the `TransactionDaySection` import goes. `transactions.helpers.ts` keeps `interface TransactionDaySection extends DayHeaderSection { key: string; data: Transaction[] }`, both required, and imports the two types with `import type` from `./components/day_header`, as `transaction_load_error.helpers.ts:1` imports `LoadErrorAlertProps` from a ui `.tsx`. `buildDaySections`, `composeDayHeaderAccessibilityLabel` and `dayFigures` stay as the adapter from the month aggregate and keep their bodies.
- Test: `none` · a type-only change: `npm run typecheck` checks it, and the `buildDaySections` cases in `transactions_helpers.test.ts` run unchanged.

### 3. The tally takes a ui-owned model, and its sum colours move with it
- File: new `src/components/ui/search_tally.helpers.ts`; `transactions.helpers.ts:43-48,295,306-313`; `search_tally.tsx:8,85-95`; `transactions_hero.tsx:15-19`; `src/modules/transactions/screens/transactions/index.tsx:132`
- Change: `search_tally.helpers.ts` exports `type SearchTallyMode = 'empty' | 'skeleton' | 'failed' | 'figures'`, `type SearchTallyPolarity = 'good' | 'bad' | 'neutral'`, `interface SearchTallyModel { mode: SearchTallyMode; count: string | undefined; label: string; filterSummary: string | undefined; sum: { text: string; polarity: SearchTallyPolarity; currencyCode: string } | undefined; accessibilityLabel: string | undefined }` (every key required, values `undefined` where typed so, none `null`), and `FLOW_CLASS: Record<SearchTallyPolarity, string>` moved whole from `transactions.helpers.ts:43-48` with its comment. `transactions.helpers.ts` drops the three definitions, imports the two types, and `buildSearchTally` and `SearchTallyInput` stay there unchanged; `PolaritySignal` assigns to `SearchTallyPolarity` as the same three literals. `transactions_hero.tsx` imports `FLOW_CLASS` from `@/components/ui/search_tally.helpers`, so the hero's In and Net and the tally's sum keep one map. `SearchTally` props become `{ model: SearchTallyModel; testID: string }`, both required, and the root `View` takes `testID` in place of the literal `transactions-search-tally`; `index.tsx` passes `testID="transactions-search-tally"`.
- Test: `none` · no behaviour changes: the `buildSearchTally` cases in `transactions_helpers.test.ts` keep their `polarity` assertions, and `transactions.screen.test.tsx:398-415` reads the slot by `transactions-search-tally`, which fails if `index.tsx` drops the testID.

### 4. The list pieces live in `src/components/ui/`
- File: `git mv` to `src/components/ui/` of `src/modules/transactions/components/day_card_row.tsx`, `day_card_row.helpers.ts`, `day_header.geometry.ts`, and `src/modules/transactions/screens/transactions/components/day_header.tsx`, `account_chips.tsx`, `account_chips.helpers.ts`, `account_chips.geometry.ts`, `search_tally.tsx`; readers `index.tsx:16,17,24,25,27`, `src/modules/transactions/components/transaction_rows_skeleton.tsx:8,9-13`, `transactions.hook.ts:28`, `transactions.helpers.ts` (step 2's import), `transactions_hero.tsx` (step 1's import)
- Change: whole files move and only import specifiers change, in the moved files and in their readers; no old path keeps a re-export, and no `index.ts` is added. `day_header.tsx` reads `./day_header.geometry`. After the move `moneyapp/screens-import-boundary` passes on every moved file, since steps 1 to 3 removed each screens import. Commit this step alone, so `git log --follow` keeps each file's history.
- Test: `first` · import paths only, cases unchanged: `__tests__/screens/transactions.screen.test.tsx:8` and its `jest.mock` paths at `:109` and `:137` to `@/components/ui/account_chips` and `@/components/ui/day_header`; `__tests__/screens/transactions/day_card_row.helpers.test.ts:10` and the `jest.requireActual` string at `:35`; `account_chips.geometry.test.ts:6`; `account_chips_helpers.test.ts:4`; `transactions_text.geometry.test.ts:6`; `transaction_row.test.tsx:10`; `transaction_rows_skeleton.test.tsx:7`.

### 5. Each account chip leads with a 20 dp account-type tile, and an archived account gets no chip
- File: `src/components/ui/account_chips.helpers.ts` (`AccountChipModel`, `buildAccountChips`); `src/components/ui/account_chips.tsx` (`CHIP_ICON_SIZE`, the `startIcon` and `style` of each `SelectablePill`, `testID`); `index.tsx:134`
- Change: `AccountChipModel` drops `iconName` and `iconColor` and gains `tile: AccountChipTile | undefined` (required key; `undefined` on All accounts), with `interface AccountChipTile { color: string | null; type: AccountType }`, both required, `color` `null` for an account with no colour; `accountId: string | undefined`, `label: string`, `accessibilityLabel: string`, `selected: boolean` stay. `buildAccountChips(accounts: readonly Account[], accountIds: readonly string[]): AccountChipModel[]` keeps its argument order and skips an account with `is_archived === 1` or `is_deleted === 1`; the `ACCOUNT_TYPE_ICONS` and `resolveAccountGlyphColor` imports go. In `account_chips.tsx` a chip with a tile takes `startIcon={<AccountColorTile color={tile.color} type={tile.type} size={CHIP_TILE} glyphSize={Size.rowGlyph} />}` and `style={[CHIP_STYLE, CHIP_TILE_PADDING]}`, with `CHIP_TILE = ms(20)` (commitments canvas `Main.dc.html` `.spill .id-tile`, 20 square, a 14 glyph as `account_strip.tsx:135` draws), and `CHIP_TILE_PADDING = { paddingVertical: (Size.compactChipHeight - CHIP_TILE) / 2 - PILL_BORDER_WIDTH, paddingLeft: ms(6) }` (the frame's 6 on the left), with `PILL_BORDER_WIDTH = 1`, the pill's `border` class in unscaled CSS px (`chip.tsx:92`), named as `CHIP_MD_PADDING_BLOCK` is at `chip.geometry.ts:8`. React Native counts the border inside the height, so a tile chip reads 1 + 3.5 + 21 + 3.5 + 1 = 30 dp, `Size.compactChipHeight`, on the Pixel_2 (`ms()` rounds, `responsive.ts:13-14`: `ms(20)` = 21, `ms(28)` = 30), level with All accounts on its `minHeight`, and the style beats `SelectablePill`'s `py-1.5` as `account_strip.tsx:161-162` beats it. The right padding stays the pill's own. `AccountColorTile` keeps its `Radius.sm` corners, as the 20 dp fact-row tile draws them (`detail_fact_row.tsx:38`). All accounts draws no tile and keeps `CHIP_STYLE` alone. `CHIP_ICON_SIZE` and the `MaterialCommunityIcons` import go. `AccountChips` props become `{ chips: readonly AccountChipModel[]; onToggle: (accountId: string | undefined) => void; testID: string }`, all required, and the `ScrollView` takes `testID` in place of `transactions-account-chips`; `index.tsx` passes `testID="transactions-account-chips"`.
- Test: `first` · `__tests__/screens/transactions/account_chips_helpers.test.ts`: All accounts reads `tile: undefined`; Wallet reads `tile: { color: '#1E88E5', type: AccountType.Bank }` and CIB `tile: { color: '#43A047', type: AccountType.CreditCard }`; a new case gives `makeTestAccount({ color: null })` `tile: { color: null, type: AccountType.PhysicalWallet }`; a new case passes one account with `is_archived: 1` and one with `is_deleted: 1` beside Wallet and gets All accounts and Wallet only. The `resolveAccountGlyphColor` import leaves the test.

### 6. The ADRs name the new homes and the tile
- File: `docs/adr/2026-10-18-transactions-pieces-leave-screen-folders.md`; `docs/adr/2026-09-27-transactions-account-chips.md`; `docs/adr/2026-09-27-transactions-search-tally.md:6,36`; `docs/adr/2026-09-28-transactions-day-cards.md:6`
- Change: 2026-10-18 gets a dated `**Extended <date> (#781, MA-207).**` paragraph under §1, after MA-206's if that one landed first: `DayCardRow` with `day_card_row.helpers.ts`, `DayHeader` with `day_header.geometry.ts`, `AccountChips` with `account_chips.helpers.ts` and `account_chips.geometry.ts`, `SearchTally` with `search_tally.helpers.ts`, and `list_text.geometry.ts` live in `src/components/ui/`, since MA-209 and MA-211 mount them in the commitments list (epic #777 R25), which supersedes §1's "No other module reads them" for the day-card pieces; the header and the tally take the ui-owned `DayHeaderSection` and `SearchTallyModel`, and `buildDaySections` and `buildSearchTally` adapt the transactions aggregate to them; `FLOW_CLASS` and `HERO_SHELL_MARGIN_BOTTOM` moved with their shared readers; the chip helpers read the accounts entity and `resolveAccountName`, and the chips draw `AccountColorTile`, which reads the accounts constants. A shared ui piece may read a module's entities and constants, as `account_color_tile.tsx:7` does, because `moneyapp/screens-import-boundary` bars only screens folders and no accounts screen change reaches it. Its Applies to line swaps the three moved paths for the new ones. 2026-09-27 account chips gets `**Amended <date> (#781, MA-207).**`: each account chip leads with a 20 dp account-type tile on the account colour in place of the type icon in glyph tone, at `Size.compactChipHeight`, All accounts has no tile, an archived or deleted account gets no chip, on the transactions list as on the commitments list (ruled 2026-10-20, epic #777); its Applies to paths move to `src/components/ui/`. The search tally and day cards ADRs get their Applies to paths, and the tally's §7 geometry path, moved to `src/components/ui/`.
- Test: `none` · docs; `npm run lint` checks the banned phrases.

### 7. The transactions features file reads the tile and the new header path
- File: `.claude/skills/emulator-verify/features/transactions.md:43,126`
- Change: the `account chips, all accounts` Proof reads each account chip leading with a 20 dp account-type tile on the account colour, `ms(20)` = 21 ± 1 dp square, and `All accounts` with no tile (MA-207, over MA-120's type icon), the chip height still `ms(28)` = 30 ± 1. The Gotchas line on `DayHeader` names `src/components/ui/day_header.tsx`.
- Test: `none` · docs.

## Screens
- `transactions.md · day card, all accounts · a clipped or rounded container`
- `transactions.md · day headers, large font · a font scale above 1.0`
- `transactions.md · search tally, large font · a font scale above 1.0`
- `transactions.md · day headers, all accounts · none`
- `transactions.md · account chip on · a clipped or rounded container`: the lit chip leads with the 20 dp tile, not the type icon (step 5)
- `transactions.md · account chips, all accounts · a clipped or rounded container`: the step 7 Proof, the 20 dp tile and the chip at 30 ± 1 dp (step 5)
- `transactions.md · search tally, results · none`
- `transactions.md · day cards, skeleton · none`

## Non-goals
- The form pieces (MA-206), and mounting any moved piece in the commitments list (MA-209, MA-211); the commitments list keeps `DateHeader`.
- `SelectablePill`'s corners (epic R25), and the filter sheet's account pills, which keep the type icon in glyph tone (`filter/components/account_accordion.tsx`).
- A tone or colour variant on `DayHeader` for the commitments state sections.
- Any change to `buildDaySections`, `buildSearchTally`, `composeDayHeaderAccessibilityLabel` or the figures they print.
- Moving the test files; they keep their folders and change import paths only, as MA-166 did.
- A radius prop on `AccountColorTile` for the frame's 7.

## Untested inputs
- A tile chip above font scale 1.0: no Screen checks row reads it, and the label grows while the tile stays 20 (step 5).
- A tile chip's height at font scale 1.0 is read on the emulator only (`account chips, all accounts`, step 5).
- The value of `AccountChips`' required `testID`: the screen test's mock draws its own literal at `__tests__/screens/transactions.screen.test.tsx:109-113`, so a wrong id passes; `npm run typecheck` catches only a missing prop (step 5).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-206 extends the same 2026-10-18 ADR; whichever lands second rebases step 6 onto the other's paragraph.
- A moved file edited past git's 50% similarity reads as added whole in the PR's files API and inflates the delivered count; `account_chips.geometry.ts` gains 2 lines on 9 and `account_chips.helpers.ts` about 12 on 45.
- `transactions.md · day card, all accounts`: the slice and swipe-corner styles move byte-identical; a background line or a square corner after the move is a stale Metro bundle, so launch with `--clear`.
- `transactions.md · day headers, large font`: the label's ellipsis reserve now reads `INTER_SEMIBOLD_ELLIPSIS_RESERVE_SCALE` from `list_text.geometry.ts`; a cut `…` at 2.0 means the value changed in the move.
- `transactions.md · search tally, large font`: the slot height reads `resolveSearchTallyGeometry` from its new file; a slot off 33.9 ± 1 dp at 2.0 means the body changed in the move.
- `transactions.md · account chip on`: if `py-1.5` wins over `CHIP_TILE_PADDING`, the selected tile chip reads 1 + 6 + 21 + 6 + 1 = 35 dp, not 30 ± 1, and its tint grows past the row's paddings.
- `transactions.md · account chips, all accounts`: the tile's top-left corner sits 6 dp inside the pill's `rounded-full` curve; a shot with the tile cut by the chip border is a padding miss.
- not probed: `transactions.md · day headers, large font` (agent-device failed at font_scale 2.0: `Android snapshot helper is unavailable`, then `Daemon request timed out`)
- not probed: `transactions.md · search tally, large font` (the same failure at 2.0; at 1.0 the slot read 19.05 dp high with its text inside, the hero 187.81 dp)
- not probed: `transactions.md · account chip on`
- not probed: `transactions.md · account chips, all accounts`
- REBUILD: none; the probe build at f8c1eb5f read REUSE.

## Self-assessment
Step 5's padding is the step I am least sure of. The tile chip holds `Size.compactChipHeight` only if the `style` padding beats the pill's `py-1.5` class. `account_strip.tsx:161-162` shows a style `paddingVertical` winning there, but no test can assert it; only the emulator reads the height. The second doubt is home, not behaviour: `FLOW_CLASS` in `search_tally.helpers.ts` and `HERO_SHELL_MARGIN_BOTTOM` in `account_chips.geometry.ts` make the transactions hero import from tally- and chip-named files. I chose one map and one margin over two copies a later change could split.
