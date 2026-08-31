import type { ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

export const HERO_GRADIENT_COLORS = [
  Colors.shared.heroGrad1,
  Colors.shared.heroGrad2,
  Colors.shared.heroGrad3,
] as const;

export const HERO_GRADIENT_START = { x: 0.1, y: 0 };
export const HERO_GRADIENT_END = { x: 0.9, y: 1 };

// Glow defaults taken from `HeroShell`'s props in `hero_shell.tsx`.
export const HERO_GLOW_DEFAULT_COLOR = Colors.dark.gold;
export const HERO_GLOW_DEFAULT_OPACITY = 0.18;

export interface HeroGlowStyleOptions {
  /** Diameter of the glow circle; already `ms()`-scaled by the caller. */
  size: number;
  /** How far the circle sits outside the top-right corner; already `ms()`-scaled by the caller. */
  offset: number;
  color?: string;
  opacity?: number;
}

/** `size` and `offset` are independent per caller; do not derive one from the other. */
export function heroGlowStyle({
  size,
  offset,
  color = HERO_GLOW_DEFAULT_COLOR,
  opacity = HERO_GLOW_DEFAULT_OPACITY,
}: HeroGlowStyleOptions): ViewStyle {
  return {
    position: 'absolute',
    top: -offset,
    right: -offset,
    width: size,
    height: size,
    borderRadius: size / 2,
    backgroundColor: color,
    opacity,
  };
}
