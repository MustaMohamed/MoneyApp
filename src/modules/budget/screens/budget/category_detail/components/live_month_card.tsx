import React from 'react';
import { StyleSheet, View } from 'react-native';

import { HeroShell } from '@/components/ui/hero_shell';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Spacing, Type } from '@/constants/theme';
import type { MonthResultVM } from '@/modules/budget/screens/budget/budget.helpers';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

import { resolveLiveMonthLeftPresentation } from './live_month_card.helpers';

export function LiveMonthCard({
  result,
  daysLeft,
  color,
}: {
  result: MonthResultVM;
  daysLeft: number | undefined;
  color: string;
}) {
  const pct = result.limit > 0 ? result.spent / result.limit : 0;
  const left = resolveLiveMonthLeftPresentation(result.limit, result.spent);
  return (
    <HeroShell glowColor={color} style={{ marginHorizontal: 0 }}>
      <View style={styles.inner}>
        <View style={styles.top}>
          <Text style={styles.muted}>
            {result.lifecycle === 'completed'
              ? Strings.budgetDetailCompleted
              : result.lifecycle === 'planned'
                ? Strings.budgetDetailPlanned
                : Strings.budgetCategoriesDaysLeft(daysLeft ?? 0)}
          </Text>
          <Text
            style={[styles.left, { color: left.color }]}
          >{`${left.text} ${Strings.budgetSummaryLeft.toLowerCase()}`}</Text>
        </View>
        <Text style={styles.big}>
          {formatAmount(result.spent)}
          <Text
            style={styles.of}
          >{`  ${Strings.budgetSummarySpent.toLowerCase()} of ${formatAmount(result.limit)}`}</Text>
        </Text>
        <BudgetBar pct={pct} status={result.status} height={ms(8)} />
      </View>
    </HeroShell>
  );
}

const styles = StyleSheet.create({
  inner: { padding: Spacing.md },
  top: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.xs },
  muted: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text1,
    opacity: 0.7,
  },
  left: { fontFamily: FontFamily.soraSemi, fontSize: Type.body },
  big: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
    color: Colors.dark.text1,
    marginBottom: Spacing.sm,
  },
  of: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.caption,
    color: Colors.dark.text1,
    opacity: 0.7,
  },
});
