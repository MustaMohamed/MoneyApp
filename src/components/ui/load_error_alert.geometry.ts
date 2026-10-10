import type { ButtonSize } from 'heroui-native';

import { resolveSmallButtonHeight } from '@/components/ui/button.geometry';
import { TOUCH_SLOP_PIXEL_MARGIN, touchFloorSlop } from '@/constants/theme';

export type LoadErrorAlertMode = 'fill' | 'inline' | 'floating' | 'bare';

export type LoadErrorAlertTone = 'plain' | 'tint' | 'tintOverSurface';

/** A floating alert lies over a screen's rows, so its tint needs the surface under it. */
export function resolveLoadErrorAlertTone(
  mode: LoadErrorAlertMode,
  tinted: boolean,
): LoadErrorAlertTone {
  if (!tinted) return 'plain';
  return mode === 'floating' ? 'tintOverSurface' : 'tint';
}

export interface LoadErrorRetryHitSlop {
  top: number;
  bottom: number;
}

/** Only the `sm` retry is drawn under the touch floor; `md` already stands above it. */
export function resolveLoadErrorRetryHitSlop(
  retrySize: ButtonSize,
  fontScale: number,
  tinted: boolean,
): LoadErrorRetryHitSlop | undefined {
  if (!tinted || retrySize !== 'sm') return undefined;
  const slop = touchFloorSlop(resolveSmallButtonHeight(fontScale)) + TOUCH_SLOP_PIXEL_MARGIN;
  return { top: slop, bottom: slop };
}
