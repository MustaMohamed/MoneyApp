import { fireEvent, render } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { TransferFlowCard } from '@/modules/transactions/screens/transactions/detail/components/transfer_flow_card';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => () => null);

function makeAccount(overrides: Partial<Account>): Account {
  return {
    id: 'account-1',
    name: 'Cash',
    type: AccountType.PhysicalWallet,
    currency: Currency.EGP,
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
    sort_order: 0,
    created_at: '2026-07-22T00:00:00.000Z',
    updated_at: '2026-07-22T00:00:00.000Z',
    ...overrides,
  };
}

describe('TransferFlowCard', () => {
  it('announces each account action with its amount and currency', () => {
    const fromAccount = makeAccount({ id: 'cash', name: 'Cash' });
    const toAccount = makeAccount({
      id: 'usd-bank',
      name: 'USD Bank',
      type: AccountType.Bank,
      currency: Currency.USD,
    });
    const onPressFrom = jest.fn();
    const onPressTo = jest.fn();

    const screen = render(
      <TransferFlowCard
        fromAccount={fromAccount}
        toAccount={toAccount}
        fromAmount={1000}
        fromCurrency={Currency.EGP}
        toAmount={20}
        toCurrency={Currency.USD}
        onPressFrom={onPressFrom}
        onPressTo={onPressTo}
      />,
    );

    fireEvent.press(
      screen.getByLabelText(Strings.detailOpenAccountAccessibility('Cash', '1,000', Currency.EGP)),
    );
    fireEvent.press(
      screen.getByLabelText(Strings.detailOpenAccountAccessibility('USD Bank', '20', Currency.USD)),
    );

    expect(onPressFrom).toHaveBeenCalledTimes(1);
    expect(onPressTo).toHaveBeenCalledTimes(1);
  });
});
