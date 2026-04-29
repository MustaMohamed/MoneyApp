import { Dimensions, PixelRatio } from 'react-native';

/**
 * Responsive sizing helpers.
 *
 * The design tokens in `constants/theme.ts` are specified at the iPhone 14
 * point width (390pt). On other devices we scale linearly with the device
 * width, clamped to a sensible range so iPads and very small phones don't
 * drift into giant- or microscopic-text territory.
 */

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BASE_WIDTH = 390;

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

const SCALE = clamp(SCREEN_WIDTH / BASE_WIDTH, 0.85, 1.15);

/** Scale a px/pt design value linearly with screen width. Returns an integer. */
export function ms(n: number): number {
  return Math.round(n * SCALE);
}

/** Scale a font size and snap to the nearest physical pixel for crisp rendering. */
export function msFont(n: number): number {
  return PixelRatio.roundToNearestPixel(n * SCALE);
}

/** Raw scale factor (e.g. 0.92 on a small phone, 1.10 on a Pro Max). Exposed for edge cases. */
export const responsiveScale = SCALE;
