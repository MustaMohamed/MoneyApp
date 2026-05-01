import { StyleSheet, Text, View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { formatAmount } from '@/utils/format_amount';

interface StatCardsProps {
  netWorthEgp: number;
  monthSpentEgp: number;
}

export function StatCards({ netWorthEgp, monthSpentEgp }: StatCardsProps) {
  return (
    <View style={styles.row}>
      <View style={styles.card}>
        <Text style={styles.label}>{Strings.dashNetWorthTitle}</Text>
        <Text style={[styles.value, netWorthEgp < 0 && styles.negative]}>
          {formatAmount(netWorthEgp)} EGP
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.label}>{Strings.dashMonthSpentTitle}</Text>
        <Text style={styles.value}>{formatAmount(monthSpentEgp)} EGP</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    marginHorizontal: Spacing.sm,
    marginTop: Spacing.xs,
    gap: Spacing.xs,
  },
  card: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.dark.border,
  },
  label: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text2,
    marginBottom: Spacing.xs,
  },
  value: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.body,
    color: Colors.dark.text1,
  },
  negative: { color: Colors.dark.negative },
});
