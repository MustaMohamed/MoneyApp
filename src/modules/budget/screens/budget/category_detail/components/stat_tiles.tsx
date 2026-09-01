import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { CategoryHistoryVM } from '@/modules/budget/screens/budget/budget.helpers';
import { MINUS_SIGN, PLUS_SIGN, formatAmount, signAmountText } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

export function StatTiles({ history }: { history: CategoryHistoryVM }) {
  const net = history.netBanked;
  const netLabel = signAmountText(formatAmount(Math.abs(net)), net >= 0 ? PLUS_SIGN : MINUS_SIGN);
  return (
    <View style={styles.row}>
      <Tile
        value={netLabel}
        valueColor={net >= 0 ? Colors.dark.positive : Colors.dark.negative}
        label={`${Strings.budgetDetailNet} · ${history.monthsTotal} mo`}
      />
      <Tile value={formatAmount(Math.round(history.avgPerMonth))} label={Strings.budgetDetailAvg} />
      <Tile
        value={`${history.monthsUnder} of ${history.monthsTotal}`}
        label={Strings.budgetDetailUnder}
      />
    </View>
  );
}

function Tile({ value, label, valueColor }: { value: string; label: string; valueColor?: string }) {
  return (
    <View style={styles.tile}>
      <Text style={[styles.value, valueColor ? { color: valueColor } : undefined]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: ms(8), marginTop: Spacing.md },
  tile: {
    flex: 1,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
  },
  value: { fontFamily: FontFamily.soraBold, fontSize: Type.subhead, color: Colors.dark.text1 },
  label: {
    fontFamily: FontFamily.interRegular,
    fontSize: ms(9),
    color: Colors.dark.text2,
    marginTop: ms(3),
  },
});
