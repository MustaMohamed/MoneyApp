import { act, render } from '@testing-library/react-native';
import React from 'react';

import { TransactionType } from '@/constants/enums';
import { AddTransactionSheet } from '@/modules/transactions/screens/transactions/transaction_form';
import { useAddTransaction } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.hook';
import { shouldRenderAddTransactionSheetBody } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction_sheet.helpers';

jest.mock('expo-router', () => ({
  router: {
    push: jest.fn(),
  },
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ label }: { label: string }) => {
    const ReactMock = jest.requireActual<typeof import('react')>('react');
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return ReactMock.createElement(View, { testID: `button-${label}` });
  },
}));

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({ children, isOpen }: { children?: React.ReactNode; isOpen: boolean }) => {
    const ReactMock = jest.requireActual<typeof import('react')>('react');
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return ReactMock.createElement(
      View,
      { testID: isOpen ? 'add-transaction-sheet-open' : 'add-transaction-sheet-closed' },
      children,
    );
  },
}));

jest.mock('@/modules/accounts/components/account_picker_sheet', () => ({
  AccountPickerSheet: () => {
    const ReactMock = jest.requireActual<typeof import('react')>('react');
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return ReactMock.createElement(View, { testID: 'account-picker-sheet' });
  },
}));

jest.mock('@/modules/categories/components/category_picker_sheet', () => ({
  CategoryPickerSheet: () => {
    const ReactMock = jest.requireActual<typeof import('react')>('react');
    const { View } = jest.requireActual<typeof import('react-native')>('react-native');
    return ReactMock.createElement(View, { testID: 'category-picker-sheet' });
  },
}));

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/add_transaction.hook',
  () => ({
    useAddTransaction: jest.fn(),
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body',
  () => ({
    TransactionFormBody: () => {
      const ReactMock = jest.requireActual<typeof import('react')>('react');
      const { View } = jest.requireActual<typeof import('react-native')>('react-native');
      return ReactMock.createElement(View, { testID: 'transaction-form-body' });
    },
  }),
);

const mockUseAddTransaction = jest.mocked(useAddTransaction);

function makeAddTransactionHook(): ReturnType<typeof useAddTransaction> {
  return {
    state: {
      hasAccounts: true,
      saving: false,
      type: TransactionType.Expense,
      amountStr: '',
      errors: {
        amount: undefined,
        account: undefined,
        toAccount: undefined,
        category: undefined,
        rate: undefined,
      },
      selectedAccount: null,
      selectedToAccount: null,
      selectedCategory: null,
      isUSD: false,
      exchangeRate: '',
      rateOverride: false,
      rateUpdatedAt: null,
      date: '2026-06-10',
      note: '',
      showAccountPicker: false,
      showToPicker: false,
      showCategoryPicker: false,
      isTransferOrCC: false,
      accounts: [],
      accountsForFrom: [],
      accountsForTo: [],
      visibleCategories: [],
      accountId: '',
      toAccountId: '',
      categoryId: '',
    },
    setType: jest.fn(),
    setAmountStr: jest.fn(),
    handleNumpad: jest.fn(),
    setExchangeRate: jest.fn(),
    toggleRateOverride: jest.fn(),
    setDate: jest.fn(),
    setNote: jest.fn(),
    setShowAccountPicker: jest.fn(),
    setShowToPicker: jest.fn(),
    setShowCategoryPicker: jest.fn(),
    selectAccount: jest.fn(),
    selectToAccount: jest.fn(),
    selectCategory: jest.fn(),
    handleSave: jest.fn(async () => undefined),
  };
}

describe('shouldRenderAddTransactionSheetBody', () => {
  it('skips the expensive body before the sheet has opened', () => {
    expect(shouldRenderAddTransactionSheetBody(false, false)).toBe(false);
  });

  it('renders while open and during close grace', () => {
    expect(shouldRenderAddTransactionSheetBody(true, false)).toBe(true);
    expect(shouldRenderAddTransactionSheetBody(false, true)).toBe(true);
  });
});

describe('AddTransactionSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseAddTransaction.mockReturnValue(makeAddTransactionHook());
  });

  it('does not construct the add transaction hook while hidden before first open', () => {
    const { queryByTestId } = render(
      React.createElement(AddTransactionSheet, { visible: false, onClose: jest.fn() }),
    );

    expect(queryByTestId('add-transaction-sheet-closed')).toBeNull();
    expect(queryByTestId('add-transaction-sheet-open')).toBeNull();
    expect(queryByTestId('transaction-form-body')).toBeNull();
    expect(mockUseAddTransaction).not.toHaveBeenCalled();
  });

  it('mounts the Sheet closed before first opening so HeroUI observes a closed-to-open transition', () => {
    jest.useFakeTimers();
    const { getByTestId, queryByTestId } = render(
      React.createElement(AddTransactionSheet, { visible: true, onClose: jest.fn() }),
    );

    expect(getByTestId('add-transaction-sheet-closed')).toBeTruthy();
    expect(getByTestId('transaction-form-body')).toBeTruthy();
    expect(mockUseAddTransaction).toHaveBeenCalledTimes(1);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(queryByTestId('add-transaction-sheet-closed')).toBeNull();
    expect(getByTestId('add-transaction-sheet-open')).toBeTruthy();
    jest.useRealTimers();
  });
});
