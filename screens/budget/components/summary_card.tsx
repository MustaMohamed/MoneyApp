import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Spacing, Type } from '@/constants/theme';
import { computeStatus, type OverallVM } from '@/screens/budget/budget.helpers';
import { BudgetBar } from '@/screens/budget/components/budget_bar';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

export interface SummaryCardProps {
  overall: OverallVM;
  daysLeft: number;
}

export function SummaryCard({ overall, daysLeft }: SummaryCardProps) {
  const pctLabel = `${Math.round(overall.pct * 100)}% ${Strings.budgetUsedSuffix}`;
  // FIX #2: single source of truth — delegate to computeStatus (uses BUDGET_WARNING_THRESHOLD)
  const status = computeStatus(overall.spent, overall.budgeted);
  // FIX #4: Left value is red when overspent (left < 0)
  const leftColor = overall.left < 0 ? Colors.dark.negative : Colors.dark.positive;
  return (
    <View style={styles.card}>
      <View style={styles.figs}>
        <Figure label={Strings.budgetSummaryBudgeted} value={formatAmount(overall.budgeted)} />
        <View style={styles.sep} />
        <Figure label={Strings.budgetSummarySpent} value={formatAmount(overall.spent)} />
        <View style={styles.sep} />
        <Figure
          label={Strings.budgetSummaryLeft}
          value={formatAmount(overall.left)}
          accentColor={leftColor}
        />
      </View>
      <BudgetBar pct={overall.pct} status={status} height={ms(12)} />
      <View style={styles.meta}>
        <Text style={styles.metaText}>{pctLabel}</Text>
        <Text style={styles.metaText}>{`${daysLeft} ${Strings.budgetDaysLeftSuffix}`}</Text>
      </View>
    </View>
  );
}

function Figure({
  label,
  value,
  accentColor,
}: {
  label: string;
  value: string;
  accentColor?: string;
}) {
  return (
    <View style={styles.fig}>
      <Text style={styles.figLabel}>{label}</Text>
      <Text style={[styles.figVal, accentColor ? { color: accentColor } : undefined]}>{value}</Text>
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
  figs: { flexDirection: 'row', marginBottom: Spacing.sm },
  fig: { flex: 1, alignItems: 'center' },
  sep: { width: StyleSheet.hairlineWidth, backgroundColor: Colors.dark.border },
  figLabel: { fontFamily: FontFamily.interMedium, fontSize: Type.micro, color: Colors.dark.text2 },
  figVal: {
    fontFamily: FontFamily.soraBold,
    fontSize: Type.subhead,
    color: Colors.dark.text1,
    marginTop: ms(4),
  },
  meta: { flexDirection: 'row', justifyContent: 'space-between', marginTop: Spacing.xs },
  metaText: { fontFamily: FontFamily.interRegular, fontSize: Type.micro, color: Colors.dark.text2 },
});
