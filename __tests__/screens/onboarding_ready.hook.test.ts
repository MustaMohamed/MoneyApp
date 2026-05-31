import { renderHook, act } from '@testing-library/react-native';

import { Currency, OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useReady } from '@/modules/onboarding/screens/onboarding/ready/ready.hook';
import { OnboardingStore, useOnboardingStore } from '@/modules/onboarding/store/onboarding.store';

jest.mock('@/modules/onboarding/store/onboarding.store', () => {
  // oxlint-disable-next-line typescript/no-unsafe-assignment, typescript/no-unsafe-return -- Jest requireActual is typed as any; this preserves the real class export while mocking the hook facade.
  const actual = jest.requireActual('@/modules/onboarding/store/onboarding.store');
  // oxlint-disable-next-line typescript/no-unsafe-return -- spreading requireActual preserves real exports in this Jest module factory.
  return { ...actual, useOnboardingStore: jest.fn() };
});
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));

const mockCompleteOnboarding = jest.fn().mockResolvedValue(undefined);
const mockInitAccounts = jest.fn().mockResolvedValue(undefined);

const fakeAccounts = [
  { id: '1', current_balance: 5000, type: 'bank', opening_balance: 5000 },
  { id: '2', current_balance: 200, type: 'physical_wallet', opening_balance: 200 },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function setup() {
  const store = new OnboardingStore({
    setStep: jest.fn().mockResolvedValue(undefined),
    setBaseCurrency: jest.fn().mockResolvedValue(undefined),
    complete: mockCompleteOnboarding,
    load: jest.fn().mockResolvedValue({
      complete: false,
      step: OnboardingStep.N4,
      baseCurrency: Currency.EGP,
    }),
  });
  jest.mocked(useOnboardingStore).mockReturnValue(store);
  jest.mocked(useAccountStore).mockReturnValue({
    state: {
      accounts: { value: fakeAccounts },
    },
    init: mockInitAccounts,
  } as unknown as ReturnType<typeof useAccountStore>);
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

  it('initializes accounts for restart directly on the ready step', () => {
    renderHook(() => useReady());

    expect(mockInitAccounts).toHaveBeenCalledTimes(1);
  });

  it('completing defaults to false', () => {
    const { result } = renderHook(() => useReady());
    expect(result.current.state.completing.value).toBe(false);
  });

  it('handleComplete calls completeOnboarding', async () => {
    const { result } = renderHook(() => useReady());
    await act(async () => {
      await result.current.handleComplete();
    });
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
  });

  it('double-tap guard: handleComplete ignores a second press while completion is pending', async () => {
    const pending = deferred<void>();
    mockCompleteOnboarding.mockReturnValueOnce(pending.promise);
    const { result } = renderHook(() => useReady());

    let firstCall!: Promise<void>;
    act(() => {
      firstCall = result.current.handleComplete();
    });

    expect(result.current.state.completing.value).toBe(true);

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
      await firstCall;
    });
  });
});
