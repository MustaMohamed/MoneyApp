import type {
  AccountActivityLoadInput,
  AccountActivitySnapshot,
  IAccountActivityRepository,
} from '@/modules/accounts/repositories/account_activity.repository';
import { createAccountActivityStore } from '@/modules/accounts/screens/accounts/detail/account_activity.store';

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

const NOW = new Date('2026-09-15T12:00:00.000Z');

function input(accountId: string, mutationVersion = 0): AccountActivityLoadInput {
  return { accountId, mutationVersion, now: NOW };
}

function snapshot(accountId: string, monthOut = 0): AccountActivitySnapshot {
  return {
    accountId,
    rows: [],
    stats: { month_in: 0, month_out: monthOut, week_in: 0, week_out: 0 },
    loadedAt: NOW.getTime(),
  };
}

function repository(getSnapshot: IAccountActivityRepository['getSnapshot']): {
  getSnapshot: jest.MockedFunction<IAccountActivityRepository['getSnapshot']>;
} {
  return { getSnapshot: jest.fn(getSnapshot) };
}

describe('createAccountActivityStore', () => {
  it('publishes the rows and the figures in one step, with no partial state between', async () => {
    const load = deferred<AccountActivitySnapshot>();
    const store = createAccountActivityStore(repository(() => load.promise));
    const seen: { status: string; hasSnapshot: boolean }[] = [];
    store.subscribe((state) =>
      seen.push({ status: state.status, hasSnapshot: state.snapshot !== undefined }),
    );

    const pending = store.getState().ensure(input('acc-1'));
    expect(store.getState().status).toBe('initialLoading');
    expect(store.getState().snapshot).toBeUndefined();

    load.resolve(snapshot('acc-1', 640));
    await pending;

    expect(store.getState().status).toBe('ready');
    expect(store.getState().snapshot?.stats.month_out).toBe(640);
    expect(seen).toEqual([
      { status: 'initialLoading', hasSnapshot: false },
      { status: 'ready', hasSnapshot: true },
    ]);
  });

  it('drops a slower first response once a newer stamp has started', async () => {
    const first = deferred<AccountActivitySnapshot>();
    const second = deferred<AccountActivitySnapshot>();
    const repo = repository(({ mutationVersion }) =>
      mutationVersion === 0 ? first.promise : second.promise,
    );
    const store = createAccountActivityStore(repo);

    const stale = store.getState().ensure(input('acc-1', 0));
    const fresh = store.getState().ensure(input('acc-1', 1));

    second.resolve(snapshot('acc-1', 200));
    await fresh;
    first.resolve(snapshot('acc-1', 999));
    await stale;

    expect(store.getState().status).toBe('ready');
    expect(store.getState().snapshot?.stats.month_out).toBe(200);
  });

  it('does not re-read for the same account at the same stamp', async () => {
    const repo = repository(({ accountId }) => Promise.resolve(snapshot(accountId)));
    const store = createAccountActivityStore(repo);

    await store.getState().ensure(input('acc-1'));
    await store.getState().ensure(input('acc-1'));

    expect(repo.getSnapshot).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a bumped mutation version', input('acc-1', 1)],
    ['a different account', input('acc-2', 0)],
  ])('re-reads under initialLoading for %s', async (_label, next) => {
    const repo = repository(({ accountId }) => Promise.resolve(snapshot(accountId)));
    const store = createAccountActivityStore(repo);
    await store.getState().ensure(input('acc-1', 0));

    const pending = store.getState().ensure(next);
    expect(store.getState().status).toBe('initialLoading');
    expect(store.getState().snapshot).toBeUndefined();
    await pending;

    expect(repo.getSnapshot).toHaveBeenCalledTimes(2);
    expect(store.getState().status).toBe('ready');
  });

  it('surfaces a failed read as an error status a retry can clear', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    let attempt = 0;
    const repo = repository(({ accountId }) => {
      attempt += 1;
      return attempt === 1
        ? Promise.reject(new Error('db down'))
        : Promise.resolve(snapshot(accountId));
    });
    const store = createAccountActivityStore(repo);

    await store.getState().ensure(input('acc-1'));
    expect(store.getState().status).toBe('initialError');
    expect(store.getState().snapshot).toBeUndefined();

    await store.getState().retry(input('acc-1'));
    expect(store.getState().status).toBe('ready');
    expect(store.getState().snapshot?.accountId).toBe('acc-1');
    consoleError.mockRestore();
  });

  it('drops a result that lands after the screen unmounted', async () => {
    const load = deferred<AccountActivitySnapshot>();
    const store = createAccountActivityStore(repository(() => load.promise));

    const pending = store.getState().ensure(input('acc-1'));
    store.getState().reset();
    load.resolve(snapshot('acc-1', 500));
    await pending;

    expect(store.getState().status).toBe('idle');
    expect(store.getState().snapshot).toBeUndefined();
  });
});
