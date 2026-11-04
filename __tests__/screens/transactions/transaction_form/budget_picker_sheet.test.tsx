import { fireEvent, render, within } from '@testing-library/react-native';
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

type HeroUIDouble = React.ComponentType<Record<string, unknown>>;

const heroUIDouble = jest.requireMock<{
  Radio: HeroUIDouble;
  RadioGroup: { Item: HeroUIDouble };
}>('heroui-native');

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
    // `role="radio"` tells a radio from a checkbox; `accessibilityState` alone does not.
    expect(screen.getByTestId('budget-picker-row-budget-12')).toHaveProp('role', 'radio');
    expect(screen.getByTestId('budget-picker-list')).toBeTruthy();
    expect(screen.getByTestId('budget-picker-row-budget-12')).toHaveProp('accessibilityState', {
      checked: true,
    });
    expect(
      within(screen.getByTestId('budget-picker-row-budget-12')).getByText('512 EGP'),
    ).toBeTruthy();

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

  describe('in the accessibility tree', () => {
    const baseRadio = heroUIDouble.Radio;
    const baseItem = heroUIDouble.RadioGroup.Item;

    // HeroUI's Item and Radio are each a Pressable with role="radio" (primitives/radio-group/radio-group.tsx:81-86, primitives/radio/radio.tsx:88-101).
    beforeAll(() => {
      heroUIDouble.Radio = (props) =>
        React.createElement(baseRadio, { role: 'radio', accessible: true, ...props });
      heroUIDouble.RadioGroup.Item = (props) =>
        React.createElement(baseItem, { accessible: true, ...props });
    });

    afterAll(() => {
      heroUIDouble.Radio = baseRadio;
      heroUIDouble.RadioGroup.Item = baseItem;
    });

    it('reads each row as one radio, its trailing radio no node of its own', async () => {
      const screen = await render(
        <BudgetPickerSheet
          isOpen
          budgets={[1, 2, 3].map(budget)}
          selectedId="budget-1"
          onSelect={jest.fn()}
          onOpenChange={jest.fn()}
        />,
      );

      expect(screen.getAllByRole('radio').map((node) => node.props.testID)).toEqual([
        'budget-picker-row-budget-1',
        'budget-picker-row-budget-2',
        'budget-picker-row-budget-3',
      ]);
      expect(screen.queryByTestId('budget-picker-row-budget-1-selected')).toBeNull();
      expect(
        screen.getByTestId('budget-picker-row-budget-1-selected', { includeHiddenElements: true }),
      ).toBeTruthy();
    });
  });
});
