import {
  STACKED_PREFIX,
  backgroundTabPushedStackKey,
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

describe('backgroundTabPushedStackKey', () => {
  const TRANSACTIONS_TAB_INDEX = 1;
  const COMMITMENTS_TAB_INDEX = 2;
  const PUSHED_TAB_STACK = {
    key: 'commitments-tab-stack',
    routes: [{ name: 'index' }, { name: '[id]/index' }],
  };
  const ROOT_TAB_STACK = { key: 'commitments-tab-stack', routes: [{ name: 'index' }] };

  function appStackOver(focusedTab: number, commitmentsStack?: typeof PUSHED_TAB_STACK) {
    return {
      routes: [
        {
          name: '(tabs)',
          state: {
            index: focusedTab,
            routes: [
              { name: 'dashboard' },
              { name: 'transactions' },
              { name: 'commitments', state: commitmentsStack },
            ],
          },
        },
        { name: 'stacked/commitments/[id]/index' },
      ],
    };
  }

  it.each([
    [
      'another tab focused and a screen pushed',
      appStackOver(TRANSACTIONS_TAB_INDEX, PUSHED_TAB_STACK),
      PUSHED_TAB_STACK.key,
    ],
    ['the tab itself focused', appStackOver(COMMITMENTS_TAB_INDEX, PUSHED_TAB_STACK), undefined],
    ['only the tab root', appStackOver(TRANSACTIONS_TAB_INDEX, ROOT_TAB_STACK), undefined],
    ['a tab with no state', appStackOver(TRANSACTIONS_TAB_INDEX), undefined],
    ['a navigator with no (tabs) route', { routes: [{ name: 'index' }] }, undefined],
    ['no navigator state', undefined, undefined],
  ])('reads %s', (_name, appStack, expected) => {
    expect(backgroundTabPushedStackKey(appStack, 'commitments')).toBe(expected);
  });
});
