import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import ActionSheet, { type ActionSheetRef } from 'react-native-actions-sheet';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
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
  const sheetRef = useRef<ActionSheetRef>(null);

  useEffect(() => {
    if (visible) sheetRef.current?.show();
    else sheetRef.current?.hide();
  }, [visible]);

  return (
    <ActionSheet
      ref={sheetRef}
      onClose={onClose}
      gestureEnabled
      containerStyle={styles.sheet}
      indicatorStyle={styles.handle}
    >
      <View style={styles.content}>
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
      </View>
    </ActionSheet>
  );
}

const styles = StyleSheet.create({
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
  },
  handle: {
    backgroundColor: Colors.dark.border,
    width: Size.sheetHandle.width,
    height: Size.sheetHandle.height,
  },
  content: { padding: Spacing.lg },
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
  divider: {
    height: Size.hairline,
    backgroundColor: Colors.dark.border,
    marginVertical: Spacing.sm,
  },
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
