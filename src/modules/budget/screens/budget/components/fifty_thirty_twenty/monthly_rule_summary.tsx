import { Card } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import type { BudgetRuleLensVM } from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import {
  BudgetSummaryHeader,
  BudgetSummaryMetricsRow,
  BudgetSummarySpentRow,
  BudgetSummaryStatusRow,
} from '@/modules/budget/screens/budget/components/budget_summary_parts';

interface MonthlyRuleSummaryProps {
  vm: BudgetRuleLensVM;
  onEditIncome: () => void;
}

export function MonthlyRuleSummary({ vm, onEditIncome }: MonthlyRuleSummaryProps) {
  const { summary } = vm;
  const presentation = summary.presentation;

  return (
    <Card
      className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0"
      style={{ boxShadow: 'none' }}
    >
      <Card.Body className="px-2 py-1.5">
        <BudgetSummaryHeader
          eyebrowLabel={presentation.eyebrowLabel}
          eyebrowTrailingLabel={presentation.lifecycleLabel}
          hasData={summary.hasIncome}
          balanceLabel={presentation.balanceLabel}
          balanceMetaLabel={presentation.balanceMetaLabel}
          balanceColor={presentation.balanceColor}
          emptyLabel={presentation.emptyLabel}
          trailingActionLabel={Strings.budget5030EditIncome}
          trailingActionAccessibilityLabel={Strings.budget5030EditIncomeA11y}
          onTrailingAction={onEditIncome}
        />

        <BudgetSummarySpentRow
          spentLabel={presentation.contextSpentLabel}
          connectorLabel={presentation.contextConnectorLabel}
          plannedLabel={presentation.contextPlannedLabel}
          usedLabel={presentation.progressLabel}
        />
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={presentation.progressLabel}
          accessibilityValue={{ min: 0, max: 100, now: presentation.progressValue }}
          className="mt-1"
        >
          <BudgetBar
            pct={summary.progressRatio ?? 0}
            status={presentation.barStatus}
            color={presentation.barColor}
            height={Size.spendingPlanProgressTrack}
          />
        </View>

        <BudgetSummaryMetricsRow
          items={[
            {
              key: 'income',
              label: Strings.budget5030IncomeMetric,
              value: presentation.incomeMetricValue,
              onPress: onEditIncome,
              accessibilityLabel: Strings.budget5030EditIncomeA11y,
            },
            {
              key: 'planned',
              label: Strings.budget5030PlannedMetric,
              value: presentation.plannedMetricValue,
            },
            {
              key: 'not-grouped',
              label: Strings.budget5030NotGroupedMetric,
              value: presentation.notGroupedMetricValue,
            },
          ]}
        />
        <BudgetSummaryStatusRow items={presentation.statusItems} />
      </Card.Body>
    </Card>
  );
}
