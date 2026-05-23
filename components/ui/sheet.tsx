import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import BottomSheetLib, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
/**
 * Sheet — declarative bottom sheet primitive.
 *
 * Wraps @gorhom/bottom-sheet. Consumers use a `visible` prop + `onClose` callback.
 * Do NOT use .show() / .hide() imperative refs.
 *
 * SCROLLABLE CONTENT RULE:
 * Any scrollable content inside a Sheet must use BottomSheetScrollView or
 * BottomSheetFlatList imported from '@gorhom/bottom-sheet'.
 * Standard RN ScrollView / FlatList will NOT scroll inside a Sheet —
 * the gesture handler intercepts touch events.
 *
 *   import { BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';
 *
 * SHEET STACKING:
 * Maximum depth 2. A nested sheet should not contain a third sheet.
 *
 * FOOTER BEHAVIOR:
 * The `footer` prop renders as a sticky `BottomSheetFooter` — it stays pinned
 * to the bottom of the sheet even when the body content scrolls.
 */
import React, { useCallback, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { Pressable as GHPressable } from 'react-native-gesture-handler';

import { Text } from '@/components/ui/text';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
// Sheet writes to the global sheet_visibility store on every open/close so the
// FAB (rendered in app/(app)/(tabs)/_layout.tsx, a sibling of <Tabs>) can hide
// while a sheet is up. Sheets are mounted inside route screens; the FAB is
// outside the route. They share no React ancestor we could plumb through, so
// React Context isn't an option here. Sheet is the only place that knows when
// a sheet is open regardless of which screen mounted it — making it the right
// publisher. See store/sheet_visibility.store.ts for the counter contract.
import { useSheetVisibilityStore } from '@/store/sheet_visibility.store';
import { ms } from '@/utils/responsive';

/**
 * SHEET_FOOTER_CLEARANCE — the paddingBottom consumers must add to their
 * scrollable content when they pass a `footer` to Sheet.
 *
 * Why a named export instead of magic in Sheet.Body:
 *   Sheet.Body has no reliable way to inject paddingBottom into an arbitrary
 *   BottomSheetScrollView / BottomSheetFlatList child without fragile React.cloneElement
 *   inspection. Exporting a constant lets consumers compose it explicitly in
 *   contentContainerStyle — simple, typed, and visible at the call site.
 *
 * Value breakdown — matches the footer styles below (`styles.footer`) plus a
 * little breathing room so the last scrollable item never feels glued to the
 * CTA:
 *   Size.ctaHeight (ms(52))         — the primary Button inside the footer
 * + Spacing.xs     (ms(8))          — footer paddingTop
 * + Spacing.lg     (ms(20))         — footer paddingBottom
 * + ms(20)                          — breathing room
 * = Size.ctaHeight + ms(48)         — collapsed for clarity in the expression.
 */
export const SHEET_FOOTER_CLEARANCE = Size.ctaHeight + ms(48);

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  /**
   * Either pick a preset size (sm/md/lg) OR pass explicit `snapPoints` for
   * sheets that need a different stop. Examples of `snapPoints`:
   *   ['40%']            — short, fixed (date range picker, simple confirm)
   *   ['45%', '92%']     — opens compact, user can drag to full (filter accordion)
   * If `snapPoints` is set it overrides `size`.
   */
  size?: 'sm' | 'md' | 'lg';
  snapPoints?: string[];
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const SNAP_POINTS: Record<'sm' | 'md' | 'lg', string[]> = {
  sm: ['50%'],
  md: ['75%'],
  // 92% rather than 85%: sheets sit inside <Screen> which already loses ~80px
  // to safe area + Stack header, so 85% of that parent felt cramped. 92% gives
  // noticeably more room without going full-screen (which feels modal, not sheet).
  lg: ['92%'],
};

function SheetHandle() {
  return (
    <View style={styles.handleContainer}>
      <View style={styles.handle} />
    </View>
  );
}

function SheetBody({ children }: { children: React.ReactNode }) {
  return <View style={styles.body}>{children}</View>;
}

export function Sheet({ visible, onClose, title, size, snapPoints, footer, children }: SheetProps) {
  const resolvedSnapPoints = snapPoints ?? SNAP_POINTS[size ?? 'lg'];
  const sheetRef = useRef<BottomSheetMethods>(null);
  const increment = useSheetVisibilityStore((s) => s.increment);
  const decrement = useSheetVisibilityStore((s) => s.decrement);

  // @gorhom/bottom-sheet v5 treats the `index` prop as initial-only in many code
  // paths. Changing it from 0 to -1 after mount does not reliably trigger a close.
  // Drive open/close state imperatively via the ref instead.
  //
  // Also update the global FAB-hiding counter so the FAB does not obscure the
  // sheet footer while a sheet is open.
  useEffect(() => {
    if (visible) {
      sheetRef.current?.snapToIndex(0);
      increment();
      return () => {
        // Cleanup: decrement when the sheet unmounts while visible, so the
        // counter never leaks (e.g. component unmounted without a close call).
        decrement();
      };
    } else {
      sheetRef.current?.close();
    }
    // No cleanup needed for the invisible branch — nothing was incremented.
    return undefined;
  }, [visible, increment, decrement]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        opacity={0.5}
        onPress={onClose}
      />
    ),
    [onClose],
  );

  const renderFooter = useCallback(
    (props: BottomSheetFooterProps) =>
      footer !== undefined ? (
        <BottomSheetFooter {...props}>
          <View testID="sheet-footer" style={styles.footer}>
            {footer}
          </View>
        </BottomSheetFooter>
      ) : null,
    [footer],
  );

  return (
    <BottomSheetLib
      ref={sheetRef}
      index={-1}
      snapPoints={resolvedSnapPoints}
      // v5 defaults this to true, which makes the sheet size to its content
      // and SILENTLY IGNORE snapPoints when content is shorter. That breaks
      // the sm/md/lg contract — collapsed accordions or short forms snap to
      // 25-30% instead of 92%. Disable so snap points are absolute.
      enableDynamicSizing={false}
      enablePanDownToClose
      // Keyboard interaction:
      //   - `interactive` lets the snap float up with the keyboard so the
      //     footer (and the sticky CTA inside it) sits flush against the top
      //     of the keyboard. The previous `extend` value tried to grow the
      //     sheet vertically, but with a FIXED snap (enableDynamicSizing=
      //     false) the sheet cannot grow past its snap point — the footer
      //     stayed anchored to the snap's bottom edge while the keyboard
      //     rose from the screen bottom, producing the big gap reported in
      //     §7 QA.
      //   - `keyboardBlurBehavior="restore"` snaps the sheet back to its
      //     original height when the keyboard dismisses, so the form doesn't
      //     stay floating mid-screen.
      //   - `android_keyboardInputMode="adjustResize"` is required on Android
      //     for @gorhom/bottom-sheet to receive the keyboard height; without
      //     it the gesture handler computes layout against the full window
      //     and the gap reappears.
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleComponent={SheetHandle}
      footerComponent={footer !== undefined ? renderFooter : undefined}
      backgroundStyle={styles.background}
    >
      {title !== undefined && (
        <View testID="sheet-header" style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <GHPressable
            testID="sheet-close-btn"
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close" size={ms(24)} color={Colors.dark.text2} />
          </GHPressable>
        </View>
      )}

      {children}
    </BottomSheetLib>
  );
}

// Attach Body as a named export so consumers can import { Sheet } and use <Sheet.Body>
Sheet.Body = SheetBody;

const styles = StyleSheet.create({
  background: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.xs,
    paddingBottom: Spacing.xs,
  },
  handle: {
    width: ms(40),
    height: ms(4),
    borderRadius: ms(2),
    backgroundColor: Colors.dark.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },
  title: {
    flex: 1,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
  },
  closeBtn: {
    width: ms(44),
    height: ms(44),
    justifyContent: 'center',
    alignItems: 'center',
  },
  body: {
    flex: 1,
  },
  footer: {
    backgroundColor: Colors.dark.surface,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    // 12px (sm) gives the CTA enough breathing room from the sheet's bottom
    // edge without the "big empty space" reported during §7 QA. The prior
    // 20px (lg) compounded with consumer wrappers (filter, date-range,
    // reassign, add-edit) that all add their own pb-6 — visually loose. With
    // SaveCta's outer wrapper now removed, this padding is the ONLY thing
    // separating the button from the sheet edge.
    paddingBottom: Spacing.sm,
  },
});
