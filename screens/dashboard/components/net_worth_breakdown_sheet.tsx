import BottomSheet, {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { formatAmount } from '@/utils/format_amount';

interface NetWorthBreakdownSheetProps {
  visible: boolean;
  onClose: () => void;
  assetsEgp: number;
  liabilitiesEgp: number;
  netWorthEgp: number;
  netWorthUsd: number;
}

export function NetWorthBreakdownSheet({
  visible,
  onClose,
  assetsEgp,
  liabilitiesEgp,
  netWorthEgp,
  netWorthUsd,
}: NetWorthBreakdownSheetProps) {
  const sheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['40%'], []);

  useEffect(() => {
    if (visible) sheetRef.current?.expand();
    else sheetRef.current?.close();
  }, [visible]);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop
        {...props}
        appearsOnIndex={0}
        disappearsOnIndex={-1}
        pressBehavior="close"
      />
    ),
    [],
  );

  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      onClose={onClose}
      snapPoints={snapPoints}
      enablePanDownToClose
      backdropComponent={renderBackdrop}
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
    >
      <BottomSheetView style={styles.content}>
        <Text style={styles.title}>{Strings.dashNetWorthTitle}</Text>

        <View style={styles.row}>
          <Text style={styles.rowLabel}>{Strings.dashAssetsLabel}</Text>
          <Text style={[styles.rowValue, styles.positive]}>{formatAmount(assetsEgp)} EGP</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>{Strings.dashLiabilitiesLabel}</Text>
          <Text style={[styles.rowValue, styles.negative]}>{formatAmount(liabilitiesEgp)} EGP</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={[styles.rowLabel, styles.totalLabel]}>{Strings.dashNetWorthTitle}</Text>
          <Text style={[styles.rowValue, styles.totalValue, netWorthEgp < 0 && styles.negative]}>
            {formatAmount(netWorthEgp)} EGP
          </Text>
        </View>
        <Text style={styles.usdLine}>≈ {formatAmount(netWorthUsd, 0)} USD</Text>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  sheetBg: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
  },
  handle: { backgroundColor: Colors.dark.border, width: 36, height: 4 },
  content: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  title: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.title,
    color: Colors.dark.text1,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  rowLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.body,
    color: Colors.dark.text2,
  },
  rowValue: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  positive: { color: Colors.dark.positive },
  negative: { color: Colors.dark.negative },
  divider: { height: 1, backgroundColor: Colors.dark.border, marginVertical: Spacing.sm },
  totalLabel: { color: Colors.dark.text1, fontFamily: FontFamily.interSemi },
  totalValue: { fontSize: Type.subhead, fontFamily: FontFamily.soraBold },
  usdLine: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    textAlign: 'right',
    marginTop: Spacing.xxs,
  },
});
