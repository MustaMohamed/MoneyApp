import { fireEvent, render } from '@testing-library/react-native';
import React from 'react';
import { Dimensions, PixelRatio, View } from 'react-native';

import { resolveFitAmountTextProps, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Currency, TransactionType } from '@/constants/enums';
import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { resolveDayCardSwipeCorners } from '@/modules/transactions/screens/transactions/components/day_card_row.helpers';
import { TransactionRow } from '@/modules/transactions/screens/transactions/components/transaction_row';
import {
  TRANSACTION_ROW_AMOUNT_FONT_SIZE,
  TRANSACTION_ROW_CAPTION_FONT_SIZE,
  TRANSACTION_ROW_CODE_FONT_SIZE,
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_TITLE_FONT_SIZE,
  resolveTransactionRowCaptionLines,
  resolveTransactionRowHeight,
  resolveTransactionRowValueTrackMaxWidth,
} from '@/modules/transactions/screens/transactions/components/transaction_row.helpers';
import { ms } from '@/utils/responsive';

interface MockSwipeableRowProps {
  actions: unknown[];
  children: React.ReactNode;
  disabled?: boolean;
  containerStyle?: unknown;
}

const mockSwipeableRow = jest.fn(({ children }: MockSwipeableRowProps) => <View>{children}</View>);

jest.mock('@/components/ui/swipeable_row', () => ({
  SwipeableRow: (props: MockSwipeableRowProps) => mockSwipeableRow(props),
}));
interface MockReanimatedSwipeableProps {
  children: React.ReactNode;
  containerStyle?: unknown;
}

const mockReanimatedSwipeable = jest.fn(({ children }: MockReanimatedSwipeableProps) => (
  <View>{children}</View>
));

jest.mock('react-native-gesture-handler/ReanimatedSwipeable', () => ({
  __esModule: true,
  default: (props: MockReanimatedSwipeableProps) => mockReanimatedSwipeable(props),
}));
jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);
jest.mock('react-native-reanimated', () => {
  const { View: RNView } = jest.requireActual<typeof import('react-native')>('react-native');
  return {
    __esModule: true,
    default: { View: RNView },
    useAnimatedStyle: () => ({}),
  };
});
jest.mock('@/modules/transactions/screens/transactions/components/transaction_row.anim', () => ({
  useRowPressScale: () => ({
    scale: { value: 1 },
    onPressIn: jest.fn(),
    onPressOut: jest.fn(),
  }),
}));

function transaction(commitmentPaymentId: string | null): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 100,
    currency: Currency.EGP,
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    revolving_balance_delta: null,
    account_id: 'account',
    to_account_id: null,
    category_id: 'category',
    budget_id: null,
    note: null,
    transaction_date: '2026-07-19',
    transaction_time: '12:00:00',
    commitment_payment_id: commitmentPaymentId,
    installment_id: null,
    created_at: '2026-07-19T12:00:00.000Z',
    updated_at: '2026-07-19T12:00:00.000Z',
  };
}

