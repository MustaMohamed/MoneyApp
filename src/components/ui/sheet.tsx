// Scrollable content in a Sheet must use `BottomSheetScrollView`; RN `ScrollView` will not scroll.
import { BottomSheetFooter, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { BottomSheet } from 'heroui-native';
import React, { useCallback, useEffect, useState } from 'react';
import { Keyboard, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { useSheetVisibilityStore } from '@/store/sheet_visibility.store';
import { ms } from '@/utils/responsive';

import { useSheetCloseLifecycle } from './sheet.hook';
import type { SheetCloseLifecycle } from './sheet_close_lifecycle';

// Keyboard inputs: wire this onto an `Input`'s `onFocus`/`onBlur` inside a sheet.
export { useBottomSheetAwareHandlers } from 'heroui-native';

/** `paddingBottom` a consumer adds to scrollable content under a `footer`; a scrollable sheet that lifts above the keyboard ends its content at the footer and takes none. */
export const SHEET_FOOTER_CLEARANCE = Size.ctaHeight + ms(72);

const SHEET_SIZES = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const;
type SheetSize = (typeof SHEET_SIZES)[number];

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

// gorhom skips its own keyboard compensation under `adjustResize`, so a footer sheet must claim `adjustPan`.
export function resolveKeyboardProps(liftsAboveKeyboard: boolean) {
  return {
    keyboardBehavior: 'interactive',
    keyboardBlurBehavior: 'restore',
    android_keyboardInputMode: liftsAboveKeyboard ? 'adjustPan' : 'adjustResize',
  } as const;
}

interface SheetContentPaddingInput {
  fitContent: boolean;
  scrollable: boolean;
  hasFooter: boolean;
  liftsAboveKeyboard: boolean;
  footerHeight: number;
}

/** The measured footer is the bottom padding of a fitContent sheet and of a scrollable sheet that lifts; every other sheet keeps HeroUI's own bottom inset. */
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

export interface SheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a previously open sheet settles at its closed index. */
  onCloseComplete?: () => void;
  title?: string;
  /** Preset height; `snapPoints` overrides it and `fitContent` ignores it. Defaults to lg. */
  size?: SheetSize;
  /** Overrides `size`; ignored when `fitContent` is true. */
  snapPoints?: SnapPoint[];
  /** Children must use gorhom's `BottomSheetScrollView`; `fitContent` wins over this. */
  scrollable?: boolean;
  /** Sizes to content height; mutually exclusive with `scrollable`, and wins over it. */
  fitContent?: boolean;
  /** Gates overlay press, pan-down, and the header close button. Defaults to true. */
  isDismissable?: boolean;
  /** Draws the header close button; overlay press and pan-down still follow `isDismissable`. Defaults to true. */
  showCloseButton?: boolean;
  /** Pass a bare CTA; the shell adds bg, hairline, and padding, so do not pad it again. */
  footer?: React.ReactNode;
  /** Android only: lift the sheet and its footer clear of the keyboard. Set it on any sheet whose `footer` must stay reachable while typing; a `scrollable` sheet with it ends its content at the footer and takes no `SHEET_FOOTER_CLEARANCE`. Assumes the activity does not resize for the IME; re-check this sheet if `app.json` gains `android.softwareKeyboardLayoutMode`. */
  liftsAboveKeyboard?: boolean;
  children: React.ReactNode;
}

export function Sheet({
  isOpen,
  onOpenChange,
  onCloseComplete,
  title,
  size,
  snapPoints,
  scrollable = false,
  fitContent = false,
  isDismissable = true,
  showCloseButton = true,
  footer,
  liftsAboveKeyboard = false,
  children,
}: SheetProps) {
  const increment = useSheetVisibilityStore((s) => s.increment);
  const decrement = useSheetVisibilityStore((s) => s.decrement);
  const insets = useSafeAreaInsets();
  // Measured, not derived: the footer's height is inset- and content-dependent, and gorhom's dynamic sizing does not fully count an absolute footer.
  const [footerHeight, setFooterHeight] = useState(0);
  const { closeLifecycle, handleSheetIndexChange } = useSheetCloseLifecycle(
    isOpen,
    onCloseComplete,
  );
  // Plain View props, which no animated style writes: a sheet closed at rest stays hidden whatever redraws its content.
  const closedAtRestProps = resolveSheetClosedAtRestProps(closeLifecycle);

  // FAB-hide: this primitive is the sole publisher to `sheet_visibility.store`.
  useEffect(() => {
    if (isOpen) {
      increment();
      return () => {
        decrement();
        // `adjustPan` leaves the IME up after a programmatic close; every close path drops `isOpen`.
        if (liftsAboveKeyboard) Keyboard.dismiss();
      };
    }
    return undefined;
  }, [isOpen, increment, decrement, liftsAboveKeyboard]);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      footer !== undefined ? (
        <BottomSheetFooter {...props}>
          <View
            testID="sheet-footer"
            onLayout={(e) => setFooterHeight(e.nativeEvent.layout.height)}
            style={{
              backgroundColor: Colors.dark.surface,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: Colors.dark.border,
              paddingTop: Spacing.xs,
              paddingHorizontal: Spacing.md,
              // Lift the CTA off the bottom gesture bar; `Spacing.lg` when there is no inset.
              paddingBottom: Math.max(insets.bottom, Spacing.lg),
            }}
          >
            {footer}
          </View>
        </BottomSheetFooter>
      ) : null,
    [footer, insets.bottom],
  );

  // HeroUI bakes `p-5` into contentContainer and Uniwind class-merge is unreliable, so use style.
  const contentContainerProps = {
    style: resolveSheetContentPadding({
      fitContent,
      scrollable,
      hasFooter: footer !== undefined,
      liftsAboveKeyboard,
      footerHeight,
    }),
  };
  const contentSizingProps = fitContent
    ? { enableDynamicSizing: true as const, contentContainerProps }
    : {
        snapPoints: resolveSnapPoints(size, snapPoints),
        enableDynamicSizing: false as const,
        contentContainerProps,
        ...(scrollable
          ? {
              enableOverDrag: false,
              contentContainerClassName: 'h-full',
            }
          : {}),
      };

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay isCloseOnPress={isDismissable} />
        <View
          collapsable={false}
          pointerEvents={closedAtRestProps.pointerEvents}
          style={[StyleSheet.absoluteFill, { opacity: closedAtRestProps.opacity }]}
        >
          <BottomSheet.Content
            {...contentSizingProps}
            onChange={handleSheetIndexChange}
            {...resolveKeyboardProps(liftsAboveKeyboard)}
            enablePanDownToClose={isDismissable}
            backgroundClassName="bg-surface"
            handleIndicatorClassName="bg-border"
            {...(footer !== undefined ? { footerComponent: renderFooter } : {})}
          >
            {title !== undefined && (
              // No `asChild`: `CloseButton`'s animated layers crash `Slot.Pressable` and Reanimated.
              <View
                testID="sheet-header"
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: Spacing.md,
                  paddingBottom: Spacing.xs,
                }}
              >
                <BottomSheet.Title
                  className="flex-1"
                  style={{
                    fontFamily: FontFamily.soraSemi,
                    fontSize: Type.subhead,
                    lineHeight: lineHeightFor(Type.subhead),
                    color: Colors.dark.text1,
                  }}
                >
                  {title}
                </BottomSheet.Title>
                {showCloseButton ? (
                  <BottomSheet.Close
                    testID="sheet-close-btn"
                    isDisabled={!isDismissable}
                    iconProps={{ size: ms(24), color: Colors.dark.text2 }}
                  />
                ) : null}
              </View>
            )}
            {children}
          </BottomSheet.Content>
        </View>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
