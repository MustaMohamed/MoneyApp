import { renderHook, act } from '@testing-library/react-native';

import { useAppReadyStore } from '@/store/ready.store';
import { useAppInit } from '@/utils/use_layout_init.hook';

const mockGetDb = jest.fn<Promise<unknown>, []>().mockResolvedValue({});
const mockRunMigrations = jest.fn<Promise<void>, [unknown]>().mockResolvedValue(undefined);
const mockLoadOnboardingState = jest
  .fn<Promise<{ complete: boolean; step: string }>, []>()
  .mockResolvedValue({ complete: false, step: 'N1' });
const mockInitAccounts = jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
const mockGeneratePayments = jest.fn().mockResolvedValue(undefined);
const mockCheckAndDeactivateExpired = jest.fn().mockResolvedValue(undefined);

jest.mock('@/database/client', () => ({
  getDb: () => mockGetDb(),
  runMigrations: (db: unknown) => mockRunMigrations(db),
}));
jest.mock('@/modules/onboarding/store/onboarding.store', () => ({
  useOnboardingStore: () => ({
    init: () => mockLoadOnboardingState(),
  }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  useAccountStore: () => ({
    init: () => mockInitAccounts(),
  }),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: {
    getState: () => ({
      generatePayments: mockGeneratePayments,
      checkAndDeactivateExpired: mockCheckAndDeactivateExpired,
    }),
  },
}));
jest.mock('@/utils/zod_config', () => {});

function readReady() {
  const { result, unmount } = renderHook(() => useAppReadyStore());
  const value = result.current.state.ready.value;
  unmount();
  return value;
}

function resetReady() {
  const { result, unmount } = renderHook(() => useAppReadyStore());
  act(() => {
    result.current.reset();
  });
  unmount();
}

describe('useAppInit - splash gate does not await commitment calls', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    resetReady();
    mockLoadOnboardingState.mockResolvedValue({ complete: false, step: 'N1' });
    mockInitAccounts.mockResolvedValue(undefined);
  });

  afterEach(() => {
    consoleWarnSpy.mockRestore();
  });

  it('marks ready without awaiting commitment calls', async () => {
    // Onboarding complete so housekeeping is scheduled.
    mockLoadOnboardingState.mockResolvedValue({ complete: true, step: 'N4' });
    // generatePayments never resolves; if readiness awaits it, the test will time out.
    let releaseGenerate: (() => void) | undefined;
    mockGeneratePayments.mockImplementation(
      () =>
        new Promise<void>((r) => {
          releaseGenerate = () => r();
        }),
    );

    renderHook(() => useAppInit());

    // Drain only the awaited promise chain, not the queueMicrotask housekeeping.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(readReady()).toBe(true);
    // Cleanup: release the held promise so jest can exit cleanly, then restore
    // the default implementation so subsequent tests are not affected.
    releaseGenerate?.();
    mockGeneratePayments.mockResolvedValue(undefined);
  });

  it('marks app readiness through the Signals app-ready API', async () => {
    expect(readReady()).toBe(false);

    renderHook(() => useAppInit());

    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });

    expect(readReady()).toBe(true);
  });

  it('does not schedule housekeeping when onboarding is not complete', async () => {
    mockLoadOnboardingState.mockResolvedValue({ complete: false, step: 'N1' });
    renderHook(() => useAppInit());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockGeneratePayments).not.toHaveBeenCalled();
    expect(mockCheckAndDeactivateExpired).not.toHaveBeenCalled();
  });

  it('schedules housekeeping when onboarding is complete', async () => {
    mockLoadOnboardingState.mockResolvedValue({ complete: true, step: 'N4' });
    renderHook(() => useAppInit());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockGeneratePayments).toHaveBeenCalledTimes(1);
    expect(mockCheckAndDeactivateExpired).toHaveBeenCalledTimes(1);
  });

  it('marks ready even when DB initialization fails', async () => {
    mockGetDb.mockRejectedValueOnce(new Error('db init failed'));
    renderHook(() => useAppInit());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(readReady()).toBe(true);
  });
});
