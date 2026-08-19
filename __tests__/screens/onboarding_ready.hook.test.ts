import { renderHook, act } from '@testing-library/react-native';

import { AccountType, Currency, OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCurrencyStore } from '@/modules/currency/store/currency.store';
import { useReady } from '@/modules/onboarding/screens/onboarding/ready/ready.hook';
import { useReadyTransitionState } from '@/modules/onboarding/screens/onboarding/ready/ready.state';
import {
  createOnboardingStore,
  useOnboardingStore,
} from '@/modules/onboarding/store/onboarding.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestAccount } from '@/test_helpers/transaction';

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
jest.mock('@/modules/currency/store/currency.store', () => ({
  useCurrencyStore: jest.fn(),
}));

const mockCompleteOnboarding = jest.fn().mockResolvedValue(undefined);
const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockLoadAccounts = jest.fn().mockResolvedValue(undefined);
const mockReplace = jest.fn();

/**
 * The mixed fixture — one USD account among three, with a verified rate. It
 * lands on F2 with the currency-pill gate OPEN, which is the only shape that
 * exercises the resolver, the frame selector and the pill composition at once
 * through the hook. The literal values match row 2 of
 * `ready_summary_state.test.ts`.
 */
const fakeAccounts = [
  makeTestAccount({ id: '1', type: AccountType.Bank, opening_balance: 48250 }),
  makeTestAccount({
    id: '2',
    type: AccountType.PhysicalWallet,
    currency: Currency.USD,
    opening_balance: 1350,
  }),
  makeTestAccount({ id: '3', type: AccountType.CreditCard, opening_balance: 8450 }),
];

const RATE = 48.6;
const RATE_UPDATED_AT = '2026-08-01T00:00:00.000Z';

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
  attachMockSelectorStore(useCurrencyStore as unknown as jest.Mock, () => ({
    rate: RATE,
    rate_updated_at: RATE_UPDATED_AT,
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

  it('derives the summary from the stores — frame, counts and the composed pill row', async () => {
    const { result } = await renderHook(() => useReady());

    expect(result.current.state.summary.frame).toBe('F2');
    expect(result.current.state.summary.accountCount).toBe(3);
    expect(result.current.state.summary.foreignCount).toBe(1);
    expect(result.current.state.summary.outcome).toEqual({ kind: 'amount', value: 105410 });
    // The currency pills REPLACE the opening-balances pill; they never merely
    // add to it. Asserted as the whole array, not a length or a spot-check.
    expect(result.current.state.summary.pills).toEqual([
      { kind: 'accounts', count: 3, glyph: 'bank-outline' },
      { kind: 'rate', rate: RATE },
      { kind: 'approx', currency: Currency.USD, value: 2168.93 },
    ]);
  });

  it('exposes the base currency the hero and the summary rows render', async () => {
    const { result } = await renderHook(() => useReady());
    expect(result.current.state.baseCurrency).toBe(Currency.EGP);
  });

  it('does not load the account list on mount', async () => {
    await renderHook(() => useReady());

    expect(mockLoadAccounts).not.toHaveBeenCalled();
  });

  it('clears a status message left behind by a previous visit, on mount', async () => {
    // The MA-005/L27 guard, and the case that dies when the `useInit(() =>
    // ...reset())` line is deleted: the store is dirtied BEFORE the mount, so
    // no in-render writer clears it. Without the guard the screen would open
    // showing a message about an attempt the user has already left behind.
    useReadyTransitionState.setState({ statusMessage: 'stale' });

    const { result } = await renderHook(() => useReady());

    expect(result.current.state.statusMessage).toBe('');
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

  it('double-tap in one frame writes completion exactly once', async () => {
    const pending = deferred<void>();
    mockCompleteOnboarding.mockReturnValueOnce(pending.promise);
    const { result } = await renderHook(() => useReady());

    // Both taps fire with NO render in between — that is the whole point. A
    // guard on complete.isLoading is React state and lags a render, so it
    // survives an `act` boundary between the two calls and lets both through.
    let firstCall!: Promise<void>;
    let secondCall!: Promise<void>;
    await act(() => {
      firstCall = result.current.handleComplete();
      secondCall = result.current.handleComplete();
    });

    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(1);

    await act(async () => {
      pending.resolve();
      await Promise.all([firstCall, secondCall]);
    });
  });

  it('busy is raised for the duration of the completion write and lowered after it', async () => {
    const pending = deferred<void>();
    mockCompleteOnboarding.mockReturnValueOnce(pending.promise);
    const { result } = await renderHook(() => useReady());

    expect(result.current.state.busy).toBe(false);

    let firstCall!: Promise<void>;
    await act(() => {
      firstCall = result.current.handleComplete();
    });
    expect(result.current.state.busy).toBe(true);

    await act(async () => {
      pending.resolve();
      await firstCall;
    });
    expect(result.current.state.busy).toBe(false);
  });

  it('holds the CTA disabled while a BACK transition is in flight — busy without completing', async () => {
    // The pair the CTA's `isDisabled={completing || busy}` exists for: during a
    // back write `begin()` has already raised `busy` and every later tap is
    // inert, while `completing` is still false. Binding the CTA to `completing`
    // alone leaves it visually live over a dead handler.
    const pending = deferred<void>();
    mockSetStep.mockReturnValueOnce(pending.promise);
    const { result } = await renderHook(() => useReady());

    let backCall!: Promise<void>;
    await act(() => {
      backCall = result.current.onBack();
    });

    expect(result.current.state.busy).toBe(true);
    expect(result.current.state.completing).toBe(false);

    await act(async () => {
      pending.resolve();
      await backCall;
    });
    expect(result.current.state.busy).toBe(false);
  });

  it('a rejecting completeOnboarding resolves handleComplete, sets the status message, and leaves the summary untouched', async () => {
    mockCompleteOnboarding.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useReady());

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(result.current.state.statusMessage).toBe(Strings.n4CompleteError);
    // F9 preserves the summary — no blank, no skeleton, no recompute.
    expect(result.current.state.summary.frame).toBe('F2');
    expect(result.current.state.summary.pills).toHaveLength(3);
  });

  it('the same CTA is a live retry after a failed completion', async () => {
    mockCompleteOnboarding.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useReady());

    await act(async () => {
      await result.current.handleComplete();
    });
    // Dropping settle() from the failure path latches busy true, and every
    // later tap is swallowed by begin() — §7's "the same CTA retries" dies
    // silently.
    expect(result.current.state.busy).toBe(false);

    await act(async () => {
      await result.current.handleComplete();
    });

    expect(mockCompleteOnboarding).toHaveBeenCalledTimes(2);
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
