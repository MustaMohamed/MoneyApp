import { render, fireEvent } from '@testing-library/react-native';

import { NoAccountsEmpty } from '@/screens/transactions/transaction_form_v2/components/no_accounts_empty';

describe('NoAccountsEmpty', () => {
  it('renders the empty-state title and body', () => {
    const { getByText } = render(<NoAccountsEmpty onAddAccount={() => {}} />);
    expect(getByText('No Accounts Yet')).toBeTruthy();
    expect(getByText(/Add an account first/)).toBeTruthy();
  });

  it('renders an "Add Account" CTA button', () => {
    const { getByText } = render(<NoAccountsEmpty onAddAccount={() => {}} />);
    expect(getByText('Add Account')).toBeTruthy();
  });

  it('calls onAddAccount when the CTA is pressed', () => {
    const onAddAccount = jest.fn();
    const { getByTestId } = render(<NoAccountsEmpty onAddAccount={onAddAccount} />);
    fireEvent.press(getByTestId('no-accounts-cta'));
    expect(onAddAccount).toHaveBeenCalledTimes(1);
  });
});
