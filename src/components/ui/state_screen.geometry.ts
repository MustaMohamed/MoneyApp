import type { TextStyle, ViewStyle } from 'react-native';

import { Size, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';

/**
 * The shared geometry behind ErrorState and EmptyState (#290 cluster 1). The
 * two components are ruled genuinely different — see the comment on each —
 * but drew the same ~10 layout values independently, and #290's fear was that
 * drift becomes a two-file retune instead of a one-file one. This module is
 * that one file: names, not a component, consumed by both through
 * `resolveStateScreenLayout`.
 *
 * `paddingHorizontal` and `bodyGap` are shared slots, held once at the top
 * level rather than duplicated onto both `error` and `empty` — the structural
 * assertion in `state_screen_geometry.test.ts` is what catches a future
 * re-split back into per-kind copies.
 *
 * The icon-circle diameters (`ms(64)`, `ms(80)`) and the empty icon size
 * (`ms(40)`) are literals, not `Size.icon*` tokens, matching EmptyState's own
 * pre-existing `styles.iconCircle`/`styles.description` literals: the icon
 * scale (`Size.iconXs`…`Size.iconXl`) is glyph-size vocabulary for the
 * `size` prop an icon renders at, not container-diameter vocabulary, even
 * where a value happens to coincide (`Size.iconHero` is also `ms(64)`).
 * `error.iconSize` is the one member that IS a scale token
 * (`Size.iconXl`, added in c1) because it feeds the icon's own `size` prop.
 *
 * Exported for `state_screen_geometry.test.ts`, the only current importer —
 * it pins the raw constants directly (the "token + independent number in the
 * same row" shape) rather than only through the resolved singletons below,
 * so a value edit here fails the test even before either component renders.
 *
 * The one sanctioned visual delta (§4.2 — device-QA item, not a bug):
 * ErrorState's static Tailwind values become these `ms()`-scaled numbers, so
 * off-baseline devices now draw a different size than before. At the
 * jest/1.15-equivalent clamp: the icon circle (`size-16`, was a fixed 64)
 * becomes 74, +10; the body/Button `max-w-80` cap (was a fixed 320) becomes
 * 368 — the retry Button, which shares that cap, is ~48pt wider; the
 * headline/body/action gaps (20/8/24) each grow by ~4. EmptyState's icon
 * circle radius also changes identity: it was an independently-authored
 * `ms(40)`, now it's the derived `iconCircle / 2` — equal at this clamp (46 =
 * 46) but up to 0.5px apart at other device widths, which is the *fix*, not
 * a new deviation: the independent `ms(40)` under-rounded relative to half
 * the box at 5 of 15 plausible device widths, and RN clamps an over-large
 * radius to half anyway, so the derived value is the one that was correct
 * (findings/p8-cycle-1-c2.md item 5 / "not routed" item 1).
 */
export const STATE_SCREEN_LAYOUT = {
  paddingHorizontal: Spacing.xl,
  bodyGap: Spacing.xs,
  error: {
    iconCircle: ms(64),
    iconSize: Size.iconXl,
    headlineGap: Spacing.lg,
    bodyMaxWidth: ms(320),
    actionGap: Spacing.xl,
  },
  empty: {
    iconCircle: ms(80),
    iconSize: ms(40),
    headlineGap: Spacing.md,
    bodyMaxWidth: ms(260),
    actionGap: Spacing.md,
  },
} as const;

// Not exported: nothing outside this file names the kind or the resolved
// shape directly — every consumer either calls `resolveStateScreenLayout`
// with a literal ('error'/'empty') or reads the two frozen singletons below.
type StateScreenKind = 'error' | 'empty';

interface StateScreenLayout {
  root: Readonly<ViewStyle>;
  iconCircle: Readonly<ViewStyle>;
  /** Not a style object — feeds the icon's own `size` prop directly. */
  iconSize: number;
  headline: Readonly<TextStyle>;
  body: Readonly<TextStyle>;
  action: Readonly<ViewStyle>;
}

/**
 * Builds one kind's frozen, spreadable style objects. Called exactly twice,
 * below, at module load — never per render and never per call — so the two
 * exported singletons are what every consumer actually shares.
 *
 * `iconCircle.borderRadius` is derived from `iconCircle`'s own width HERE,
 * never carried as a separate constant, so the circle can never go out of
 * round.
 */
function buildStateScreenLayout(kind: StateScreenKind): StateScreenLayout {
  const config = STATE_SCREEN_LAYOUT[kind];

  const root: Readonly<ViewStyle> = Object.freeze({
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: STATE_SCREEN_LAYOUT.paddingHorizontal,
  });

  const iconCircle: Readonly<ViewStyle> = Object.freeze({
    width: config.iconCircle,
    height: config.iconCircle,
    borderRadius: config.iconCircle / 2,
    alignItems: 'center',
    justifyContent: 'center',
  });

  const headline: Readonly<TextStyle> = Object.freeze({
    marginTop: config.headlineGap,
    textAlign: 'center',
  });

  const body: Readonly<TextStyle> = Object.freeze({
    marginTop: STATE_SCREEN_LAYOUT.bodyGap,
    maxWidth: config.bodyMaxWidth,
    textAlign: 'center',
  });

  // ErrorState's action is a mandatory full-width Button, bounded by the same
  // maxWidth as the body copy; EmptyState's action sizes itself (a gradient
  // CTA or a text link, several callers rendering neither) and only needs the
  // top gap.
  const action: Readonly<ViewStyle> =
    kind === 'error'
      ? Object.freeze({ marginTop: config.actionGap, width: '100%', maxWidth: config.bodyMaxWidth })
      : Object.freeze({ marginTop: config.actionGap });

  return Object.freeze({ root, iconCircle, iconSize: config.iconSize, headline, body, action });
}

/**
 * The frozen singletons themselves — one object per kind, built once. Both
 * ErrorState and EmptyState consume the same reference on every render
 * (module-level `resolveStateScreenLayout('error'|'empty')` call, not a
 * per-render one), the `N4_SUMMARY_ROW_STYLE` precedent for why a stray
 * mutation must throw in dev rather than silently retune every instance at
 * once. Exported directly (the `ready.geometry.ts` shape) as well as through
 * the lookup below, so a consumer can import either the kind it always wants
 * or the resolver when the kind is a runtime value — today only
 * `state_screen_geometry.test.ts` takes the direct route, as a pin on the
 * resolved shape; `resolveStateScreenLayout` below is what both components
 * actually call.
 */
export const ERROR_STATE_SCREEN_LAYOUT: StateScreenLayout = buildStateScreenLayout('error');
export const EMPTY_STATE_SCREEN_LAYOUT: StateScreenLayout = buildStateScreenLayout('empty');

const STATE_SCREEN_LAYOUTS_BY_KIND: Readonly<Record<StateScreenKind, StateScreenLayout>> =
  Object.freeze({
    error: ERROR_STATE_SCREEN_LAYOUT,
    empty: EMPTY_STATE_SCREEN_LAYOUT,
  });

/** A lookup, not a builder — returns the same frozen singleton every time. */
export function resolveStateScreenLayout(kind: StateScreenKind): StateScreenLayout {
  return STATE_SCREEN_LAYOUTS_BY_KIND[kind];
}
