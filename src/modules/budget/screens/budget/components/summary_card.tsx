import { Card } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import type { BudgetCategoriesSummaryVM } from '@/modules/budget/screens/budget/budget_categories.types';
import { BudgetBar } from '@/modules/budget/screens/budget/components/budget_bar';
import {
  BudgetSummaryHeader,
  BudgetSummaryMetricsRow,
  BudgetSummarySpentRow,
  BudgetSummaryStatusRow,
} from '@/modules/budget/screens/budget/components/budget_summary_parts';
import { formatAmount } from '@/utils/format_amount';

interface SummaryCardProps {
  summary: BudgetCategoriesSummaryVM;
  onSetIncome: () => void;
}

export function SummaryCard({ summary, onSetIncome }: SummaryCardProps) {
  return (
    <Card className="bg-surface border-border mx-4 mt-3 rounded-2xl border p-0 shadow-none">
      <Card.Body className="px-2 py-1.5">
        <BudgetSummaryHeader
          eyebrowLabel={summary.eyebrowLabel}
          hasData={summary.hasPlan}
          balanceLabel={summary.balanceAmountLabel}
          balanceMetaLabel={summary.balanceMetaLabel}
          balanceColor={summary.balanceColor}
          emptyLabel={summary.emptyLabel ?? Strings.budgetCategoriesNoBudgetSet}
          trailingLabel={summary.lifecycleLabel}
        />

        {summary.hasPlan ? (
          <>
            <BudgetSummarySpentRow
              spentLabel={formatAmount(summary.spent)}
              connectorLabel={Strings.budgetSummarySpentOfConnector}
              plannedLabel={summary.plannedLabel}
              usedLabel={summary.usedLabel ?? ''}
            />
            <View
              accessible
              accessibilityRole="progressbar"
              accessibilityLabel={summary.usedLabel}
              accessibilityValue={{ text: summary.usedLabel }}
              className="mt-1"
            >
              <BudgetBar
                pct={summary.usedPct ?? 0}
                status="under"
                color={summary.barColor}
                height={Size.spendingPlanProgressTrack}
              />
            </View>
          </>
        ) : null}
        <BudgetSummaryMetricsRow
          items={[
            {
              key: 'planned',
              label: Strings.budgetCategoriesSummaryPlanned,
              value: summary.plannedLabel,
            },
            {
              key: 'unassigned-income',
              label: Strings.budgetCategoriesSummaryUnassignedIncome,
              value: summary.unassignedIncomeLabel,
              onPress: onSetIncome,
              accessibilityLabel: Strings.budgetCategoriesSetIncome,
            },
            {
              key: 'unbudgeted-spend',
              label: Strings.budgetCategoriesSummaryUnbudgetedSpend,
              value: summary.unbudgetedSpendLabel,
              tone: summary.unbudgetedSpend > 0 ? 'warning' : 'default',
            },
          ]}
        />
        {summary.statusItems.length > 0 ? (
          <BudgetSummaryStatusRow items={summary.statusItems} />
        ) : null}
      </Card.Body>
    </Card>
  );
}
