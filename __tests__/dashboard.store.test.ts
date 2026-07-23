import type {
  DashboardLoadInput,
  DashboardSnapshot,
  DashboardSnapshotStatus,
  IDashboardRepository,
} from '@/modules/dashboard/repositories/dashboard.repository';
import { createDashboardStore } from '@/modules/dashboard/screens/dashboard/dashboard.store';

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
} {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });
  return { promise, resolve, reject };
}

function input(yearMonth: string): DashboardLoadInput {
  return { yearMonth, now: new Date(`${yearMonth}-15T12:00:00.000Z`) };
}

function snapshot(key: string): DashboardSnapshot {
  const [year, month] = key.split('-').map(Number);
  const previousDate = new Date(year, month - 2, 1);
  const previousYearMonth = `${previousDate.getFullYear()}-${String(
    previousDate.getMonth() + 1,
  ).padStart(2, '0')}`;

  return {
    key,
    yearMonth: key,
    previousYearMonth,
    accounts: [],
    statsMap: {},
    currentMonth: {
      totals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
      spend: { totalEgp: 0, usdNative: 0, count: 0 },
    },
    previousMonth: {
      totals: { incomeEgp: 0, expenseEgp: 0, netEgp: 0 },
      spend: { totalEgp: 0, usdNative: 0, count: 0 },
    },
    budgetSummary: {
      budgeted: 0,
      spent: 0,
      left: 0,
      pct: 0,
      categoryCount: 0,
    },
    commitmentPayments: [],
    loadedAt: new Date(`${key}-15T12:00:00.000Z`).getTime(),
  };
}

function repository(getSnapshot: IDashboardRepository['getSnapshot']): IDashboardRepository & {
  getSnapshot: jest.MockedFunction<IDashboardRepository['getSnapshot']>;
} {
  return { getSnapshot: jest.fn(getSnapshot) };
}

