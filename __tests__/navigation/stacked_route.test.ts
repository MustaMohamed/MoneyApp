import {
  STACKED_PREFIX,
  resolveDetailScreenEdges,
  stackedPrefixOf,
  stackedTransactionDetailRoute,
} from '@/modules/navigation/domain/stacked_route';

describe('resolveDetailScreenEdges', () => {
  it.each(['/transactions/detail/tx-1', '/commitments/c-1'])(
    'leaves the bottom inset to the tab bar on %s',
    (pathname) => {
      expect(resolveDetailScreenEdges(stackedPrefixOf(pathname))).toEqual(['top']);
    },
  );

  it.each(['/stacked/transactions/detail/tx-1', '/stacked/commitments/c-1'])(
    'pays the bottom inset on %s, which has no tab bar',
    (pathname) => {
      expect(resolveDetailScreenEdges(stackedPrefixOf(pathname))).toEqual(['top', 'bottom']);
    },
  );
});

describe('stackedPrefixOf', () => {
  it.each(['/stacked/transactions/detail/tx-1', '/stacked/commitments/pay-1', '/stacked'])(
    'reads %s as the stacked copy',
    (pathname) => {
      expect(stackedPrefixOf(pathname)).toBe(STACKED_PREFIX);
    },
  );

  it.each([
    '/transactions/detail/tx-1',
    '/commitments/pay-1',
    '/accounts/a-1',
    '/',
    '',
    '/stackedthing',
    '/transactions/stacked/tx-1',
  ])('reads %s as the tabbed copy', (pathname) => {
    expect(stackedPrefixOf(pathname)).toBe('');
  });
});

describe('stackedTransactionDetailRoute', () => {
  it('addresses the stacked twin of the transaction detail route', () => {
    expect(stackedTransactionDetailRoute('tx-9')).toBe('/stacked/transactions/detail/tx-9');
  });
});
