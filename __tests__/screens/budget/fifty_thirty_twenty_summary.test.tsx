import { render } from '@testing-library/react-native';

import { BudgetGroup, CategoryType } from '@/constants/enums';
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
  it('renders the explanatory no-income state from its presentation VM', () => {
    const screen = render(
      <MonthlyRuleSummary vm={vm(null, [budget()])} onEditIncome={jest.fn()} />,
    );

    expect(screen.getByText('Set monthly planning income')).toBeTruthy();
    expect(screen.getByText('Income is needed to calculate rule targets')).toBeTruthy();
    expect(screen.getByText('Set income')).toBeTruthy();
  });

  it('renders the explanatory no-budget state from its presentation VM', () => {
    const screen = render(<MonthlyRuleSummary vm={vm(20_000)} onEditIncome={jest.fn()} />);

    expect(screen.getByText('No category budgets planned for May')).toBeTruthy();
    expect(screen.getByText('0% planned')).toBeTruthy();
  });
});
