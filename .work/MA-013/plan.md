# MA-013 — Fix active account-type card background in the add form
base: b897a013f4c8b22b17b61a6c1a6127a7c8ba257a · verify: emulator · flags: none · expected diff: ~12 lines

## Steps
### 1. The glow is a circle whose fade reaches zero at its own edge
- File: `src/components/ui/hero_glow.tsx` (`HeroGlow`, `hero_glow.tsx:21-26`)
- Change: import `Circle` from `react-native-svg` in place of `Rect` (already imported that way in two `src/` files) and draw `<Circle cx={size / 2} cy={size / 2} r={size / 2} />` filled by the gradient. Gradient becomes `cx="50%" cy="50%" r="50%"`; the two stops stay as they are, `Colors.dark.gold` at `0.46` on offset 0 and at `0` on offset 1. `size` and `offset` keep their meaning and the `Svg` wrapper keeps its `width`, `height`, `pointerEvents` and absolute position; the tile file is untouched. Replace the comment at line 11 with one line that describes a centred circle fading to transparent at its edge and no longer names `heroGlowStyle` or 70%.
- Test: none. The component is SVG markup with no logic layer, and `.claude/rules/tests.md` bars new render suites; the emulator pass below is the proof.

### 2. Each mounted glow owns its gradient id
- File: `src/components/ui/hero_glow.tsx` (`HeroGlow`)
- Change: `const id = useId();` (React 19.2.3) at the top of the component; `<RadialGradient id={id}>` and the circle's `fill` set to `url(#<id>)` through a template literal. react-native-svg matches the reference with `/^url\(#(.+)\)$/` (`node_modules/react-native-svg/src/lib/extract/extractBrush.ts:5`), so the `«r0»` shape `useId` returns needs no sanitising. No other `id=` in `src/` shares the name; `onboarding_ambient_wash.tsx:27,39` keep theirs.
- Test: none, same reason as step 1.

## Screens
- Onboarding add account (`src/modules/onboarding/screens/onboarding/add_account/index.tsx`), emulator 1080x1920 at density 420: tap each of the five type tiles in turn; shoot each selected state and zoom the top-right corner. Pass: gold fades to nothing before any straight or curved edge shows, the navy gradient covers the whole tile, and the four unselected tiles are flat. Take the same shots at base first for the before and after pair.
- In-app add account (`src/modules/accounts/screens/accounts/add_account/index.tsx`): select Bank and Credit Card, same check.
- Do not shoot geometry or the spring pop; `__tests__/account_form.geometry.test.ts` and `__tests__/account_type_tile_anim.test.ts` assert those.

## Non-goals
- Detail and edit screens, #384 and #385.
- `account_type_tile.tsx`: `GLOW_SIZE`, `GLOW_OFFSET`, the border alpha, the icon chip and the label stay as they are, and the comment at line 53 still holds.
- `hero_gradient.ts`: `heroGlowStyle` and the shared gradient constants are not edited even though the hero shell's flat disc is the older look.
- No `Ellipse`, mask, blur filter or second stop to soften further; the ticket chose the 50/50 circle over the mockup's 34%/70% numbers.
- No `React.memo`, no props added to `HeroGlow`.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- Fabric's Android renderer draws a visible anti-aliased ring at the circle's edge even at zero alpha; the ticket's spike says it does not, and only the emulator shots decide it.
- `objectBoundingBox` gradient units on a `Circle` resolve `r="50%"` against the bounding box diagonal on some renderers rather than the width; if the fade ends short of the edge a hard ring appears and the fix is `gradientUnits="userSpaceOnUse"` with `cx`, `cy`, `r` in pixels, as `onboarding_ambient_wash.tsx:28` does.
- Either the id or the unmodified `size` prop being cached natively across re-renders would surface as a stale glow when switching tiles; one glow mounts at a time today, so the walk covers it by tapping all five tiles in sequence.

## Self-assessment
Step 1's gradient units are the part I cannot settle from the tree. Percentage values on a `RadialGradient` default to the bounding box of the shape, and for a circle whose diameter is the box the 50% radius should land on the edge exactly; the ticket's emulator spike used those numbers and saw no edge, so the plan follows it. If the Fabric radial resolves the percentage differently, the symptom is a faint curved ring, the same one the mockup's numbers produced, and the `userSpaceOnUse` fallback named under Risks is a same-file change with no other consumer.
