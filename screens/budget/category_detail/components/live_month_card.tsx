import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import type { MonthResultVM } from '@/screens/budget/budget.helpers';
import { BudgetBar } from '@/screens/budget/components/budget_bar';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

export function LiveMonthCard({ result, daysLeft }: { result: MonthResultVM; daysLeft: number }) {
  const pct = result.limit > 0 ? result.spent / result.limit : 0;
  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <Text style={styles.muted}>{`${daysLeft} ${Strings.budgetDaysLeftSuffix}`}</Text>
        <Text
          style={styles.left}
        >{`${formatAmount(result.limit - result.spent)} ${Strings.budgetSummaryLeft.toLowerCase()}`}</Text>
      </View>
      <Text style={styles.big}>
        {formatAmount(result.spent)}
        <Text
          style={styles.of}
        >{`  ${Strings.budgetSummarySpent.toLowerCase()} of ${formatAmount(result.limit)}`}</Text>
      </Text>
      <BudgetBar pct={pct} status={result.status} height={ms(8)} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
    padding: Spacing.md,
  },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  muted: { fontFamily: FontFamily.interRegular, fontSize: Type.micro, color: Colors.dark.text2 },
  left: { fontFamily: FontFamily.soraSemi, fontSize: Type.body, color: Colors.dark.positive },
  big: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: Colors.dark.text1,
    marginBottom: Spacing.sm,
  },
  of: { fontFamily: FontFamily.interRegular, fontSize: Type.caption, color: Colors.dark.text2 },
});
