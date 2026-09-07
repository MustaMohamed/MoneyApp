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
const FOREGROUND_STEP_COUNT = Math.ceil(FOREGROUND_COLOR_SHARE / FOREGROUND_SHARE_STEP);
const MIN_CONTRAST_RATIO = 4.5;

function channels(hex: string): [number, number, number] {
  const n = Number.parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

/** Channel mix of `a` into `b`; exported so a test derives the frames' mix from the tokens instead of mirroring its hex. */
export function mixHex(a: string, b: string, shareOfA: number): string {
  const [ar, ag, ab] = channels(a);
  const [br, bg, bb] = channels(b);
  const blend = (x: number, y: number): string =>
    Math.round(x * shareOfA + y * (1 - shareOfA))
      .toString(16)
      .padStart(2, '0');
  return `#${blend(ar, br)}${blend(ag, bg)}${blend(ab, bb)}`.toUpperCase();
}

/** The type badge's opaque fill and the foreground that clears 4.5:1 on it, for any account colour. */
export function resolveAccountBadgeColors(color: string): AccountBadgeColors {
  const fill = mixHex(color, FILL_BACKDROP, FILL_ALPHA);
  for (let step = 0; step <= FOREGROUND_STEP_COUNT; step += 1) {
    const share = Math.max(0, FOREGROUND_COLOR_SHARE - step * FOREGROUND_SHARE_STEP);
    const foreground = mixHex(color, CoreTokens.text1, share);
    if (contrastRatio(fill, foreground) >= MIN_CONTRAST_RATIO) return { fill, foreground };
  }
  return { fill, foreground: CoreTokens.text1 };
}
