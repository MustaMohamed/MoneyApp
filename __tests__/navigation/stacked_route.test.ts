import {
  STACKED_PREFIX,
  resolveDetailScreenEdges,
  stackedPrefixOf,
  stackedPrefixOfNavigator,
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

describe('stackedPrefixOfNavigator', () => {
  it('reads a navigator holding a stacked/ route as the stacked copy', () => {
    const state = {
      routes: [{ name: '(tabs)' }, { name: 'stacked/transactions/detail/[id]/index' }],
    };

    expect(stackedPrefixOfNavigator(state)).toBe(STACKED_PREFIX);
  });

  it('reads a navigator with no stacked/ route as the tabbed copy', () => {
    const state = {
      routes: [
        { name: 'index' },
        { name: 'detail/[id]/index' },
        { name: 'stackedthing/index' },
        { name: 'transactions/stacked/index' },
      ],
    };

    expect(stackedPrefixOfNavigator(state)).toBe('');
  });

  it('reads no navigator state as the tabbed copy', () => {
    expect(stackedPrefixOfNavigator(undefined)).toBe('');
  });
});

describe('stackedTransactionDetailRoute', () => {
  it('addresses the stacked twin of the transaction detail route', () => {
    expect(stackedTransactionDetailRoute('tx-9')).toBe('/stacked/transactions/detail/tx-9');
  });
});
