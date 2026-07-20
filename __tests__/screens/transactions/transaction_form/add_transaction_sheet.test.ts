import { act, render } from '@testing-library/react-native';
import React from 'react';
import { View } from 'react-native';

const mockSheetProps: Array<{
  isOpen: boolean;
  hasFooter: boolean;
  instanceId: number;
  onCloseComplete: () => void;
}> = [];
let mockNextSheetInstanceId = 1;
const mockUseAddTransaction = jest.fn<unknown, [() => void]>();
const mockTransactionFormBody = jest.fn<React.ReactElement, [object]>((_props) =>
  React.createElement(View, { testID: 'transaction-form-body' }),
);
const mockAccountPickerSheet = jest.fn<React.ReactElement, [object]>((_props) =>
  React.createElement(View, { testID: 'account-picker-sheet' }),
);
const mockCategoryPickerSheet = jest.fn<React.ReactElement, [object]>((_props) =>
  React.createElement(View, { testID: 'category-picker-sheet' }),
);
const mockBudgetPickerSheet = jest.fn<React.ReactElement, [object]>((_props) =>
  React.createElement(View, { testID: 'budget-picker-sheet' }),
);

jest.mock('expo-router', () => ({
  router: { push: jest.fn() },
}));

jest.mock('@/components/ui/button', () => ({
  Button: (props: object) => {
    const ReactLocal = require('react');
    const { View: RNView } = require('react-native');
    return ReactLocal.createElement(RNView, { testID: 'button', ...props });
  },
}));

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({
    isOpen,
    onCloseComplete,
    footer,
    children,
  }: {
    isOpen: boolean;
    onCloseComplete: () => void;
    footer?: React.ReactNode;
    children: React.ReactNode;
  }) => {
    const ReactLocal = require('react');
    const { View: RNView } = require('react-native');
    const instanceId = ReactLocal.useRef(mockNextSheetInstanceId++).current;
    mockSheetProps.push({
      isOpen,
      hasFooter: footer !== undefined,
      instanceId,
      onCloseComplete,
    });
    return ReactLocal.createElement(
      RNView,
      { testID: isOpen ? 'sheet-open' : 'sheet-closed' },
      ReactLocal.createElement(ReactLocal.Fragment, null, footer, children),
    );
  },
}));

jest.mock('@/modules/accounts/components/account_picker_sheet', () => ({
  AccountPickerSheet: (props: object) => mockAccountPickerSheet(props),
}));

