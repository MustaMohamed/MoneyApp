# ADR: Stored category colours move once to one brightness that clears 3:1

- **Date:** 2026-09-26
- **Status:** accepted
- **Ticket:** #564 (MA-103)
- **Applies to:** `src/database/migrations/021_recolour_category_palette.ts`, `src/constants/theme.ts` (`AccountColors`), `src/modules/commitments/screens/commitments/detail/components/detail_hero.tsx`, `src/modules/dashboard/screens/dashboard/components/account_card.tsx`

Category glyphs are drawn in the stored category colour, and the old palette held background tones: `#1B2B4B` reads 1.06:1 on the dark chip. Migration 021 rewrites every stored category colour that is one of the 13 old hexes to its new tone, and the category form's swatch list moves to the same 12 tones.

## 1. One brightness for both themes

Each old hex keeps its hue and saturation and takes the lightness that puts its relative luminance at 0.215. The floor is WCAG 2.2 non-text contrast, 3:1, measured on the chip fill of each theme (dark `#243044`, light `#F0EBE3`), the dark screen, the light surface and the hero gradient's middle stop `#223060`. The band that clears all five is luminance 0.187 to 0.245, so the light theme needs no second migration when it ships.

Where a glyph sits on a box tinted in its own colour, the floor is measured on the untinted fill beneath the tint, never on the composite.

## 2. A migration, not a runtime resolver

Stored values stay the truth. No code maps a stored category colour to another at read time, in this ticket or later. The seeds in 003, 009 and 012 are shipped and stay as written; 021 rewrites them on first run, as 020 does for names.

## 3. The guard is the value

The `UPDATE` matches the 13 old hexes by exact, uppercase value, never by id or `is_default`: a user who picked a swatch chose a family, and the family survives the move. `#6B7F99` (Other, Other Income) already clears the floor and is not in the list. A colour outside the list is the user's own and is never written. Every writer stores uppercase (the seeds and `AccountColors`), so a lowercase variant is treated as a user colour. The `SET` names `color` alone; `updated_at` does not move on any row.

## 4. The accounts palette is a separate list

`AcctTokens`, `ACCOUNT_PALETTE`, `DEFAULT_ACCOUNT_COLOR` and the account tile and badge resolvers do not move. The dashboard account card's fallback for a null account colour is `DEFAULT_ACCOUNT_COLOR`, not the first category swatch.

## 5. A money figure is never in a category colour

Label text painted in a category colour holds only the 3:1 glyph floor, so it is allowed only beside its glyph on a pill tinted in the same family: the transaction detail hero pill. The commitment detail hero amount is a money figure and renders in the foreground text colour (`docs/adr/2026-08-27-money-colour-vocabulary.md`).
