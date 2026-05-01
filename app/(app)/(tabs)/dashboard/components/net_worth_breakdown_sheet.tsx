import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { formatAmount } from '../dashboard.helpers';

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
  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.container}>
        <Pressable style={StyleSheet.absoluteFillObject} onPress={onClose} />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>{Strings.dashNetWorthTitle}</Text>

          <View style={styles.row}>
            <Text style={styles.rowLabel}>{Strings.dashAssetsLabel}</Text>
            <Text style={[styles.rowValue, styles.positive]}>{formatAmount(assetsEgp)} EGP</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>{Strings.dashLiabilitiesLabel}</Text>
            <Text style={[styles.rowValue, styles.negative]}>
              {formatAmount(liabilitiesEgp)} EGP
            </Text>
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
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
  sheet: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    borderTopWidth: 1,
    borderColor: Colors.dark.border,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: Colors.dark.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: Spacing.md,
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
