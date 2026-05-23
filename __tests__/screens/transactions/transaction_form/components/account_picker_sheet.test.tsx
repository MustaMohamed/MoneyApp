import { render, fireEvent } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/database/entities/account.entity';
import { AccountPickerSheet } from '@/screens/transactions/transaction_form/components/account_picker_sheet';

jest.mock('@expo/vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');

function mkAccount(over: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    name: 'Checking',
    type: AccountType.Bank,
    currency: Currency.EGP,
    opening_balance: 0,
    current_balance: 1000,
    color: '#10B981',
    is_archived: 0,
    credit_limit: null,
    revolving_balance: null,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0,
    apr: null,
    sort_order: 0,
    created_at: 'now',
    updated_at: 'now',
    ...over,
  } as Account;
}

describe('AccountPickerSheet', () => {
  const accounts: Account[] = [
    mkAccount({ id: 'a1', name: 'Checking', current_balance: 1000 }),
    mkAccount({
      id: 'a2',
      name: 'Cash Wallet',
      type: AccountType.PhysicalWallet,
      color: '#3B82F6',
    }),
    mkAccount({ id: 'a3', name: 'Credit Card', type: AccountType.CreditCard, color: '#9B73D4' }),
  ];

  it('renders only when visible=true', () => {
    const { queryByText, rerender } = render(
      <AccountPickerSheet
        visible={false}
        title="From"
        accounts={accounts}
        selectedId={undefined}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(queryByText('From')).toBeNull();

    rerender(
      <AccountPickerSheet
        visible={true}
        title="From"
        accounts={accounts}
        selectedId={undefined}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(queryByText('From')).toBeTruthy();
  });

  it('renders each account name', () => {
    const { getByText } = render(
      <AccountPickerSheet
        visible={true}
        title="From"
        accounts={accounts}
        selectedId={undefined}
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(getByText('Checking')).toBeTruthy();
    expect(getByText('Cash Wallet')).toBeTruthy();
    expect(getByText('Credit Card')).toBeTruthy();
  });

  it('calls onSelect with the chosen account when a row is pressed', () => {
    const onSelect = jest.fn();
    const { getByTestId } = render(
      <AccountPickerSheet
        visible={true}
        title="From"
        accounts={accounts}
        selectedId={undefined}
        onSelect={onSelect}
        onClose={() => {}}
      />,
    );
    fireEvent.press(getByTestId('account-picker-row-a2'));
    expect(onSelect).toHaveBeenCalledWith(accounts[1]);
  });

  it('marks the selected row with a check indicator', () => {
    const { getByTestId } = render(
      <AccountPickerSheet
        visible={true}
        title="From"
        accounts={accounts}
        selectedId="a2"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(getByTestId('account-picker-row-a2-selected')).toBeTruthy();
  });

  it('excludes accounts whose id equals excludeId (used for transfer To)', () => {
    const { queryByText } = render(
      <AccountPickerSheet
        visible={true}
        title="To"
        accounts={accounts}
        selectedId={undefined}
        excludeId="a1"
        onSelect={() => {}}
        onClose={() => {}}
      />,
    );
    expect(queryByText('Checking')).toBeNull();
    expect(queryByText('Cash Wallet')).toBeTruthy();
  });
});
