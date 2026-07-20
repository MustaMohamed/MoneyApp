import { fireEvent, render } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { BalanceReviewAlert } from '@/modules/accounts/screens/accounts/detail/components/balance_review_alert';
import { shouldShowBalanceReview } from '@/modules/accounts/screens/accounts/detail/components/balance_review_alert.helpers';

jest.mock('@/components/ui/button', () => {
  const React = jest.requireActual<typeof import('react')>('react');
  const { Pressable, Text } = jest.requireActual<typeof import('react-native')>('react-native');

  return {
    Button: (mockProps: {
      isDisabled?: boolean;
      isLoading?: boolean;
      label: string;
      onPress?: () => void;
    }) =>
      React.createElement(
        Pressable,
        { disabled: mockProps.isDisabled, onPress: mockProps.onPress },
        React.createElement(Text, null, mockProps.isLoading ? 'Loading...' : mockProps.label),
      ),
  };
});

describe('BalanceReviewAlert', () => {
  it('offers adjustment as the primary action and confirmation as the secondary action', () => {
    const onAdjust = jest.fn();
    const onConfirm = jest.fn();
    const screen = render(
      <BalanceReviewAlert onAdjust={onAdjust} onConfirm={onConfirm} isConfirming={false} />,
    );

    expect(screen.getByText(Strings.accountBalanceReviewTitle)).toBeTruthy();
    fireEvent.press(screen.getByText(Strings.accountBalanceReviewAdjust));
    fireEvent.press(screen.getByText(Strings.accountBalanceReviewConfirm));

    expect(onAdjust).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('locks both actions while confirmation is running', () => {
    const onAdjust = jest.fn();
    const onConfirm = jest.fn();
    const screen = render(
      <BalanceReviewAlert onAdjust={onAdjust} onConfirm={onConfirm} isConfirming />,
    );

    fireEvent.press(screen.getByText(Strings.accountBalanceReviewAdjust));
    fireEvent.press(screen.getByText('Loading...'));

    expect(onAdjust).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('renders an inline error without replacing the review guidance', () => {
    const screen = render(
      <BalanceReviewAlert
        onAdjust={jest.fn()}
        onConfirm={jest.fn()}
        isConfirming={false}
        errorMessage={Strings.accountBalanceReviewError}
      />,
    );

    expect(screen.getByText(Strings.accountBalanceReviewBody)).toBeTruthy();
    expect(screen.getByText(Strings.accountBalanceReviewError)).toBeTruthy();
  });
});

describe('shouldShowBalanceReview', () => {
  const account = {
    id: 'card',
    name: 'Card',
    type: AccountType.CreditCard,
    currency: Currency.EGP,
    opening_balance: 100,
    current_balance: 100,
    color: null,
    credit_limit: 1000,
    revolving_balance: 100,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0 as const,
    apr: null,
    balance_review_required: 1 as const,
    is_archived: 0 as const,
    sort_order: 0,
    created_at: '2026-07-19T00:00:00.000Z',
    updated_at: '2026-07-19T00:00:00.000Z',
  };

  it('shows only for a flagged credit card', () => {
    expect(shouldShowBalanceReview(account)).toBe(true);
    expect(shouldShowBalanceReview({ ...account, balance_review_required: 0 })).toBe(false);
    expect(shouldShowBalanceReview({ ...account, type: AccountType.Bank })).toBe(false);
  });
});