jest.mock('@/modules/categories/components/category_picker_sheet', () => ({
  CategoryPickerSheet: (props: object) => mockCategoryPickerSheet(props),
}));

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet',
  () => ({
    BudgetPickerSheet: (props: object) => mockBudgetPickerSheet(props),
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/add_transaction.hook',
  () => ({
    useAddTransaction: (onClose: () => void) => mockUseAddTransaction(onClose),
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/no_accounts_empty',
  () => ({
    NoAccountsEmpty: (props: object) => {
      const ReactLocal = require('react');
      const { View: RNView } = require('react-native');
      return ReactLocal.createElement(RNView, { testID: 'no-accounts', ...props });
    },
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body',
  () => ({
    TransactionFormBody: (props: object) => mockTransactionFormBody(props),
  }),
);

import { Currency, TransactionType } from '@/constants/enums';
import { AddTransactionSheet } from '@/modules/transactions/screens/transactions/transaction_form';
import { useAddTransactionSheetState } from '@/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet.state';

function createMockAddHookReturn() {
  return {
    state: {
      type: TransactionType.Expense,
      amountStr: '',
      selectedAccount: undefined,
      selectedToAccount: undefined,
      selectedCategory: undefined,
      selectedBudget: undefined,
      accountId: '',
      toAccountId: '',
      categoryId: '',
      budgetId: '',
      date: '2026-06-30',
      note: '',
      exchangeRate: '50',
      rateOverride: false,
      isUSD: false,
      isTransferOrCC: false,
      errors: {},
      saving: false,
      accounts: [{ id: 'a1', currency: Currency.EGP }],
      hasAccounts: true,
      accountsForFrom: [],
      accountsForTo: [],
      visibleCategories: [],
      showAccountPicker: false,
      showToPicker: false,
      showCategoryPicker: false,
      showBudgetPicker: false,
      budgetsLoading: false,
      availableBudgets: [],
      showBudgetField: false,
      rateUpdatedAt: undefined,
    },
    setType: jest.fn(),
    setAmountStr: jest.fn(),
    handleNumpad: jest.fn(),
    setDate: jest.fn(),
    setNote: jest.fn(),
    setExchangeRate: jest.fn(),
    toggleRateOverride: jest.fn(),
    setShowAccountPicker: jest.fn(),
    setShowToPicker: jest.fn(),
    setShowCategoryPicker: jest.fn(),
    setShowBudgetPicker: jest.fn(),
    selectAccount: jest.fn(),
    selectToAccount: jest.fn(),
    selectCategory: jest.fn(),
    selectBudget: jest.fn(),
    handleSave: jest.fn(),
  };
}

function mockAddHookReturn() {
  mockUseAddTransaction.mockReturnValue(createMockAddHookReturn());
}

describe('AddTransactionSheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSheetProps.length = 0;
    mockNextSheetInstanceId = 1;
    mockUseAddTransaction.mockReset();
    mockTransactionFormBody.mockClear();
    mockAccountPickerSheet.mockClear();
    mockCategoryPickerSheet.mockClear();
    mockBudgetPickerSheet.mockClear();
    useAddTransactionSheetState.getState().reset();
    mockAddHookReturn();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders nothing expensive while closed', () => {
    render(React.createElement(AddTransactionSheet, { visible: false, onClose: jest.fn() }));

    expect(mockSheetProps).toEqual([]);
    expect(mockUseAddTransaction).not.toHaveBeenCalled();
    expect(mockTransactionFormBody).not.toHaveBeenCalled();
    expect(mockAccountPickerSheet).not.toHaveBeenCalled();
    expect(mockCategoryPickerSheet).not.toHaveBeenCalled();
  });

  it('opens with a closed shell before mounting the form hook and nested pickers', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      React.createElement(AddTransactionSheet, { visible: false, onClose }),
    );

    rerender(React.createElement(AddTransactionSheet, { visible: true, onClose }));

    const closedFrame = mockSheetProps[mockSheetProps.length - 1];
    expect(closedFrame).toMatchObject({
      isOpen: false,
      hasFooter: false,
      instanceId: 1,
    });
    expect(mockUseAddTransaction).not.toHaveBeenCalled();
    expect(mockTransactionFormBody).not.toHaveBeenCalled();
    expect(mockAccountPickerSheet).not.toHaveBeenCalled();
    expect(mockCategoryPickerSheet).not.toHaveBeenCalled();

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(mockSheetProps[mockSheetProps.length - 1]).toMatchObject({
      isOpen: true,
      hasFooter: true,
      instanceId: closedFrame.instanceId,
    });
    expect(mockUseAddTransaction).toHaveBeenCalled();
    expect(mockTransactionFormBody).toHaveBeenCalled();
    expect(mockAccountPickerSheet).toHaveBeenCalled();
    expect(mockCategoryPickerSheet).toHaveBeenCalled();
  });

  it('keeps the inner sheet mounted until the close animation completes', () => {
    const onClose = jest.fn();
    const { rerender, queryByTestId } = render(
      React.createElement(AddTransactionSheet, { visible: true, onClose }),
    );

    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(queryByTestId('sheet-open')).toBeTruthy();
    mockSheetProps.length = 0;
    mockUseAddTransaction.mockClear();

    rerender(React.createElement(AddTransactionSheet, { visible: false, onClose }));

    const openFrame = mockSheetProps[mockSheetProps.length - 1];

    expect(openFrame).toMatchObject({
      isOpen: false,
      hasFooter: true,
      instanceId: 1,
    });
    expect(mockUseAddTransaction).toHaveBeenCalled();

    act(() => openFrame.onCloseComplete());

    expect(queryByTestId('sheet-open')).toBeNull();
    expect(queryByTestId('sheet-closed')).toBeNull();
  });
});
