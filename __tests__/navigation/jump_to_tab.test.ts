import { router } from 'expo-router';

import { jumpToTab } from '@/modules/navigation/utils/jump_to_tab';

jest.mock('expo-router', () => ({ router: { dismissTo: jest.fn() } }));

type JumpNavigation = Parameters<typeof jumpToTab>[0];
type TabName = Parameters<typeof jumpToTab>[1];

const TAB_NAMES = ['dashboard', 'transactions', 'commitments'] as const;
const STACK_KEY = 'tab-stack';
const PUSHED_STACK = {
  key: STACK_KEY,
  routes: [{ name: 'index' }, { name: 'detail/[id]/index' }],
};
const ROOT_STACK = { key: STACK_KEY, routes: [{ name: 'index' }] };

function appStackOver(focused: string, tabName: TabName, tabStack: typeof ROOT_STACK) {
  return {
    routes: [
      {
        name: '(tabs)',
        state: {
          index: TAB_NAMES.findIndex((name) => name === focused),
          routes: TAB_NAMES.map((name) => ({
            name,
            state: name === tabName ? tabStack : undefined,
          })),
        },
      },
      { name: 'accounts/[id]/index' },
    ],
  };
}

function navigationOver(state: object): { navigation: JumpNavigation; dispatch: jest.Mock } {
  const dispatch = jest.fn();
  const navigation = { getState: () => state, dispatch } as unknown as JumpNavigation;
  return { navigation, dispatch };
}

describe('jumpToTab', () => {
  const dismissTo = jest.mocked(router.dismissTo);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it.each(['transactions', 'commitments'] as const)(
    'pops a background %s tab with a pushed screen on its key before both dismissals',
    (tabName) => {
      const { navigation, dispatch } = navigationOver(
        appStackOver('dashboard', tabName, PUSHED_STACK),
      );

      jumpToTab(navigation, tabName);

      expect(dispatch).toHaveBeenCalledTimes(1);
      expect(dispatch).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'POP_TO_TOP', target: STACK_KEY }),
      );
      expect(dispatch.mock.invocationCallOrder[0]).toBeLessThan(
        dismissTo.mock.invocationCallOrder[0],
      );
      const href = `/(app)/(tabs)/${tabName}`;
      expect(dismissTo.mock.calls).toEqual([[href], [href]]);
    },
  );

  it.each([
    ['the selected tab', appStackOver('transactions', 'transactions', PUSHED_STACK)],
    ['a tab at its root', appStackOver('dashboard', 'transactions', ROOT_STACK)],
    ['a navigator with no (tabs) route', { routes: [{ name: 'accounts/[id]/index' }] }],
  ])('dispatches nothing on %s and makes two dismissals', (_name, state) => {
    const { navigation, dispatch } = navigationOver(state);

    jumpToTab(navigation, 'transactions');

    expect(dispatch).not.toHaveBeenCalled();
    expect(dismissTo.mock.calls).toEqual([
      ['/(app)/(tabs)/transactions'],
      ['/(app)/(tabs)/transactions'],
    ]);
  });
});
