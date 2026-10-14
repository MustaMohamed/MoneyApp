import { act, fireEvent, render, screen, within } from '@testing-library/react-native';
import React from 'react';
import { Dimensions } from 'react-native';

import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { AccountType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';

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
type MockSheetProps = React.PropsWithChildren<{
  isOpen: boolean;
  title?: string;
  footer?: React.ReactNode;
  onOpenChange: (open: boolean) => void;
}>;
const mockSheetProps: MockSheetProps[] = [];
jest.mock('@/components/ui/sheet', () => {
  const ReactLocal = jest.requireActual<typeof import('react')>('react');
  const { Text: RNText, View: RNView } =
    jest.requireActual<typeof import('react-native')>('react-native');
  return {
    Sheet: (props: MockSheetProps) => {
      mockSheetProps.push(props);
      if (!props.isOpen) return null;
      return ReactLocal.createElement(
        RNView,
        { testID: 'mock-sheet' },
        ReactLocal.createElement(RNText, null, props.title),
        props.children,
        props.footer,
      );
    },
    resolveSheetSizeAboveOne: (size: string) => size,
    useBottomSheetAwareHandlers: () => ({ onFocus: jest.fn(), onBlur: jest.fn() }),
  };
});
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
type MockExchangeRateRowProps = {
  previewEgpAmount?: number;
  previewHidden?: boolean;
  onOpenEditor?: () => void;
};
const mockExchangeRateRowProps: MockExchangeRateRowProps[] = [];
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row',
  () => ({
    ExchangeRateRow: (props: MockExchangeRateRowProps) => {
      mockExchangeRateRowProps.push(props);
      return null;
    },
  }),
);
jest.mock(
  '@/modules/transactions/screens/transactions/transaction_form/components/type_tabs',
  () => ({ TypeTabs: () => null }),
);

import { useAddTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.store';
import { useRateEditorSheetState } from '@/modules/transactions/screens/transactions/transaction_form/components/rate_editor_sheet.state';
import {
  ACCOUNT_STRIP_CHIP_RADIUS,
  ACCOUNT_STRIP_CHIP_WIDTH,
  ACCOUNT_STRIP_GAP,
  AMOUNT_MESSAGE_TEXT_STYLE,
  FACT_ROW_MIN_HEIGHT,
  TRANSACTION_FORM_CONTENT_CONTAINER_STYLE,
  resolveAccountStripChipGeometry,
} from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form.geometry';
import { TransactionFormLoading } from '@/modules/transactions/screens/transactions/transaction_form/components/transaction_form_loading';
import { useEditTransactionStore } from '@/modules/transactions/screens/transactions/transaction_form/edit_transaction.store';
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
  commitExchangeRate: jest.fn(),
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

  it('MA-163: puts no line cap on the budget lookup failure, so it is whole, and holds a loaded budget to one line', async () => {
    const lookupError = 'Could not load matching budgets. Try again.';
    const { rerender } = await render(
      <TransactionFormBody {...baseProps} showBudgetField budgetLookupError={lookupError} />,
    );

    const failure = within(screen.getByTestId('budget-row')).getByText(lookupError);
    // RN reads 0 and an absent prop alike as no cap.
    const lineCap: unknown = failure.props.numberOfLines;
    expect(lineCap ?? 0).toBe(0);

    await rerender(<TransactionFormBody {...baseProps} showBudgetField />);

    expect(
      within(screen.getByTestId('budget-row')).getByText(Strings.addTxPickBudgetTitle),
    ).toHaveProp('numberOfLines', 1);
  });
});

