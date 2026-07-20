import { act, render } from '@testing-library/react-native';
import React from 'react';

import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { EditTransactionSheet } from '@/modules/transactions/screens/transactions/transaction_form';
import { useEditTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.state';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';

const mockSheetProps: Array<{ isOpen: boolean; isDismissable: boolean | undefined }> = [];
const mockUseEditTransaction = jest.fn();

jest.mock('@/components/ui/button', () => ({
  Button: (props: object) => {
    const ReactLocal = require('react');
    const { View: RNView } = require('react-native');
    return ReactLocal.createElement(RNView, props);
  },
}));

jest.mock('@/components/ui/sheet', () => ({
  Sheet: ({
    isOpen,
    isDismissable,
    children,
  }: {
    isOpen: boolean;
    isDismissable?: boolean;
    children: React.ReactNode;
  }) => {
    const ReactLocal = require('react');
    const { View: RNView } = require('react-native');
    mockSheetProps.push({ isOpen, isDismissable });
    return ReactLocal.createElement(RNView, null, children);
  },
}));

jest.mock('@/modules/categories/components/category_picker_sheet', () => ({
  CategoryPickerSheet: () => {
    const ReactLocal = require('react');
    const { View: RNView } = require('react-native');
    return ReactLocal.createElement(RNView);
  },
}));

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/add_transaction_sheet',
  () => ({ AddTransactionSheet: () => null }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet',
  () => ({
    BudgetPickerSheet: () => {
      const ReactLocal = require('react');
      const { View: RNView } = require('react-native');
      return ReactLocal.createElement(RNView);
    },
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body',
  () => ({
    TransactionFormBody: () => {
      const ReactLocal = require('react');
      const { View: RNView } = require('react-native');
      return ReactLocal.createElement(RNView);
    },
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook',
  () => ({
    useEditTransaction: (...args: unknown[]) => mockUseEditTransaction(...args),
  }),
);

const mockTx = {
  id: 'tx-1',
  type: TransactionType.Expense,
  amount: 25,
  currency: Currency.EGP,
  account_id: 'account-1',
  transaction_date: '2026-07-20',
  transaction_time: '12:00:00',
} as Transaction;

function createHookReturn(saving: boolean) {
  return {
    state: {
      type: TransactionType.Expense,
      amountStr: '25',
      selectedAccount: null,
      selectedToAccount: null,
      selectedCategory: null,
      selectedBudget: null,
      categoryId: '',
      budgetId: '',
      note: '',
      date: '2026-07-20',
      exchangeRate: '50',
      rateOverride: false,
      typeLabel: 'Expense',
      typeSupportingText: '',
      isUSD: false,
      errors: {},
      errorMessage: undefined,
      budgetLookupError: undefined,
      saving,
      visibleCategories: [],
      showCategoryPicker: false,
      showBudgetPicker: false,
      budgetsLoading: false,
      availableBudgets: [],
      showBudgetField: false,
      rateUpdatedAt: undefined,
    },
    setAmountStr: jest.fn(),
    setDate: jest.fn(),
    setNote: jest.fn(),
    setExchangeRate: jest.fn(),
    toggleRateOverride: jest.fn(),
    setShowCategoryPicker: jest.fn(),
    setShowBudgetPicker: jest.fn(),
    selectCategory: jest.fn(),
    selectBudget: jest.fn(),
    retryBudgetLookup: jest.fn(),
    handleSave: jest.fn(),
  };
}

describe('EditTransactionSheet', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockSheetProps.length = 0;
    mockUseEditTransaction.mockReset();
    mockUseEditTransaction.mockReturnValue(createHookReturn(false));
    useEditTransactionState.getState().reset();
    useEditTransactionStore.getState().reset();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('retains the edit target during close and clears it after the animation', () => {
    useEditTransactionState.getState().open(mockTx);
    useEditTransactionStore.getState().loadFromTx(mockTx);
    const { rerender } = render(<EditTransactionSheet visible tx={mockTx} onClose={jest.fn()} />);

    rerender(<EditTransactionSheet visible={false} tx={mockTx} onClose={jest.fn()} />);

    expect(useEditTransactionStore.getState().editingTx).toEqual(mockTx);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(useEditTransactionStore.getState().editingTx).toBeNull();
    expect(useEditTransactionState.getState().visible).toBe(false);
  });

  it('disables every sheet dismissal path while saving', () => {
    mockUseEditTransaction.mockReturnValue(createHookReturn(true));

    render(<EditTransactionSheet visible tx={mockTx} onClose={jest.fn()} />);

    expect(mockSheetProps[mockSheetProps.length - 1]).toEqual({
      isOpen: true,
      isDismissable: false,
    });
  });
});
