import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
const mockScrollToEnd = jest.fn();
jest.mock('@gorhom/bottom-sheet', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    BottomSheetScrollView: ({
      children,
      ref,
      ...props
    }: React.PropsWithChildren<{ ref?: React.Ref<{ scrollToEnd: () => void }> }>) => {
      ReactLocal.useImperativeHandle(ref, () => ({ scrollToEnd: mockScrollToEnd }));
      return ReactLocal.createElement(RNView, props, children);
    },
  };
});
jest.mock('@/components/account_type_pill', () => ({ TYPE_OPTIONS: [] }));
jest.mock('@/components/ui/sheet', () => ({
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

import {
  ACCOUNT_STRIP_CHIP_HEIGHT,
  ACCOUNT_STRIP_CHIP_RADIUS,
  ACCOUNT_STRIP_CHIP_WIDTH,
  ACCOUNT_STRIP_GAP,
  FACT_ROW_MIN_HEIGHT,
  TRANSACTION_FORM_CONTENT_CONTAINER_STYLE,
} from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form.geometry';
import { TransactionFormLoading } from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_loading';
import {
  resolveAccountStripChips,
  resolveLockedStripChips,
} from '@/modules/transactions/screens/transactions/transaction_form/transaction_form.helpers';
import {
  TRANSACTION_FORM_ERROR_SLOT_HEIGHT,
  TransactionFormBody,
} from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_body';
import { makeTestAccount } from '@/test_helpers/transaction';

const stripAccount = makeTestAccount({
  id: 'account-1',
  name: 'A very long account name that must truncate to one line',
  type: AccountType.Bank,
});

const baseProps: React.ComponentProps<typeof TransactionFormBody> = {
  datePickerOwnerId: 'add:1',
  formMode: 'add',
  locked: false,
  stripChips: [],
  onSelectStripChip: jest.fn(),
  type: TransactionType.Expense,
  typeLabel: 'Expense',
  typeSupportingText: 'Money spent',
  onSelectType: jest.fn(),
  setAmountStr: jest.fn(),
  selectedAccount: null,
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
  it('MA-123: scrolls the strip, the amount, its error slot and the fact group as one', async () => {
    await render(<TransactionFormBody {...baseProps} />);

    const scroll = within(screen.getByTestId('transaction-form-scroll'));
    const held = [
      'account-strip',
      'amount-hero',
      'amount-error-slot',
      'transaction-form-fact-group',
    ];
    expect(held.filter((id) => scroll.queryByTestId(id) !== null)).toEqual(held);
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
      'account-strip-ring',
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
        stripChips={resolveAccountStripChips([stripAccount], undefined)}
        showBudgetField
        accountError="Account is required"
        categoryError="Category is required"
        budgetError="Pick a budget"
      />,
    );

    expect(screen.getByTestId('account-strip-ring')).toBeTruthy();
    expect(screen.getByTestId('account-strip-chip-account-1')).toHaveProp(
      'accessibilityHint',
      'Account is required',
    );
    expect(screen.queryByText('Account is required')).toBeNull();
    for (const [row, ring, message] of [
      ['category-row', 'category-ring', 'Category is required'],
      ['budget-row', 'budget-ring', 'Pick a budget'],
    ]) {
      expect(screen.getByTestId(ring)).toBeTruthy();
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
    expect(screen.getByTestId('to-account-ring')).toBeTruthy();
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

    expect(screen.getByTestId('budget-ring')).toBeTruthy();

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

  it('keeps a long account name on one line in its strip chip', async () => {
    await render(
      <TransactionFormBody
        {...baseProps}
        stripChips={resolveAccountStripChips([stripAccount], stripAccount.id)}
        selectedAccount={stripAccount}
      />,
    );

    expect(
      within(screen.getByTestId('account-strip-chip-account-1')).getByText(stripAccount.name),
    ).toHaveProp('numberOfLines', 1);
  });

  it('exposes stable chip and picker-row semantics and delegates presses', async () => {
    const onSelectStripChip = jest.fn();
    const onOpenCategoryPicker = jest.fn();
    await render(
      <TransactionFormBody
        {...baseProps}
        stripChips={resolveAccountStripChips([stripAccount], stripAccount.id)}
        onSelectStripChip={onSelectStripChip}
        onOpenCategoryPicker={onOpenCategoryPicker}
      />,
    );

    const chip = screen.getByTestId('account-strip-chip-account-1');
    expect(chip).toHaveProp('accessibilityRole', 'button');
    expect(chip).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
    await fireEvent.press(chip);
    await fireEvent.press(screen.getByTestId('category-row'));
    expect(onSelectStripChip).toHaveBeenCalledWith(stripAccount.id);
    expect(onOpenCategoryPicker).toHaveBeenCalledTimes(1);
  });
});

describe('TransactionFormBody fact rows', () => {
  it('draws the category picker as a fact row with key and value', async () => {
    await render(<TransactionFormBody {...baseProps} />);

    expect(screen.getByTestId('category-row')).toHaveStyle({ minHeight: FACT_ROW_MIN_HEIGHT });

    const categoryRow = within(screen.getByTestId('category-row'));
    expect(categoryRow.getByText('Category')).toBeTruthy();
    expect(categoryRow.getByText('Select Category')).toBeTruthy();
  });

  it('says why the strip is empty when the type leaves no eligible account', async () => {
    await render(
      <TransactionFormBody {...baseProps} type={TransactionType.Transfer} stripChips={[]} />,
    );

    expect(screen.getByTestId('account-strip-empty')).toHaveTextContent(
      Strings.addTxErrTransferNoCc,
    );
  });

  it('draws the To row as a fact row that stays locked on edit, and the account as the locked strip', async () => {
    const onOpenToPicker = jest.fn();
    const otherAccount = makeTestAccount({ id: 'account-2', type: AccountType.Bank });
    const lockedChips = resolveLockedStripChips({
      type: TransactionType.Transfer,
      currentId: stripAccount.id,
      current: stripAccount,
      accounts: [stripAccount, otherAccount],
    });
    const { rerender } = await render(
      <TransactionFormBody
        {...baseProps}
        type={TransactionType.Transfer}
        locked
        lockedChips={lockedChips}
        onOpenToPicker={onOpenToPicker}
      />,
    );

    expect(screen.getByTestId('to-account-row')).toHaveStyle({ minHeight: FACT_ROW_MIN_HEIGHT });
    expect(screen.getByTestId('to-account-row')).toHaveProp('accessibilityState', {
      disabled: true,
    });
    await fireEvent.press(screen.getByTestId('to-account-row'));
    expect(onOpenToPicker).not.toHaveBeenCalled();
    expect(screen.queryByTestId('from-account-row')).toBeNull();
    expect(screen.getByTestId('account-strip')).toBeTruthy();
    expect(
      within(screen.getByTestId('account-strip')).getByText(Strings.addTxFromLabel),
    ).toBeTruthy();
    expect(screen.getByTestId('account-strip-chip-account-1')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ disabled: true }),
    );
    expect(screen.getByTestId('account-strip-chip-account-2')).toHaveProp(
      'accessibilityState',
      expect.objectContaining({ disabled: true }),
    );

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

  it('MA-123: scrolls to the end when the scroll shrinks with the Note focused, and not after it blurs', async () => {
    const layoutOf = (height: number) => ({
      nativeEvent: { layout: { x: 0, y: 0, width: 411, height } },
    });
    const runFrame = () =>
      act(() => {
        jest.advanceTimersByTime(16);
      });
    jest.useFakeTimers();
    mockScrollToEnd.mockClear();
    try {
      await render(<TransactionFormBody {...baseProps} />);
      const scroll = screen.getByTestId('transaction-form-scroll');
      const input = screen.getByPlaceholderText(Strings.addTxNotePlaceholder);

      await fireEvent(input, 'focus');
      await fireEvent(scroll, 'layout', layoutOf(377.9));
      await fireEvent(scroll, 'layout', layoutOf(228.57));
      await runFrame();
      expect(mockScrollToEnd).toHaveBeenCalledTimes(1);

      await fireEvent(input, 'blur');
      await fireEvent(scroll, 'layout', layoutOf(200));
      await runFrame();
      expect(mockScrollToEnd).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('holds the expense fact rows in one group card and draws the strip outside it, with no From row', async () => {
    await render(<TransactionFormBody {...baseProps} />);

    const group = within(screen.getByTestId('transaction-form-fact-group'));
    expect(group.getByTestId('category-row')).toBeTruthy();
    expect(group.getByTestId('date-row')).toBeTruthy();
    expect(group.getByTestId('note-row')).toBeTruthy();
    expect(screen.getByTestId('account-strip')).toBeTruthy();
    expect(group.queryByTestId('account-strip')).toBeNull();
    expect(screen.queryByTestId('from-account-row')).toBeNull();
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
  it('draws the strip row of three chip-sized bars and four fact rows at the loaded fact-row height', async () => {
    await render(<TransactionFormLoading />);

    expect(screen.queryByTestId('transaction-form-skeleton-account-row')).toBeNull();
    expect(screen.getByTestId('transaction-form-skeleton-strip')).toHaveStyle({
      gap: ACCOUNT_STRIP_GAP,
    });
    const bars = screen.getAllByTestId('transaction-form-skeleton-strip-bar');
    expect(bars).toHaveLength(3);
    for (const bar of bars) {
      expect(bar).toHaveStyle({
        width: ACCOUNT_STRIP_CHIP_WIDTH,
        height: ACCOUNT_STRIP_CHIP_HEIGHT,
        borderRadius: ACCOUNT_STRIP_CHIP_RADIUS,
      });
    }
    const factRows = screen.getAllByTestId('transaction-form-skeleton-fact-row');
    expect(factRows).toHaveLength(4);
    for (const row of factRows) {
      expect(row).toHaveStyle({ minHeight: FACT_ROW_MIN_HEIGHT });
    }
  });

  it('holds the four skeleton fact rows in one group card and the strip bars outside the scroll', async () => {
    await render(<TransactionFormLoading />);

    const group = within(screen.getByTestId('transaction-form-skeleton-fact-group'));
    expect(group.getAllByTestId('transaction-form-skeleton-fact-row')).toHaveLength(4);
    const scroll = within(screen.getByTestId('transaction-form-skeleton-scroll'));
    expect(scroll.queryByTestId('transaction-form-skeleton-strip')).toBeNull();
    expect(scroll.queryAllByTestId('transaction-form-skeleton-strip-bar')).toHaveLength(0);
    expect(
      within(screen.getByTestId('transaction-form-skeleton-strip')).getAllByTestId(
        'transaction-form-skeleton-strip-bar',
      ),
    ).toHaveLength(3);
  });

  it('MA-123: insets the loaded fact group and the skeleton scroll by the one content style', async () => {
    const skeleton = await render(<TransactionFormLoading />);
    const skeletonStyle = screen.getByTestId('transaction-form-skeleton-scroll').props
      .contentContainerStyle;
    await skeleton.unmount();

    await render(<TransactionFormBody {...baseProps} />);
    const insetStyle = screen.getByTestId('transaction-form-fact-inset').props.style;

    expect(insetStyle).toBe(TRANSACTION_FORM_CONTENT_CONTAINER_STYLE);
    expect(skeletonStyle).toBe(insetStyle);
  });
});
