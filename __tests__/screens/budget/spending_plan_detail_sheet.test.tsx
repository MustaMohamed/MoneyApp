import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CategoryType } from '@/constants/enums';
import type { SpendingPlanWithCategories } from '@/modules/budget/database/spending_plans';
import { SpendingPlanDetailSheet } from '@/modules/budget/screens/budget/components/spending_plan_detail_sheet';
import { buildSpendingPlanRows } from '@/modules/budget/screens/budget/spending_plans.helpers';
import type { Category } from '@/modules/categories/entities/category.entity';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

const categories: Category[] = [
  {
    id: 'cat_food',
    name: 'Food & Dining',
    type: CategoryType.Expense,
    icon: 'food',
    color: '#D4A44C',
    is_default: 0,
    sort_order: 0,
    budget_group: null,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'cat_home',
    name: 'Housing',
    type: CategoryType.Expense,
    icon: 'home',
    color: '#17294C',
    is_default: 0,
    sort_order: 1,
    budget_group: null,
    created_at: '',
    updated_at: '',
  },
];
const spendingPlan: SpendingPlanWithCategories = {
  id: 'plan_trip',
  name: 'Alex weekend',
  start_date: '2026-07-18',
  end_date: '2026-07-21',
  total_amount: 8000,
  created_at: '',
  updated_at: '',
  categories: [
    { plan_id: 'plan_trip', category_id: 'cat_food', allocated_amount: 3000 },
    { plan_id: 'plan_trip', category_id: 'cat_home', allocated_amount: 500 },
  ],
};
const plan = buildSpendingPlanRows({
  plans: [spendingPlan],
  categories,
  spendByPlanId: { plan_trip: { cat_food: 1200, cat_home: 600 } },
  selectedMonth: '2026-07',
  today: '2026-07-19',
})[0];

describe('SpendingPlanDetailSheet', () => {
  it('renders category limits as compact progress chips with spent over total', () => {
    const { getAllByText, getByText, queryByText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <SpendingPlanDetailSheet isOpen plan={plan} onOpenChange={jest.fn()} onEdit={jest.fn()} />
      </SafeAreaProvider>,
    );

    expect(getAllByText('Food & Dining').length).toBeGreaterThan(0);
    expect(getByText('40%')).toBeTruthy();
    expect(getByText('1,200/3,000')).toBeTruthy();
    expect(getByText('600/500')).toBeTruthy();
    expect(queryByText('1,200 / 3,000')).toBeNull();
  });
});
