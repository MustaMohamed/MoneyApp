import { renderHook, act } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useReady } from '@/modules/onboarding/screens/onboarding/ready/ready.hook';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('@/modules/onboarding/store/onboarding.store', () => ({ useOnboarding: jest.fn() }));
jest.mock('@/modules/accounts/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/modules/onboarding/screens/onboarding/ready/ready.state', () => ({
  useReadyScreenState: jest.fn(),
}));

const mockCompleteOnboarding = jest.fn().mockResolvedValue(undefined);
const mockSetCompleting = jest.fn();

const fakeAccounts = [
  { id: '1', current_balance: 5000, type: 'bank', opening_balance: 5000 },
  { id: '2', current_balance: 200, type: 'physical_wallet', opening_balance: 200 },
];

function setup(completing = false) {
  const { useOnboarding } = require('@/modules/onboarding/store/onboarding.store');
  (useOnboarding as jest.Mock).mockReturnValue({
    state: {
      baseCurrency: { value: 'EGP' },
    },
    completeOnboarding: mockCompleteOnboarding,
  });
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: fakeAccounts,
  }));
  const {
    useReadyScreenState,
  } = require('@/modules/onboarding/screens/onboarding/ready/ready.state');
  (useReadyScreenState as jest.Mock).mockReturnValue({
    state: {
      completing: { value: completing },
    },
    setCompleting: mockSetCompleting,
  });
}

describe('useReady', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useReady())).not.toThrow();
  });

  it('rows has exactly 3 items (no Security row)', () => {
    const { result } = renderHook(() => useReady());
    expect(result.current.state.rows).toHaveLength(3);
  });

  it('rows contains Currency, Accounts, and TotalBalance', () => {
    const { result } = renderHook(() => useReady());
    const labels = result.current.state.rows.map((r) => r.label);
    expect(labels).toContain(Strings.o6Currency);
    expect(labels).toContain(Strings.o6Accounts);
    expect(labels).toContain(Strings.o6TotalBalance);
  });

  it('TotalBalance value reflects sum of account.current_balance', () => {
    const { result } = renderHook(() => useReady());
    const balanceRow = result.current.state.rows.find((r) => r.label === Strings.o6TotalBalance);
    // 5000 + 200 = 5200 → formatted as "5,200 EGP"
    expect(balanceRow?.value).toContain('5,200');
  });

  it('completing defaults to false', () => {
    const { result } = renderHook(() => useReady());
    expect(result.current.state.completing).toBe(false);
  });

  it('handleComplete calls completeOnboarding', async () => {
    const { result } = renderHook(() => useReady());
    await act(async () => {
      await result.current.handleComplete();
    });
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
  });

  it('double-tap guard: handleComplete does nothing when completing=true', async () => {
    setup(true); // completing = true
    const { result } = renderHook(() => useReady());
    await act(async () => {
      await result.current.handleComplete();
    });
    expect(mockCompleteOnboarding).not.toHaveBeenCalled();
  });
});
