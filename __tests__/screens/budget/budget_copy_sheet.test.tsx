import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import { Strings } from '@/constants/strings';
import type { BudgetCopyRowVM } from '@/modules/budget/screens/budget/budget.helpers';
import { BudgetCopySheet } from '@/modules/budget/screens/budget/components/budget_copy_sheet';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@/components/ui/button', () => ({
  Button: ({
    label,
    onPress,
    isDisabled,
  }: {
    label: string;
    onPress: () => void;
    isDisabled?: boolean;
  }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <Pressable accessibilityRole="button" disabled={isDisabled} onPress={onPress}>
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));
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
  const Alert = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Alert.Indicator = () => null;
  Alert.Content = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  Alert.Title = ({ children }: { children?: ReactNode }) => <Text>{children}</Text>;
  const SkeletonGroup = ({ children }: { children?: ReactNode }) => <View>{children}</View>;
  SkeletonGroup.Item = () => <View testID="copy-preview-skeleton" />;
  return {
    Alert,
    Checkbox,
    PressableFeedback: ({
      children,
      isDisabled,
      ...props
    }: PressableProps & { children?: ReactNode; isDisabled?: boolean }) => (
      <Pressable {...props} disabled={isDisabled}>
        {children}
      </Pressable>
    ),
    SkeletonGroup,
    Typography: { Heading: ({ children }: { children?: ReactNode }) => <Text>{children}</Text> },
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
  it('renders checklist rows and applies selected categories', async () => {
    const onToggleBudget = jest.fn();
    const onSelectAll = jest.fn();
    const onClearSelection = jest.fn();
    const onApply = jest.fn();

    const { getByText, getByLabelText } = await render(
      <BudgetCopySheet
        isOpen
        sourceMonth="2026-06"
        targetMonthLabel="July 2026"
        rows={rows}
        selectedBudgetIds={['budget-food']}
        previewLoading={false}
        previewError={false}
        copyBusy={false}
        copyError={false}
        onSourceMonthChange={jest.fn()}
        onOpenChange={jest.fn()}
        onToggleBudget={onToggleBudget}
        onSelectAll={onSelectAll}
        onClearSelection={onClearSelection}
        onRetryPreview={jest.fn()}
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

    await fireEvent.press(getByLabelText('Toggle Fuel'));
    expect(onToggleBudget).toHaveBeenCalledWith('budget-car');

    await fireEvent.press(getByText('Select all'));
    expect(onSelectAll).toHaveBeenCalledTimes(1);

    await fireEvent.press(getByText('Clear'));
    expect(onClearSelection).toHaveBeenCalledTimes(1);

    await fireEvent.press(getByText('Apply'));
    expect(onApply).toHaveBeenCalledTimes(1);
  });

  it('keeps checkbox controls compact instead of stretching them over the full row', async () => {
    const { getAllByTestId } = await render(
      <BudgetCopySheet
        isOpen
        sourceMonth="2026-06"
        targetMonthLabel="July 2026"
        rows={rows}
        selectedBudgetIds={['budget-food', 'budget-car']}
        previewLoading={false}
        previewError={false}
        copyBusy={false}
        copyError={false}
        onSourceMonthChange={jest.fn()}
        onOpenChange={jest.fn()}
        onToggleBudget={jest.fn()}
        onSelectAll={jest.fn()}
        onClearSelection={jest.fn()}
        onRetryPreview={jest.fn()}
        onApply={jest.fn()}
      />,
    );

    expect(getAllByTestId('checkbox-root').map((node) => node.props.className)).toEqual([
      expect.not.stringContaining('w-full'),
      expect.not.stringContaining('w-full'),
    ]);
  });

  it('keeps unchecked checkbox controls visibly bordered on the row surface', async () => {
    const { getAllByTestId } = await render(
      <BudgetCopySheet
        isOpen
        sourceMonth="2026-06"
        targetMonthLabel="July 2026"
        rows={rows}
        selectedBudgetIds={[]}
        previewLoading={false}
        previewError={false}
        copyBusy={false}
        copyError={false}
        onSourceMonthChange={jest.fn()}
        onOpenChange={jest.fn()}
        onToggleBudget={jest.fn()}
        onSelectAll={jest.fn()}
        onClearSelection={jest.fn()}
        onRetryPreview={jest.fn()}
        onApply={jest.fn()}
      />,
    );

    expect(getAllByTestId('checkbox-root').map((node) => node.props.className)).toEqual([
      expect.stringContaining('border'),
      expect.stringContaining('border'),
    ]);
  });

  it('opens a direct month picker for changing the copy source month', async () => {
    const onSourceMonthChange = jest.fn();
    const { getByLabelText, queryByLabelText } = await render(
      <BudgetCopySheet
        isOpen
        sourceMonth="2026-06"
        targetMonthLabel="July 2026"
        rows={rows}
        selectedBudgetIds={['budget-food']}
        previewLoading={false}
        previewError={false}
        copyBusy={false}
        copyError={false}
        onSourceMonthChange={onSourceMonthChange}
        onOpenChange={jest.fn()}
        onToggleBudget={jest.fn()}
        onSelectAll={jest.fn()}
        onClearSelection={jest.fn()}
        onRetryPreview={jest.fn()}
        onApply={jest.fn()}
      />,
    );

    expect(queryByLabelText(Strings.monthFilterPreviousA11y)).toBeNull();
    expect(queryByLabelText(Strings.monthFilterNextA11y)).toBeNull();

    await fireEvent.press(getByLabelText(Strings.monthFilterOpenA11y('June 2026')));
    await fireEvent.press(getByLabelText('May 2026'));

    expect(onSourceMonthChange).toHaveBeenCalledWith('2026-05');
  });

  it('disables apply when nothing is selected', async () => {
    const onApply = jest.fn();
    const { getByText } = await render(
      <BudgetCopySheet
        isOpen
        sourceMonth="2026-06"
        targetMonthLabel="July 2026"
        rows={rows}
        selectedBudgetIds={[]}
        previewLoading={false}
        previewError={false}
        copyBusy={false}
        copyError={false}
        onSourceMonthChange={jest.fn()}
        onOpenChange={jest.fn()}
        onToggleBudget={jest.fn()}
        onSelectAll={jest.fn()}
        onClearSelection={jest.fn()}
        onRetryPreview={jest.fn()}
        onApply={onApply}
      />,
    );

    await fireEvent.press(getByText('Apply'));
    expect(onApply).not.toHaveBeenCalled();
  });

  it('shows an empty message when the selected source month has no budgets', async () => {
    const { getByText, queryByText } = await render(
      <BudgetCopySheet
        isOpen
        sourceMonth="2026-06"
        targetMonthLabel="July 2026"
        rows={[]}
        selectedBudgetIds={[]}
        previewLoading={false}
        previewError={false}
        copyBusy={false}
        copyError={false}
        onSourceMonthChange={jest.fn()}
        onOpenChange={jest.fn()}
        onToggleBudget={jest.fn()}
        onSelectAll={jest.fn()}
        onClearSelection={jest.fn()}
        onRetryPreview={jest.fn()}
        onApply={jest.fn()}
      />,
    );

    expect(getByText('Nothing to copy')).toBeTruthy();
    expect(queryByText('Select all')).toBeNull();
  });
});
