import { Strings } from '@/constants/strings';
import { resolveTransactionLoadErrorTitle } from '@/modules/transactions/screens/transactions/components/transaction_load_error.helpers';

const ROWS = [
  ['initial', Strings.transactionsLoadError],
  ['refresh', Strings.transactionsRefreshError],
  ['totals', Strings.transactionsTotalsLoadError],
  ['pagination', Strings.transactionsLoadMoreError],
] as const;

describe('resolveTransactionLoadErrorTitle', () => {
  it.each(ROWS)('%s -> its own title', (variant, expected) => {
    expect(resolveTransactionLoadErrorTitle(variant)).toBe(expected);
  });

  it('every title is distinct', () => {
    expect(new Set(ROWS.map(([, title]) => title)).size).toBe(ROWS.length);
  });
});
