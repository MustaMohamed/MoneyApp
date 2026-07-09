import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import { BudgetToolRail } from '@/modules/budget/screens/budget/components/budget_tool_rail';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => {
  const { View } = jest.requireActual<typeof import('react-native')>('react-native');
  return ({ name }: { name: string }) => <View testID={`icon-${name}`} />;
});
jest.mock('heroui-native', () => {
  const { Pressable, Text, View } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PressableFeedback: ({ children, ...props }: PressableProps & { children?: ReactNode }) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    Text: { Heading: ({ children }: { children?: ReactNode }) => <Text>{children}</Text> },
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
    Card: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
  };
});

describe('BudgetToolRail', () => {
  it('renders compact icon actions and calls available handlers', () => {
    const onCopy = jest.fn();
    const onAddCategory = jest.fn();
    const onPlan = jest.fn();
    const { getByLabelText, getByTestId, getByText } = render(
      <BudgetToolRail
        onCopy={onCopy}
        onAddCategory={onAddCategory}
        onPlan={onPlan}
        copyDisabled={false}
        addCategoryDisabled={false}
        planDisabled
      />,
    );

    expect(getByText('Copy')).toBeTruthy();
    expect(getByText('Budget')).toBeTruthy();
    expect(getByTestId('icon-wallet-plus-outline')).toBeTruthy();

    fireEvent.press(getByLabelText('Copy budget'));
    fireEvent.press(getByLabelText('Add budget'));

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onAddCategory).toHaveBeenCalledTimes(1);
    expect(onPlan).not.toHaveBeenCalled();
  });

  it('uses an add-plan icon in the plans rail', () => {
    const onPlan = jest.fn();
    const { getByLabelText, getByTestId, getByText, queryByText } = render(
      <BudgetToolRail
        variant="plans"
        onCopy={jest.fn()}
        onAddCategory={jest.fn()}
        onPlan={onPlan}
        copyDisabled={false}
        addCategoryDisabled={false}
        planDisabled={false}
      />,
    );

    expect(getByText('Plan')).toBeTruthy();
    expect(getByTestId('icon-calendar-plus-outline')).toBeTruthy();
    expect(queryByText('Copy')).toBeNull();
    expect(queryByText('Budget')).toBeNull();

    fireEvent.press(getByLabelText('Plan'));
    expect(onPlan).toHaveBeenCalledTimes(1);
  });

  it('can disable copy when there is no source month budget to copy', () => {
    const onCopy = jest.fn();
    const { getByLabelText } = render(
      <BudgetToolRail
        onCopy={onCopy}
        onAddCategory={jest.fn()}
        onPlan={jest.fn()}
        copyDisabled
        addCategoryDisabled={false}
        planDisabled
      />,
    );

    fireEvent.press(getByLabelText('Copy budget'));
    expect(onCopy).not.toHaveBeenCalled();
  });
});
