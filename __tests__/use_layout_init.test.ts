import { act, renderHook } from '@testing-library/react-native';

import { useAppReadyStore } from '@/store/ready.store';
import { useAppInit } from '@/utils/use_layout_init.hook';

const mockGetDb = jest.fn<Promise<unknown>, []>();
const mockRunMigrations = jest.fn<Promise<void>, [unknown]>();
const mockInitOnboarding = jest.fn<Promise<{ complete: boolean; step: string }>, []>();
const mockLoadAccounts = jest.fn<Promise<void>, []>();
const mockLoadRate = jest.fn<Promise<void>, []>();
const mockEnsureHousekeepingCurrent = jest.fn<Promise<void>, []>();

jest.mock('@/database/client', () => ({
  getDb: () => mockGetDb(),
  runMigrations: (db: unknown) => mockRunMigrations(db),
}));
jest.mock('@/modules/onboarding/store/onboarding.store', () => ({
  useOnboardingStore: Object.assign(jest.fn(), {
    getState: () => ({ init: () => mockInitOnboarding() }),
  }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  useAccountStore: {
    getState: () => ({ loadAccounts: () => mockLoadAccounts() }),
  },
}));
jest.mock('@/modules/currency/store/currency.store', () => ({
  useCurrencyStore: {
    getState: () => ({ loadRate: () => mockLoadRate() }),
  },
}));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: {
    getState: () => ({
      ensureHousekeepingCurrent: () => mockEnsureHousekeepingCurrent(),
    }),
  },
}));
jest.mock('@/utils/zod_config', () => {});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

async function flushStartup() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('useAppInit', () => {
  let consoleWarnSpy: jest.SpyInstance;

  beforeEach(async () => {
    jest.clearAllMocks();
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await act(() => useAppReadyStore.getState().reset());
    mockGetDb.mockResolvedValue({});
    mockRunMigrations.mockResolvedValue(undefined);
    mockInitOnboarding.mockResolvedValue({ complete: false, step: 'N1' });
    mockLoadAccounts.mockResolvedValue(undefined);
    mockLoadRate.mockResolvedValue(undefined);
    mockEnsureHousekeepingCurrent.mockResolvedValue(undefined);
  });

  afterEach(() => consoleWarnSpy.mockRestore());

  it('publishes ready only after every required startup operation succeeds', async () => {
    const currency = deferred<void>();
    mockLoadRate.mockReturnValueOnce(currency.promise);

    await renderHook(() => useAppInit());
    await flushStartup();

    expect(useAppReadyStore.getState().status).toBe('initializing');
    expect(mockRunMigrations).toHaveBeenCalledTimes(1);
    expect(mockInitOnboarding).toHaveBeenCalledTimes(1);
    expect(mockLoadAccounts).toHaveBeenCalledTimes(1);
    expect(mockLoadRate).toHaveBeenCalledTimes(1);

    currency.resolve();
    await flushStartup();

    expect(useAppReadyStore.getState().status).toBe('ready');
  });

  it.each([
    ['database open', () => mockGetDb.mockRejectedValueOnce(new Error('database'))],
    ['migration', () => mockRunMigrations.mockRejectedValueOnce(new Error('migration'))],
    ['onboarding', () => mockInitOnboarding.mockRejectedValueOnce(new Error('onboarding'))],
    ['accounts', () => mockLoadAccounts.mockRejectedValueOnce(new Error('accounts'))],
    ['currency', () => mockLoadRate.mockRejectedValueOnce(new Error('currency'))],
  ])('publishes fatalError when required %s initialization fails', async (_, fail) => {
    fail();

    await renderHook(() => useAppInit());
    await flushStartup();

    expect(useAppReadyStore.getState()).toMatchObject({ status: 'fatalError' });
  });

  it('does not let a stale failed attempt replace a successful retry', async () => {
    const firstDb = deferred<unknown>();
    mockGetDb.mockReturnValueOnce(firstDb.promise).mockResolvedValueOnce({});
    const { result } = await renderHook(() => useAppInit());
    await flushStartup();

    await act(() => result.current.retry());
    await flushStartup();
    expect(useAppReadyStore.getState().status).toBe('ready');

    firstDb.reject(new Error('stale database failure'));
    await flushStartup();
    expect(useAppReadyStore.getState().status).toBe('ready');
  });

  it('marks ready without awaiting optional commitment housekeeping', async () => {
    const generate = deferred<void>();
    mockInitOnboarding.mockResolvedValue({ complete: true, step: 'N4' });
    mockEnsureHousekeepingCurrent.mockReturnValue(generate.promise);

    await renderHook(() => useAppInit());
    await flushStartup();

    expect(useAppReadyStore.getState().status).toBe('ready');
    expect(mockEnsureHousekeepingCurrent).toHaveBeenCalledTimes(1);
    generate.resolve();
    await flushStartup();
  });

  it('keeps ready when optional commitment housekeeping fails', async () => {
    mockInitOnboarding.mockResolvedValue({ complete: true, step: 'N4' });
    mockEnsureHousekeepingCurrent.mockRejectedValue(new Error('housekeeping'));

    await renderHook(() => useAppInit());
    await flushStartup();

    expect(useAppReadyStore.getState().status).toBe('ready');
    expect(mockEnsureHousekeepingCurrent).toHaveBeenCalledTimes(1);
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[layoutInit] commitment housekeeping failed:',
      expect.any(Error),
    );
  });

  it('skips housekeeping before onboarding completes', async () => {
    await renderHook(() => useAppInit());
    await flushStartup();

    expect(mockEnsureHousekeepingCurrent).not.toHaveBeenCalled();
  });
});
