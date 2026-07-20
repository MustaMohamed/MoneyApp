/**
 * sheet.tsx — HeroUI-backed Sheet primitive.
 *
 * The declarative sheet primitive composing heroui-native's BottomSheet
 * compound component. This is the sole sheet primitive in the app; the
 * former imperative @gorhom-ref wrapper no longer exists.
 *
 * CONSUMERS: import from '@/components/ui/sheet'.
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
 * The footer SHELL (see renderFooter) supplies the surface bg, top hairline,
 * horizontal padding, and safe-area bottom inset — so pass a BARE CTA (or a
 * layout-only flex-row of CTAs). Do NOT add your own px/pt/pb to the footer
 * node or it double-pads against the shell.
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
 * SIZE PRESETS (7-step scale, user-defined):
 * xxs=25%, xs=35%, sm=45%, md=60%, lg=75%, xl=85%, xxl=95%
 * Default size is lg (75%). Consumers select a preset via the `size` prop.
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
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Colors, FontFamily, Size, Spacing, Type } from '@/constants/theme';
import { useSheetVisibilityStore } from '@/store/sheet_visibility.store';
import { ms } from '@/utils/responsive';

export { useBottomSheetAwareHandlers } from 'heroui-native';

/**
 * SHEET_FOOTER_CLEARANCE — paddingBottom consumers must add to scrollable
 * contentContainerStyle when passing a footer prop.
 *
 * Value: Size.ctaHeight (ms(52)) + ms(72) — accounts for the safe-area-aware
 * footer chrome (separator, paddingTop, paddingBottom with inset).
 * See the legacy file's comment for the full breakdown.
 */
export const SHEET_FOOTER_CLEARANCE = Size.ctaHeight + ms(72);

/**
 * Size presets (7-step scale, user-defined heights).
 *
 * xxs  25%  — compact confirm/alert sheets
 * xs   35%  — small pickers / short lists
 * sm   45%  — under half-screen
 * md   60%  — over half-screen
 * lg   75%  — tall (default)
 * xl   85%  — near-full
 * xxl  95%  — full-bleed (leaves a sliver at top)
 */
const SHEET_SIZES = ['xxs', 'xs', 'sm', 'md', 'lg', 'xl', 'xxl'] as const;
type SheetSize = (typeof SHEET_SIZES)[number];

/** Size preset → snap percentage (7-step scale, user-defined). */
const SIZE_PCT: Record<SheetSize, string> = {
  xxs: '25%',
  xs: '35%',
  sm: '45%',
  md: '60%',
  lg: '75%',
  xl: '85%',
  xxl: '95%',
};

/**
 * A single snap stop. Either a size preset token ('sm' → '45%'), a raw
 * percentage string ('45%'), or a pixel number.
 */
export type SnapPoint = SheetSize | `${number}%` | number;

function isSheetSize(p: SnapPoint): p is SheetSize {
  return typeof p === 'string' && (SHEET_SIZES as readonly string[]).includes(p);
}

/** Map one snap stop: size token → percentage; raw %/pixel pass through. */
function resolveSnapPoint(p: SnapPoint): string | number {
  return isSheetSize(p) ? SIZE_PCT[p] : p;
}

/** Pure resolver — exported for unit testing in sheet_snap_points.test.ts */
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
  /**
   * Preset size. Resolves to snapPoints via SIZE_PCT map.
   * Overridden by explicit snapPoints prop.
   * Ignored when fitContent=true.
   *
   * 7-step scale: xxs=25%, xs=35%, sm=45%, md=60%, lg=75%, xl=85%, xxl=95%
   * Default: lg (75%).
   */
  size?: SheetSize;
  /**
   * Explicit snap points. Overrides size when provided.
   * Pass size tokens (['sm','xl']), raw percentages (['45%','92%']), or pixel numbers.
   * Ignored when fitContent=true.
   */
  snapPoints?: SnapPoint[];
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
   * Whether the user can dismiss the sheet through the overlay, pan-down
   * gesture, or header close button. Defaults to true.
   */
  isDismissable?: boolean;
  /**
   * Sticky footer rendered via gorhom footerComponent. Pass a BARE CTA — the
   * footer shell adds surface bg, top hairline, horizontal padding, and a
   * safe-area bottom inset. Do NOT wrap it in your own px/pt/pb (double-pads).
   * Consumers must add SHEET_FOOTER_CLEARANCE as paddingBottom to their
   * scrollable contentContainerStyle.
   */
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
  const previousIsOpenRef = useRef(isOpen);
  const closePendingRef = useRef(false);

  useEffect(() => {
    const wasOpen = previousIsOpenRef.current;
    previousIsOpenRef.current = isOpen;
    if (wasOpen && !isOpen) closePendingRef.current = true;
    if (isOpen) closePendingRef.current = false;
  }, [isOpen]);

  const handleSheetIndexChange = useCallback(
    (index: number) => {
      if (index !== -1 || !closePendingRef.current) return;
      closePendingRef.current = false;
      onCloseComplete?.();
    },
    [onCloseComplete],
  );

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
          <View
            testID="sheet-footer"
            style={{
              backgroundColor: Colors.dark.surface,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: Colors.dark.border,
              paddingTop: Spacing.xs,
              paddingHorizontal: Spacing.md,
              // Safe-area-aware: lift the CTA off the screen's bottom gesture
              // bar (min Spacing.lg breathing room when no inset). Restores the
              // footer chrome the legacy sheet.tsx had — the new primitive had
              // dropped it, leaving the CTA flush against the screen edge.
              paddingBottom: Math.max(insets.bottom, Spacing.lg),
            }}
          >
            {footer}
          </View>
        </BottomSheetFooter>
      ) : null,
    [footer, insets.bottom],
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
