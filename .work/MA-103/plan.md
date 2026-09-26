# MA-103 — Category colours clear a contrast floor wherever they paint a glyph or label
base: 9f2a3328e4468bd0d762c50f3ecf055a9466a416 · verify: emulator · flags: data-loss migration · expected diff: ~130 lines

## Steps
### 1. Migration 021 moves the 13 old category hexes to their new tones, on the value alone
- File: `src/database/migrations/021_recolour_category_palette.ts` (new, `migration021`, `version: 21`), `src/database/migrations/index.ts` (import and append to `MIGRATIONS`, after `migration020`)
- Change: one SQL statement, `UPDATE categories SET color = CASE color WHEN '#1B2B4B' THEN '#5C7FC4' … END WHERE color IN (<the 13 old hexes>)`, using the ticket's mapping verbatim; `#6B7F99` is not in the list, `updated_at` is not in the SET, and the match is exact case (every writer stores uppercase: the seeds and `AccountColors`). Literal SQL, no import from `theme.ts`: a later swatch change must not rewrite a shipped migration.
- Test: `first` · `__tests__/database/migrations/021_recolour_category_palette.test.ts`, on the 020 suite's shape (better-sqlite3, `MIGRATIONS.filter(version <= 20)`, `registerOpenDbsDrain`): every one of the 29 seeded rows reads the mapped hex (Other and Other Income still `#6B7F99`); a user row (`is_default = 0`) on `#185FA5` reads `#2381DF`; user rows on `#ABCDEF`, `#6B7F99` and `#1b2b4b` are unchanged; a snapshot of `SELECT id, updated_at` before equals the one after on every row; running the statement twice changes nothing. The runner suite `__tests__/database/migrations/019_add_account_is_deleted.test.ts:109-121` asserts `schema_migrations` equals `MIGRATIONS` and picks 021 up with no edit.

