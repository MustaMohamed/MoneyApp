import { fireEvent, render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { CategoryType } from '@/constants/enums';
import type { SpendingPlanWithCategories } from '@/modules/budget/database/spending_plans';
import SpendingPlanDetailScreen from '@/modules/budget/screens/budget/spending_plan_detail';
import { useSpendingPlanDetail } from '@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.hook';
import { buildSpendingPlanRows } from '@/modules/budget/screens/budget/spending_plans.helpers';
import type { Category } from '@/modules/categories/entities/category.entity';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/modules/budget/screens/budget/spending_plan_detail/spending_plan_detail.hook', () => ({
  useSpendingPlanDetail: jest.fn(),
}));
jest.mock('@/modules/budget/screens/budget/components/spending_plan_sheet', () => ({
  SpendingPlanSheet: () => null,
}));

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
  {
    id: 'cat_travel',
    name: 'Travel',
    type: CategoryType.Expense,
    icon: 'bag',
    color: '#4A7ABF',
    is_default: 0,
    sort_order: 2,
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
    { plan_id: 'plan_trip', category_id: 'cat_travel', allocated_amount: null },
  ],
};
const plan = buildSpendingPlanRows({
  plans: [spendingPlan],
  categories,
  spendByPlanId: { plan_trip: { cat_food: 1200, cat_home: 600, cat_travel: 125 } },
  selectedMonth: '2026-07',
  today: '2026-07-19',
})[0];

const mockedUseSpendingPlanDetail = jest.mocked(useSpendingPlanDetail);

describe('SpendingPlanDetailScreen', () => {
  it('renders full-screen plan insights and category limits', () => {
    const editPlan = jest.fn();
    mockedUseSpendingPlanDetail.mockReturnValue({
      state: { viewState: 'ready', plan, budgetableCategories: categories },
      goBack: jest.fn(),
      editPlan,
    });

    const { getAllByLabelText, getByLabelText, getByText, queryByText } = render(
      <SafeAreaProvider
        initialMetrics={{
          frame: { x: 0, y: 0, width: 390, height: 844 },
          insets: { top: 0, right: 0, bottom: 0, left: 0 },
        }}
      >
        <SpendingPlanDetailScreen />
      </SafeAreaProvider>,
    );

    expect(getByText('Alex weekend')).toBeTruthy();
    expect(getByLabelText('6,075 EGP left')).toBeTruthy();
    expect(getByText('1,925 / 8,000 spent')).toBeTruthy();
    expect(getByText('24% used')).toBeTruthy();
    expect(getByText('Budget used')).toBeTruthy();
    expect(getByText('Time elapsed')).toBeTruthy();
    expect(getByText('26 pts under pace')).toBeTruthy();
    expect(getByText('Housing is 100 over its limit')).toBeTruthy();
    expect(getByText('Category limits')).toBeTruthy();
    expect(getByText('1,925 spent')).toBeTruthy();
    expect(getByText('Food & Dining')).toBeTruthy();
    expect(getByText('1,200 / 3,000')).toBeTruthy();
    expect(getByText('Travel')).toBeTruthy();
    expect(getByText('Included · no category limit')).toBeTruthy();
    expect(getByText('4,500 EGP')).toBeTruthy();
    expect(queryByText('1,200/3,000')).toBeNull();

    fireEvent.press(getAllByLabelText('Edit plan Alex weekend')[0]);
    expect(editPlan).toHaveBeenCalledTimes(1);
  });
});
