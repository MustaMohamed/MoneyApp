import { renderHook, act } from '@testing-library/react-native';

import { Currency, OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useReady } from '@/modules/onboarding/screens/onboarding/ready/ready.hook';
import { useReadyTransitionState } from '@/modules/onboarding/screens/onboarding/ready/ready.state';
import {
  createOnboardingStore,
  useOnboardingStore,
} from '@/modules/onboarding/store/onboarding.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ replace: jest.fn() })),
}));
jest.mock('@/modules/onboarding/store/onboarding.store', () => {
  // oxlint-disable-next-line typescript/no-unsafe-assignment -- Jest requireActual is typed as any; this preserves the real class export while mocking the hook facade.
  const actual = jest.requireActual('@/modules/onboarding/store/onboarding.store');
  // oxlint-disable-next-line typescript/no-unsafe-return -- spreading requireActual preserves real exports in this Jest module factory.
  return { ...actual, useOnboardingStore: jest.fn() };
});
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));

const mockCompleteOnboarding = jest.fn().mockResolvedValue(undefined);
const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockLoadAccounts = jest.fn().mockResolvedValue(undefined);
const mockReplace = jest.fn();

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
  const { useRouter } = require('expo-router');
  (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });

  const store = createOnboardingStore({
    setStep: mockSetStep,
    setBaseCurrency: jest.fn().mockResolvedValue(undefined),
    complete: mockCompleteOnboarding,
    load: jest.fn().mockResolvedValue({
      complete: false,
      step: OnboardingStep.N4,
      baseCurrency: Currency.EGP,
    }),
  });
  const mockedOnboardingStore = jest.mocked(useOnboardingStore);
  mockedOnboardingStore.mockImplementation(((
    selector?: (state: ReturnType<typeof store.getState>) => unknown,
  ) => (selector ? store(selector) : store())) as typeof useOnboardingStore);
  (
    mockedOnboardingStore as typeof useOnboardingStore & {
      getState: typeof store.getState;
    }
  ).getState = store.getState;
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: fakeAccounts,
    loadAccounts: mockLoadAccounts,
  }));
}

describe('useReady', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCompleteOnboarding.mockResolvedValue(undefined);
    useReadyTransitionState.getState().reset();
    setup();
  });

  it('renders without throwing', async () => {
    await expect(renderHook(() => useReady())).resolves.toBeDefined();
  });

  it('rows has exactly 3 items (no Security row)', async () => {
    const { result } = await renderHook(() => useReady());
    expect(result.current.state.rows).toHaveLength(3);
  });

  it('rows contains Currency, Accounts, and TotalBalance', async () => {
    const { result } = await renderHook(() => useReady());
    const labels = result.current.state.rows.map((r) => r.label);
    expect(labels).toContain(Strings.o6Currency);
    expect(labels).toContain(Strings.o6Accounts);
    expect(labels).toContain(Strings.o6TotalBalance);
  });

  it('TotalBalance value reflects sum of account.current_balance', async () => {
    const { result } = await renderHook(() => useReady());
    const balanceRow = result.current.state.rows.find((r) => r.label === Strings.o6TotalBalance);
    // 5000 + 200 = 5200 → formatted as "5,200 EGP"
    expect(balanceRow?.value).toContain('5,200');
  });

  it('loads accounts for restart directly on the ready step', async () => {
    await renderHook(() => useReady());

    expect(mockLoadAccounts).toHaveBeenCalledTimes(1);
  });

  it('completing defaults to false', async () => {
    const { result } = await renderHook(() => useReady());
    expect(result.current.state.completing).toBe(false);
  });

  it('handleComplete calls completeOnboarding', async () => {
    const { result } = await renderHook(() => useReady());
    await act(async () => {
      await result.current.handleComplete();
    });
    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);
  });

  it('double-tap guard: handleComplete ignores a second press while completion is pending', async () => {
    const pending = deferred<void>();
    mockCompleteOnboarding.mockReturnValueOnce(pending.promise);
    const { result } = await renderHook(() => useReady());

    let firstCall!: Promise<void>;
    await act(() => {
      firstCall = result.current.handleComplete();
    });

    expect(result.current.state.completing).toBe(true);

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
      await firstCall;
    });
  });

  it('a rejecting completeOnboarding resolves handleComplete, sets the status message, and leaves rows unchanged', async () => {
    mockCompleteOnboarding.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useReady());

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(result.current.state.statusMessage).toBe(Strings.n4CompleteError);
    expect(result.current.state.rows).toHaveLength(3);
  });

  it('a failed back write reports its own message, not a stale failed-completion message', async () => {
    mockCompleteOnboarding.mockRejectedValueOnce(new Error('boom'));
    mockSetStep.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useReady());

    await act(async () => {
      await result.current.handleComplete();
    });
    expect(result.current.state.statusMessage).toBe(Strings.n4CompleteError);

    await act(async () => {
      await result.current.onBack();
    });

    expect(result.current.state.statusMessage).toBe(Strings.onboardingBackSaveError);
  });

  it('a failed completion after a failed back write reports its own message, not a stale back message', async () => {
    mockSetStep.mockRejectedValueOnce(new Error('boom'));
    mockCompleteOnboarding.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useReady());

    await act(async () => {
      await result.current.onBack();
    });
    expect(result.current.state.statusMessage).toBe(Strings.onboardingBackSaveError);

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(result.current.state.statusMessage).toBe(Strings.n4CompleteError);
  });

  it('onBack writes N3 and replaces to more_accounts', async () => {
    const { result } = await renderHook(() => useReady());
    await act(async () => {
      await result.current.onBack();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N3);
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/more_accounts');
  });

  it('onBack is inert while completing', async () => {
    const pending = deferred<void>();
    mockCompleteOnboarding.mockReturnValueOnce(pending.promise);
    const { result } = await renderHook(() => useReady());

    let firstCall!: Promise<void>;
    await act(() => {
      firstCall = result.current.handleComplete();
    });
    expect(result.current.state.completing).toBe(true);

    await act(async () => {
      await result.current.onBack();
    });

    expect(mockSetStep).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();

    await act(async () => {
      pending.resolve();
      await firstCall;
    });
  });
});