describe('MA-168 rate card', () => {
  beforeEach(() => useAddTransactionStore.getState().reset());
  // The body is still mounted here, so the reset is an update to its amount subscriber.
  afterEach(async () => {
    await act(() => useAddTransactionStore.getState().reset());
  });

  it('hides the rate card preview and hands it no converted amount of its own', async () => {
    mockExchangeRateRowProps.length = 0;
    useAddTransactionStore.getState().setAmountStr('15');
    await render(
      <TransactionFormBody
        {...baseProps}
        requiresRate
        selectedAccount={makeTestAccount({ id: 'account-usd', currency: Currency.USD })}
        currency={Currency.USD}
        exchangeRate="49"
      />,
    );

    expect(mockExchangeRateRowProps).not.toHaveLength(0);
    expect(mockExchangeRateRowProps.at(-1)?.previewHidden).toBe(true);
    expect(mockExchangeRateRowProps.at(-1)?.previewEgpAmount).toBeUndefined();
  });

  it('speaks no label left from the stored state once the rate row holds a field', async () => {
    const { ExchangeRateRow: RealExchangeRateRow } = jest.requireActual<
      typeof import('@/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row')
    >('@/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row');
    const rowProps = {
      value: '49',
      onChange: jest.fn(),
      onToggleOverride: jest.fn(),
      rateUpdatedAt: null,
      previewEgpAmount: undefined,
    };
    const { rerender } = await render(
      <RealExchangeRateRow {...rowProps} overrideEnabled={false} />,
    );

    expect(screen.getByTestId('exchange-rate-row')).toHaveProp(
      'accessibilityLabel',
      Strings.addTxRateEditAccessibility,
    );

    await rerender(<RealExchangeRateRow {...rowProps} overrideEnabled />);

    expect(screen.getByTestId('exchange-rate-row')).toHaveProp('accessibilityLabel', '');
  });

  it('MA-169: given onOpenEditor, the card is a button that speaks the stored-rate label with a custom rate as with the stored one, opens the editor on a press, and draws no field', async () => {
    const { ExchangeRateRow: RealExchangeRateRow } = jest.requireActual<
      typeof import('@/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row')
    >('@/modules/transactions/screens/transactions/transaction_form/components/exchange_rate_row');
    const onOpenEditor = jest.fn();
    const rowProps = {
      value: '49',
      onOpenEditor,
      onToggleOverride: jest.fn(),
      rateUpdatedAt: null,
      previewEgpAmount: undefined,
    };
    const { rerender } = await render(<RealExchangeRateRow {...rowProps} overrideEnabled />);

    const row = screen.getByTestId('exchange-rate-row');
    expect(row).toHaveProp('accessibilityRole', 'button');
    expect(row).toHaveProp('accessibilityLabel', Strings.addTxRateEditAccessibility);
    expect(screen.queryByTestId('exchange-rate-input')).toBeNull();

    await fireEvent.press(row);
    expect(onOpenEditor).toHaveBeenCalledTimes(1);

    await rerender(<RealExchangeRateRow {...rowProps} overrideEnabled={false} />);
    const storedRow = screen.getByTestId('exchange-rate-row');
    expect(storedRow).toHaveProp('accessibilityRole', 'button');
    expect(storedRow).toHaveProp('accessibilityLabel', Strings.addTxRateEditAccessibility);
  });
});

describe('MA-169 rate editor opened from the card', () => {
  beforeEach(() => {
    useRateEditorSheetState.getState().reset();
    mockExchangeRateRowProps.length = 0;
    mockSheetProps.length = 0;
  });

  it('opens on the form rate, closes on onOpenChange(false) with no commit, commits a typed 48 once at Done and closes, and stays open with the message on a refused commit', async () => {
    const commitExchangeRate = jest.fn().mockReturnValue(true);
    await render(
      <TransactionFormBody
        {...baseProps}
        requiresRate
        selectedAccount={makeTestAccount({ id: 'account-usd', currency: Currency.USD })}
        currency={Currency.USD}
        exchangeRate="49"
        commitExchangeRate={commitExchangeRate}
      />,
    );
    const openEditor = async () => {
      const { onOpenEditor } = mockExchangeRateRowProps.at(-1) ?? {};
      expect(onOpenEditor).toEqual(expect.any(Function));
      await act(() => onOpenEditor?.());
    };
    const editorSheet = () =>
      mockSheetProps.filter((props) => props.title === Strings.addTxRateLabel).at(-1);
    expect(screen.queryByTestId('rate-editor-input')).toBeNull();

    await openEditor();
    expect(within(screen.getByTestId('mock-sheet')).getByText(Strings.addTxRateLabel)).toBeTruthy();
    expect(screen.getByTestId('rate-editor-input')).toHaveDisplayValue('49');
    expect(
      within(screen.getByTestId('rate-editor-message-slot')).queryByText(
        Strings.addTxErrRateInvalid,
      ),
    ).toBeNull();

    await act(() => editorSheet()?.onOpenChange(false));
    expect(screen.queryByTestId('rate-editor-input')).toBeNull();
    expect(commitExchangeRate).not.toHaveBeenCalled();

    await openEditor();
    await fireEvent.changeText(screen.getByTestId('rate-editor-input'), '48');
    await fireEvent.press(screen.getByTestId('rate-editor-done'));
    expect(commitExchangeRate).toHaveBeenCalledTimes(1);
    expect(commitExchangeRate).toHaveBeenCalledWith('48');
    expect(screen.queryByTestId('rate-editor-input')).toBeNull();

    commitExchangeRate.mockReturnValue(false);
    await openEditor();
    await fireEvent.changeText(screen.getByTestId('rate-editor-input'), '48.');
    await fireEvent.press(screen.getByTestId('rate-editor-done'));
    expect(commitExchangeRate).toHaveBeenLastCalledWith('48.');
    expect(screen.getByTestId('rate-editor-input')).toBeTruthy();
    expect(
      within(screen.getByTestId('rate-editor-message-slot')).getByText(Strings.addTxErrRateInvalid),
    ).toBeTruthy();
  });
});

