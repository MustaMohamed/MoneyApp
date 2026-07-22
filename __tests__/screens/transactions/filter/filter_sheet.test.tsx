import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { Strings } from '@/constants/strings';
import {
  FILTER_SHEET_ACTION_STYLE,
  FilterSheet,
} from '@/modules/transactions/screens/transactions/filter';

const mockClose = jest.fn();
const mockResetDraft = jest.fn();
const mockApplyDraft = jest.fn();

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@gorhom/bottom-sheet', () => ({
  BottomSheetScrollView: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));
jest.mock('@/components/ui/sheet', () => ({
  SHEET_FOOTER_CLEARANCE: 124,
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
    onPress,
    isDisabled,
  }: {
    label: string;
    variant?: string;
    onPress?: () => void;
    isDisabled?: boolean;
  }) => {
    const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return (
      <Pressable accessibilityRole="button" disabled={isDisabled} onPress={onPress}>
        <Text>{`${variant}:${label}`}</Text>
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
jest.mock(
  '@/modules/transactions/screens/transactions/filter/components/account_accordion',
  () => ({
    AccountAccordion: () => null,
  }),
);
jest.mock(
  '@/modules/transactions/screens/transactions/filter/components/category_accordion',
  () => ({
    CategoryAccordion: () => null,
  }),
);
jest.mock('@/modules/transactions/screens/transactions/filter/components/amount_accordion', () => ({
  AmountAccordion: () => null,
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

  it('renders Reset and Apply as equal-width themed footer buttons', () => {
    const { getByText, getByTestId } = render(<FilterSheet />);

    expect(FILTER_SHEET_ACTION_STYLE).toEqual({ flex: 1 });
    expect(getByText(`secondary:${Strings.filterReset}`)).toBeTruthy();
    expect(getByText(`primary:${Strings.filterApplyWithCount(2)}`)).toBeTruthy();
    expect(getByTestId('filter-reset-action')).toHaveStyle(FILTER_SHEET_ACTION_STYLE);
    expect(getByTestId('filter-apply-action')).toHaveStyle(FILTER_SHEET_ACTION_STYLE);
  });

  it('wires Reset and Apply actions from the footer', () => {
    const { getByText } = render(<FilterSheet />);

    fireEvent.press(getByText(`secondary:${Strings.filterReset}`));
    expect(mockResetDraft).toHaveBeenCalled();

    fireEvent.press(getByText(`primary:${Strings.filterApplyWithCount(2)}`));
    expect(mockApplyDraft).toHaveBeenCalled();
  });
});
