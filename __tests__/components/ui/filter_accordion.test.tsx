import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import {
  AmountRangeFilterContent,
  FILTER_AMOUNT_ERROR_SLOT_HEIGHT,
  FilterAccordionShell,
  FilterOptionPillList,
} from '@/components/ui/filter_accordion';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('heroui-native', () => {
  const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');
  let onValueChange: ((value: string | undefined) => void) | undefined;
  return {
    Accordion: Object.assign(
      ({
        children,
        onValueChange: nextOnValueChange,
      }: {
        children?: ReactNode;
        onValueChange?: (value: string | undefined) => void;
      }) => {
        onValueChange = nextOnValueChange;
        return <View>{children}</View>;
      },
      {
        Content: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
        Indicator: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
        Item: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
        Trigger: ({ children, ...props }: { children?: ReactNode }) => (
          <Pressable {...props} onPress={() => onValueChange?.('section')}>
            {children}
          </Pressable>
        ),
      },
    ),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
  };
});
jest.mock('@/components/ui/chip', () => ({
  SelectablePill: ({
    label,
    selected,
    onPress,
    accessibilityLabel,
  }: {
    label: string;
    selected: boolean;
    onPress: () => void;
    accessibilityLabel: string;
  }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ selected }}
        onPress={onPress}
      >
        <Text>{label}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/components/ui/tabs', () => ({
  SegmentedTabs: ({
    segments,
    value,
    onValueChange,
    accessibilityLabel,
  }: {
    segments: ReadonlyArray<{ value: Currency; label: string }>;
    value: Currency;
    onValueChange: (value: Currency) => void;
    accessibilityLabel: string;
  }) => {
    const { Pressable, Text, View } =
      jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <View accessibilityLabel={accessibilityLabel}>
        {segments.map((segment) => (
          <Pressable key={segment.value} onPress={() => onValueChange(segment.value)}>
            <Text>{segment.value === value ? `${segment.label} selected` : segment.label}</Text>
          </Pressable>
        ))}
      </View>
    );
  },
}));
jest.mock('@/components/ui/input', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { TextInput } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Input: (props: object) => ReactLocal.createElement(TextInput, props),
  };
});

describe('FilterAccordionShell', () => {
  it('renders title, count, collapsed summary, and children', async () => {
    const onToggle = jest.fn();
    const { getByText } = await render(
      <FilterAccordionShell
        title="Accounts"
        count={2}
        summary="CIB, Cash"
        expanded={false}
        onToggle={onToggle}
      >
        <FilterOptionPillList
          options={[
            {
              id: 'cib',
              label: 'CIB',
              selected: true,
              accessibilityLabel: 'CIB account filter',
            },
          ]}
          onToggle={jest.fn()}
        />
      </FilterAccordionShell>,
    );

    expect(getByText('Accounts')).toBeTruthy();
    expect(getByText('2')).toBeTruthy();
    expect(getByText('CIB, Cash')).toBeTruthy();
    expect(getByText('CIB')).toBeTruthy();
    await fireEvent.press(getByText('Accounts'));
    expect(onToggle).toHaveBeenCalled();
  });

  it('hides summary while expanded', async () => {
    const { queryByText } = await render(
      <FilterAccordionShell
        title="Categories"
        count={0}
        summary="All categories"
        expanded
        onToggle={jest.fn()}
      >
        <></>
      </FilterAccordionShell>,
    );

    expect(queryByText('All categories')).toBeNull();
  });
});

describe('FilterOptionPillList', () => {
  it('renders options and calls onToggle with the option id', async () => {
    const onToggle = jest.fn();
    const { getByLabelText } = await render(
      <FilterOptionPillList
        options={[
          {
            id: 'food',
            label: 'Food',
            selected: false,
            accessibilityLabel: 'Food category filter',
          },
        ]}
        onToggle={onToggle}
      />,
    );

    await fireEvent.press(getByLabelText('Food category filter'));
    expect(onToggle).toHaveBeenCalledWith('food');
  });
});

describe('AmountRangeFilterContent', () => {
  it('renders currency tabs and min/max inputs', async () => {
    const onChangeCurrency = jest.fn();
    const onChangeMinText = jest.fn();
    const onChangeMaxText = jest.fn();
    const { getByLabelText, getByPlaceholderText, getByText } = await render(
      <AmountRangeFilterContent
        amountCurrency={Currency.EGP}
        minValue="100"
        maxValue=""
        onChangeCurrency={onChangeCurrency}
        onChangeMinText={onChangeMinText}
        onChangeMaxText={onChangeMaxText}
        accessibilityLabel="Amount currency"
      />,
    );

    expect(getByLabelText('Amount currency')).toBeTruthy();
    expect(getByText('EGP selected')).toBeTruthy();
    await fireEvent.press(getByText('USD'));
    expect(onChangeCurrency).toHaveBeenCalledWith(Currency.USD);

    await fireEvent.changeText(getByPlaceholderText('0'), '200');
    expect(onChangeMinText).toHaveBeenCalledWith('200');

    await fireEvent.changeText(getByPlaceholderText('∞'), '500');
    expect(onChangeMaxText).toHaveBeenCalledWith('500');
    expect(getByText(Strings.filterAmountMinLabel)).toBeTruthy();
    expect(getByText(Strings.filterAmountMaxLabel)).toBeTruthy();
  });

  it('reserves validation slots while amount errors appear and clear', async () => {
    const baseProps = {
      amountCurrency: Currency.EGP,
      minValue: '500',
      maxValue: '100',
      onChangeCurrency: jest.fn(),
      onChangeMinText: jest.fn(),
      onChangeMaxText: jest.fn(),
      accessibilityLabel: 'Amount currency',
    };
    const screen = await render(<AmountRangeFilterContent {...baseProps} />);

    expect(screen.getAllByTestId('amount-field-error-slot')).toHaveLength(2);
    expect(screen.getByTestId('amount-range-error-slot')).toHaveStyle({
      height: FILTER_AMOUNT_ERROR_SLOT_HEIGHT,
    });

    await screen.rerender(
      <AmountRangeFilterContent
        {...baseProps}
        minError="Enter a valid minimum"
        rangeError="Minimum cannot exceed maximum"
      />,
    );

    expect(screen.getAllByTestId('amount-field-error-slot')).toHaveLength(2);
    expect(screen.getByTestId('amount-range-error-slot')).toHaveStyle({
      height: FILTER_AMOUNT_ERROR_SLOT_HEIGHT,
    });
    expect(screen.getByText('Minimum cannot exceed maximum')).toBeTruthy();
  });
});
