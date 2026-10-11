import { Strings } from '@/constants/strings';
import {
  resolveTransactionLoadErrorAlertProps,
  resolveTransactionLoadErrorTitle,
} from '@/modules/transactions/screens/transactions/components/transaction_load_error.helpers';

const ROWS = [
  ['initial', Strings.transactionsLoadError],
  ['refresh', Strings.transactionsRefreshError],
  ['totals', Strings.transactionsTotalsLoadError],
  ['accounts', Strings.transactionsAccountLookupError],
  ['pagination', Strings.transactionsLoadMoreError],
] as const;

const FLOATING_ALERT_PROPS = {
  mode: 'floating',
  floatingOffset: 'tabBar',
  tinted: true,
  flatRetry: true,
} as const;

const ALERT_PROPS = [
  ['initial', undefined],
  ['pagination', { mode: 'inline', tinted: true, flatRetry: true }],
  ['refresh', FLOATING_ALERT_PROPS],
  ['totals', FLOATING_ALERT_PROPS],
  ['accounts', FLOATING_ALERT_PROPS],
] as const;

describe('resolveTransactionLoadErrorTitle', () => {
  it.each(ROWS)('%s -> its own title', (variant, expected) => {
    expect(resolveTransactionLoadErrorTitle(variant)).toBe(expected);
  });

  it('every title is distinct', () => {
    expect(new Set(ROWS.map(([, title]) => title)).size).toBe(ROWS.length);
  });
});

describe('the list failure copy (MA-161)', () => {
  it('reads the canvas Copy note verbatim, with Try again on the retry', () => {
    expect({
      initial: Strings.transactionsLoadError,
      description: Strings.transactionsLoadErrorDescription,
      refresh: Strings.transactionsRefreshError,
      totals: Strings.transactionsTotalsLoadError,
      accounts: Strings.transactionsAccountLookupError,
      pagination: Strings.transactionsLoadMoreError,
      retry: Strings.transactionsLoadRetry,
    }).toEqual({
      initial: "Couldn't load your transactions",
      description: 'Something went wrong reading your data. Your transactions are still there.',
      refresh: "Couldn't refresh your transactions.",
      totals: "Couldn't load this month's figures.",
      accounts: "Couldn't load account names.",
      pagination: "Couldn't load more.",
      retry: 'Try again',
    });
  });

  it('starts no failure string with Could not', () => {
    const copy: unknown[] = [
      ...ROWS.map(([, title]) => title),
      Strings.transactionsLoadErrorDescription,
    ];

    expect(copy.filter((text) => /^Could not/.test(String(text)))).toEqual([]);
  });
});

describe('resolveTransactionLoadErrorAlertProps', () => {
  it.each(ALERT_PROPS)('%s -> its alert props', (variant, expected) => {
    expect(resolveTransactionLoadErrorAlertProps(variant)).toStrictEqual(expected);
  });
});
