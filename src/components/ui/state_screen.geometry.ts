import type { TextStyle, ViewStyle } from 'react-native';

import { Size, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';

// Module-private. `satisfies` reds a re-split shared slot or a dropped member (#338), and
// `as const satisfies` checks the literal without widening it.
interface StateScreenKindGeometry {
  iconCircle: number;
  iconSize: number;
  headlineGap: number;
  bodyMaxWidth: number;
  actionGap: number;
}

interface StateScreenGeometry {
  paddingHorizontal: number;
  bodyGap: number;
  inlinePaddingTop: number;
  inlinePaddingBottom: number;
  error: StateScreenKindGeometry;
  empty: StateScreenKindGeometry;
}

export const STATE_SCREEN_LAYOUT = {
  paddingHorizontal: Spacing.xl,
  bodyGap: Spacing.xs,
  inlinePaddingTop: Spacing.xxl,
  // 8, so the section that follows the archived-only block clears it (MA-017's slot).
  inlinePaddingBottom: Spacing.xs,
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
} as const satisfies StateScreenGeometry;

type StateScreenKind = 'error' | 'empty';

interface StateScreenLayout {
  root: Readonly<ViewStyle>;
  /** Top-placed variant: no `flex`, so it does not centre inside a scroll. */
  rootInline: Readonly<ViewStyle>;
  iconCircle: Readonly<ViewStyle>;
  /** Not a style object; feeds the icon's own `size` prop directly. */
  iconSize: number;
  headline: Readonly<TextStyle>;
  body: Readonly<TextStyle>;
  action: Readonly<ViewStyle>;
}

function buildStateScreenLayout(kind: StateScreenKind): StateScreenLayout {
  const config = STATE_SCREEN_LAYOUT[kind];

  const root: Readonly<ViewStyle> = Object.freeze({
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: STATE_SCREEN_LAYOUT.paddingHorizontal,
  });

  const rootInline: Readonly<ViewStyle> = Object.freeze({
    alignItems: 'center',
    paddingHorizontal: STATE_SCREEN_LAYOUT.paddingHorizontal,
    paddingTop: STATE_SCREEN_LAYOUT.inlinePaddingTop,
    paddingBottom: STATE_SCREEN_LAYOUT.inlinePaddingBottom,
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

  const action: Readonly<ViewStyle> =
    kind === 'error'
      ? Object.freeze({ marginTop: config.actionGap, width: '100%' })
      : Object.freeze({ marginTop: config.actionGap });

  return Object.freeze({
    root,
    rootInline,
    iconCircle,
    iconSize: config.iconSize,
    headline,
    body,
    action,
  });
}

export const ERROR_STATE_SCREEN_LAYOUT: StateScreenLayout = buildStateScreenLayout('error');
export const EMPTY_STATE_SCREEN_LAYOUT: StateScreenLayout = buildStateScreenLayout('empty');

const STATE_SCREEN_LAYOUTS_BY_KIND: Readonly<Record<StateScreenKind, StateScreenLayout>> =
  Object.freeze({
    error: ERROR_STATE_SCREEN_LAYOUT,
    empty: EMPTY_STATE_SCREEN_LAYOUT,
  });

/** A lookup, not a builder; returns the same frozen singleton every time. */
export function resolveStateScreenLayout(kind: StateScreenKind): StateScreenLayout {
  return STATE_SCREEN_LAYOUTS_BY_KIND[kind];
}
