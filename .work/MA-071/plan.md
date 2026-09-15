# MA-071 — Tile: the hollow tile clears 3:1 on the archived hero as painted
base: 4b9192e1 · verify: emulator · flags: none · expected diff: ~30 lines

Figures reproduce at HEAD: 16 of 32 under 3:1 at the painted middle stop `#1F2D57`, midnight rich 2.73, graphite soft 2.98 (`node scratchpad/repro.mjs`, the loop of `account_tile_color.ts:24-31` painted with `mixHex(x, CoreTokens.bg, 0.85)` on both sides). Every colour that clears at HEAD still keeps its own hex under the painted floor; the stepped rings all clear `CoreTokens.surface` unblended, lowest 4.40 (paprika rich).

## Steps
### 1. The hero and the resolver read one `ARCHIVED_HERO_OPACITY`
- File: `src/modules/accounts/constants/account_tile_color.ts` (new export), `src/modules/accounts/screens/accounts/detail/components/balance_hero.geometry.ts:6-7` (delete), `src/modules/accounts/screens/accounts/detail/components/balance_hero.tsx:17-21` (import)
- Change: move `export const ARCHIVED_HERO_OPACITY = 0.85` with its C4 comment into `account_tile_color.ts`, above `HOLLOW_BACKDROP`; delete it from the geometry file, which keeps `HERO_CURRENCY_GAP` and `HERO_CURRENCY_OPACITY`; `balance_hero.tsx` imports it from `@/modules/accounts/constants/account_tile_color` alongside its other `constants/` imports and drops it from the `./balance_hero.geometry` import. Direction: `constants/` never imports from a screen folder; the geometry file's only import is `@/utils/responsive`, so no cycle either way, but the hero already imports two `constants/` resolvers (`balance_hero.tsx:12-13`). No re-export from the geometry file: one home, two readers.
- Test: none. The value does not change and `__tests__/` has no reader of the geometry file (`grep -rn ARCHIVED_HERO_OPACITY __tests__` returns nothing); `npm run typecheck` is the gate that the hero still reads it.

### 2. The hollow resolver composites ring and backdrop at the hero's opacity before measuring
- File: `src/modules/accounts/constants/account_tile_color.ts` (`HOLLOW_BACKDROP`, `resolveHollowTileColor`, `:18-31`)
- Change: `HOLLOW_BACKDROP` becomes `mixHex(HERO_GRADIENT_COLORS[1], CoreTokens.bg, ARCHIVED_HERO_OPACITY)`; the loop keeps its step, share and candidate exactly as at HEAD and tests `contrastRatio(mixHex(candidate, CoreTokens.bg, ARCHIVED_HERO_OPACITY), HOLLOW_BACKDROP) >= HOLLOW_MIN_CONTRAST_RATIO`, returning the unpainted `candidate`. `mixHex` is declared in `account_badge_color.ts`, already imported; a `const` initialiser calling it at module load is fine, `HERO_GRADIENT_COLORS` and `CoreTokens` are plain constants. The two comments at `:18` and `:33` say the floor is the painted hero. Signature of `resolveAccountTileColors` unchanged; its two callers (`account_color_tile.tsx:20`, and through it `balance_hero.tsx:48` and `archived_account_row.tsx:53`) need nothing.
- Test: `__tests__/accounts/account_tile_color.test.ts`, written first. Import `ARCHIVED_HERO_OPACITY` from the resolver module (step 1's export), never a literal. `HOLLOW_HERO_BACKDROP` (`:13`) becomes the painted stop, `mixHex(HERO_GRADIENT_COLORS[1], CoreTokens.bg, ARCHIVED_HERO_OPACITY)`. In the `it.each` at `:70-80`, the hero assertion measures `mixHex(glyph, CoreTokens.bg, ARCHIVED_HERO_OPACITY)` against it; the surface assertion at `:78` stays unblended, as the row paints it. The midnight test at `:97-105` pins `mixHex(hex, CoreTokens.text1, 0.5)` and asserts the 0.55 mix, painted, is under the floor. The keeps-as-is `it.each` at `:82-95` and the fallback tests stay as they are, which is what the acceptance's "already clearing keeps its own hex" asks for. Red at HEAD: the `it.each` fails for the ticket's 16 colours (midnight rich, midnight soft, nile rich, paprika rich, plum rich, plum soft, lapis rich, lapis soft, rose rich, amethyst rich, steel rich, jade rich, indigo rich, coral rich, graphite rich, graphite soft) and the midnight test fails on `0.5` vs `0.55`; green after the change, with midnight rich at `#868B97`.

## Screens
- Account detail, archived, of a midnight rich account: the hero, one shot. The ring should read grey-blue, not the old `#7B818F`; no sampling, the floor is step 2's test.

## Non-goals
- `ARCHIVED_HERO_OPACITY` stays 0.85 (MA-056).
- The filled tile, the type badge's 4.5:1 stepping (`account_badge_color.ts`), and `FILL_BACKDROP` there stay unblended.
- The archived row keeps its unblended surface floor; no opacity on `archived_account_row.tsx`.
- No per-screen backdrop parameter on `resolveAccountTileColors`.
- No ADR: flags none.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- A change to `heroGrad2`, `CoreTokens.bg` or a palette hex moves the pinned midnight share; the test names the mechanism, so the pin is re-derived, not the resolver.
- `1 - step * 0.05` yields `0.6499999999999999` at step 7; `mixHex` rounds channels, and the reproduction used the same expression, so the pinned values match, but a test that recomputes with a literal `0.65` could differ by one channel unit.
- MA-019 (#385) and MA-038 (#427) edit `balance_hero.tsx` later and rebase over step 1's import line.

## Self-assessment
Step 1's home for the constant is the call I am least sure of: `account_tile_color.ts` is a resolver file, and the hero's opacity lands there because the resolver is its second reader and the hero already imports from `constants/`. A reviewer may prefer a one-line `constants/archived_hero.ts`; the diff is the same size either way and step 2 is unaffected.
