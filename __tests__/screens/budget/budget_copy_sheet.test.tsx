import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

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
    isSelected,
    onSelectedChange,
    accessibilityLabel,
  }: {
    children?: ReactNode;
    isSelected?: boolean;
    onSelectedChange?: (selected: boolean) => void;
    accessibilityLabel?: string;
  }) => (
    <Pressable
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
    categoryId: 'food',
    name: 'Food',
    icon: 'food',
    color: '#caa445',
    amount: 3500,
    status: 'will-replace',
  },
  {
    categoryId: 'car',
    name: 'Car',
    icon: 'car',
    color: '#55aaff',
    amount: 1200,
    status: 'new',
  },
];

describe('BudgetCopySheet', () => {
  it('renders checklist rows and applies selected categories', () => {
    const onToggleCategory = jest.fn();
    const onSelectAll = jest.fn();
    const onClearSelection = jest.fn();
    const onApply = jest.fn();

    const { getByText, getByLabelText } = render(
      <BudgetCopySheet
        isOpen
        sourceMonthLabel="June 2026"
        targetMonthLabel="July 2026"
        rows={rows}
        selectedCategoryIds={['food']}
        onOpenChange={jest.fn()}
        onToggleCategory={onToggleCategory}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
        onApply={onApply}
      />,
    );

    expect(getByText('June 2026 → July 2026')).toBeTruthy();
    expect(getByText('Food')).toBeTruthy();
    expect(getByText('3,500')).toBeTruthy();
    expect(getByText('Will replace')).toBeTruthy();
    expect(getByText('Car')).toBeTruthy();
    expect(getByText('New')).toBeTruthy();

    fireEvent.press(getByLabelText('Toggle Car'));
    expect(onToggleCategory).toHaveBeenCalledWith('car');

    fireEvent.press(getByText('Select all'));
    expect(onSelectAll).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Clear'));
    expect(onClearSelection).toHaveBeenCalledTimes(1);

    fireEvent.press(getByText('Apply'));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('disables apply when nothing is selected', () => {
    const onApply = jest.fn();
    const { getByText } = render(
      <BudgetCopySheet
        isOpen
        sourceMonthLabel="June 2026"
        targetMonthLabel="July 2026"
        rows={rows}
        selectedCategoryIds={[]}
        onOpenChange={jest.fn()}
        onToggleCategory={jest.fn()}
        onSelectAll={jest.fn()}
        onClearSelection={jest.fn()}
        onApply={onApply}
      />,
    );

    fireEvent.press(getByText('Apply'));
    expect(onApply).not.toHaveBeenCalled();
  });

  it('shows an empty message when previous month has no budgets', () => {
    const { getByText, queryByText } = render(
      <BudgetCopySheet
        isOpen
        sourceMonthLabel="June 2026"
        targetMonthLabel="July 2026"
        rows={[]}
        selectedCategoryIds={[]}
        onOpenChange={jest.fn()}
        onToggleCategory={jest.fn()}
        onSelectAll={jest.fn()}
        onClearSelection={jest.fn()}
        onApply={jest.fn()}
      />,
    );

    expect(getByText('Nothing to copy')).toBeTruthy();
    expect(queryByText('Select all')).toBeNull();
  });
});
