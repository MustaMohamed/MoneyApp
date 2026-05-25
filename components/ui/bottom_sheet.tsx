import { BottomSheetFooter, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
/**
 * bottom_sheet.tsx — HeroUI-backed Sheet primitive.
 *
 * This file is the NEW declarative sheet primitive composing heroui-native's
 * BottomSheet compound component. It replaces the legacy sheet.tsx which
 * drove @gorhom/bottom-sheet imperatively via a ref.
 *
 * CONSUMERS: import from '@/components/ui/bottom_sheet' (Waves 1–4).
 * After Wave 5 (git mv), the canonical path becomes '@/components/ui/sheet'.
 *
 * SCROLLABLE CONTENT RULE:
 * Any scrollable content inside a Sheet must use BottomSheetScrollView or
 * BottomSheetFlatList imported from '@gorhom/bottom-sheet'.
 * Standard RN ScrollView / FlatList will NOT scroll inside a Sheet.
 * Pass scrollable={true} to Sheet to bake the required gorhom props.
 *
 * KEYBOARD INPUTS:
 * Wire useBottomSheetAwareHandlers() onto Input's onFocus/onBlur inside a sheet.
 * Re-exported from this file so callers don't need a direct heroui-native dep.
 *
 * FOOTER:
 * Pass footer={<ReactNode>} for a sticky BottomSheetFooter. Consumers must add
 * SHEET_FOOTER_CLEARANCE as paddingBottom to their scrollable contentContainerStyle.
 *
 * FAB HIDING:
 * This primitive is the SOLE publisher to sheet_visibility.store. The counter
 * increments on open and decrements on close/unmount.
 */
import { BottomSheet } from 'heroui-native';
import React, { useCallback, useEffect } from 'react';

import { Size } from '@/constants/theme';
import { useSheetVisibilityStore } from '@/store/sheet_visibility.store';
import { ms } from '@/utils/responsive';

export { useBottomSheetAwareHandlers } from 'heroui-native';

/**
 * SHEET_FOOTER_CLEARANCE — paddingBottom consumers must add to scrollable
 * contentContainerStyle when passing a footer prop.
 *
 * Value: Size.ctaHeight (ms(52)) + ms(48) — same as the legacy sheet.tsx.
 * See the legacy file's comment for the full breakdown.
 */
export const SHEET_FOOTER_CLEARANCE = Size.ctaHeight + ms(48);

const SNAP_POINTS: Record<'sm' | 'md' | 'lg', string[]> = {
  sm: ['50%'],
  md: ['75%'],
  // 92% rather than 85%: sheets sit inside <Screen> which loses ~80px to
  // safe area + Stack header; 85% felt cramped on tall-status-bar devices.
  lg: ['92%'],
};

/** Pure resolver — exported for unit testing in sheet_snap_points.test.ts */
export function resolveSnapPoints(
  size: SheetProps['size'],
  snapPoints: SheetProps['snapPoints'],
): string[] {
  return snapPoints ?? SNAP_POINTS[size ?? 'lg'];
}

export interface SheetProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  /**
   * Preset size. Resolves to snapPoints via SNAP_POINTS map.
   * Overridden by explicit snapPoints prop.
   */
  size?: 'sm' | 'md' | 'lg';
  /**
   * Explicit snap points. Overrides size when provided.
   * Pass gorhom-style string values: ['50%'], ['45%', '92%'], etc.
   */
  snapPoints?: string[];
  /**
   * Opt-in scrollable mode. When true, bakes:
   *   enableOverDrag={false}
   *   enableDynamicSizing={false}
   *   contentContainerClassName="h-full"
   * Children must use BottomSheetScrollView / BottomSheetFlatList
   * from @gorhom/bottom-sheet — not react-native ScrollView.
   */
  scrollable?: boolean;
  /**
   * Sticky footer rendered via gorhom footerComponent.
   * Consumers must add SHEET_FOOTER_CLEARANCE as paddingBottom to
   * their scrollable contentContainerStyle.
   */
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function Sheet({
  isOpen,
  onOpenChange,
  title,
  size,
  snapPoints,
  scrollable = false,
  footer,
  children,
}: SheetProps) {
  const resolvedSnapPoints = resolveSnapPoints(size, snapPoints);
  const increment = useSheetVisibilityStore((s) => s.increment);
  const decrement = useSheetVisibilityStore((s) => s.decrement);

  // FAB-hide: increment on open, decrement on close or unmount-while-open.
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
          <React.Fragment>{footer}</React.Fragment>
        </BottomSheetFooter>
      ) : null,
    [footer],
  );

  return (
    <BottomSheet isOpen={isOpen} onOpenChange={onOpenChange}>
      <BottomSheet.Portal>
        <BottomSheet.Overlay />
        <BottomSheet.Content
          snapPoints={resolvedSnapPoints}
          enableDynamicSizing={false}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          enablePanDownToClose
          backgroundClassName="bg-surface"
          handleIndicatorClassName="bg-border"
          {...(scrollable
            ? {
                enableOverDrag: false,
                contentContainerClassName: 'h-full',
              }
            : {})}
          {...(footer !== undefined ? { footerComponent: renderFooter } : {})}
        >
          {title !== undefined && (
            <>
              <BottomSheet.Close />
              <BottomSheet.Title>{title}</BottomSheet.Title>
            </>
          )}
          {children}
        </BottomSheet.Content>
      </BottomSheet.Portal>
    </BottomSheet>
  );
}
