import { Dimensions, PixelRatio } from 'react-native';

// Tokens in `constants/theme.ts` are authored at the iPhone 14 width (390pt) and scale from it.

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

/** Raw scale factor: 0.92 on a small phone, 1.10 on a Pro Max. */
export const responsiveScale = SCALE;
