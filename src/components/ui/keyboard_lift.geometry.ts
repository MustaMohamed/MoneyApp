import type { PlatformOSType } from 'react-native';

/** Android's IME height already excludes the navigation bar `Screen` pads, so only iOS subtracts the inset. */
export function resolveKeyboardLift(
  platform: PlatformOSType,
  keyboardHeight: number,
  bottomInset: number,
): number {
  const lift = platform === 'android' ? keyboardHeight : keyboardHeight - bottomInset;
  return Math.max(lift, 0);
}
