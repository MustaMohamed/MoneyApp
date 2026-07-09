import { fireEvent, render } from '@testing-library/react-native';

import { SpendingPlansLens } from '@/modules/budget/screens/budget/components/spending_plans_lens';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

describe('SpendingPlansLens', () => {
  const summary = { planned: 8000, spent: 1200, left: 6800, pct: 0.15 };
  const row = {
    id: 'plan_trip',
    name: 'Alexandria weekend',
    startDate: '2026-07-18',
    endDate: '2026-07-21',
    totalAmount: 8000,
    spent: 1200,
    left: 6800,
    pct: 0.15,
    isOver: false,
    categoryCount: 2,
    categoryChips: [
      { id: 'cat_food', name: 'Food', icon: 'food', color: '#f90' },
      { id: 'cat_travel', name: 'Travel', icon: 'car', color: '#09f' },
    ],
    allocationRows: [
      {
        categoryId: 'cat_food',
        categoryName: 'Food',
        icon: 'food',
        color: '#f90',
        allocatedAmount: 3000,
        spent: 1200,
        left: 1800,
        pct: 0.4,
        isOver: false,
      },
    ],
    allocatedTotal: 3000,
    buffer: 5000,
  };

  it('renders summary and plan cards', () => {
    const { getAllByText, getByText } = render(
      <SpendingPlansLens
        rows={[row]}
        summary={summary}
        onCreate={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(getByText('Alexandria weekend')).toBeTruthy();
    expect(getByText('8,000')).toBeTruthy();
    expect(getByText('1,200')).toBeTruthy();
    expect(getAllByText('Food').length).toBeGreaterThan(0);
  });

  it('renders empty state and create action', () => {
    const onCreate = jest.fn();
    const { getByText } = render(
      <SpendingPlansLens
        rows={[]}
        summary={{ planned: 0, spent: 0, left: 0, pct: 0 }}
        onCreate={onCreate}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    fireEvent.press(getByText('Create plan'));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
