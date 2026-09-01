import { Card } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import {
  BudgetSummaryHeader,
  BudgetSummaryMetricsRow,
  BudgetSummarySpentRow,
  BudgetSummaryStatusRow,
} from '@/modules/budget/screens/budget/components/budget_summary_parts';
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
    <Card className="bg-surface border-border rounded-2xl border p-0" style={{ boxShadow: 'none' }}>
      <Card.Body className="px-2 py-1.5">
        <BudgetSummaryHeader
          eyebrowLabel={summary.eyebrowLabel}
          hasData
          balanceLabel={formatAmount(summary.balanceAmount)}
          balanceMetaLabel={balanceSuffix}
          balanceColor={summary.balanceColor}
          trailingChipLabel={
            summary.needsAttentionCount > 0
              ? Strings.budgetPlansSummaryAttentionCount(summary.needsAttentionCount)
              : undefined
          }
        />

        <BudgetSummarySpentRow
          spentLabel={formatAmount(summary.spent)}
          connectorLabel={Strings.budgetSummarySpentOfConnector}
          plannedLabel={formatAmount(summary.planned)}
          usedLabel={usedLabel}
        />
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={usedLabel}
          accessibilityValue={{
            min: 0,
            max: 100,
            now: summary.progressPercentage,
          }}
          className="mt-1"
        >
          <BudgetBar
            pct={summary.pct}
            status={summary.barStatus}
            color={summary.barColor}
            height={Size.spendingPlanProgressTrack}
          />
        </View>

        <BudgetSummaryMetricsRow
          items={[
            {
              key: 'lifecycle',
              label: Strings.budgetPlansSummaryLifecycleLabel,
              value: Strings.budgetPlansSummaryActiveCount(summary.activeCount),
            },
            {
              key: 'upcoming',
              label: Strings.budgetPlansSummaryUpcomingLabel,
              value: Strings.budgetPlansSummaryUpcomingPlansCount(summary.upcomingCount),
            },
            {
              key: 'itemized',
              label: Strings.budgetPlansSummaryItemizedLabel,
              value: Strings.budgetPlansSummaryItemized(
                formatAmount(summary.itemizedAmount),
                summary.itemizedPercentage,
              ),
            },
          ]}
        />

        <BudgetSummaryStatusRow items={summary.statusItems} />
      </Card.Body>
    </Card>
  );
}
