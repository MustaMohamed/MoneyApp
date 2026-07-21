import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

const mockHandleSave = jest.fn();
const mockRetry = jest.fn();
const mockUseAddTransaction = jest.fn();
const mockUseEditTransaction = jest.fn();
const mockUsePrerequisites = jest.fn(
  (_sessionId: number, _mode: string, _tx: Transaction | null) => ({
    status: 'loading',
    retry: mockRetry,
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/add_transaction.hook',
  () => ({ useAddTransaction: (...args: unknown[]) => mockUseAddTransaction(...args) }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook',
  () => ({ useEditTransaction: (...args: unknown[]) => mockUseEditTransaction(...args) }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form_v2/transaction_form_v2_prerequisites.hook',
  () => ({
    useTransactionFormV2Prerequisites: (
      sessionId: number,
      mode: string,
      transaction: Transaction | null,
    ) => mockUsePrerequisites(sessionId, mode, transaction),
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body',
  () => ({
    TransactionFormBody: () => {
      const { View: RNView } = require('react-native');
      return <RNView testID="transaction-form-body" />;
    },
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_loading',
  () => ({
    TransactionFormLoading: () => {
      const { View: RNView } = require('react-native');
      return <RNView testID="transaction-form-loading" />;
    },
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_data_error',
  () => ({
    TransactionFormDataError: ({ onRetry }: { onRetry: () => void }) => {
      const { Pressable: RNPressable } = require('react-native');
      return <RNPressable testID="transaction-form-retry" onPress={onRetry} />;
    },
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/no_accounts_empty',
  () => ({
    NoAccountsEmpty: () => {
      const { View: RNView } = require('react-native');
      return <RNView testID="transaction-form-no-accounts" />;
    },
  }),
);

jest.mock('@/modules/accounts/components/account_picker_sheet', () => ({
  AccountPickerSheet: () => {
    const { View: RNView } = require('react-native');
    return <RNView testID="account-picker" />;
  },
}));

jest.mock('@/modules/categories/components/category_picker_sheet', () => ({
  CategoryPickerSheet: () => {
    const { View: RNView } = require('react-native');
    return <RNView testID="category-picker" />;
  },
}));

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet',
  () => ({
    BudgetPickerSheet: () => {
      const { View: RNView } = require('react-native');
      return <RNView testID="budget-picker" />;
    },
  }),
);

import { AddTransactionV2Session } from '@/modules/transactions/screens/transactions/transaction_form_v2/add_transaction_session';
import { EditTransactionV2Session } from '@/modules/transactions/screens/transactions/transaction_form_v2/edit_transaction_session';
import { useTransactionFormV2State } from '@/modules/transactions/screens/transactions/transaction_form_v2/transaction_form_v2.state';

const tx: Transaction = {
  id: 'tx-1',
  type: TransactionType.Expense,
  amount: 125,
  currency: Currency.EGP,
  egp_amount: 125,
  exchange_rate: null,
  to_amount: null,
  minimum_payment_snapshot: null,
  revolving_balance_delta: null,
  account_id: 'account-1',
  to_account_id: null,
  category_id: 'category-1',
  budget_id: null,
  note: null,
  transaction_date: '2026-07-21',
  transaction_time: '12:00:00',
  commitment_payment_id: null,
  installment_id: null,
  created_at: 'now',
  updated_at: 'now',
};

function createHookState(overrides: Record<string, unknown> = {}) {
  return {
    state: {
      type: TransactionType.Expense,
      typeLabel: 'Expense',
      typeSupportingText: 'Money spent',
      selectedAccount: null,
      selectedToAccount: null,
      selectedCategory: null,
      selectedBudget: null,
      accountId: '',
      toAccountId: '',
      categoryId: '',
      budgetId: '',
      date: '2026-07-21',
      note: '',
      exchangeRate: '50',
      rateOverride: false,
      isUSD: false,
      isTransferOrCC: false,
      errors: {},
      errorMessage: undefined,
      budgetLookupError: undefined,
      formDataReady: false,
      formDataLoadError: false,
      saving: false,
      accounts: [],
      hasAccounts: true,
      accountsForFrom: [],
      accountsForTo: [],
      visibleCategories: [],
      showAccountPicker: false,
      showToPicker: false,
      showCategoryPicker: false,
      showBudgetPicker: false,
      closingPicker: undefined,
      budgetsLoading: false,
      availableBudgets: [],
      showBudgetField: false,
      rateUpdatedAt: null,
      ...overrides,
    },
    setType: jest.fn(),
    setAmountStr: jest.fn(),
    setDate: jest.fn(),
    setNote: jest.fn(),
    setExchangeRate: jest.fn(),
    toggleRateOverride: jest.fn(),
    setShowAccountPicker: jest.fn(),
    setShowToPicker: jest.fn(),
    setShowCategoryPicker: jest.fn(),
    setShowBudgetPicker: jest.fn(),
    completePickerClose: jest.fn(),
    selectAccount: jest.fn(),
    selectToAccount: jest.fn(),
    selectCategory: jest.fn(),
    selectBudget: jest.fn(),
    retryBudgetLookup: jest.fn(),
    retryFormData: mockRetry,
    handleSave: mockHandleSave,
  };
}

function renderAdd(overrides: Record<string, unknown> = {}) {
  mockUseAddTransaction.mockReturnValue(createHookState(overrides));
  return render(
    <AddTransactionV2Session
      sessionId={1}
      onRegisterSubmit={jest.fn()}
      onClose={jest.fn()}
      onSaved={jest.fn()}
    />,
  );
}

describe('Transaction Form V2 sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionFormV2State.getState().reset();
    useTransactionFormV2State.getState().openAdd();
  });

  it('keeps stable loading and error bodies with a retry action', () => {
    const loading = renderAdd();
    expect(loading.getByTestId('transaction-form-loading')).toBeTruthy();
    loading.unmount();

    const error = renderAdd({ formDataLoadError: true });
    fireEvent.press(error.getByTestId('transaction-form-retry'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('renders the ready Add form and owned nested pickers', () => {
    const screen = renderAdd({
      formDataReady: true,
      showAccountPicker: true,
      closingPicker: 'category',
    });

    expect(screen.getByTestId('transaction-form-body')).toBeTruthy();
    expect(screen.getByTestId('account-picker')).toBeTruthy();
    expect(screen.getByTestId('category-picker')).toBeTruthy();
  });

  it('hides the Add footer when no account exists', async () => {
    renderAdd({ formDataReady: true, hasAccounts: false });

    await waitFor(() =>
      expect(useTransactionFormV2State.getState().footer).toMatchObject({
        visible: false,
        disabled: true,
      }),
    );
  });

  it('registers Edit submit and publishes saving footer state', async () => {
    useTransactionFormV2State.getState().openEdit(tx);
    mockUseEditTransaction.mockReturnValue(createHookState({ formDataReady: true, saving: true }));
    const registerSubmit = jest.fn();

    const screen = render(
      <EditTransactionV2Session
        sessionId={2}
        tx={tx}
        onRegisterSubmit={registerSubmit}
        onClose={jest.fn()}
        onSaved={jest.fn()}
      />,
    );

    expect(screen.getByTestId('transaction-form-body')).toBeTruthy();
    await waitFor(() => {
      expect(registerSubmit).toHaveBeenCalledWith(2, expect.any(Function));
      expect(useTransactionFormV2State.getState().footer).toMatchObject({
        visible: true,
        saving: true,
        disabled: true,
      });
    });

    const registeredSubmit = registerSubmit.mock.calls.find(
      ([ownerSessionId, submit]) => ownerSessionId === 2 && typeof submit === 'function',
    )?.[1] as (() => Promise<void>) | undefined;
    await registeredSubmit?.();
    expect(mockHandleSave).toHaveBeenCalledTimes(1);
  });
});
