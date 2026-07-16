import { Card } from 'heroui-native';
import { View } from 'react-native';

import { BudgetGroup } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Colors, Size } from '@/constants/theme';
import type {
  BudgetRuleLensVM,
  RuleBucketStatus,
} from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import {
  BudgetSummaryHeader,
  BudgetSummaryMetricsRow,
  BudgetSummarySpentRow,
  BudgetSummaryStatusRow,
} from '@/modules/budget/screens/budget/components/budget_summary_parts';
import { formatAmount } from '@/utils/format_amount';
import { formatMonthYear } from '@/utils/format_date';

interface MonthlyRuleSummaryProps {
  vm: BudgetRuleLensVM;
  selectedMonth: string;
  onEditIncome: () => void;
}

const GROUP_LABELS: Record<BudgetGroup, string> = {
  [BudgetGroup.Need]: Strings.budget5030NeedLabel,
  [BudgetGroup.Want]: Strings.budget5030WantLabel,
  [BudgetGroup.Savings]: Strings.budget5030SavingsLabel,
};

const STATUS_PRESENTATION: Record<
  RuleBucketStatus,
  {
    label: string;
    icon:
      | 'help-circle-outline'
      | 'circle-outline'
      | 'check-circle-outline'
      | 'alert-circle-outline'
      | 'target';
    color: string;
  }
> = {
  'income-needed': {
    label: Strings.budget5030StatusIncomeNeeded,
    icon: 'help-circle-outline',
    color: Colors.dark.budgetUnder,
  },
  'no-plan': {
    label: Strings.budget5030StatusNoPlan,
    icon: 'circle-outline',
    color: Colors.dark.budgetUnder,
  },
  'within-cap': {
    label: Strings.budget5030StatusWithinCap,
    icon: 'check-circle-outline',
    color: Colors.dark.positive,
  },
  'over-cap': {
    label: Strings.budget5030StatusOverCap,
    icon: 'alert-circle-outline',
    color: Colors.dark.negative,
  },
  'target-met': {
    label: Strings.budget5030StatusTargetMet,
    icon: 'check-circle-outline',
    color: Colors.dark.positive,
  },
  'below-target': {
    label: Strings.budget5030StatusBelowTarget,
    icon: 'target',
    color: Colors.dark.budgetWatch,
  },
};

function lifecycleLabel(summary: BudgetRuleLensVM['summary']): string {
  if (summary.lifecycle === 'planned') return Strings.budget5030LifecyclePlanned;
  if (summary.lifecycle === 'completed') return Strings.budget5030LifecycleComplete;
  return Strings.budget5030DaysLeft(summary.daysLeft ?? 0);
}

export function MonthlyRuleSummary({ vm, selectedMonth, onEditIncome }: MonthlyRuleSummaryProps) {
  const { summary } = vm;
  const monthLabel = formatMonthYear(selectedMonth);
  const percentage = Math.round((summary.plannedRatio ?? 0) * 100);
  const leftToPlan = summary.leftToPlan ?? 0;
  const isOver = leftToPlan < 0;
  const statusItems = vm.buckets.map((bucket) => {
    const presentation = STATUS_PRESENTATION[bucket.status];
    return {
      key: bucket.group,
      icon: presentation.icon,
      color: presentation.color,
      label:
        bucket.status === 'income-needed'
          ? Strings.budget5030SummaryIncomeNeeded(GROUP_LABELS[bucket.group])
          : `${GROUP_LABELS[bucket.group]} ${presentation.label.toLowerCase()}`,
    };
  });

  return (
    <Card className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0 shadow-none">
      <Card.Body className="px-2 py-1.5">
        <BudgetSummaryHeader
          eyebrowLabel={Strings.budget5030SummaryEyebrow(monthLabel.split(' ')[0] ?? monthLabel)}
          hasData={summary.hasIncome}
          balanceLabel={formatAmount(Math.abs(leftToPlan))}
          balanceMetaLabel={isOver ? Strings.budget5030OverIncome : Strings.budget5030LeftToPlan}
          balanceColor={isOver ? Colors.dark.negative : Colors.dark.positive}
          emptyLabel={Strings.budget5030SetPlanningIncome}
          trailingLabel={lifecycleLabel(summary)}
          trailingActionLabel={Strings.budget5030EditIncome}
          trailingActionAccessibilityLabel={Strings.budget5030EditIncomeA11y}
          onTrailingAction={onEditIncome}
        />

        <BudgetSummarySpentRow
          spentLabel={formatAmount(summary.totalPlanned)}
          connectorLabel={
            summary.hasIncome
              ? Strings.budget5030PlannedOfConnector
              : Strings.budget5030PlannedConnector
          }
          plannedLabel={summary.hasIncome ? formatAmount(summary.income ?? 0) : ''}
          usedLabel={
            summary.hasIncome
              ? Strings.budget5030PlannedPercentage(percentage)
              : Strings.budget5030NotReady
          }
        />
        <View
          accessible
          accessibilityRole="progressbar"
          accessibilityLabel={
            summary.hasIncome
              ? Strings.budget5030PlannedPercentage(percentage)
              : Strings.budget5030NotReady
          }
          accessibilityValue={{ min: 0, max: 100, now: Math.min(percentage, 100) }}
          className="mt-1"
        >
          <BudgetBar
            pct={summary.progressRatio ?? 0}
            status={isOver ? 'over' : 'under'}
            color={isOver ? Colors.dark.negative : Colors.dark.positive}
            height={Size.spendingPlanProgressTrack}
          />
        </View>

        <BudgetSummaryMetricsRow
          items={[
            {
              key: 'income',
              label: Strings.budget5030IncomeMetric,
              value: summary.hasIncome
                ? formatAmount(summary.income ?? 0)
                : Strings.budget5030EditIncome,
              onPress: onEditIncome,
              accessibilityLabel: Strings.budget5030EditIncomeA11y,
            },
            {
              key: 'planned',
              label: Strings.budget5030PlannedMetric,
              value: formatAmount(summary.totalPlanned),
            },
            {
              key: 'not-grouped',
              label: Strings.budget5030NotGroupedMetric,
              value: formatAmount(summary.notGroupedPlanned),
            },
          ]}
        />
        <BudgetSummaryStatusRow items={statusItems} />
      </Card.Body>
    </Card>
  );
}
