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
import React, { useCallback, useRef } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import BottomSheetLib, {
  BottomSheetBackdrop,
  BottomSheetFooter,
  type BottomSheetBackdropProps,
  type BottomSheetFooterProps,
} from '@gorhom/bottom-sheet';
import type { BottomSheetMethods } from '@gorhom/bottom-sheet/lib/typescript/types';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { Text } from '@/components/ui/text';
import { ms } from '@/utils/responsive';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  size: 'sm' | 'lg';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const SNAP_POINTS: Record<'sm' | 'lg', string[]> = {
  sm: ['50%'],
  lg: ['85%'],
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

export function Sheet({ visible, onClose, title, size, footer, children }: SheetProps) {
  const sheetRef = useRef<BottomSheetMethods>(null);

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
      index={visible ? 0 : -1}
      snapPoints={SNAP_POINTS[size]}
      enablePanDownToClose
      onClose={onClose}
      backdropComponent={renderBackdrop}
      handleComponent={SheetHandle}
      footerComponent={footer !== undefined ? renderFooter : undefined}
      backgroundStyle={styles.background}
    >
      {title !== undefined && (
        <View testID="sheet-header" style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Pressable
            testID="sheet-close-btn"
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Close"
            accessibilityRole="button"
          >
            <MaterialCommunityIcons name="close" size={ms(24)} color={Colors.dark.text2} />
          </Pressable>
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
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
    paddingTop: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },
});
