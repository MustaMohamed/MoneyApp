import { fireEvent, render, waitFor } from '@testing-library/react-native';
import React from 'react';

import { Currency, TransactionType } from '@/constants/enums';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

type AddTransactionHook =
  typeof import('@/modules/transactions/screens/transactions/transaction_form/add_transaction.hook').useAddTransaction;
type EditTransactionHook =
  typeof import('@/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook').useEditTransaction;
type PrerequisitesHook =
  typeof import('@/modules/transactions/screens/transactions/transaction_form/transaction_form_prerequisites.hook').useTransactionFormPrerequisites;
type TransactionFormHookResult = ReturnType<AddTransactionHook>;
type EditTransactionHookResult = ReturnType<EditTransactionHook>;

const mockHandleSave = jest.fn();
const mockRetry = jest.fn();
const mockUseAddTransaction = jest.fn<
  ReturnType<AddTransactionHook>,
  Parameters<AddTransactionHook>
>();
const mockUseEditTransaction = jest.fn<
  ReturnType<EditTransactionHook>,
  Parameters<EditTransactionHook>
>();
const mockRequestAccountCreation = jest.fn();
const mockUsePrerequisites = jest.fn(
  (_sessionId: number, _mode: string, _tx: Transaction | null) => ({
    status: 'loading',
    retry: mockRetry,
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/add_transaction.hook',
  () => ({
    useAddTransaction: (...args: Parameters<AddTransactionHook>) => mockUseAddTransaction(...args),
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.hook',
  () => ({
    useEditTransaction: (...args: Parameters<EditTransactionHook>) =>
      mockUseEditTransaction(...args),
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/transaction_form_prerequisites.hook',
  () => ({
    useTransactionFormPrerequisites: (...args: Parameters<PrerequisitesHook>) =>
      mockUsePrerequisites(...args),
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body',
  () => ({
    TransactionFormBody: () => {
      const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
      return <RNView testID="transaction-form-body" />;
    },
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_loading',
  () => ({
    TransactionFormLoading: () => {
      const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
      return <RNView testID="transaction-form-loading" />;
    },
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_data_error',
  () => ({
    TransactionFormDataError: ({ onRetry }: { onRetry: () => void }) => {
      const { Pressable: RNPressable } =
        jest.requireActual<typeof import('react-native')>('react-native');
      return <RNPressable testID="transaction-form-retry" onPress={onRetry} />;
    },
  }),
);

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/no_accounts_empty',
  () => ({
    NoAccountsEmpty: ({ onAddAccount }: { onAddAccount: () => void }) => {
      const { Pressable: RNPressable } =
        jest.requireActual<typeof import('react-native')>('react-native');
      return <RNPressable testID="transaction-form-no-accounts" onPress={onAddAccount} />;
    },
  }),
);

jest.mock('@/modules/accounts/components/account_picker_sheet', () => ({
  AccountPickerSheet: () => {
    const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
    return <RNView testID="account-picker" />;
  },
}));

jest.mock('@/modules/categories/components/category_picker_sheet', () => ({
  CategoryPickerSheet: () => {
    const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
    return <RNView testID="category-picker" />;
  },
}));

jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/budget_picker_sheet',
  () => ({
    BudgetPickerSheet: () => {
      const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
      return <RNView testID="budget-picker" />;
    },
  }),
);

import { AddTransactionSession } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction_session';
import { EditTransactionSession } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction_session';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';

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

function createHookState(
  overrides: Partial<TransactionFormHookResult['state']> = {},
): TransactionFormHookResult {
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
      isCardCredit: false,
      isUSD: false,
      isTransferOrCC: false,
      errors: {
        amount: undefined,
        account: undefined,
        toAccount: undefined,
        category: undefined,
        budget: undefined,
        rate: undefined,
      },
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
      closingPickers: [],
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

function createEditHookState(
  overrides: Partial<EditTransactionHookResult['state']> = {},
): EditTransactionHookResult {
  return {
    state: {
      type: TransactionType.Expense,
      typeLabel: 'Expense',
      typeSupportingText: 'Money spent',
      selectedAccount: null,
      selectedToAccount: null,
      selectedCategory: null,
      selectedBudget: null,
      categoryId: '',
      budgetId: '',
      date: '2026-07-21',
      note: '',
      exchangeRate: '50',
      rateOverride: false,
      isCardCredit: false,
      isUSD: false,
      isTransferOrCC: false,
      errors: {
        amount: undefined,
        category: undefined,
        budget: undefined,
        rate: undefined,
      },
      errorMessage: undefined,
      budgetLookupError: undefined,
      formDataReady: false,
      formDataLoadError: false,
      saving: false,
      visibleCategories: [],
      showCategoryPicker: false,
      showBudgetPicker: false,
      closingPickers: [],
      budgetsLoading: false,
      availableBudgets: [],
      showBudgetField: false,
      rateUpdatedAt: null,
      ...overrides,
    },
    setAmountStr: jest.fn(),
    setDate: jest.fn(),
    setNote: jest.fn(),
    setExchangeRate: jest.fn(),
    toggleRateOverride: jest.fn(),
    setShowCategoryPicker: jest.fn(),
    setShowBudgetPicker: jest.fn(),
    completePickerClose: jest.fn(),
    selectCategory: jest.fn(),
    selectBudget: jest.fn(),
    retryBudgetLookup: jest.fn(),
    retryFormData: mockRetry,
    handleSave: mockHandleSave,
  };
}

function renderAdd(overrides: Partial<TransactionFormHookResult['state']> = {}) {
  mockUseAddTransaction.mockReturnValue(createHookState(overrides));
  return render(
    <AddTransactionSession
      sessionId={1}
      onRegisterSubmit={jest.fn()}
      onSaved={jest.fn()}
      onRequestAccountCreation={mockRequestAccountCreation}
    />,
  );
}

describe('transaction form sessions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useTransactionFormState.getState().reset();
    useTransactionFormState.getState().openAdd();
  });

  it('keeps stable loading and error bodies with a retry action', () => {
    const loading = renderAdd();
    expect(loading.getByTestId('transaction-form-loading')).toBeTruthy();
    loading.unmount();

    const error = renderAdd({ formDataLoadError: true });
    fireEvent.press(error.getByTestId('transaction-form-retry'));
    expect(mockRetry).toHaveBeenCalledTimes(1);
  });

  it('mounts Add pickers closed so the first press can open an existing HeroUI sheet', () => {
    const screen = renderAdd({ formDataReady: true });

    expect(screen.getAllByTestId('account-picker')).toHaveLength(2);
    expect(screen.getByTestId('category-picker')).toBeTruthy();
    expect(screen.getByTestId('budget-picker')).toBeTruthy();
  });

  it('renders the ready Add form and keeps its nested pickers mounted', () => {
    const screen = renderAdd({
      formDataReady: true,
      showAccountPicker: true,
      closingPickers: ['category'],
    });

    expect(screen.getByTestId('transaction-form-body')).toBeTruthy();
    expect(screen.getAllByTestId('account-picker')).toHaveLength(2);
    expect(screen.getByTestId('category-picker')).toBeTruthy();
  });

  it('hides the Add footer when no account exists', async () => {
    const screen = renderAdd({ formDataReady: true, hasAccounts: false });

    await waitFor(() =>
      expect(useTransactionFormState.getState().footer).toMatchObject({
        visible: false,
        disabled: true,
      }),
    );
    fireEvent.press(screen.getByTestId('transaction-form-no-accounts'));
    expect(mockRequestAccountCreation).toHaveBeenCalledWith(1);
  });

  it('registers Edit submit and publishes saving footer state', async () => {
    useTransactionFormState.getState().openEdit(tx);
    mockUseEditTransaction.mockReturnValue(
      createEditHookState({ formDataReady: true, saving: true }),
    );
    const registerSubmit = jest.fn<void, [number, (() => Promise<void>) | undefined]>();

    const screen = render(
      <EditTransactionSession
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
      expect(useTransactionFormState.getState().footer).toMatchObject({
        visible: true,
        saving: true,
        disabled: true,
      });
    });

    const registration = registerSubmit.mock.calls.find(
      ([ownerSessionId, submit]) => ownerSessionId === 2 && typeof submit === 'function',
    );
    const registeredSubmit = registration?.[1];
    expect(registeredSubmit).toBeDefined();
    if (!registeredSubmit) throw new Error('Edit submit was not registered');
    await registeredSubmit();
    expect(mockHandleSave).toHaveBeenCalledTimes(1);
  });

  it('mounts Edit pickers closed so the first press can open an existing HeroUI sheet', () => {
    useTransactionFormState.getState().openEdit(tx);
    mockUseEditTransaction.mockReturnValue(createEditHookState({ formDataReady: true }));

    const screen = render(
      <EditTransactionSession
        sessionId={2}
        tx={tx}
        onRegisterSubmit={jest.fn()}
        onClose={jest.fn()}
        onSaved={jest.fn()}
      />,
    );

    expect(screen.getByTestId('category-picker')).toBeTruthy();
    expect(screen.getByTestId('budget-picker')).toBeTruthy();
  });
});
