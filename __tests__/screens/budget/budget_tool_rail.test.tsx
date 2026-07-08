import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import type { PressableProps } from 'react-native';

import { BudgetToolRail } from '@/modules/budget/screens/budget/components/budget_tool_rail';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
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
    const { getByLabelText, getByText } = render(
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
    expect(getByText('Category')).toBeTruthy();
    expect(getByText('Plan')).toBeTruthy();

    fireEvent.press(getByLabelText('Copy previous month'));
    fireEvent.press(getByLabelText('Budget a category'));
    fireEvent.press(getByLabelText('Spending plans coming in Phase 2'));

    expect(onCopy).toHaveBeenCalledTimes(1);
    expect(onAddCategory).toHaveBeenCalledTimes(1);
    expect(onPlan).not.toHaveBeenCalled();
  });

  it('can disable copy when there is no previous month budget to copy', () => {
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

    fireEvent.press(getByLabelText('Copy previous month'));
    expect(onCopy).not.toHaveBeenCalled();
  });
});
