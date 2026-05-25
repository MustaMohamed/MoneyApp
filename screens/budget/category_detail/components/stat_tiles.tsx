import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { CategoryHistoryVM } from '@/screens/budget/budget.helpers';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

export function StatTiles({ history }: { history: CategoryHistoryVM }) {
  // These tiles summarise COMPLETED months only — the in-progress month already
  // lives in the LiveMonthCard above ("… so far"). A brand-new budget has no
  // completed history yet, so show an honest line instead of banking the
  // current month's running surplus as a result.
  if (history.monthsCompleted === 0) {
    return (
      <View style={styles.emptyRow}>
        <Text style={styles.emptyText}>{Strings.budgetDetailNoCompleted}</Text>
      </View>
    );
  }
  const net = history.netBanked;
  const netLabel = `${net >= 0 ? '+' : ''}${formatAmount(net)}`;
  return (
    <View style={styles.row}>
      <Tile
        value={netLabel}
        valueColor={net >= 0 ? Colors.dark.positive : Colors.dark.negative}
        label={`${Strings.budgetDetailNet} · ${history.monthsCompleted} mo`}
      />
      <Tile value={formatAmount(Math.round(history.avgPerMonth))} label={Strings.budgetDetailAvg} />
      <Tile
        value={`${history.monthsUnder} of ${history.monthsCompleted}`}
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
  emptyRow: {
    marginTop: Spacing.md,
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  emptyText: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
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
