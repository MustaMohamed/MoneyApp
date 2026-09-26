import { fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';
import { View, type ViewProps } from 'react-native';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { TouchSize } from '@/constants/theme';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('@gorhom/bottom-sheet', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    BottomSheetScrollView: ({ children, ...props }: React.PropsWithChildren<object>) =>
      ReactLocal.createElement(RNView, props, children),
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
    const ReactLocal = jest.requireActual<typeof import('react')>('react');
    const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
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

import { FACT_ROW_MIN_HEIGHT } from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_geometry';
import { TransactionFormLoading } from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_loading';
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
  requiresRate: false,
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

// Without this, `toHaveStyle({ minHeight: undefined })` matches any row that lacks a minHeight.
function expectFactRowMinimumDefined(): void {
  expect(FACT_ROW_MIN_HEIGHT).toBe(TouchSize.min);
}

describe('TransactionFormBody geometry', () => {
  it('reserves the shared sticky-footer clearance below the last field', () => {
    expect(TRANSACTION_FORM_CONTENT_CONTAINER_STYLE.paddingBottom).toBe(777);
  });

  it('reserves validation geometry before and after errors appear', async () => {
    const { rerender } = await render(<TransactionFormBody {...baseProps} />);

    for (const id of [
      'amount-error-slot',
      'account-error-slot',
      'category-error-slot',
      'form-error-slot',
    ]) {
      expect(screen.getByTestId(id)).toHaveStyle({ minHeight: TRANSACTION_FORM_ERROR_SLOT_HEIGHT });
    }

    await rerender(
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

  it('keeps long picker values in one truncating content column', async () => {
    await render(
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
          is_deleted: 0,
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

  it('exposes stable picker-row semantics and delegates presses', async () => {
    const onOpenAccountPicker = jest.fn();
    const onOpenCategoryPicker = jest.fn();
    await render(
      <TransactionFormBody
        {...baseProps}
        onOpenAccountPicker={onOpenAccountPicker}
        onOpenCategoryPicker={onOpenCategoryPicker}
      />,
    );

    expect(screen.getByTestId('from-account-row')).toHaveProp('accessibilityRole', 'button');
    expect(screen.getByTestId('from-account-row')).toHaveProp('accessibilityState', {
      disabled: false,
    });
    await fireEvent.press(screen.getByTestId('from-account-row'));
    await fireEvent.press(screen.getByTestId('category-row'));
    expect(onOpenAccountPicker).toHaveBeenCalledTimes(1);
    expect(onOpenCategoryPicker).toHaveBeenCalledTimes(1);
  });
});

describe('TransactionFormBody fact rows', () => {
  it('draws the account and category pickers as fact rows with key and value', async () => {
    await render(<TransactionFormBody {...baseProps} />);

    expectFactRowMinimumDefined();
    expect(screen.getByTestId('from-account-row')).toHaveStyle({ minHeight: FACT_ROW_MIN_HEIGHT });
    expect(screen.getByTestId('category-row')).toHaveStyle({ minHeight: FACT_ROW_MIN_HEIGHT });

    const categoryRow = within(screen.getByTestId('category-row'));
    expect(categoryRow.getByText('Category')).toBeTruthy();
    expect(categoryRow.getByText('Select Category')).toBeTruthy();
  });

  it('draws the To row as a fact row that stays locked on edit', async () => {
    const onOpenToPicker = jest.fn();
    const { rerender } = await render(
      <TransactionFormBody
        {...baseProps}
        type={TransactionType.Transfer}
        locked
        onOpenToPicker={onOpenToPicker}
      />,
    );

    expectFactRowMinimumDefined();
    expect(screen.getByTestId('to-account-row')).toHaveStyle({ minHeight: FACT_ROW_MIN_HEIGHT });
    expect(screen.getByTestId('to-account-row')).toHaveProp('accessibilityState', {
      disabled: true,
    });
    await fireEvent.press(screen.getByTestId('to-account-row'));
    expect(onOpenToPicker).not.toHaveBeenCalled();

    await rerender(
      <TransactionFormBody
        {...baseProps}
        type={TransactionType.Transfer}
        locked={false}
        onOpenToPicker={onOpenToPicker}
      />,
    );

    await fireEvent.press(screen.getByTestId('to-account-row'));
    expect(onOpenToPicker).toHaveBeenCalledTimes(1);
  });

  it('types the note into the Note fact row', async () => {
    const setNote = jest.fn();
    await render(<TransactionFormBody {...baseProps} setNote={setNote} />);

    expectFactRowMinimumDefined();
    const input = screen.getByPlaceholderText(Strings.addTxNotePlaceholder);
    const noteRow = screen.getByTestId('note-row');
    expect(within(noteRow).getByText(Strings.addTxNoteLabel)).toBeTruthy();
    expect(input).toHaveStyle({ minHeight: FACT_ROW_MIN_HEIGHT });

    await fireEvent.changeText(input, 'Lunch with the team');
    expect(setNote).toHaveBeenCalledWith('Lunch with the team');
  });
});

describe('TransactionFormLoading', () => {
  // The jest.setup.js heroui-native mock carries no SkeletonGroup; the rest of this file needs that mock.
  beforeAll(() => {
    const Group = ({ children }: React.PropsWithChildren<object>) =>
      React.createElement(View, null, children);
    const Item = (props: ViewProps) => React.createElement(View, props);
    Object.assign(jest.requireMock<Record<string, unknown>>('heroui-native'), {
      SkeletonGroup: Object.assign(Group, { Item }),
    });
  });

  it('draws the account bar and four fact rows at the loaded fact-row height', async () => {
    await render(<TransactionFormLoading />);

    expectFactRowMinimumDefined();
    expect(screen.getByTestId('transaction-form-skeleton-account-row')).toHaveStyle({
      height: FACT_ROW_MIN_HEIGHT,
    });
    const factRows = screen.getAllByTestId('transaction-form-skeleton-fact-row');
    expect(factRows).toHaveLength(4);
    for (const row of factRows) {
      expect(row).toHaveStyle({ minHeight: FACT_ROW_MIN_HEIGHT });
    }
  });
});
