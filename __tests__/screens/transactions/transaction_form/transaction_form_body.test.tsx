import { fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

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
const mockAmountHeroProps: Array<{ invalid?: boolean }> = [];
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/amount_hero',
  () => {
    const ReactLocal = jest.requireActual<typeof import('react')>('react');
    const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
    return {
      AmountHero: (props: { invalid?: boolean }) => {
        mockAmountHeroProps.push(props);
        return ReactLocal.createElement(RNView, { testID: 'amount-hero' });
      },
    };
  },
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/date_row',
  () => {
    const ReactLocal = jest.requireActual<typeof import('react')>('react');
    const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
    return { DateRow: () => ReactLocal.createElement(RNView, { testID: 'date-row' }) };
  },
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row',
  () => ({ ExchangeRateRow: () => null }),
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/type_tabs',
  () => ({ TypeTabs: () => null }),
);

import { Size, Spacing } from '@/constants/theme';
import {
  FACT_ROW_MIN_HEIGHT,
  TRANSACTION_FORM_CONTENT_CONTAINER_STYLE,
} from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_geometry';
import { TransactionFormLoading } from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_loading';
import {
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

describe('TransactionFormBody geometry', () => {
  it('reserves the sheet footer clearance plus the status track and its gap below the last field', () => {
    expect(TRANSACTION_FORM_CONTENT_CONTAINER_STYLE.paddingBottom).toBe(
      777 + Size.statusTrack + Spacing.xs,
    );
  });

  it('keeps only the amount slot and draws no ring before any error', async () => {
    mockAmountHeroProps.length = 0;
    await render(<TransactionFormBody {...baseProps} showBudgetField />);

    expect(screen.getByTestId('amount-error-slot')).toHaveStyle({
      minHeight: TRANSACTION_FORM_ERROR_SLOT_HEIGHT,
    });
    for (const id of [
      'account-error-slot',
      'category-error-slot',
      'budget-error-slot',
      'from-account-ring',
      'category-ring',
      'budget-ring',
    ]) {
      expect(screen.queryByTestId(id)).toBeNull();
    }
    expect(mockAmountHeroProps.at(-1)).toMatchObject({ invalid: false });
  });

  it('marks the amount hero invalid while the amount has an error', async () => {
    mockAmountHeroProps.length = 0;
    await render(<TransactionFormBody {...baseProps} amountError="Enter an amount" />);

    expect(mockAmountHeroProps.at(-1)).toMatchObject({ invalid: true });
    expect(screen.getByText('Enter an amount')).toBeTruthy();
  });

  it('rings each fact row at fault without moving it and reads its message as a hint', async () => {
    await render(
      <TransactionFormBody
        {...baseProps}
        showBudgetField
        accountError="Account is required"
        categoryError="Category is required"
        budgetError="Pick a budget"
      />,
    );

    for (const [row, ring, message] of [
      ['from-account-row', 'from-account-ring', 'Account is required'],
      ['category-row', 'category-ring', 'Category is required'],
      ['budget-row', 'budget-ring', 'Pick a budget'],
    ]) {
      expect(screen.getByTestId(ring)).toHaveStyle({ position: 'absolute' });
      expect(screen.getByTestId(row)).toHaveStyle({ minHeight: FACT_ROW_MIN_HEIGHT });
      expect(screen.getByTestId(row)).toHaveProp('accessibilityHint', message);
      expect(screen.queryByText(message)).toBeNull();
    }
  });

  it('rings the To row on a transfer', async () => {
    await render(
      <TransactionFormBody
        {...baseProps}
        type={TransactionType.Transfer}
        toAccountError="Pick where the money goes"
      />,
    );

    expect(screen.queryByTestId('to-account-error-slot')).toBeNull();
    expect(screen.getByTestId('to-account-ring')).toHaveStyle({ position: 'absolute' });
    expect(screen.getByTestId('to-account-row')).toHaveStyle({ minHeight: FACT_ROW_MIN_HEIGHT });
    expect(screen.getByTestId('to-account-row')).toHaveProp(
      'accessibilityHint',
      'Pick where the money goes',
    );
    expect(screen.queryByText('Pick where the money goes')).toBeNull();
  });

  it('rings the budget row for a budget fault but not for a lookup failure, which is a data error', async () => {
    const lookupError = 'Could not load matching budgets. Try again.';
    const { rerender } = await render(
      <TransactionFormBody {...baseProps} showBudgetField budgetError="Pick a budget" />,
    );

    expect(screen.getByTestId('budget-ring')).toHaveStyle({ position: 'absolute' });

    await rerender(
      <TransactionFormBody
        {...baseProps}
        showBudgetField
        budgetLookupError={lookupError}
        budgetError={lookupError}
      />,
    );

    expect(screen.queryByTestId('budget-ring')).toBeNull();
    expect(within(screen.getByTestId('budget-row')).getByText(lookupError)).toBeTruthy();
  });

  it('leaves the save failure to the footer track: the body has no form-level slot', async () => {
    await render(<TransactionFormBody {...baseProps} />);

    expect(screen.queryByTestId('form-error-slot')).toBeNull();
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

    const input = screen.getByPlaceholderText(Strings.addTxNotePlaceholder);
    const noteRow = screen.getByTestId('note-row');
    expect(within(noteRow).getByText(Strings.addTxNoteLabel)).toBeTruthy();
    expect(input).toHaveStyle({ minHeight: FACT_ROW_MIN_HEIGHT });

    await fireEvent.changeText(input, 'Lunch with the team');
    expect(setNote).toHaveBeenCalledWith('Lunch with the team');
  });

  it('holds the expense fact rows in one group card and leaves the From row outside it', async () => {
    await render(<TransactionFormBody {...baseProps} />);

    const group = within(screen.getByTestId('transaction-form-fact-group'));
    expect(group.getByTestId('category-row')).toBeTruthy();
    expect(group.getByTestId('date-row')).toBeTruthy();
    expect(group.getByTestId('note-row')).toBeTruthy();
    expect(group.queryByTestId('from-account-row')).toBeNull();
  });

  it('holds the To row in the group card on a transfer', async () => {
    await render(<TransactionFormBody {...baseProps} type={TransactionType.Transfer} />);

    const group = within(screen.getByTestId('transaction-form-fact-group'));
    expect(group.getByTestId('to-account-row')).toBeTruthy();
  });

  it('gives the budget lookup failure two lines and a loaded budget one', async () => {
    const lookupError = 'Could not load matching budgets. Try again.';
    const { rerender } = await render(
      <TransactionFormBody {...baseProps} showBudgetField budgetLookupError={lookupError} />,
    );

    expect(within(screen.getByTestId('budget-row')).getByText(lookupError)).toHaveProp(
      'numberOfLines',
      2,
    );

    await rerender(<TransactionFormBody {...baseProps} showBudgetField />);

    expect(
      within(screen.getByTestId('budget-row')).getByText(Strings.addTxPickBudgetTitle),
    ).toHaveProp('numberOfLines', 1);
  });
});

describe('TransactionFormLoading', () => {
  it('draws the account bar and four fact rows at the loaded fact-row height', async () => {
    await render(<TransactionFormLoading />);

    expect(screen.getByTestId('transaction-form-skeleton-account-row')).toHaveStyle({
      height: FACT_ROW_MIN_HEIGHT,
    });
    const factRows = screen.getAllByTestId('transaction-form-skeleton-fact-row');
    expect(factRows).toHaveLength(4);
    for (const row of factRows) {
      expect(row).toHaveStyle({ minHeight: FACT_ROW_MIN_HEIGHT });
    }
  });

  it('holds the four skeleton fact rows in one group card below the account bar', async () => {
    await render(<TransactionFormLoading />);

    const group = within(screen.getByTestId('transaction-form-skeleton-fact-group'));
    expect(group.getAllByTestId('transaction-form-skeleton-fact-row')).toHaveLength(4);
    expect(group.queryByTestId('transaction-form-skeleton-account-row')).toBeNull();
  });

  it('scrolls the skeleton with the loaded body content style so its fourth row clears the footer', async () => {
    const skeleton = await render(<TransactionFormLoading />);
    const skeletonStyle = screen.getByTestId('transaction-form-skeleton-scroll').props
      .contentContainerStyle;
    await skeleton.unmount();

    await render(<TransactionFormBody {...baseProps} />);
    const bodyStyle = screen.getByTestId('transaction-form-scroll').props.contentContainerStyle;

    expect(bodyStyle).toBe(TRANSACTION_FORM_CONTENT_CONTAINER_STYLE);
    expect(skeletonStyle).toBe(bodyStyle);
  });
});
