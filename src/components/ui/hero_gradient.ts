import type { ViewStyle } from 'react-native';

import { Colors } from '@/constants/theme';

/**
 * The hero-card gradient + corner-glow treatment, shared by every surface
 * that paints it: `HeroShell` (five consumers — dashboard, commitments,
 * transactions, accounts, budget), the account-type grid's selected tile,
 * and the dashboard's `TotalBalanceStrip`. Extracted post-MA-009
 * (debt:quality #228, quality review Q2): MA-009's plan decision 7
 * deliberately duplicated this rather than touching `HeroShell`'s five
 * out-of-scope consumers, and that trade was right at the time — this
 * module removes the duplication it left behind without moving
 * `HeroShell`'s public API or any of its callers.
 */

/** The three-stop diagonal gradient every hero card and the selected type tile paint. */
export const HERO_GRADIENT_COLORS = [
  Colors.shared.heroGrad1,
  Colors.shared.heroGrad2,
  Colors.shared.heroGrad3,
] as const;

export const HERO_GRADIENT_START = { x: 0.1, y: 0 };
export const HERO_GRADIENT_END = { x: 0.9, y: 1 };

/** `HeroShell`'s own historical prop defaults (`hero_shell.tsx`) — the single source every glow consumer now reads instead of restating them as literals. */
export const HERO_GLOW_DEFAULT_COLOR = Colors.dark.gold;
export const HERO_GLOW_DEFAULT_OPACITY = 0.18;

export interface HeroGlowStyleOptions {
  /** Diameter of the glow circle — already `ms()`-scaled by the caller. */
  size: number;
  /** How far the circle sits outside the top-right corner — already `ms()`-scaled by the caller. */
  offset: number;
  color?: string;
  opacity?: number;
}

/**
 * The absolutely-positioned corner-glow circle — `HeroShell`'s own formula
 * (its inline `View` style), parameterised so every consumer gets
 * pixel-identical output for its own size/offset rather than a shared ratio
 * that would move an existing glow. `size` and `offset` are independent per
 * caller and neither is derivable from the other: `HeroShell` ships
 * `ms(160)`/`ms(40)` (ratio 4), the account-type tile ships `ms(74)`/`ms(22)`
 * (ratio ~3.36) — deriving `offset` from `size` would have silently moved
 * one of the two.
 */
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
