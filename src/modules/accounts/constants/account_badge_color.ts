import { HERO_GRADIENT_COLORS } from '@/components/ui/hero_gradient';
import { CoreTokens } from '@/constants/theme_tokens';

import { contrastRatio } from './account_palette';

export interface AccountBadgeColors {
  fill: string;
  foreground: string;
}

// The badge's shipped fill alpha (`status_badge.tsx`), composited so the tested fill is the painted one.
const FILL_ALPHA = 0x22 / 255;
// The hero gradient's middle stop, the one the badge sits on; the glow tints the top-right corner above it.
const FILL_BACKDROP = HERO_GRADIENT_COLORS[1];
// The frames' badge foreground: 55% account colour into the text colour, stepped down until it clears.
const FOREGROUND_COLOR_SHARE = 0.55;
const FOREGROUND_SHARE_STEP = 0.05;
export const BADGE_TEXT_MIN_CONTRAST = 4.5;

export interface BadgeColorsInput {
  tone: string;
  /** What the badge sits on; the fill is composited over it. */
  backdrop: string;
  fillShare: number;
  /** The foreground's colour before it steps toward the text colour; the tone when omitted. */
  ink?: string;
  /** The ink's share of the foreground at the first step. */
  inkShare: number;
}

function channels(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Channel mix of `a` into `b`, `shareOfA` from 0 to 1, as an uppercase #RRGGBB. */
export function mixHex(a: string, b: string, shareOfA: number): string {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const blend = (x: number, y: number): string =>
    Math.round(x * shareOfA + y * (1 - shareOfA))
      .toString(16)
      .padStart(2, '0');
  return `#${blend(ar, br)}${blend(ag, bg)}${blend(ab, bb)}`.toUpperCase();
}

/** An opaque badge fill and the foreground that clears 4.5:1 on it, the ink stepped toward the text colour. */
export function resolveBadgeColors({
  tone,
  backdrop,
  fillShare,
  ink = tone,
  inkShare,
}: BadgeColorsInput): AccountBadgeColors {
  const fill = mixHex(tone, backdrop, fillShare);
  const stepCount = Math.ceil(inkShare / FOREGROUND_SHARE_STEP);
  for (let step = 0; step <= stepCount; step += 1) {
    const share = Math.max(0, inkShare - step * FOREGROUND_SHARE_STEP);
    const foreground = mixHex(ink, CoreTokens.text1, share);
    if (contrastRatio(fill, foreground) >= BADGE_TEXT_MIN_CONTRAST) return { fill, foreground };
  }
  return { fill, foreground: CoreTokens.text1 };
}

/** The type badge's opaque fill and the foreground that clears 4.5:1 on it, for any account colour. */
export function resolveAccountBadgeColors(color: string): AccountBadgeColors {
  return resolveBadgeColors({
    tone: color,
    backdrop: FILL_BACKDROP,
    fillShare: FILL_ALPHA,
    inkShare: FOREGROUND_COLOR_SHARE,
  });
}
