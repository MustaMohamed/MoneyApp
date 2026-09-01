// Scrollable content in a Sheet must use `BottomSheetScrollView`; RN `ScrollView` will not scroll.
import { BottomSheetFooter, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { BottomSheet } from 'heroui-native';
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { useSheetVisibilityStore } from '@/store/sheet_visibility.store';
import { ms } from '@/utils/responsive';

import {
  createSheetCloseLifecycle,
  settleSheetCloseLifecycle,
  syncSheetCloseLifecycle,
} from './sheet_close_lifecycle';

// Keyboard inputs: wire this onto an `Input`'s `onFocus`/`onBlur` inside a sheet.
export { useBottomSheetAwareHandlers } from 'heroui-native';

/** `paddingBottom` a consumer must add to scrollable content when passing a `footer`. */
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
  /** Pass a bare CTA; the shell adds bg, hairline, and padding, so do not pad it again. */
  footer?: React.ReactNode;
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
  footer,
  children,
}: SheetProps) {
  const increment = useSheetVisibilityStore((s) => s.increment);
  const decrement = useSheetVisibilityStore((s) => s.decrement);
  const insets = useSafeAreaInsets();
  const closeLifecycleRef = useRef(createSheetCloseLifecycle(isOpen));
  closeLifecycleRef.current = syncSheetCloseLifecycle(closeLifecycleRef.current, isOpen);

  const handleSheetIndexChange = useCallback(
    (index: number) => {
      const settlement = settleSheetCloseLifecycle(closeLifecycleRef.current, index);
      closeLifecycleRef.current = settlement.lifecycle;
      if (settlement.shouldComplete) onCloseComplete?.();
    },
    [onCloseComplete],
  );

  // FAB-hide: this primitive is the sole publisher to `sheet_visibility.store`.
  useEffect(() => {
    if (isOpen) {
      increment();
      return () => {
        decrement();
      };
    }
    return undefined;
  }, [isOpen, increment, decrement]);

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      footer !== undefined ? (
        <BottomSheetFooter {...props}>
          <View
            testID="sheet-footer"
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
  const contentSizingProps = fitContent
    ? {
        enableDynamicSizing: true as const,
        contentContainerProps: { style: { padding: 0 } } as const,
      }
    : {
        snapPoints: resolveSnapPoints(size, snapPoints),
        enableDynamicSizing: false as const,
        contentContainerProps: { style: { padding: 0 } } as const,
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
        <BottomSheet.Content
          {...contentSizingProps}
          onChange={handleSheetIndexChange}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
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
                  color: Colors.dark.text1,
                }}
              >
                {title}
              </BottomSheet.Title>
              <BottomSheet.Close
                testID="sheet-close-btn"
                isDisabled={!isDismissable}
                iconProps={{ size: ms(24), color: Colors.dark.text2 }}
              />
            </View>
          )}
          {children}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
