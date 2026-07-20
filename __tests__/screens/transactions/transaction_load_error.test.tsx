import { fireEvent, render } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { TransactionLoadError } from '@/modules/transactions/screens/transactions/components/transaction_load_error';

describe('TransactionLoadError', () => {
  it.each([
    ['initial', Strings.transactionsLoadError],
    ['refresh', Strings.transactionsRefreshError],
    ['totals', Strings.transactionsTotalsLoadError],
    ['pagination', Strings.transactionsLoadMoreError],
  ] as const)('renders the %s failure with a retry action', (variant, title) => {
    const retry = jest.fn();
    const screen = render(<TransactionLoadError variant={variant} onRetry={retry} />);

    expect(screen.getByText(title)).toBeTruthy();
    fireEvent.press(screen.getByText(Strings.transactionsLoadRetry));
    expect(retry).toHaveBeenCalledTimes(1);
  });

  it('keeps nonblocking failures in the elevated overlay lane above the FAB', () => {
    const screen = render(<TransactionLoadError variant="refresh" onRetry={jest.fn()} />);

    expect(screen.getByTestId('transaction-load-error')).toHaveProp(
      'className',
      expect.stringContaining('bottom-24'),
    );
  });
});
