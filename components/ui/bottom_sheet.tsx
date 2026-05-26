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
 *
 * HEADER LAYOUT:
 * When `title` is provided, renders a compact ROW: title (flex:1, Sora semibold,
 * subhead) on the LEFT and BottomSheet.Close on the RIGHT.
 * BottomSheet.Close is used WITHOUT asChild — its default render is a working
 * CloseButton (Button variant="tertiary" size="sm" isIconOnly) that calls
 * onOpenChange(false) internally via the BottomSheetClose forwardRef in
 * node_modules/heroui-native/src/components/bottom-sheet/bottom-sheet.tsx.
 * Using asChild caused "Invalid asChild element" + Reanimated host-instance
 * crashes because CloseButton renders multiple animated layers that Slot.Pressable
 * cannot clone as a single host child.
 * BottomSheet.Title is kept so the `nativeID={id}_label` accessibility linkage
 * remains intact; its default className is overridden to match legacy styling.
 *
 * SIZE PRESETS (7-step scale):
 * xxs=25%, xs=40%, sm=50%, md=75%, lg=92%, xl=96%, xxl=100%
 * Existing sm/md/lg values are unchanged — in-flight consumers are device-QA gated.
 * xxl=100% is full-bleed; device QA should verify it does not obscure the status bar.
 *
 * CONTENT PADDING (QA fix):
 * HeroUI's contentContainer tv() base includes `p-5` (20 px on all sides).
 * Under Uniwind, class-merge precedence is not guaranteed — a className override
 * like `p-0` may or may not win. Instead we use the deterministic
 * `contentContainerProps={{ style: { padding: 0 } }}` on EVERY sheet variant
 * (scrollable and non-scrollable). Consumers are responsible for their own
 * padding (paddingHorizontal: Spacing.md, paddingBottom, etc.) exactly as they
 * were under the legacy sheet. No safe-area bottom inset is added — all
 * consumers already add their own paddingBottom.
 */
import { BottomSheetFooter, type BottomSheetFooterProps } from '@gorhom/bottom-sheet';
import { BottomSheet } from 'heroui-native';
import React, { useCallback, useEffect } from 'react';
import { View } from 'react-native';

import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
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

/**
 * Size presets (7-step scale). Existing sm/md/lg values are frozen — in-flight
 * consumers are device-QA gated on these exact heights.
 *
 * xxs  25%  — compact confirm/alert sheets
 * xs   40%  — small pickers / short lists
 * sm   50%  — half-screen (legacy, unchanged)
 * md   75%  — three-quarter (legacy, unchanged)
 * lg   92%  — tall (legacy, unchanged; 92% > 85% — fits tall-status-bar devices)
 * xl   96%  — near-full without status bar overlap
 * xxl  100% — full-bleed; device QA should verify status bar clearance
 */
const SNAP_POINTS: Record<'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl', string[]> = {
  xxs: ['25%'],
  xs: ['40%'],
  sm: ['50%'],
  md: ['75%'],
  lg: ['92%'],
  xl: ['96%'],
  xxl: ['100%'],
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
   * Ignored when fitContent=true.
   *
   * 7-step scale: xxs=25%, xs=40%, sm=50%, md=75%, lg=92%, xl=96%, xxl=100%
   * Default: lg (92%).
   */
  size?: 'xxs' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'xxl';
  /**
   * Explicit snap points. Overrides size when provided.
   * Pass gorhom-style string values: ['50%'], ['45%', '92%'], etc.
   * Ignored when fitContent=true.
   */
  snapPoints?: string[];
  /**
   * Opt-in scrollable mode. When true, bakes:
   *   enableOverDrag={false}
   *   enableDynamicSizing={false}
   *   contentContainerClassName="h-full"
   * Children must use BottomSheetScrollView / BottomSheetFlatList
   * from @gorhom/bottom-sheet — not react-native ScrollView.
   *
   * Mutually exclusive with fitContent. If both are passed, fitContent
   * wins — a content-hugging sheet has no bounded height to scroll inside.
   */
  scrollable?: boolean;
  /**
   * Content-hug mode. When true, the sheet sizes to exactly its content
   * height with no fixed snap point (gorhom enableDynamicSizing=true,
   * snapPoints omitted). Ideal for confirm/alert sheets whose content
   * height is well-defined and small.
   *
   * DEFAULT: false — all other sheets use the fixed sm/md/lg snap
   * contract to prevent content-height drift.
   *
   * Mutually exclusive with scrollable (scrollable needs a bounded
   * parent height; fitContent removes that bound). fitContent wins.
   */
  fitContent?: boolean;
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
  fitContent = false,
  footer,
  children,
}: SheetProps) {
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

  // fitContent mode: enableDynamicSizing=true, snapPoints omitted — gorhom
  // sizes the sheet to its content height. scrollable is incompatible (needs
  // a bounded parent) so it is ignored when fitContent is true.
  //
  // contentContainerProps.style.padding = 0 on ALL variants:
  // HeroUI's contentContainer tv() base bakes in `p-5` (20 px). Overriding
  // via className is unreliable under Uniwind's compile-time class-merge.
  // A style prop is deterministic and wins unconditionally. Consumers own
  // their own horizontal / bottom padding — same contract as legacy sheet.
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
        <BottomSheet.Overlay />
        <BottomSheet.Content
          {...contentSizingProps}
          keyboardBehavior="interactive"
          keyboardBlurBehavior="restore"
          android_keyboardInputMode="adjustResize"
          enablePanDownToClose
          backgroundClassName="bg-surface"
          handleIndicatorClassName="bg-border"
          {...(footer !== undefined ? { footerComponent: renderFooter } : {})}
        >
          {title !== undefined && (
            // Compact header ROW: title (flex:1) LEFT · BottomSheet.Close RIGHT.
            // BottomSheet.Close is used WITHOUT asChild — its default render is
            // a CloseButton (Button variant="tertiary" size="sm" isIconOnly) that
            // calls onOpenChange(false) via its onPress handler in BottomSheetClose
            // (heroui-native/src/components/bottom-sheet/bottom-sheet.tsx).
            // Using asChild caused "Invalid asChild element" crashes because
            // CloseButton renders multiple animated layers that Slot.Pressable
            // cannot clone as a single host child, and the resulting empty animated
            // node triggered a Reanimated host-instance error on unmount.
            // BottomSheet.Title preserves the nativeID={id}_label a11y linkage.
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
