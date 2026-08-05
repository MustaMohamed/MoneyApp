import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';

const mockSheet = jest.fn(
  ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) => {
    const ReactLocal = jest.requireActual<typeof import('react')>('react');
    const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
    return isOpen
      ? ReactLocal.createElement(RNView, { testID: 'budget-picker-shell' }, children)
      : null;
  },
);

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return (props: object) => ReactLocal.createElement(RNView, props);
});

jest.mock('@/components/ui/sheet', () => ({
  Sheet: (props: { isOpen: boolean; children: React.ReactNode }) => mockSheet(props),
}));

jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetFlatList: ({
    data,
    renderItem,
    ...props
  }: {
    data: object[];
    renderItem: (input: { item: object; index: number }) => React.ReactNode;
  }) => {
    const ReactLocal = jest.requireActual<typeof import('react')>('react');
    const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
    return ReactLocal.createElement(
      RNView,
      { testID: 'budget-picker-list', ...props },
      data.map((item, index) =>
        ReactLocal.createElement(ReactLocal.Fragment, { key: index }, renderItem({ item, index })),
      ),
    );
  },
}));

import { Strings } from '@/constants/strings';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import { BudgetPickerSheet } from '@/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet';

const NOW = '2026-07-20T00:00:00.000Z';

function budget(index: number): Budget {
  return {
    id: `budget-${index}`,
    category_id: 'category-1',
    name: `Budget ${index}`,
    limit_amount: 500 + index,
    effective_from: '2026-07',
    created_at: NOW,
    updated_at: NOW,
  };
}

describe('BudgetPickerSheet', () => {
  beforeEach(() => mockSheet.mockClear());

  it('uses a bounded scrollable sheet for a long list and selects a row', async () => {
    const budgets = Array.from({ length: 30 }, (_, index) => budget(index));
    const onSelect = jest.fn();
    const screen = await render(
      <BudgetPickerSheet
        isOpen
        budgets={budgets}
        selectedId="budget-12"
        onSelect={onSelect}
        onOpenChange={jest.fn()}
      />,
    );

    expect(mockSheet).toHaveBeenLastCalledWith(
      expect.objectContaining({ size: 'md', scrollable: true }),
    );
    // The old `UNSAFE_getByProps({ role: 'radiogroup' })` reached into a composite
    // component, which Test Renderer no longer exposes. Radio semantics are covered
    // behaviourally by the accessibilityState assertion below.
    expect(screen.getByTestId('budget-picker-list')).toBeTruthy();
    expect(screen.getByTestId('budget-picker-row-budget-12')).toHaveProp('accessibilityState', {
      checked: true,
    });

    await fireEvent.press(screen.getByTestId('budget-picker-row-budget-29'));
    expect(onSelect).toHaveBeenCalledWith(budgets[29]);
  });

  it('renders a clear empty state instead of an empty sheet', async () => {
    const screen = await render(
      <BudgetPickerSheet
        isOpen
        budgets={[]}
        selectedId={undefined}
        onSelect={jest.fn()}
        onOpenChange={jest.fn()}
      />,
    );

    expect(screen.getByText(Strings.addTxBudgetEmptyTitle)).toBeTruthy();
    expect(screen.getByText(Strings.addTxBudgetEmptyBody)).toBeTruthy();
    expect(screen.queryByTestId('budget-picker-list')).toBeNull();
  });
});