describe('MA-168 converted amount under the amount', () => {
  const usdAccount = makeTestAccount({ id: 'account-usd', currency: Currency.USD });
  const egpAccount = makeTestAccount({ id: 'account-egp', currency: Currency.EGP });
  const usdExpense = (
    <TransactionFormBody
      {...baseProps}
      requiresRate
      selectedAccount={usdAccount}
      currency={Currency.USD}
      exchangeRate="49"
    />
  );

  beforeEach(() => {
    useAddTransactionStore.getState().reset();
    useEditTransactionStore.getState().reset();
  });
  // The body is still mounted here, so each reset is an update to the line's amount subscriber.
  afterEach(async () => {
    await act(() => {
      useAddTransactionStore.getState().reset();
      useEditTransactionStore.getState().reset();
    });
  });

  it('prints the EGP value of a USD expense in the amount slot, outside the live region', async () => {
    useAddTransactionStore.getState().setAmountStr('15');
    await render(usdExpense);

    const slot = screen.getByTestId('amount-error-slot');
    const live = screen.getByTestId('amount-error-live');
    expect(within(slot).getByTestId('converted-amount-line')).toHaveTextContent('≈ 735 EGP');
    expect(within(slot).getByTestId('amount-error-live')).toBeTruthy();
    expect(within(live).queryByTestId('converted-amount-line')).toBeNull();
    expect(live).toHaveProp('accessibilityLiveRegion', 'polite');
    const slotLiveRegion: unknown = slot.props.accessibilityLiveRegion;
    expect(slotLiveRegion).toBeUndefined();
  });

  it("gives the slot to an amount error: the message in the live region in the slot's text style, no converted amount, the same floor", async () => {
    useAddTransactionStore.getState().setAmountStr('15');
    await render(React.cloneElement(usdExpense, { amountError: 'Enter an amount' }));

    const slot = screen.getByTestId('amount-error-slot');
    const message = within(screen.getByTestId('amount-error-live')).getByText('Enter an amount');
    // jest.setup.js mocks FieldError as a pass-through Text, so the message carries its style under textProps.
    expect(message).toHaveProp('textProps', {
      numberOfLines: 1,
      style: AMOUNT_MESSAGE_TEXT_STYLE,
    });
    expect(screen.queryByTestId('converted-amount-line')).toBeNull();
    expect(slot).toHaveStyle({ minHeight: TRANSACTION_FORM_ERROR_SLOT_HEIGHT });
  });

  it('mounts no converted amount when no USD account is involved', async () => {
    useAddTransactionStore.getState().setAmountStr('15');
    await render(React.cloneElement(usdExpense, { requiresRate: false }));

    expect(screen.queryByTestId('converted-amount-line')).toBeNull();
    expect(screen.getByTestId('amount-error-slot')).toHaveStyle({
      minHeight: TRANSACTION_FORM_ERROR_SLOT_HEIGHT,
    });
  });

  it("holds the line to one line in the amount error's line box, which the OS scales, above font scale 1", async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);
    useAddTransactionStore.getState().setAmountStr('15');
    await render(usdExpense);

    const line = screen.getByTestId('converted-amount-line');
    expect(line).toHaveProp('numberOfLines', 1);
    expect(line).not.toHaveProp('allowFontScaling', false);
    expect(line).toHaveStyle(AMOUNT_MESSAGE_TEXT_STYLE);
    expect(line).toHaveStyle({ fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) });
    expect(line).not.toHaveStyle(scaledTextStyle(Type.micro, fontScale));
  });

  it('prints the USD the destination receives on the edit sheet of an EGP to USD transfer', async () => {
    useEditTransactionStore.getState().setAmountStr('5000');
    await render(
      <TransactionFormBody
        {...baseProps}
        formMode="edit"
        type={TransactionType.Transfer}
        requiresRate
        selectedAccount={egpAccount}
        selectedToAccount={usdAccount}
        exchangeRate="49"
      />,
    );

    expect(screen.getByTestId('converted-amount-line')).toHaveTextContent('≈ 102.04 USD');
  });
});

describe('TransactionFormLoading', () => {
  it('draws the strip row of three bars as tall as the loaded chip at the suite font scale, and four fact rows at the loaded fact-row height', async () => {
    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);
    const chipHeight = resolveAccountStripChipGeometry(fontScale).height;
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
        height: chipHeight,
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
