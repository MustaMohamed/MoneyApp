import { renderHook, act } from '@testing-library/react-native';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useAccountStore } from '@/store/account.store';
import { useReadyV2 } from '@/screens/onboarding_v2/ready/ready.hook';
import { Strings } from '@/constants/strings';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('@/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/screens/onboarding_v2/ready/ready.state', () => ({
  useReadyState: jest.fn((sel: any) =>
    sel({ state: { completing: false }, setCompleting: jest.fn() }),
  ),
}));

const mockCompleteOnboarding = jest.fn().mockResolvedValue(undefined);
const mockSetCompleting = jest.fn();

const fakeAccounts = [
  { id: '1', current_balance: 5000, type: 'bank', opening_balance: 5000 },
  { id: '2', current_balance: 200, type: 'physical_wallet', opening_balance: 200 },
];

function setup(completing = false) {
  (useOnboardingStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { baseCurrency: 'EGP' },
      completeOnboarding: mockCompleteOnboarding,
    }),
  );
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: fakeAccounts } }),
  );
  const { useReadyState } = require('@/screens/onboarding_v2/ready/ready.state');
  (useReadyState as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { completing }, setCompleting: mockSetCompleting }),
  );
}

describe('useReadyV2', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setup();
  });

  it('renders without throwing', () => {
    expect(() => renderHook(() => useReadyV2())).not.toThrow();
  });

  it('rows has exactly 3 items', () => {
    const { result } = renderHook(() => useReadyV2());
    expect(result.current.state.rows).toHaveLength(3);
  });

  it('rows does not include a Security row', () => {
    const { result } = renderHook(() => useReadyV2());
    const labels = result.current.state.rows.map((r) => r.label);
    expect(labels).not.toContain(Strings.o6Security);
  });

  it('rows contains Currency, Accounts, and TotalBalance', () => {
    const { result } = renderHook(() => useReadyV2());
    const labels = result.current.state.rows.map((r) => r.label);
    expect(labels).toContain(Strings.o6Currency);
    expect(labels).toContain(Strings.o6Accounts);
    expect(labels).toContain(Strings.o6TotalBalance);
  });

  it('TotalBalance value reflects sum of account.current_balance', () => {
    const { result } = renderHook(() => useReadyV2());
    const balanceRow = result.current.state.rows.find((r) => r.label === Strings.o6TotalBalance);
    // 5000 + 200 = 5200 → formatted as "5,200 EGP"
    expect(balanceRow?.value).toContain('5,200');
  });

  it('completing defaults to false', () => {
    const { result } = renderHook(() => useReadyV2());
    expect(result.current.state.completing).toBe(false);
  });

  it('handleComplete calls completeOnboarding', async () => {
    const { result } = renderHook(() => useReadyV2());
    await act(async () => {
      await result.current.handleComplete();
    });
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
  });

  it('double-tap guard: handleComplete does nothing when completing=true', async () => {
    setup(true); // completing = true
    const { result } = renderHook(() => useReadyV2());
    await act(async () => {
      await result.current.handleComplete();
    });
    expect(mockCompleteOnboarding).not.toHaveBeenCalled();
  });
});
