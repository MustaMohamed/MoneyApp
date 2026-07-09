import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import { Strings } from '@/constants/strings';
import type { BudgetCopyRowVM } from '@/modules/budget/screens/budget/budget.helpers';
import { BudgetCopySheet } from '@/modules/budget/screens/budget/components/budget_copy_sheet';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@gorhom/bottom-sheet', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    BottomSheetScrollView: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
  };
});
jest.mock('@/components/ui/sheet', () => ({
  SHEET_FOOTER_CLEARANCE: 120,
  Sheet: ({
    isOpen,
    children,
    footer,
  }: {
    isOpen: boolean;
    children?: ReactNode;
    footer?: ReactNode;
  }) => {
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return isOpen ? (
      <View>
        {children}
        {footer}
      </View>
    ) : null;
  },
}));
jest.mock('heroui-native', () => {
  const { Pressable, Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  const Checkbox = ({
    children,
    className,
    isSelected,
    onSelectedChange,
    accessibilityLabel,
  }: {
    children?: ReactNode;
    className?: string;
    isSelected?: boolean;
    onSelectedChange?: (selected: boolean) => void;
    accessibilityLabel?: string;
  }) => (
    <Pressable
      testID="checkbox-root"
      className={className}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: Boolean(isSelected) }}
      onPress={() => onSelectedChange?.(!isSelected)}
    >
      {children}
    </Pressable>
  );
  Checkbox.Indicator = () => <View testID="checkbox-indicator" />;
  return {
    Checkbox,
    PressableFeedback: ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    Text: { Heading: ({ children }: { children?: ReactNode }) => <Text>{children}</Text> },
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});

const rows: BudgetCopyRowVM[] = [
  {
    id: 'budget-food',
    categoryId: 'food',
    categoryName: 'Food & Dining',
    name: 'Monthly Food',
    icon: 'food',
    color: '#caa445',
    amount: 3500,
    status: 'will-replace',
  },
  {
    id: 'budget-car',
    categoryId: 'car',
    categoryName: 'Car',
    name: 'Fuel',
    icon: 'car',
    color: '#55aaff',
    amount: 1200,
    status: 'new',
  },
];

describe('BudgetCopySheet', () => {
  it('renders checklist rows and applies selected categories', () => {
    const onToggleBudget = jest.fn();
    const onSelectAll = jest.fn();
    const onClearSelection = jest.fn();
    const onApply = jest.fn();

    const { getByText, getByLabelText } = render(
      <BudgetCopySheet
        isOpen
        sourceMonth="2026-06"
        targetMonthLabel="July 2026"
        rows={rows}
        selectedBudgetIds={['budget-food']}
        onSourceMonthChange={jest.fn()}
        onOpenChange={jest.fn()}
        onToggleBudget={onToggleBudget}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
        onApply={onApply}
      />,
    );

    expect(getByText('Copy from')).toBeTruthy();
    expect(getByText('June 2026')).toBeTruthy();
    expect(getByText('July 2026')).toBeTruthy();
    expect(getByText('Monthly Food')).toBeTruthy();
    expect(getByText('Food & Dining / Will replace')).toBeTruthy();
    expect(getByText('3,500')).toBeTruthy();
    expect(getByText('Fuel')).toBeTruthy();
    expect(getByText('Car / New')).toBeTruthy();

    fireEvent.press(getByLabelText('Toggle Fuel'));
    expect(onToggleBudget).toHaveBeenCalledWith('budget-car');

    fireEvent.press(getByText('Select all'));
    expect(onSelectAll).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Clear'));
    expect(onClearSelection).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Apply'));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('keeps checkbox controls compact instead of stretching them over the full row', () => {
    const { getAllByTestId } = render(
      <BudgetCopySheet
        isOpen
        sourceMonth="2026-06"
        targetMonthLabel="July 2026"
        rows={rows}
        selectedBudgetIds={['budget-food', 'budget-car']}
        onSourceMonthChange={jest.fn()}
        onOpenChange={jest.fn()}
        onToggleBudget={jest.fn()}
        onSelectAll={jest.fn()}
        onClearSelection={jest.fn()}
        onApply={jest.fn()}
      />,
    );

    expect(getAllByTestId('checkbox-root').map((node) => node.props.className)).toEqual([
      expect.not.stringContaining('w-full'),
      expect.not.stringContaining('w-full'),
    ]);
  });

  it('keeps unchecked checkbox controls visibly bordered on the row surface', () => {
    const { getAllByTestId } = render(
      <BudgetCopySheet
        isOpen
        sourceMonth="2026-06"
        targetMonthLabel="July 2026"
        rows={rows}
        selectedBudgetIds={[]}
        onSourceMonthChange={jest.fn()}
        onOpenChange={jest.fn()}
        onToggleBudget={jest.fn()}
        onSelectAll={jest.fn()}
        onClearSelection={jest.fn()}
        onApply={jest.fn()}
      />,
    );

    expect(getAllByTestId('checkbox-root').map((node) => node.props.className)).toEqual([
      expect.stringContaining('border'),
      expect.stringContaining('border'),
    ]);
  });

  it('opens a direct month picker for changing the copy source month', () => {
    const onSourceMonthChange = jest.fn();
    const { getByLabelText, queryByLabelText } = render(
      <BudgetCopySheet
        isOpen
        sourceMonth="2026-06"
        targetMonthLabel="July 2026"
        rows={rows}
        selectedBudgetIds={['budget-food']}
        onSourceMonthChange={onSourceMonthChange}
        onOpenChange={jest.fn()}
        onToggleBudget={jest.fn()}
        onSelectAll={jest.fn()}
        onClearSelection={jest.fn()}
        onApply={jest.fn()}
      />,
    );

    expect(queryByLabelText(Strings.monthFilterPreviousA11y)).toBeNull();
    expect(queryByLabelText(Strings.monthFilterNextA11y)).toBeNull();

    fireEvent.press(getByLabelText(Strings.monthFilterOpenA11y('June 2026')));
    fireEvent.press(getByLabelText('May 2026'));

    expect(onSourceMonthChange).toHaveBeenCalledWith('2026-05');
  });

  it('disables apply when nothing is selected', () => {
    const onApply = jest.fn();
    const { getByText } = render(
      <BudgetCopySheet
        isOpen
        sourceMonth="2026-06"
        targetMonthLabel="July 2026"
        rows={rows}
        selectedBudgetIds={[]}
        onSourceMonthChange={jest.fn()}
        onOpenChange={jest.fn()}
        onToggleBudget={jest.fn()}
        onSelectAll={jest.fn()}
        onClearSelection={jest.fn()}
        onApply={onApply}
      />,
    );

    fireEvent.press(getByText('Apply'));
    expect(onApply).not.toHaveBeenCalled();
  });

  it('shows an empty message when the selected source month has no budgets', () => {
    const { getByText, queryByText } = render(
      <BudgetCopySheet
        isOpen
        sourceMonth="2026-06"
        targetMonthLabel="July 2026"
        rows={[]}
        selectedBudgetIds={[]}
        onSourceMonthChange={jest.fn()}
        onOpenChange={jest.fn()}
        onToggleBudget={jest.fn()}
        onSelectAll={jest.fn()}
        onClearSelection={jest.fn()}
        onApply={jest.fn()}
      />,
    );

    expect(getByText('Nothing to copy')).toBeTruthy();
    expect(queryByText('Select all')).toBeNull();
  });
});
