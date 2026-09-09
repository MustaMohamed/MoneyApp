import {
  STACKED_PREFIX,
  commitmentEditRoute,
  stackedPrefixOf,
  stackedTransactionDetailRoute,
} from '@/modules/navigation/domain/stacked_route';

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

describe('commitmentEditRoute', () => {
  it('addresses the tabbed edit route with no prefix', () => {
    expect(commitmentEditRoute('com-1', '')).toBe('/commitments/com-1/edit');
  });

  it('addresses the stacked twin of the edit route with the prefix', () => {
    expect(commitmentEditRoute('com-1', STACKED_PREFIX)).toBe('/stacked/commitments/com-1/edit');
  });

  it('carries the origin transaction on the stacked href', () => {
    expect(commitmentEditRoute('com-1', STACKED_PREFIX, 'tx-1')).toBe(
      '/stacked/commitments/com-1/edit?originTxId=tx-1',
    );
  });

  it('leaves the tabbed href bare when an origin transaction is passed', () => {
    expect(commitmentEditRoute('com-1', '', 'tx-1')).toBe('/commitments/com-1/edit');
  });
});
