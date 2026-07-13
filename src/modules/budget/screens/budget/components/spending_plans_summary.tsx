import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, Chip } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, Radius, Size, Spacing, Type } from '@/constants/theme';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import type { SpendingPlansSummaryVM } from '@/modules/budget/screens/budget/spending_plans.helpers';
import { formatAmount } from '@/utils/format_amount';
import { ms } from '@/utils/responsive';

interface SpendingPlansSummaryProps {
  summary: SpendingPlansSummaryVM;
}

const BALANCE_AMOUNT_COPY = {
  left: Strings.budgetPlansSummaryLeftAmount,
  over: Strings.budgetPlansSummaryOverAmount,
} as const;

const STATUS_ITEMS = [
  {
    countKey: 'onTrackCount',
    icon: 'check-circle-outline',
    color: Colors.dark.positive,
    format: Strings.budgetPlansSummaryOnTrackCount,
  },
  {
    countKey: 'watchCount',
    icon: 'alert-circle-outline',
    color: Colors.dark.warning,
    format: Strings.budgetPlansSummaryWatchCount,
  },
  {
    countKey: 'overCount',
    icon: 'alert-octagon-outline',
    color: Colors.dark.negative,
    format: Strings.budgetPlansSummaryOverCount,
  },
  {
    countKey: 'upcomingCount',
    icon: 'clock-outline',
    color: Colors.shared.transferBlue,
    format: Strings.budgetPlansSummaryUpcomingCount,
  },
] as const;

export function SpendingPlansSummary({ summary }: SpendingPlansSummaryProps) {
  const primaryValue = BALANCE_AMOUNT_COPY[summary.balanceStatus](
    formatAmount(summary.balanceAmount),
  );
  const usedLabel = Strings.budgetPlansSummaryUsed(summary.usedPercentage);

  return (
    <Card className="p-0 shadow-none" style={styles.card}>
      <Card.Body style={styles.body}>
        <Text style={styles.eyebrow}>
          {Strings.budgetPlansSummaryEyebrow(summary.planCount, summary.monthLabel)}
        </Text>

        <View style={styles.primaryRow}>
          <Text style={[styles.primaryValue, { color: summary.balanceColor }]}>{primaryValue}</Text>
          <Chip
            accessibilityRole="text"
            size="sm"
            variant="soft"
            color="warning"
            animation="disable-all"
          >
            <Chip.Label style={styles.attentionLabel}>
              {Strings.budgetPlansSummaryAttentionCount(summary.needsAttentionCount)}
            </Chip.Label>
          </Chip>
        </View>

        <View style={styles.moneyRow}>
          <Text style={styles.moneyLabel}>
            {Strings.budgetPlansSummarySpentOf(
              formatAmount(summary.spent),
              formatAmount(summary.planned),
            )}
          </Text>
          <Text style={styles.usedLabel}>{usedLabel}</Text>
        </View>

        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={usedLabel}
          accessibilityValue={{
            min: 0,
            max: 100,
            now: summary.progressPercentage,
          }}
          style={styles.progress}
        >
          <BudgetBar
            pct={summary.pct}
            status={summary.barStatus}
            color={summary.barColor}
            height={ms(8)}
          />
        </View>

        <View style={styles.metricsRow}>
          <SummaryMetric value={Strings.budgetPlansSummaryActiveCount(summary.activeCount)} />
          <View style={styles.metricDivider} />
          <SummaryMetric value={Strings.budgetPlansSummaryUpcomingCount(summary.upcomingCount)} />
          <View style={styles.metricDivider} />
          <SummaryMetric
            value={Strings.budgetPlansSummaryItemized(
              formatAmount(summary.itemizedAmount),
              summary.itemizedPercentage,
            )}
            label={Strings.budgetPlansSummaryItemizedLabel}
          />
        </View>

        <View style={styles.statusRow}>
          {STATUS_ITEMS.map((item) => (
            <View key={item.countKey} style={styles.statusItem}>
              <MaterialCommunityIcons
                accessible={false}
                name={item.icon}
                size={Size.iconXs}
                color={item.color}
              />
              <Text style={styles.statusLabel}>{item.format(summary[item.countKey])}</Text>
            </View>
          ))}
        </View>
      </Card.Body>
    </Card>
  );
}

function SummaryMetric({ value, label }: { value: string; label?: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      {label ? <Text style={styles.metricLabel}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  body: {
    padding: Spacing.md,
  },
  eyebrow: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: ms(0.7),
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.xxs,
  },
  primaryValue: {
    flexShrink: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
  },
  attentionLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  moneyLabel: {
    flexShrink: 1,
    fontFamily: FontFamily.interMedium,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  usedLabel: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
  },
  progress: {
    marginTop: Spacing.xs,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: Spacing.md,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: ms(36),
    paddingHorizontal: Spacing.xxs,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.border,
  },
  metricValue: {
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.caption,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  metricLabel: {
    marginTop: ms(2),
    fontFamily: FontFamily.interRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: Spacing.xxs,
    marginTop: Spacing.md,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
  },
  statusItem: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statusLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.micro,
    color: Colors.dark.text2,
    textAlign: 'center',
  },
});
