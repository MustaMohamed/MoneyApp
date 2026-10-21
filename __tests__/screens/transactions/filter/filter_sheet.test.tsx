import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { FILTER_SHEET_ACTION_STYLE } from '@/components/ui/filter_sheet_frame';
import { Strings } from '@/constants/strings';
import { FilterSheet } from '@/modules/transactions/screens/transactions/filter';

type OptionLabelProps = { optionAccessibilityLabel: (name: string) => string };

const mockClose = jest.fn();
const mockResetDraft = jest.fn();
const mockApplyDraft = jest.fn();
const mockAccountAccordionProps = jest.fn<void, [OptionLabelProps]>();
const mockCategoryAccordionProps = jest.fn<void, [OptionLabelProps]>();
const mockAmountAccordionProps = jest.fn<void, [Record<string, unknown>]>();

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetScrollView: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({
    isOpen,
    title,
    footer,
    children,
  }: {
    isOpen: boolean;
    title?: string;
    footer?: ReactNode;
    children?: ReactNode;
  }) => {
    const { Text, View } = jest.requireActual<typeof import('react-native')>('react-native');
    if (!isOpen) return null;
    return (
      <View>
        <Text>{title}</Text>
        {children}
        <View testID="sheet-footer">{footer}</View>
      </View>
    );
  },
}));
jest.mock('@/components/ui/button', () => ({
  Button: ({
    label,
    variant,
    flat,
    onPress,
    isDisabled,
  }: {
    label: string;
    variant?: string;
    flat?: boolean;
    onPress?: () => void;
    isDisabled?: boolean;
  }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <Pressable accessibilityRole="button" disabled={isDisabled} onPress={onPress}>
        <Text>{`${variant}${flat ? ':flat' : ''}:${label}`}</Text>
      </Pressable>
    );
  },
}));
jest.mock('@/modules/transactions/screens/transactions/filter/filter.hook', () => ({
  useFilterSheet: () => ({
    state: {
      visible: true,
      openSection: null,
      draft: {
        accountIds: [],
        categoryIds: [],
        amountCurrency: 'EGP',
      },
      draftCount: 2,
      canApply: true,
      canReset: true,
      accounts: [],
      categories: [],
    },
    close: mockClose,
    toggleSection: jest.fn(),
    resetDraft: mockResetDraft,
    toggleAccountId: jest.fn(),
    toggleCategoryId: jest.fn(),
    setAmountMin: jest.fn(),
    setAmountMax: jest.fn(),
    setAmountCurrency: jest.fn(),
    applyDraft: mockApplyDraft,
  }),
}));
jest.mock('@/components/ui/filter_account_accordion', () => ({
  FilterAccountAccordion: (props: OptionLabelProps) => {
    mockAccountAccordionProps(props);
    return null;
  },
}));
jest.mock('@/components/ui/filter_category_accordion', () => ({
  FilterCategoryAccordion: (props: OptionLabelProps) => {
    mockCategoryAccordionProps(props);
    return null;
  },
}));
jest.mock('@/components/ui/filter_amount_accordion', () => ({
  FilterAmountAccordion: (props: Record<string, unknown>) => {
    mockAmountAccordionProps(props);
    return null;
  },
}));
jest.mock('heroui-native', () => {
  const { Pressable, View } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    PressableFeedback: ({ children, ...props }: { children?: ReactNode }) => (
      <Pressable {...props}>{children}</Pressable>
    ),
    cn: (...args: Array<string | false | null | undefined>) => args.filter(Boolean).join(' '),
    Accordion: Object.assign(({ children }: { children?: ReactNode }) => <View>{children}</View>, {
      Item: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
      Trigger: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
      Content: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
      Indicator: ({ children }: { children?: ReactNode }) => <View>{children}</View>,
    }),
  };
});

describe('FilterSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders Reset and Apply as equal-width themed footer buttons', async () => {
    const { getByText, getByTestId } = await render(<FilterSheet />);

    expect(FILTER_SHEET_ACTION_STYLE).toEqual({ flex: 1 });
    expect(getByText(`secondary:flat:${Strings.filterReset}`)).toBeTruthy();
    expect(getByText(`primary:flat:${Strings.filterApplyWithCount(2)}`)).toBeTruthy();
    expect(getByTestId('filter-reset-action')).toHaveStyle(FILTER_SHEET_ACTION_STYLE);
    expect(getByTestId('filter-apply-action')).toHaveStyle(FILTER_SHEET_ACTION_STYLE);
  });

  it('wires Reset and Apply actions from the footer', async () => {
    const { getByText } = await render(<FilterSheet />);

    await fireEvent.press(getByText(`secondary:flat:${Strings.filterReset}`));
    expect(mockResetDraft).toHaveBeenCalled();

    await fireEvent.press(getByText(`primary:flat:${Strings.filterApplyWithCount(2)}`));
    expect(mockApplyDraft).toHaveBeenCalled();
  });

  it('labels the shared sections with the transactions copy', async () => {
    await render(<FilterSheet />);

    expect(mockAmountAccordionProps).toHaveBeenLastCalledWith(
      expect.objectContaining({
        currencyAccessibilityLabel: Strings.filterAmountCurrencyAccessibility,
      }),
    );
    const accountLabel = mockAccountAccordionProps.mock.lastCall?.[0].optionAccessibilityLabel;
    const categoryLabel = mockCategoryAccordionProps.mock.lastCall?.[0].optionAccessibilityLabel;
    expect(accountLabel?.('Cash')).toBe(Strings.filterAccountAccessibility('Cash'));
    expect(categoryLabel?.('Food')).toBe(Strings.filterCategoryAccessibility('Food'));
  });
});