describe('TransactionRow ownership actions', () => {
  beforeEach(() => mockSwipeableRow.mockClear());

  it('does not expose generic swipe actions for a commitment-owned transaction', async () => {
    await render(
      <TransactionRow
        tx={transaction('payment-1')}
        onPress={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(mockSwipeableRow).toHaveBeenCalledWith(
      expect.objectContaining({ actions: [], disabled: true }),
    );
  });

  it('keeps edit and delete actions for an ordinary transaction', async () => {
    await render(
      <TransactionRow
        tx={transaction(null)}
        onPress={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    expect(mockSwipeableRow.mock.calls[0][0].actions).toHaveLength(2);
  });

  it('hands the day card corners to the swipeable as its container style', async () => {
    const corners = resolveDayCardSwipeCorners(true, false);
    await render(
      <TransactionRow
        tx={transaction(null)}
        onPress={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
        swipeContainerStyle={corners}
      />,
    );

    expect(mockSwipeableRow.mock.calls[0][0].containerStyle).toBe(corners);
  });

  it('sizes the row and its text from the font scale, clips a long note to one line and draws the time alone on the line under it', async () => {
    const source: Account = {
      id: 'account',
      name: 'A very long source account name that must truncate',
      type: AccountType.Bank,
      currency: Currency.USD,
      opening_balance: 0,
      current_balance: 0,
      color: null,
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
      created_at: '2026-07-19T12:00:00.000Z',
      updated_at: '2026-07-19T12:00:00.000Z',
    };
    const tx = transaction(null);
    tx.note = 'Split with Omar at the counter';
    const screen = await render(
      <TransactionRow
        tx={tx}
        account={source}
        onPress={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    const { fontScale } = Dimensions.get('window');
    expect(screen.getByTestId('transaction-row')).toHaveStyle({
      height: resolveTransactionRowHeight(fontScale),
    });
    expect(screen.getByTestId('transaction-row-content-track')).toHaveStyle({
      flex: 1,
      minWidth: 0,
    });
    const lead = screen.getByText('Split with Omar at the counter');
    expect(lead.props.numberOfLines).toBe(1);
    expect(lead).toHaveProp('allowFontScaling', false);
    expect(lead).toHaveStyle({
      ...scaledTextStyle(TRANSACTION_ROW_CAPTION_FONT_SIZE, fontScale),
      flexShrink: 1,
    });
    expect(resolveTransactionRowCaptionLines(fontScale)).toBe(2);
    const time = screen.getByText(/^\d{1,2}:\d{2} [AP]M$/);
    expect(time.props.numberOfLines).toBe(1);
    expect(time).toHaveProp('allowFontScaling', false);
    expect(time).toHaveStyle(scaledTextStyle(TRANSACTION_ROW_CAPTION_FONT_SIZE, fontScale));
    const title = screen.getByText(Strings.uncategorized);
    expect(title).toHaveProp('allowFontScaling', false);
    expect(title).toHaveStyle(scaledTextStyle(TRANSACTION_ROW_TITLE_FONT_SIZE, fontScale));
    expect(TRANSACTION_ROW_HEIGHT).toBe(PixelRatio.roundToNearestPixel(ms(60)));
  });

  it('renders the destination native amount for transfers', async () => {
    const source = {
      id: 'account',
      name: 'USD wallet',
      type: AccountType.Bank,
      currency: Currency.USD,
      opening_balance: 0,
      current_balance: 0,
      color: null,
      credit_limit: null,
      revolving_balance: null,
      minimum_payment: null,
      statement_due_day: null,
      interest_tracking: 0 as const,
      apr: null,
      is_archived: 0 as const,
      balance_review_required: 0 as const,
      is_deleted: 0 as const,
      sort_order: 0,
      created_at: '2026-07-19T12:00:00.000Z',
      updated_at: '2026-07-19T12:00:00.000Z',
    };
    const destination = { ...source, id: 'destination', name: 'CIB', currency: Currency.EGP };
    const transfer = transaction(null);
    transfer.type = TransactionType.Transfer;
    transfer.currency = Currency.USD;
    transfer.amount = 100;
    transfer.egp_amount = 4_850;
    transfer.to_amount = 4_850;
    transfer.exchange_rate = 48.5;
    transfer.to_account_id = destination.id;
    transfer.category_id = null;

    const { getByTestId, getByText } = await render(
      <TransactionRow
        tx={transfer}
        account={source}
        toAccount={destination}
        onPress={jest.fn()}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );

    const { fontScale } = Dimensions.get('window');
    expect(fontScale).toBeGreaterThan(1);
    const amount = getByText('100.00');
    const amountFit = resolveFitAmountTextProps(TRANSACTION_ROW_AMOUNT_FONT_SIZE, fontScale);
    expect(amount).toHaveProp('numberOfLines', amountFit.numberOfLines);
    expect(amount).toHaveProp('allowFontScaling', amountFit.allowFontScaling);
    expect(amount).toHaveProp('adjustsFontSizeToFit', amountFit.adjustsFontSizeToFit);
    expect(amount).toHaveStyle(amountFit.style);
    const fit = resolveFitAmountTextProps(TRANSACTION_ROW_CODE_FONT_SIZE, fontScale);
    const code = getByText('→ 4,850 EGP');
    expect(code).toHaveProp('numberOfLines', fit.numberOfLines);
    expect(code).toHaveProp('allowFontScaling', fit.allowFontScaling);
    expect(code).toHaveProp('adjustsFontSizeToFit', fit.adjustsFontSizeToFit);
    expect(code).toHaveStyle(fit.style);
    expect(getByTestId('transaction-row-value-track')).toHaveStyle({
      maxWidth: resolveTransactionRowValueTrackMaxWidth(fontScale),
    });
  });

  it('leaves the detail closed after a horizontal drag across a commitment-owned row and opens it on a tap', async () => {
    const onPress = jest.fn();
    const screen = await render(
      <TransactionRow
        tx={transaction('payment-1')}
        onPress={onPress}
        onEdit={jest.fn()}
        onDelete={jest.fn()}
      />,
    );
    const row = screen.getByTestId('transaction-row-content-track');

    await fireEvent(row, 'pressIn', { nativeEvent: { pageX: 0 } });
    await fireEvent(row, 'pressMove', { nativeEvent: { pageX: 12 } });
    await fireEvent.press(row);
    expect(onPress).not.toHaveBeenCalled();

    await fireEvent(row, 'pressIn', { nativeEvent: { pageX: 0 } });
    await fireEvent.press(row);
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});

describe('SwipeableRow', () => {
  it('hands its container style to the swipeable, whose corner radii clip the action tiles', async () => {
    const { SwipeableRow: RealSwipeableRow } = jest.requireActual<
      typeof import('@/components/ui/swipeable_row')
    >('@/components/ui/swipeable_row');
    const corners = resolveDayCardSwipeCorners(true, false);

    await render(
      <RealSwipeableRow actions={[]} containerStyle={corners}>
        <View />
      </RealSwipeableRow>,
    );

    expect(mockReanimatedSwipeable.mock.calls[0][0].containerStyle).toBe(corners);
  });
});
