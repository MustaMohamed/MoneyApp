import { renderHook, act } from '@testing-library/react-native';

import { useLayoutInit } from '@/utils/use_layout_init.hook';

const mockGetDb = jest.fn().mockResolvedValue({});
const mockRunMigrations = jest.fn().mockResolvedValue(undefined);
const mockLoadOnboardingState = jest.fn().mockResolvedValue({ complete: false, step: 'N1' });
const mockSetReady = jest.fn();
const mockGeneratePayments = jest.fn().mockResolvedValue(undefined);
const mockCheckAndDeactivateExpired = jest.fn().mockResolvedValue(undefined);

jest.mock('@/database/client', () => ({
  getDb: () => mockGetDb(),
  runMigrations: (...args: unknown[]) => mockRunMigrations(...args),
}));
jest.mock('@/store/onboarding.store', () => ({
  loadOnboardingState: () => mockLoadOnboardingState(),
}));
jest.mock('@/store/ready.store', () => ({
  useReadyStore: Object.assign(
    jest.fn((sel: (s: { state: { ready: boolean }; setReady: jest.Mock }) => unknown) =>
      sel({ state: { ready: false }, setReady: mockSetReady }),
    ),
    {
      use: { setReady: () => mockSetReady },
      useState: { ready: () => false },
      getState: () => ({ state: { ready: false }, setReady: mockSetReady }),
    },
  ),
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: {
    getState: () => ({
      generatePayments: mockGeneratePayments,
      checkAndDeactivateExpired: mockCheckAndDeactivateExpired,
    }),
  },
}));
jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: unknown) => sel }));
jest.mock('@/utils/zod_config', () => {});

describe('useLayoutInit — splash gate does not await commitment calls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLoadOnboardingState.mockResolvedValue({ complete: false, step: 'N1' });
  });

  it('calls setReady(true) without awaiting commitment calls', async () => {
    // Onboarding complete so housekeeping is scheduled
    mockLoadOnboardingState.mockResolvedValue({ complete: true, step: 'N4' });
    // generatePayments never resolves — if setReady awaits it, the test will time out
    let releaseGenerate: (() => void) | undefined;
    mockGeneratePayments.mockImplementation(
      () =>
        new Promise<void>((r) => {
          releaseGenerate = () => r();
        }),
    );

    renderHook(() => useLayoutInit());

    // Drain only the awaited promise chain (NOT the queueMicrotask housekeeping)
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockSetReady).toHaveBeenCalledWith(true);
    // Cleanup: release the held promise so jest can exit cleanly, then restore
    // the default implementation so subsequent tests are not affected.
    releaseGenerate?.();
    mockGeneratePayments.mockResolvedValue(undefined);
  });

  it('does not schedule housekeeping when onboarding is not complete', async () => {
    mockLoadOnboardingState.mockResolvedValue({ complete: false, step: 'N1' });
    renderHook(() => useLayoutInit());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockGeneratePayments).not.toHaveBeenCalled();
    expect(mockCheckAndDeactivateExpired).not.toHaveBeenCalled();
  });

  it('schedules housekeeping when onboarding is complete', async () => {
    mockLoadOnboardingState.mockResolvedValue({ complete: true, step: 'N4' });
    renderHook(() => useLayoutInit());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockGeneratePayments).toHaveBeenCalledTimes(1);
    expect(mockCheckAndDeactivateExpired).toHaveBeenCalledTimes(1);
  });

  it('calls setReady(true) even when DB initialization fails', async () => {
    mockGetDb.mockRejectedValueOnce(new Error('db init failed'));
    renderHook(() => useLayoutInit());
    await act(async () => {
      await new Promise((r) => setTimeout(r, 0));
    });
    expect(mockSetReady).toHaveBeenCalledWith(true);
  });
});