describe('createDashboardStore', () => {
  it('publishes one complete snapshot across the initial load lifecycle', async () => {
    const load = deferred<DashboardSnapshot>();
    const repo = repository(() => load.promise);
    const store = createDashboardStore(repo);
    const publications: Array<{
      status: DashboardSnapshotStatus;
      snapshot: DashboardSnapshot | undefined;
    }> = [];
    const unsubscribe = store.subscribe((state) => {
      publications.push({ status: state.status, snapshot: state.snapshot });
    });
    const result = snapshot('2026-07');

    const request = store.getState().ensureSnapshot(input('2026-07'));

    expect(store.getState()).toMatchObject({
      status: 'initialLoading',
      snapshot: undefined,
      requestedKey: '2026-07',
      requestGeneration: 1,
    });

    load.resolve(result);
    await request;

    expect(store.getState()).toMatchObject({
      status: 'ready',
      snapshot: result,
      requestedKey: '2026-07',
      requestGeneration: 1,
    });
    expect(publications.filter((entry) => entry.snapshot !== undefined)).toEqual([
      { status: 'ready', snapshot: result },
    ]);
    unsubscribe();
  });

  it('preserves the exact warm snapshot through refresh failure', async () => {
    const load = deferred<DashboardSnapshot>();
    const repo = repository(() => load.promise);
    const store = createDashboardStore(repo);
    const warmSnapshot = snapshot('2026-07');
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();
    store.setState({
      snapshot: warmSnapshot,
      status: 'ready',
      requestedKey: warmSnapshot.key,
    });

    const refresh = store.getState().refresh(input('2026-07'));

    expect(store.getState().status).toBe('refreshing');
    expect(store.getState().snapshot).toBe(warmSnapshot);

    load.reject(new Error('db unavailable'));
    await expect(refresh).resolves.toBeUndefined();

    expect(store.getState().status).toBe('refreshErrorWithData');
    expect(store.getState().snapshot).toBe(warmSnapshot);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('publishes initialError without fabricating a zero snapshot', async () => {
    const repo = repository(() => Promise.reject(new Error('db unavailable')));
    const store = createDashboardStore(repo);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    await expect(store.getState().ensureSnapshot(input('2026-07'))).resolves.toBeUndefined();

    expect(store.getState()).toMatchObject({
      status: 'initialError',
      snapshot: undefined,
      requestedKey: '2026-07',
    });
    expect(errorSpy).toHaveBeenCalledTimes(1);
    errorSpy.mockRestore();
  });

  it('shares one repository promise for same-key focus and refresh requests', async () => {
    const load = deferred<DashboardSnapshot>();
    const repo = repository(() => load.promise);
    const store = createDashboardStore(repo);

    const focusRequest = store.getState().ensureSnapshot(input('2026-07'));
    const refreshRequest = store.getState().refresh(input('2026-07'));

    expect(refreshRequest).toBe(focusRequest);
    expect(repo.getSnapshot).toHaveBeenCalledTimes(1);

    load.resolve(snapshot('2026-07'));
    await Promise.all([focusRequest, refreshRequest]);
  });

  it('lets a newer month generation win when requests resolve out of order', async () => {
    const july = deferred<DashboardSnapshot>();
    const august = deferred<DashboardSnapshot>();
    const repo = repository(({ yearMonth }) =>
      yearMonth === '2026-07' ? july.promise : august.promise,
    );
    const store = createDashboardStore(repo);
    const augustSnapshot = snapshot('2026-08');

    const julyRequest = store.getState().ensureSnapshot(input('2026-07'));
    const augustRequest = store.getState().ensureSnapshot(input('2026-08'));
    august.resolve(augustSnapshot);
    await augustRequest;
    july.resolve(snapshot('2026-07'));
    await julyRequest;

    expect(store.getState()).toMatchObject({
      status: 'ready',
      snapshot: augustSnapshot,
      requestedKey: '2026-08',
      requestGeneration: 2,
    });
  });

  it('clears an old-month snapshot while a new month loads', async () => {
    const load = deferred<DashboardSnapshot>();
    const store = createDashboardStore(repository(() => load.promise));
    store.setState({
      snapshot: snapshot('2026-07'),
      status: 'ready',
      requestedKey: '2026-07',
    });

    const request = store.getState().ensureSnapshot(input('2026-08'));

    expect(store.getState()).toMatchObject({
      snapshot: undefined,
      status: 'initialLoading',
      requestedKey: '2026-08',
    });

    load.resolve(snapshot('2026-08'));
    await request;
  });

  it('invalidates freshness and blocks late publication without clearing warm data', async () => {
    const load = deferred<DashboardSnapshot>();
    const repo = repository(() => load.promise);
    const store = createDashboardStore(repo);
    const warmSnapshot = snapshot('2026-07');
    store.setState({
      snapshot: warmSnapshot,
      status: 'ready',
      requestedKey: '2026-07',
    });

    const request = store.getState().refresh(input('2026-07'));
    store.getState().invalidate();

    expect(store.getState().snapshot).toBe(warmSnapshot);
    expect(store.getState()).toMatchObject({
      status: 'refreshing',
      requestGeneration: 2,
    });

    load.resolve(snapshot('2026-07'));
    await request;

    expect(store.getState().snapshot).toBe(warmSnapshot);
    expect(store.getState().status).toBe('refreshing');
  });

  it('reset restores idle state and blocks a pre-reset completion', async () => {
    const load = deferred<DashboardSnapshot>();
    const store = createDashboardStore(repository(() => load.promise));
    const request = store.getState().ensureSnapshot(input('2026-07'));

    store.getState().reset();
    load.resolve(snapshot('2026-07'));
    await request;

    expect(store.getState()).toMatchObject({
      snapshot: undefined,
      status: 'idle',
      requestedKey: undefined,
      requestGeneration: 2,
    });
  });

  it('reuses a fresh focus snapshot until invalidation requests revalidation', async () => {
    const first = snapshot('2026-07');
    const second = snapshot('2026-07');
    const repo = repository(() =>
      Promise.resolve(repo.getSnapshot.mock.calls.length === 1 ? first : second),
    );
    const store = createDashboardStore(repo);

    await store.getState().ensureSnapshot(input('2026-07'));
    await store.getState().ensureSnapshot(input('2026-07'));
    expect(repo.getSnapshot).toHaveBeenCalledTimes(1);

    store.getState().invalidate();
    await store.getState().ensureSnapshot(input('2026-07'));

    expect(repo.getSnapshot).toHaveBeenCalledTimes(2);
    expect(store.getState().snapshot).toBe(second);
  });

  it('ignores stale failures without logging or changing the newer request state', async () => {
    const july = deferred<DashboardSnapshot>();
    const august = deferred<DashboardSnapshot>();
    const repo = repository(({ yearMonth }) =>
      yearMonth === '2026-07' ? july.promise : august.promise,
    );
    const store = createDashboardStore(repo);
    const errorSpy = jest.spyOn(console, 'error').mockImplementation();

    const julyRequest = store.getState().ensureSnapshot(input('2026-07'));
    const augustRequest = store.getState().ensureSnapshot(input('2026-08'));
    july.reject(new Error('stale July failure'));
    await julyRequest;

    expect(errorSpy).not.toHaveBeenCalled();
    expect(store.getState()).toMatchObject({
      status: 'initialLoading',
      requestedKey: '2026-08',
      requestGeneration: 2,
    });

    august.resolve(snapshot('2026-08'));
    await augustRequest;
    errorSpy.mockRestore();
  });
});
