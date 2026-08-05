import { fireEvent, render } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { Strings } from '@/constants/strings';
import {
  COMMITMENT_FILTER_SHEET_ACTION_STYLE,
  CommitmentFilterSheet,
} from '@/modules/commitments/screens/commitments/filter';

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
jest.mock('@/modules/commitments/screens/commitments/filter/filter.hook', () => ({
  useCommitmentFilterSheet: () => ({
    state: {
      visible: true,
      openSection: null,
      draft: {
        accountIds: [],
        categoryIds: [],
        amountCurrency: 'EGP',
        amountTypes: [],
        recurrencePresets: [],
      },
      draftCount: 3,
      canApply: true,
      accounts: [],
      categories: [],
    },
    close: jest.fn(),
    toggleSection: jest.fn(),
    resetDraft: mockResetDraft,
    toggleAccountId: jest.fn(),
    toggleCategoryId: jest.fn(),
    toggleAmountType: jest.fn(),
    toggleRecurrencePreset: jest.fn(),
    setAmountMin: jest.fn(),
    setAmountMax: jest.fn(),
    setAmountCurrency: jest.fn(),
    applyDraft: mockApplyDraft,
  }),
}));
jest.mock('@/modules/commitments/screens/commitments/filter/components/account_accordion', () => ({
  CommitmentAccountAccordion: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>Accounts section</Text>;
  },
}));
jest.mock('@/modules/commitments/screens/commitments/filter/components/category_accordion', () => ({
  CommitmentCategoryAccordion: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>Categories section</Text>;
  },
}));
jest.mock('@/modules/commitments/screens/commitments/filter/components/amount_accordion', () => ({
  CommitmentAmountAccordion: () => {
    const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
    return <Text>Amount section</Text>;
  },
}));
jest.mock(
  '@/modules/commitments/screens/commitments/filter/components/amount_type_accordion',
  () => ({
    CommitmentAmountTypeAccordion: () => {
      const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
      return <Text>Amount type section</Text>;
    },
  }),
);
jest.mock(
  '@/modules/commitments/screens/commitments/filter/components/recurrence_accordion',
  () => ({
    CommitmentRecurrenceAccordion: () => {
      const { Text } = jest.requireActual<typeof import('react-native')>('react-native');
      return <Text>Recurrence section</Text>;
    },
  }),
);

describe('CommitmentFilterSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all advanced filter sections', async () => {
    const { getByText } = await render(<CommitmentFilterSheet />);

    expect(getByText(Strings.filterTitle)).toBeTruthy();
    expect(getByText('Accounts section')).toBeTruthy();
    expect(getByText('Categories section')).toBeTruthy();
    expect(getByText('Amount section')).toBeTruthy();
    expect(getByText('Amount type section')).toBeTruthy();
    expect(getByText('Recurrence section')).toBeTruthy();
  });

  it('renders Reset and Apply as equal-width themed footer buttons', async () => {
    const { getByText, getByTestId } = await render(<CommitmentFilterSheet />);

    expect(COMMITMENT_FILTER_SHEET_ACTION_STYLE).toEqual({ flex: 1 });
    expect(getByText(`secondary:${Strings.filterReset}`)).toBeTruthy();
    expect(getByText(`primary:${Strings.filterApplyWithCount(3)}`)).toBeTruthy();
    expect(getByTestId('commitment-filter-reset-action')).toHaveStyle(
      COMMITMENT_FILTER_SHEET_ACTION_STYLE,
    );
    expect(getByTestId('commitment-filter-apply-action')).toHaveStyle(
      COMMITMENT_FILTER_SHEET_ACTION_STYLE,
    );
  });

  it('wires Reset and Apply actions from the footer', async () => {
    const { getByText } = await render(<CommitmentFilterSheet />);

    await fireEvent.press(getByText(`secondary:${Strings.filterReset}`));
    expect(mockResetDraft).toHaveBeenCalled();

    await fireEvent.press(getByText(`primary:${Strings.filterApplyWithCount(3)}`));
    expect(mockApplyDraft).toHaveBeenCalled();
  });
});
