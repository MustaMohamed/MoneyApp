import type { TextStyle, ViewStyle } from 'react-native';

import { Size, Spacing } from '@/constants/theme';
import { ms } from '@/utils/responsive';

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

type StateScreenKind = 'error' | 'empty';

interface StateScreenLayout {
  root: Readonly<ViewStyle>;
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
      ? Object.freeze({ marginTop: config.actionGap, width: '100%', maxWidth: config.bodyMaxWidth })
      : Object.freeze({ marginTop: config.actionGap });

  return Object.freeze({ root, iconCircle, iconSize: config.iconSize, headline, body, action });
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
