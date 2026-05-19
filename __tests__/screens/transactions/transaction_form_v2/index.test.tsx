import { render } from '@testing-library/react-native';

import {
  AddTransactionSheet,
  EditTransactionSheet,
} from '@/screens/transactions/transaction_form_v2';
import { useAccountStore } from '@/store/account.store';

beforeEach(() => {
  useAccountStore.setState({
    state: { accounts: [], loading: false, error: undefined },
  } as any);
});

describe('AddTransactionSheet', () => {
  it('renders nothing when visible=false', () => {
    const { queryByTestId } = render(<AddTransactionSheet visible={false} onClose={() => {}} />);
    expect(queryByTestId('add-transaction-sheet')).toBeNull();
  });

  it('renders NoAccountsEmpty when visible=true and accounts is empty', () => {
    const { getByText } = render(<AddTransactionSheet visible={true} onClose={() => {}} />);
    expect(getByText('No Accounts Yet')).toBeTruthy();
  });
});

describe('EditTransactionSheet', () => {
  it('renders nothing when tx is null', () => {
    const { queryByTestId } = render(
      <EditTransactionSheet visible={true} onClose={() => {}} tx={null} />,
    );
    expect(queryByTestId('edit-transaction-sheet')).toBeNull();
  });
});
