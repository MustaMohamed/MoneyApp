import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/store/account.store';

jest.mock('react-native-reanimated', () => {
  const React = jest.requireActual('react');
  const View = ({ children, style }: { children?: React.ReactNode; style?: unknown }) =>
    React.createElement('View', { style }, children);
  return {
    __esModule: true,
    default: { View, createAnimatedComponent: (c: unknown) => c },
    View,
    FadeIn: { duration: () => undefined },
    FadeOut: { duration: () => undefined },
    useSharedValue: () => ({ value: 0 }),
    useAnimatedStyle: () => ({}),
    withTiming: (v: unknown) => v,
    withSpring: (v: unknown) => v,
    withDelay: (_d: number, v: unknown) => v,
  };
});

import DashboardScreenV2 from '@/screens/dashboard_v2';

// Mock the hook directly — screen test is about wiring, not hook logic.
// Hook is tested separately in dashboard_hook.test.ts.

const setBreakdownVisible = jest.fn();
const setSelectedSegment = jest.fn();
const refresh = jest.fn();
const goToAccount = jest.fn();
const goToAddAccount = jest.fn();
const goToSettings = jest.fn();
const goToCommitments = jest.fn();

let mockHookReturn: any;

jest.mock('@/screens/dashboard_v2/dashboard.hook', () => ({
  useDashboardV2: () => mockHookReturn,
}));

jest.mock('@/screens/dashboard_v2/dashboard.anim', () => ({
  useDashboardAnim: () => ({
    heroStyle: {},
    startEntrance: jest.fn(),
    statsEntering: undefined,
    sectionEntering: () => undefined,
  }),
}));

jest.mock('@/components/ui/sheet', () => {
  const React = jest.requireActual('react');
  const { View } = jest.requireActual('react-native');
  const Sheet = (props: { visible: boolean; children: React.ReactNode }) =>
    props.visible ? React.createElement(View, {}, props.children) : null;
  Sheet.Body = ({ children }: { children: React.ReactNode }) =>
    React.createElement(View, {}, children);
  return { Sheet };
});

function mkAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'a1',
    name: 'CIB',
    type: AccountType.Bank,
    currency: Currency.EGP,
    current_balance: 1000,
    opening_balance: 1000,
    is_archived: 0,
    created_at: '',
    updated_at: '',
    ...overrides,
  } as Account;
}

function makeHookReturn(opts: {
  accounts?: Account[];
  selectedSegment?: 'overview' | 'accounts';
}) {
  const accounts = opts.accounts ?? [];
  const groupedAccounts: Partial<Record<AccountType, Account[]>> = {};
  for (const a of accounts) {
    if (!groupedAccounts[a.type]) groupedAccounts[a.type] = [];
    groupedAccounts[a.type]!.push(a);
  }
  return {
    state: {
      accounts,
      rate: 48.85,
      isManualOverride: false,
      netWorth: {
        assetsEgp: 1000,
        assetsUsd: 20,
        liabilitiesEgp: 0,
        netWorthEgp: 1000,
        netWorthUsd: 20,
      },
      liquidity: { liquidEgp: 1000, liquidCount: accounts.length, reserveEgp: 0, reserveCount: 0 },
      liabilities: [],
      groupedAccounts,
      statsMap: {},
      isBreakdownVisible: false,
      refreshing: false,
      selectedSegment: opts.selectedSegment ?? 'overview',
      monthSpend: {
        currentEgp: 0,
        currentUsdNative: 0,
        currentCount: 0,
        previousEgp: 0,
        deltaPct: null,
        yearMonth: '2026-05',
      },
      accountCounts: { assets: accounts.length, liabilities: 0 },
      commitments: {
        counts: { paid: 0, overdue: 0, due: 0, upcoming: 0, skipped: 0, total: 0 },
        totalsByCurrency: new Map<string, number>(),
        yearMonth: '2026-05',
      },
    },
    setBreakdownVisible,
    setSelectedSegment,
    refresh,
    goToAccount,
    goToAddAccount,
    goToSettings,
    goToCommitments,
  };
}

beforeEach(() => {
  setBreakdownVisible.mockReset();
  setSelectedSegment.mockReset();
  refresh.mockReset();
  goToAccount.mockReset();
  goToAddAccount.mockReset();
  goToSettings.mockReset();
  goToCommitments.mockReset();
});

describe('DashboardScreenV2', () => {
  it('renders the empty state when there are zero accounts', () => {
    mockHookReturn = makeHookReturn({ accounts: [] });
    const { getByText, queryByText } = render(<DashboardScreenV2 />);
    expect(queryByText('Overview')).toBeNull();
    expect(queryByText('Accounts')).toBeNull();
    // EmptyState renders its variant-driven CTA via Strings.emptyAccountsCta.
    expect(getByText('Add Account')).toBeTruthy();
  });

  it('renders Overview segment by default with at least one account', () => {
    mockHookReturn = makeHookReturn({ accounts: [mkAccount()] });
    const { getByText } = render(<DashboardScreenV2 />);
    expect(getByText('Overview')).toBeTruthy();
    expect(getByText('Accounts')).toBeTruthy();
    expect(getByText('Available to Spend')).toBeTruthy();
  });

  it('renders Accounts segment body when selectedSegment is accounts', () => {
    mockHookReturn = makeHookReturn({
      accounts: [mkAccount()],
      selectedSegment: 'accounts',
    });
    const { getByText, queryByText } = render(<DashboardScreenV2 />);
    expect(queryByText('Available to Spend')).toBeNull();
    expect(getByText('Total balance')).toBeTruthy();
  });

  it('tapping the settings cog calls goToSettings', () => {
    mockHookReturn = makeHookReturn({ accounts: [] });
    const { getByLabelText } = render(<DashboardScreenV2 />);
    fireEvent.press(getByLabelText('Settings'));
    expect(goToSettings).toHaveBeenCalledTimes(1);
  });
});
