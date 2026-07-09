import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { SpendingPlanDetailSheet } from '@/modules/budget/screens/budget/components/spending_plan_detail_sheet';
import type { SpendingPlanRowVM } from '@/modules/budget/screens/budget/spending_plans.helpers';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

const plan: SpendingPlanRowVM = {
  id: 'plan_trip',
  name: 'Alex weekend',
  startDate: '2026-07-18',
  endDate: '2026-07-21',
  totalAmount: 8000,
  spent: 1200,
  left: 6800,
  pct: 0.15,
  isOver: false,
  categoryCount: 2,
  categoryChips: [
    { id: 'cat_food', name: 'Food & Dining', icon: 'food', color: '#D4A44C' },
    { id: 'cat_home', name: 'Housing', icon: 'home', color: '#17294C' },
  ],
  cardChips: [],
  allocationRows: [
    {
      categoryId: 'cat_food',
      categoryName: 'Food & Dining',
      icon: 'food',
      color: '#D4A44C',
      allocatedAmount: 3000,
      spent: 1200,
      left: 1800,
      pct: 0.4,
      isOver: false,
    },
    {
      categoryId: 'cat_home',
      categoryName: 'Housing',
      icon: 'home',
      color: '#17294C',
      allocatedAmount: 500,
      spent: 600,
      left: -100,
      pct: 1.2,
      isOver: true,
    },
  ],
  allocatedTotal: 3500,
  buffer: 4500,
};

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
