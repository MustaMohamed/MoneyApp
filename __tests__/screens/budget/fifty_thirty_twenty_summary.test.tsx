import { render, within } from '@testing-library/react-native';
import { Dimensions } from 'react-native';

import {
  resolveFitAmountTextProps,
  resolveRowStacking,
  scaledTextStyle,
} from '@/components/ui/text_scale.geometry';
import { BudgetGroup, CategoryType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type } from '@/constants/theme';
import type { Category } from '@/database/entities/category.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { buildBudgetRuleLens } from '@/modules/budget/screens/budget/budget_buckets.helpers';
import { MonthlyRuleSummary } from '@/modules/budget/screens/budget/components/fifty_thirty_twenty/monthly_rule_summary';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

const MONTH = '2026-05';
const NOW = '2026-05-01T00:00:00.000Z';

function category(): Category {
  return {
    id: 'housing',
    name: 'Housing',
    type: CategoryType.Expense,
    icon: 'home',
    color: '#fff',
    is_default: 0,
    sort_order: 0,
    budget_group: BudgetGroup.Need,
    created_at: NOW,
    updated_at: NOW,
  };
}

function budget(): Budget {
  return {
    id: 'housing-budget',
    category_id: 'housing',
    name: 'Housing',
    limit_amount: 5_000,
    effective_from: MONTH,
    created_at: NOW,
    updated_at: NOW,
  };
}

function vm(income: number | null, budgets: Budget[] = []) {
  return buildBudgetRuleLens({
    income,
    categories: [category()],
    budgets,
    budgetGroupByCategoryId: { housing: BudgetGroup.Need },
    spendByMonth: {},
    selectedMonth: MONTH,
    lifecycleDate: '2026-05-15',
  });
}

describe('MonthlyRuleSummary', () => {
  it('renders the explanatory no-income state from its presentation VM', async () => {
    const screen = await render(
      <MonthlyRuleSummary vm={vm(null, [budget()])} onEditIncome={jest.fn()} />,
    );

    expect(screen.getByText('Set monthly planning income')).toBeTruthy();
    expect(screen.getByText('Income is needed to calculate rule targets')).toBeTruthy();
    expect(screen.getByText('Set income')).toBeTruthy();
  });

  it('renders the explanatory no-budget state from its presentation VM', async () => {
    const screen = await render(<MonthlyRuleSummary vm={vm(20_000)} onEditIncome={jest.fn()} />);

    expect(screen.getByText('No category budgets planned for May')).toBeTruthy();
    expect(screen.getByText('0% planned')).toBeTruthy();
  });

  it('stacks the metrics into rows above a font scale of 1 and scales each value app-side', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(resolveRowStacking(fontScale)).toBe('stacked');
    const lens = vm(20_000, [budget()]);
    const screen = await render(<MonthlyRuleSummary vm={lens} onEditIncome={jest.fn()} />);

    const metrics = screen.getByTestId('budget-summary-metrics');
    const { incomeMetricValue, plannedMetricValue, notGroupedMetricValue } =
      lens.summary.presentation;
    const fit = resolveFitAmountTextProps(Type.bodyStrong, fontScale);
    expect(fit.adjustsFontSizeToFit).toBe(true);
    for (const [label, value] of [
      [Strings.budget5030IncomeMetric, incomeMetricValue],
      [Strings.budget5030PlannedMetric, plannedMetricValue],
      [Strings.budget5030NotGroupedMetric, notGroupedMetricValue],
    ] as const) {
      expect(within(metrics).getByText(label)).toBeTruthy();
      const valueNode = within(metrics).getByText(value);
      expect(valueNode).toHaveProp('numberOfLines', fit.numberOfLines);
      expect(valueNode).toHaveProp('allowFontScaling', fit.allowFontScaling);
      expect(valueNode).toHaveProp('adjustsFontSizeToFit', fit.adjustsFontSizeToFit);
      expect(valueNode).toHaveStyle(scaledTextStyle(Type.bodyStrong, fontScale));
    }
  });
});