### 2. The swatch list is the 12 new tones, and a test holds seeds and swatches at the floor
- File: `src/constants/theme.ts` (`AccountColors`, `:246`)
- Change: replace the 12 values, in order, with the swatch 1 to 12 tones from the ticket, uppercase, so `AccountColors[0]` is `#5C7FC4` and each value equals the migration's output for the same position. The name stays (`add_edit_category_sheet.state.ts:34`, `add_edit_category_sheet.tsx:130,269` and `__tests__/add_edit_category_sheet.state.test.ts` read it symbolically and need no edit). Update the comment at `__tests__/account_palette.test.ts:85`: `#3D7A5F` is no longer an `AccountColors` value; say it is a retired category swatch, or an arbitrary hex outside `AcctTokens`.
- Test: `first` · `__tests__/category_colour_contrast.test.ts`: backdrops `Colors.dark.bg`, `Colors.dark.surfaceEl`, `Colors.shared.heroGrad2`, `Colors.light.surface`, `Colors.light.surfaceEl` (all exported from `@/constants/theme`); `contrastRatio` from `@/modules/accounts/constants/account_palette` ≥ 3 for each of the 12 `AccountColors` on all five; the 29 rows of `SELECT color FROM categories` on a better-sqlite3 database built from every `MIGRATIONS` entry ≥ 3 on all five (fresh install); every `AccountColors` value is among those 29 colours (a migrated category's swatch shows selected, `selectedColor === c` at `add_edit_category_sheet.tsx:273`); relative luminance of the 12 swatches and the 14 distinct seed colours within 0.187 to 0.245, taken as `contrastRatio(hex, '#000000') * 0.05 - 0.05`. Fails at base on 8 swatches and 4 seeds (`#1B2B4B` reads 1.06 on `#243044`).

### 3. The dashboard card's fallback is the accounts default
- File: `src/modules/dashboard/screens/dashboard/components/account_card.tsx` (`:8` import, `:46`)
- Change: `account.color ?? DEFAULT_ACCOUNT_COLOR` from `@/modules/accounts/constants/account_palette`; drop `AccountColors` from the theme import. Same hex today (`AcctTokens.midnight.rich` is `#1B2B4B`), so no pixel moves.
- Test: `none` · the fallback is an expression in a `.tsx`; the repo adds no render suites, and `typecheck` catches the import.

### 4. The commitment hero amount is foreground, not the category colour
- File: `src/modules/commitments/screens/commitments/detail/components/detail_hero.tsx` (`:50-56`)
- Change: the amount `Text` takes `text-foreground` in its className and loses `color: iconColor` from its style; `opacity: 0.85` and everything else on the screen stay. The glyph (`:42`) and `glowColor` keep `iconColor`.
- Test: `none` · `.tsx` render change with no logic; the emulator state `hero amount, neutral` (below) is the proof.

### 5. Decision record
- File: `docs/adr/2026-09-26-category-colour-contrast-floor.md` (new; shape of `docs/adr/2026-09-15-trim-stored-names-in-place.md`)
- Change: the ruling from the ticket's Rules, once each: one brightness (luminance 0.215) for both themes, measured on the untinted fill under a tint box; migration over runtime resolver, and none later; the guard is the value, 13 exact-case hexes, `#6B7F99` stays, user hexes outside the list are never written, `updated_at` untouched; the accounts palette is a separate list; a money figure is never in a category colour, so the commitment hero amount moves to foreground.
- Test: `none` · documentation.

### 6. Feature files carry the states this ticket adds
- File: `.claude/skills/emulator-verify/features/categories.md` (new, four sections, route `/settings/categories`, reached from Settings → `Strings.settingsCategoriesRow`), `features/README.md` (one table row for it), and one `States` row each in `transactions.md`, `account_detail.md`, `transaction_detail.md`, `commitments.md`, `commitment_detail.md`, `budget.md`
- Change: the states named under Screens, each `no frame, MA-103`, with the force and proof written there. The `categories.md` Gotchas section carries the upgrade recipe: build the seed on the host with `MIGRATIONS.filter(version <= 20)` and `PRAGMA journal_mode=DELETE`, add one user category on `#185FA5` and one on `#ABCDEF`, push it before launch (README § Seeding), and leave it on the device for the lens.
- Test: `none` · documentation.

## Screens
One walk, on the upgraded seed (schema 020 pushed before launch); the fresh-install tones are step 2's test.

- `emulator-verify/features/categories.md` (new): `upgraded from 020` (proof: `mqa db "select count(*) from categories where color in ('#1B2B4B','#4A2545','#185FA5')"` = 0, `#ABCDEF` still 1, schema_migrations max 21), `list row, recoloured glyph` (Housing and Subscriptions rows, one cropped shot of the two icon boxes), `edit sheet, migrated swatch selected` (edit Housing: `mqa ui | grep -c '#5C7FC4'` = 1 and that node `selected=true`; edit the `#185FA5` user category: `#2381DF` selected), `edit sheet, seed-only tone unselected` (edit Salary: no swatch node `selected=true`), `add sheet, first swatch default` (`#5C7FC4` selected on open)
- `emulator-verify/features/transactions.md`: `row glyph, recoloured` (a Housing, a Bills and a Subscriptions expense; one cropped shot of the three glyphs on the bare row), `filter accordion, category glyph` (open the filter sheet, expand Category; one shot)
- `emulator-verify/features/account_detail.md`: `activity row, glyph recoloured` (the same three expenses on the account's activity card; one shot)
- `emulator-verify/features/transaction_detail.md`: `hero pill, category tone` (open the Housing expense; the pill label and glyph in `#5C7FC4` on the hero; one shot of the pill)
- `emulator-verify/features/commitments.md`: `row glyph, recoloured` (a commitment on Housing; one shot of the row)
- `emulator-verify/features/commitment_detail.md`: `hero amount, neutral` (the same commitment; the amount `TextView` reads the amount in foreground, the glyph still in `#5C7FC4`; one shot of the hero)
- `emulator-verify/features/budget.md`: `category chip glyph, recoloured` (a budget or plan on Housing; one shot of the chip)
- Every state above is one the files lack; step 6 appends them.

## Decision record
- `docs/adr/2026-09-26-category-colour-contrast-floor.md`: stored category colours move once, by value, to one brightness that clears 3:1 on both themes' chip fills; no runtime resolver; step 5 adds the file.

## Non-goals
- Account tile, badge and dot colours: `AcctTokens`, `ACCOUNT_PALETTE`, `DEFAULT_ACCOUNT_COLOR`, `resolveAccountTileColors`, `resolveAccountBadgeColors` unchanged.
- Renaming `AccountColors` to a category name; its three consumers read it symbolically and the rename is a separate diff.
- Editing 003, 009 or 012; the seed literals stay old and 021 rewrites them.
- Any change to the 25 glyph sites in Context, the low-alpha tint boxes, `HeroShell`, or the transaction detail pill (MA-094 redraws it).
- `Colors.light`, `global.css @variant light`, or a light theme switch.
- Free hex input, a wider picker, or a category colour resolver at read time.
- Touching the 11 old hexes that live as unrelated tokens (`AcctTokens.midnight.rich`, `Colors.dark.positive`, `cairoGold`, `Colors.light.*`, `theme_tokens.ts`): no global replace.
- Any other change to the commitments, dashboard or budget screens.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Step 2's suite is red at base and green at head; run it at both to prove the gate.

## Risks
- A stored hex in another case than the seed's uppercase would escape the exact-case guard; no writer produces one today (`AccountColors` and the seeds are uppercase), and the ADR records the choice.
- The contrast suite reads five `Colors` tokens; a theme change to `surfaceEl`, `heroGrad2` or the light surfaces moves the floor and may go red with no category change, which is the guard doing its job.
- `mqa ui` cannot read icon colour; the glyph states rest on cropped shots, so the lens judges hue by eye against the hex list.
- The 019 runner suite is the only real-runner test and asserts on `MIGRATIONS` length; if 021 breaks under `withTransactionAsync` it fails there, not in the 021 suite.
- Amended after review: the transactions and activity-card states add a Bills expense beside Housing and Subscriptions, since Acceptance names Housing and Bills on both surfaces.

## Self-assessment
Step 6 is the one I am least sure about: the categories settings screen has no feature file, so the plan creates one from the README's four-section shape without a canvas frame behind it, and the emulator proofs for glyph colour are shots rather than `mqa ui` reads. The migration and the palette steps are fixed-interface and their tests fail at base on the numbers in the ticket, which I recomputed (min ratio 3.08 on `#223060`, old `#1B2B4B` at 1.06 on `#243044`).
