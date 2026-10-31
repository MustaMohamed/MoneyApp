import type { ButtonSize } from 'heroui-native';

import { resolveSmallButtonHeight } from '@/components/ui/button.geometry';
import type { LoadErrorAlertProps } from '@/components/ui/load_error_alert';
import { Spacing, type TouchFloorHitSlop, touchFloorHitSlop } from '@/constants/theme';

type LoadErrorAlertMode = 'fill' | 'inline' | 'floating' | 'bare';

export type LoadErrorAlertTone = 'plain' | 'tint' | 'tintOverSurface';

// `satisfies`, since the JSX spread these reach the alert through runs no excess-key check.
export const TAB_FLOATING_ALERT_PROPS = {
  mode: 'floating',
  floatingOffset: 'tabBar',
  tinted: true,
  flatRetry: true,
} satisfies Partial<Extract<LoadErrorAlertProps, { mode: 'floating' }>>;

/** A floating alert lies over a screen's rows, so its tint needs the surface under it. */
export function resolveLoadErrorAlertTone(
  mode: LoadErrorAlertMode,
  tinted: boolean,
): LoadErrorAlertTone {
  if (!tinted) return 'plain';
  return mode === 'floating' ? 'tintOverSurface' : 'tint';
}

/** Only the `sm` retry is drawn under the touch floor; `md` already stands above it. */
export function resolveLoadErrorRetryHitSlop(
  retrySize: ButtonSize,
  fontScale: number,
): TouchFloorHitSlop | undefined {
  if (retrySize !== 'sm') return undefined;
  return touchFloorHitSlop(resolveSmallButtonHeight(fontScale));
}

/** The toast's bottom inset that leaves the frames' gap above a floating alert's top edge. */
export function resolveFloatingAlertToastClearance(windowHeight: number, alertTop: number): number {
  return windowHeight - alertTop + Spacing.xs;
}
