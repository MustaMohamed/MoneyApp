import type { BottomSheet } from 'heroui-native';
import type React from 'react';
import type { TextInput } from 'react-native';

import { Size } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import type { SheetProps } from './sheet';
import type { SheetCloseLifecycle } from './sheet_close_lifecycle';

/** `paddingBottom` a consumer adds to scrollable content under a `footer`; a scrollable sheet that lifts above the keyboard ends its content at the footer and takes none. */
export const SHEET_FOOTER_CLEARANCE = Size.ctaHeight + ms(72);

const SHEET_SIZES = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const;
export type SheetSize = (typeof SHEET_SIZES)[number];

/** Above font scale 1 a sheet that cannot scroll takes `aboveOne`, or the next size up, so no content sits under its footer. */
export function resolveSheetSizeAboveOne(
  size: SheetSize,
  fontScale: number,
  aboveOne?: SheetSize,
): SheetSize {
  if (fontScale <= 1) return size;
  if (aboveOne !== undefined) return aboveOne;
  return SHEET_SIZES[Math.min(SHEET_SIZES.indexOf(size) + 1, SHEET_SIZES.length - 1)];
}

const SIZE_PCT: Record<SheetSize, string> = {
  xxs: '25%',
  xs: '35%',
  sm: '45%',
  md: '60%',
  lg: '75%',
  xl: '85%',
  xxl: '95%',
};

export type SnapPoint = SheetSize | `${number}%` | number;

function isSheetSize(p: SnapPoint): p is SheetSize {
  return typeof p === 'string' && (SHEET_SIZES as readonly string[]).includes(p);
}

function resolveSnapPoint(p: SnapPoint): string | number {
  return isSheetSize(p) ? SIZE_PCT[p] : p;
}

export function resolveSnapPoints(
  size: SheetProps['size'],
  snapPoints: SheetProps['snapPoints'],
): (string | number)[] {
  if (snapPoints !== undefined) return snapPoints.map(resolveSnapPoint);
  return [SIZE_PCT[size ?? 'lg']];
}

// A JSX spread has no excess-property check, so the resolvers pick their keys from Content's props and a renamed key fails typecheck.
type SheetContentProps = React.ComponentProps<typeof BottomSheet.Content>;

// gorhom skips its own keyboard compensation under `adjustResize`, so a footer sheet must claim `adjustPan`.
export function resolveKeyboardProps(
  liftsAboveKeyboard: boolean,
): Pick<
  SheetContentProps,
  'keyboardBehavior' | 'keyboardBlurBehavior' | 'android_keyboardInputMode'
> {
  return {
    keyboardBehavior: 'interactive',
    keyboardBlurBehavior: 'restore',
    android_keyboardInputMode: liftsAboveKeyboard ? 'adjustPan' : 'adjustResize',
  } as const;
}

// `currentlyFocusedInput()` is typed non-null and returns `null` while no field holds focus.
export type FocusedInput = ReturnType<typeof TextInput.State.currentlyFocusedInput> | null;

interface BlurInputOnCloseInput {
  liftsAboveKeyboard: boolean;
  blursInputOnClose: boolean;
  /** The input that held focus when the sheet opened. */
  focusedAtOpen: FocusedInput;
  /** The input that holds focus as the sheet closes. */
  focusedNow: FocusedInput;
}

/** A closing sheet that passes either flag blurs the input that took focus while it was open, and leaves one that held focus before it opened. */
export function shouldBlurInputOnClose({
  liftsAboveKeyboard,
  blursInputOnClose,
  focusedAtOpen,
  focusedNow,
}: BlurInputOnCloseInput): boolean {
  if (!liftsAboveKeyboard && !blursInputOnClose) return false;
  return focusedNow !== null && focusedNow !== focusedAtOpen;
}

interface SheetContentPaddingInput {
  fitContent: boolean;
  scrollable: boolean;
  hasFooter: boolean;
  liftsAboveKeyboard: boolean;
  footerHeight: number;
}

/** The measured footer is the bottom padding of a fitContent sheet and of a scrollable sheet that lifts; a scrollable sheet that does not lift takes the excess of a footer taller than `SHEET_FOOTER_CLEARANCE`; every other sheet keeps HeroUI's own bottom inset. */
export function resolveSheetContentPadding({
  fitContent,
  scrollable,
  hasFooter,
  liftsAboveKeyboard,
  footerHeight,
}: SheetContentPaddingInput): { padding: 0; paddingBottom?: number } {
  if (fitContent) return { padding: 0, paddingBottom: hasFooter ? footerHeight : 0 };
  if (scrollable && hasFooter && liftsAboveKeyboard) {
    return { padding: 0, paddingBottom: footerHeight };
  }
  if (scrollable && hasFooter && footerHeight > SHEET_FOOTER_CLEARANCE) {
    return { padding: 0, paddingBottom: footerHeight - SHEET_FOOTER_CLEARANCE };
  }
  return { padding: 0 };
}

/** A sheet never opened, or one whose close has settled, draws nothing and takes no touch; any other passes touches through as HeroUI's portal view does. */
export function resolveSheetClosedAtRestProps(lifecycle: SheetCloseLifecycle): {
  opacity: 0 | 1;
  pointerEvents: 'none' | 'box-none';
} {
  if (!lifecycle.isOpen && !lifecycle.hasOpened) return { opacity: 0, pointerEvents: 'none' };
  return { opacity: 1, pointerEvents: 'box-none' };
}

const SHEET_CLOSING_FAIL_OFFSET: [number, number] = [-1, 1];

/** A sheet whose close is in flight fails every drag before it starts, so the close runs to its end; any other sends no offsets. */
export function resolveSheetCloseGestureProps(
  lifecycle: SheetCloseLifecycle,
): Pick<SheetContentProps, 'failOffsetX' | 'failOffsetY'> {
  if (lifecycle.isOpen || !lifecycle.hasOpened) return {};
  return { failOffsetX: SHEET_CLOSING_FAIL_OFFSET, failOffsetY: SHEET_CLOSING_FAIL_OFFSET };
}
