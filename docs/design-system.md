# Cairo Nights Design System

This document describes the design tokens shipped in `constants/theme.ts` and the responsive helpers in `utils/responsive.ts`. All onboarding screens (and downstream M1.5 work) should consume these tokens rather than hardcoding values.

## Why this exists

The original Day 5–9 screens hardcoded numbers from a Figma mockup that was visually calibrated at a small frame size. On real devices those values rendered as compact / cramped:

| Element | Original | New (token) |
|---|---|---|
| Body text | 8–10 px | `Type.body` = 14 |
| Section labels | 8 px caps | `Type.caption` = 12 |
| Headlines | 13–18 px | `Type.headline` 22 / `Type.hero` 28 |
| Header chrome height | 42 | `Size.headerHeight` = 56 |
| Header title | 12 | `Type.subhead` = 16 |
| Back button | 26 × 26 | `Size.backBtn` = 40 (with `TouchSize.min` 44 hit-slop) |
| CTA button | 40 tall, 12 text | `Size.ctaHeight` = 52, `Type.bodyStrong` = 15 |
| Security pill icons | 18 | `Size.iconMd` = 22 (icon container `Size.securityIconBox` = 40) |
| Type pill icons | 16 | `Size.iconSm` = 18 (with bigger pill) |
| Progress dots | 3 tall | `Size.progressDot` = 4 |
| Check circle | 16 | `Size.checkCircle` = 20 |
| O5 row icon container | 28 × 28 | `Size.typeIconBox` = 36 |
| O6 hero checkmark | 54 | `Size.iconHero` = 64 |
| O1 illustration | 88 × 88 | `Size.illustration` = 120 |

These bumps target mobile-conventional sizes (Apple HIG, Material 3) while keeping the visual hierarchy from the original spec.

## Responsive scaling

Tokens are defined at the iPhone 14 width (390 pt). At runtime, every `ms(n)` and `msFont(n)` call multiplies by `clamp(deviceWidth / 390, 0.85, 1.15)`:

- Tiny phones (e.g. iPhone SE, ~320 pt) → tokens shrink ~15 %.
- Default (iPhone 14 / Pixel) → tokens at design value.
- Pro Max / large Android → tokens grow ~10 %.
- Tablets are clamped at +15 % (M1 doesn't ship for tablets, but the clamp prevents runaway growth if `supportsTablet` is later flipped on).

`msFont` snaps to the nearest physical pixel via `PixelRatio.roundToNearestPixel` so text remains crisp at any device pixel ratio.

```ts
import { ms, msFont } from '@/utils/responsive';

ms(20);     // 20 on iPhone 14, 17 on SE, 22 on Pro Max
msFont(14); // same scaling, snapped to nearest pixel for typography
```

## Token reference

### Colors (`Colors.dark.*` / `Colors.light.*`)

Unchanged from the original Cairo Nights palette. Added a `text3` muted accent for the lightest chrome (sign-in link, dashed-border labels, fine print).

### Typography (`Type.*`)

| Token | Default px | Use case |
|---|---|---|
| `Type.micro` | 11 | Section labels caps, tiny annotations |
| `Type.caption` | 12 | Sublabels, dense table cells |
| `Type.body` | 14 | Default body text |
| `Type.bodyStrong` | 15 | CTA text, emphasized body |
| `Type.subhead` | 16 | Header titles, intro paragraphs |
| `Type.title` | 18 | Card titles |
| `Type.headline` | 22 | Screen headlines (O3, O5, O6) |
| `Type.hero` | 28 | O1 welcome headline |

Pair with `FontFamily.*`:

| Family token | Resolved family |
|---|---|
| `FontFamily.soraRegular` | `Sora_400Regular` |
| `FontFamily.soraSemi` | `Sora_600SemiBold` |
| `FontFamily.soraBold` | `Sora_700Bold` |
| `FontFamily.soraExtra` | `Sora_800ExtraBold` |
| `FontFamily.interRegular` | `Inter_400Regular` |
| `FontFamily.interMedium` | `Inter_500Medium` |
| `FontFamily.interSemi` | `Inter_600SemiBold` |

### Spacing (`Spacing.*`)

| Token | Default px |
|---|---|
| `Spacing.xxs` | 4 |
| `Spacing.xs` | 8 |
| `Spacing.sm` | 12 |
| `Spacing.md` | 16 |
| `Spacing.lg` | 20 |
| `Spacing.xl` | 24 |
| `Spacing.xxl` | 32 |

### Radius (`Radius.*`)

| Token | Default px | Use case |
|---|---|---|
| `Radius.sm` | 8 | Small chips, dense rows |
| `Radius.md` | 12 | Cards, inputs |
| `Radius.lg` | 16 | Large surfaces |
| `Radius.xl` | 28 | Sheets, modal handles |
| `Radius.pill` | 11 | Selectable pill rows |
| `Radius.cta` | 13 | Primary buttons |

### Component sizes (`Size.*`)

Heights, icon containers, dot diameters. See the table at the top for use cases.

### Touch (`TouchSize.min`)

Constant `44` (the iOS HIG minimum and a sane Android floor). Don't scale this. Use it for `hitSlop` on small icon buttons:

```tsx
<Pressable
  hitSlop={{ top: TouchSize.min, bottom: TouchSize.min, left: TouchSize.min, right: TouchSize.min }}
  style={{ width: Size.backBtn, height: Size.backBtn }}
/>
```

## Conventions

1. **Don't hardcode numbers in screens.** Pull from the tokens. Magic numbers should only appear in `constants/theme.ts` and `utils/responsive.ts`.
2. **Hex colors stay inline for now.** Until M1.5 we don't have a use case for theming; importing every hex through `Colors.dark.text1` adds noise without payoff. Re-evaluate when light mode lands.
3. **Line height** = `Type.X * 1.35` is a good default. Specify it on text styles that wrap.
4. **Touch targets** smaller than `TouchSize.min` need a `hitSlop` to bring the tap area up to 44 pt minimum.
5. **Custom screen-specific values** (e.g. an unusual marker height in one chart) are fine inline, but document the magic with a one-line comment explaining the constraint.

## Migrating new screens

When adding a new screen in M1.5+:

```tsx
import {
  Colors,
  FontFamily,
  Radius,
  Size,
  Spacing,
  TouchSize,
  Type,
} from '@/constants/theme';

const styles = StyleSheet.create({
  cta: {
    height: Size.ctaHeight,
    borderRadius: Radius.cta,
    paddingHorizontal: Spacing.md,
  },
  ctaText: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.bodyStrong,
    color: Colors.shared.midnightBlue,
  },
});
```

That's the pattern. Don't reach for `useWindowDimensions` directly — `ms()` already handles responsiveness based on launch-time width, which is sufficient for portrait-locked onboarding.
