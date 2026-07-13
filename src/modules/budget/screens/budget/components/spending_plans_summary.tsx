import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, Chip } from 'heroui-native';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, FontFamily, LetterSpacing, Radius, Size, Spacing, Type } from '@/constants/theme';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import type { SpendingPlansSummaryVM } from '@/modules/budget/screens/budget/spending_plans.types';
import { formatAmount } from '@/utils/format_amount';

interface SpendingPlansSummaryProps {
  summary: SpendingPlansSummaryVM;
}

const BALANCE_SUFFIX_COPY = {
  left: Strings.budgetPlansLeftStatus,
  over: Strings.budgetPlansOverStatus,
} as const;

export function SpendingPlansSummary({ summary }: SpendingPlansSummaryProps) {
  const balanceSuffix = Strings.budgetPlansCardBalanceMeta(
    Strings.currencyEgp,
    BALANCE_SUFFIX_COPY[summary.balanceStatus],
  );
  const usedLabel = Strings.budgetPlansSummaryUsed(summary.usedPercentage);

  return (
    <Card className="p-0 shadow-none" style={styles.card}>
      <Card.Body style={styles.body}>
        <Text style={styles.eyebrow}>{summary.eyebrowLabel}</Text>

        <View style={styles.primaryRow}>
          <Text style={[styles.primaryValue, { color: summary.balanceColor }]}>
            {formatAmount(summary.balanceAmount)}
            <Text style={styles.primarySuffix}> {balanceSuffix}</Text>
          </Text>
          {summary.needsAttentionCount > 0 ? (
            <Chip
              accessibilityRole="text"
              size="sm"
              variant="soft"
              color="danger"
              animation="disable-all"
              style={styles.attentionChip}
            >
              <Chip.Label style={styles.attentionLabel}>
                {Strings.budgetPlansSummaryAttentionCount(summary.needsAttentionCount)}
              </Chip.Label>
            </Chip>
          ) : null}
        </View>

        <View style={styles.moneyRow}>
          <View style={{ flexDirection: 'row', gap: Spacing.xxxs }}>
            <Text style={styles.moneyLabel}>{formatAmount(summary.spent)}</Text>
            <Text
              style={{
                color: Colors.dark.text2,
                fontFamily: FontFamily.interRegular,
                fontSize: Type.micro,
              }}
            >
              {Strings.budgetPlansSummarySpentOf()}
            </Text>
            <Text style={styles.moneyLabel}>{formatAmount(summary.planned)}</Text>
          </View>
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
            height={Size.spendingPlanProgressTrack}
          />
        </View>

        <View style={styles.metricsRow}>
          <SummaryMetric
            label={Strings.budgetPlansSummaryLifecycleLabel}
            value={Strings.budgetPlansSummaryActiveCount(summary.activeCount)}
          />
          <View style={styles.metricDivider} />
          <SummaryMetric
            label={Strings.budgetPlansSummaryUpcomingLabel}
            value={Strings.budgetPlansSummaryUpcomingPlansCount(summary.upcomingCount)}
          />
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
          {summary.statusItems.map((item) => (
            <View key={item.key} style={styles.statusItem}>
              <MaterialCommunityIcons
                accessible={false}
                name={item.icon}
                size={Size.iconMicro}
                color={item.color}
              />
              <Text style={styles.statusLabel}>{item.label}</Text>
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
      {label ? <Text style={styles.metricLabel}>{label}</Text> : null}
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.dark.border,
  },
  body: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  eyebrow: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.chip,
    color: Colors.dark.text2,
    textTransform: 'uppercase',
    letterSpacing: LetterSpacing.eyebrow,
  },
  primaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.xxxs,
  },
  primaryValue: {
    flexShrink: 1,
    fontFamily: FontFamily.soraBold,
    fontSize: Type.headline,
  },
  primarySuffix: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.chip,
    color: Colors.dark.text2,
  },
  attentionChip: {
    minHeight: Size.checkCircle,
    paddingHorizontal: Spacing.xs,
    paddingVertical: 0,
  },
  attentionLabel: {
    fontFamily: FontFamily.interSemi,
    fontSize: Type.chip,
    textTransform: 'capitalize',
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.sm,
    marginTop: Spacing.xxxs,
  },
  moneyLabel: {
    flexShrink: 1,
    fontFamily: FontFamily.interSemi,
    fontSize: Type.micro,
    color: Colors.dark.text1,
  },
  usedLabel: {
    fontFamily: FontFamily.soraRegular,
    fontSize: Type.micro,
    color: Colors.dark.text2,
  },
  progress: {
    marginTop: Spacing.xxxs,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    marginTop: Spacing.xs,
    paddingTop: Spacing.xxxs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.dark.border,
  },
  metric: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxs,
  },
  metricDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.dark.border,
  },
  metricValue: {
    marginTop: Spacing.xxxxs,
    fontFamily: FontFamily.soraSemi,
    fontSize: Type.micro,
    color: Colors.dark.text1,
    textAlign: 'center',
  },
  metricLabel: {
    fontFamily: FontFamily.interRegular,
    fontSize: Type.chip,
    color: Colors.dark.text2,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.xxs,
    marginTop: Spacing.xxs,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xxs,
  },
  statusLabel: {
    fontFamily: FontFamily.interMedium,
    fontSize: Type.chip,
    color: Colors.dark.text2,
    textAlign: 'center',
  },
});
