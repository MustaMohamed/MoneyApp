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

export type StateScreenKind = 'error' | 'empty';

export interface StateScreenLayout {
  root: Readonly<ViewStyle>;
  iconCircle: Readonly<ViewStyle>;
  /** Not a style object — feeds the icon's own `size` prop directly. */
  iconSize: number;
  headline: Readonly<TextStyle>;
  body: Readonly<TextStyle>;
  action: Readonly<ViewStyle>;
}

/**
 * Composes one kind's frozen, spreadable style objects. Frozen because both
 * components consume the same object identity on every render (module-level
 * `resolveStateScreenLayout('error')` / `('empty')` call, not a per-render
 * one) — the `N4_SUMMARY_ROW_STYLE` precedent for why a stray mutation must
 * throw in dev rather than silently retune every instance at once.
 *
 * `iconCircle.borderRadius` is derived from `iconCircle`'s own width HERE,
 * never carried as a separate constant, so the circle can never go out of
 * round.
 */
export function resolveStateScreenLayout(kind: StateScreenKind): StateScreenLayout {
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

  return { root, iconCircle, iconSize: config.iconSize, headline, body, action };
}
