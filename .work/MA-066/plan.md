# MA-066 — Tile: the hollow tile stays visible on a hero of its own colour
base: ca01025b09c1d20139af5a822f3394afc057a6fc · verify: emulator · flags: none · expected diff: ~65 lines (~20 outside tests)

## Steps
### 1. The hollow ring and glyph clear 3:1 on the hero's middle stop, and so on the card surface, for every colour
- File: `src/modules/accounts/constants/account_tile_color.ts` (`resolveAccountTileColors`, hollow branch `:22-26`)
- Change: add a module-private `resolveHollowTileColor(hex: string): string`. Constants next to it: `HOLLOW_BACKDROP = HERO_GRADIENT_COLORS[1]` (`@/components/ui/hero_gradient`), `HOLLOW_MIN_CONTRAST_RATIO = 3`, `HOLLOW_SHARE_STEP = 0.05`, `HOLLOW_STEP_COUNT = Math.ceil(1 / HOLLOW_SHARE_STEP)`. For `step` in `0..HOLLOW_STEP_COUNT`, `share = Math.max(0, 1 - step * HOLLOW_SHARE_STEP)`; the candidate is `hex` itself at step 0 and `mixHex(hex, CoreTokens.text1, share)` (`mixHex` from `./account_badge_color`, `contrastRatio` from `./account_palette`) after; return the first candidate with `contrastRatio(candidate, HOLLOW_BACKDROP) >= HOLLOW_MIN_CONTRAST_RATIO`, else `CoreTokens.text1`. The hollow branch becomes `const hex = resolveHollowTileColor(entry?.hex ?? DEFAULT_ACCOUNT_COLOR)` and returns it as both `glyph` and `border`; `background`, the return shape, the `filled` branch (`:27`) and `FALLBACK_TILE_COLORS` do not move. Rewrite the one-line comment at `:23` to say the ring is the account colour stepped toward the text colour. `mixHex` returns uppercase; palette hexes are uppercase, so a kept colour is byte-identical to `entry.hex`. No new import cycle: `account_badge_color` imports `hero_gradient` and `account_palette` only.
- Test: `__tests__/accounts/account_tile_color.test.ts`, the hollow `describe` (`:50-79`), written first.
  - `it.each([...ACCOUNT_PALETTE.map((e) => e.hex), DEFAULT_ACCOUNT_COLOR, '#ABCDEF', null])`: `resolveAccountTileColors(hex, 'hollow')` has `background === Colors.shared.transparent`, `glyph === border`, `glyph` matches `/^#[0-9A-F]{6}$/`, and `contrastRatio(glyph, HERO_GRADIENT_COLORS[1]) >= 3` and `contrastRatio(glyph, CoreTokens.surface) >= 3`. Fails at base for 14 hexes on the hero and 8 on the card.
  - `it.each` over `AcctTokens.gold`, `saffron`, `sand`, `emerald`, both tones: `glyph` and `border` equal the input hex. `:51-57` (saffron rich `#D4830A`) already asserts this shape and stays as written.
  - Escalation on `AcctTokens.midnight.rich`: `contrastRatio(hex, HERO_GRADIENT_COLORS[1]) < 3`, `glyph !== hex`, `contrastRatio(glyph, HERO_GRADIENT_COLORS[1]) > contrastRatio(hex, HERO_GRADIENT_COLORS[1])`. Same shape as `account_badge_color.test.ts:34-41`.
  - `:59-73` re-pinned: `resolveAccountTileColors('#ABCDEF', 'hollow')` and `resolveAccountTileColors(null, 'hollow')` both `toEqual(resolveAccountTileColors(DEFAULT_ACCOUNT_COLOR, 'hollow'))`, and their `glyph` is not `DEFAULT_ACCOUNT_COLOR` (the default is midnight rich, 1.11:1, so the fallback must step).
  - `:5-48` (filled) and `:76-78` (filled carries no border) stay byte-identical; they are the "filled tile unchanged" assertion.

## Screens
- Account detail, archived, on an account with the default (midnight) colour: the hero with the hollow tile. One shot.
- Accounts list, archived card expanded, same account: the row's hollow tile on the card surface. One shot.
- Nothing else; the floor is asserted in the test above. `mqa claim` first, `mqa needs-build` says reuse (JS-only diff).

## Non-goals
- The hero's archived opacity and label (MA-056), the account name on the hero (MA-059): `balance_hero.tsx` is not touched.
- `account_list_row.tsx:28` (filled, direct call) and `account_color_tile.tsx` are not touched; the component already routes both surfaces through the resolver.
- No refactor of `account_badge_color.ts` into a shared stepping helper: its 4.5 floor, 0.55 start and the `#DBBD86` pin in its test stay as they are.
- No per-surface colour: one resolution against the hero's middle stop serves the card too (0 failures at this checkout).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- The suite alone: `npx jest __tests__/accounts/account_tile_color.test.ts` (`test -f` passes at this checkout); it must fail on the base resolver and pass on the head.
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `CoreTokens.text1`, `Colors.shared.heroGrad2` or `CoreTokens.surface` move: the `it.each` re-derives from the tokens, so it fails loudly rather than pinning a stale hex.
- A palette entry added later that fails 3:1 on `#1A2535` after clearing `#223060`: the card assertion in the same `it.each` catches it; the fix would be a second backdrop check in the loop, not a screen override.
- MA-059 edits `balance_hero.tsx` in parallel; this diff does not touch that file, so no rebase conflict from this side.

## Self-assessment
The one step I am least sure about is the shape of the escalation loop: whether the implementer keeps step 0 as the raw hex (so a kept colour is identical to `entry.hex` without a round trip through `mixHex`) or runs every step through `mixHex`. Both give the same output for the 32 uppercase palette hexes, and the kept-hex `it.each` pins the outcome either way, so the choice is cosmetic; I named the step-0 shortcut because it makes the "returned as it is" rule literal.
