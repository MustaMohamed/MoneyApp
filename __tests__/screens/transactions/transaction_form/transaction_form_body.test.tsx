import { render, screen } from '@testing-library/react-native';
import React from 'react';

import { AccountType, Currency, TransactionType } from '@/constants/enums';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@gorhom/bottom-sheet', () => {
  const ReactLocal = require('react');
  const { View: RNView } = require('react-native');
  return {
    BottomSheetScrollView: ({ children, ...props }: React.PropsWithChildren<object>) =>
      ReactLocal.createElement(RNView, props, children),
  };
});
jest.mock('heroui-native', () => {
  const ReactLocal = require('react');
  const { Text: RNText, TextInput: RNTextInput, View: RNView } = require('react-native');
  return {
    cn: (...classes: Array<string | undefined>) => classes.filter(Boolean).join(' '),
    FieldError: ({ children, ...props }: React.PropsWithChildren<object>) =>
      ReactLocal.createElement(RNText, props, children),
    Input: (props: object) => ReactLocal.createElement(RNTextInput, props),
    PressableFeedback: ({ children, ...props }: React.PropsWithChildren<object>) =>
      ReactLocal.createElement(RNView, props, children),
    Spinner: () => null,
  };
});
jest.mock('@/components/account_type_pill', () => ({ TYPE_OPTIONS: [] }));
jest.mock('@/components/ui/sheet', () => ({
  SHEET_FOOTER_CLEARANCE: 777,
  useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
}));
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/amount_hero',
  () => {
    const ReactLocal = require('react');
    const { View: RNView } = require('react-native');
    return { AmountHero: () => ReactLocal.createElement(RNView, { testID: 'amount-hero' }) };
  },
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/date_row',
  () => ({ DateRow: () => null }),
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row',
  () => ({ ExchangeRateRow: () => null }),
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/type_tabs',
  () => ({ TypeTabs: () => null }),
);

import {
  TRANSACTION_FORM_CONTENT_CONTAINER_STYLE,
  TRANSACTION_FORM_ERROR_SLOT_HEIGHT,
  TransactionFormBody,
} from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body';

const baseProps: React.ComponentProps<typeof TransactionFormBody> = {
  datePickerOwnerId: 'add:1',
  formMode: 'add',
  locked: false,
  type: TransactionType.Expense,
  typeLabel: 'Expense',
  typeSupportingText: 'Money spent',
  onSelectType: jest.fn(),
  setAmountStr: jest.fn(),
  selectedAccount: null,
  onOpenAccountPicker: jest.fn(),
  selectedToAccount: null,
  onOpenToPicker: jest.fn(),
  selectedCategory: null,
  onOpenCategoryPicker: jest.fn(),
  showBudgetField: false,
  selectedBudget: null,
  budgetsLoading: false,
  onOpenBudgetPicker: jest.fn(),
  onRetryBudgetLookup: jest.fn(),
  isUSD: false,
  exchangeRate: '',
  setExchangeRate: jest.fn(),
  rateOverride: false,
  toggleRateOverride: jest.fn(),
  rateUpdatedAt: null,
  date: '2026-07-21',
  setDate: jest.fn(),
  note: '',
  setNote: jest.fn(),
  currency: Currency.EGP,
};

describe('TransactionFormBody geometry', () => {
  it('reserves the shared sticky-footer clearance below the last field', () => {
    expect(TRANSACTION_FORM_CONTENT_CONTAINER_STYLE.paddingBottom).toBe(777);
  });

  it('reserves validation geometry before and after errors appear', () => {
    const { rerender } = render(<TransactionFormBody {...baseProps} />);

    for (const id of [
      'amount-error-slot',
      'account-error-slot',
      'category-error-slot',
      'form-error-slot',
    ]) {
      expect(screen.getByTestId(id)).toHaveStyle({ minHeight: TRANSACTION_FORM_ERROR_SLOT_HEIGHT });
    }

    rerender(
      <TransactionFormBody
        {...baseProps}
        amountError="Amount is required"
        accountError="Account is required"
        categoryError="Category is required"
        errorMessage="Could not save transaction"
      />,
    );

    expect(screen.getByText('Amount is required')).toBeTruthy();
    expect(screen.getByText('Account is required')).toBeTruthy();
    expect(screen.getByText('Category is required')).toBeTruthy();
    expect(screen.getByText('Could not save transaction')).toBeTruthy();
  });

  it('keeps long picker values in one truncating content column', () => {
    render(
      <TransactionFormBody
        {...baseProps}
        selectedAccount={{
          id: 'account-1',
          name: 'A very long account name that must not move the chevron',
          type: AccountType.Bank,
          currency: Currency.EGP,
          color: null,
          opening_balance: 0,
          current_balance: 0,
          credit_limit: null,
          revolving_balance: null,
          minimum_payment: null,
          statement_due_day: null,
          interest_tracking: 0,
          apr: null,
          is_archived: 0,
          balance_review_required: 0,
          sort_order: 0,
          created_at: '2026-07-21T00:00:00.000Z',
          updated_at: '2026-07-21T00:00:00.000Z',
        }}
      />,
    );

    expect(screen.getByText('A very long account name that must not move the chevron')).toHaveProp(
      'numberOfLines',
      1,
    );
  });
});
