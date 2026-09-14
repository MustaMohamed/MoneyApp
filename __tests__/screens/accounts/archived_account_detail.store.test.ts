import type {
  ArchivedAccountDetailLoadInput,
  ArchivedAccountDetailSnapshot,
  IArchivedAccountDetailRepository,
} from '@/modules/accounts/repositories/archived_account_detail.repository';
import { createArchivedAccountDetailStore } from '@/modules/accounts/screens/accounts/detail/archived_account_detail.store';

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

function input(accountId: string, mutationVersion = 0): ArchivedAccountDetailLoadInput {
  return { accountId, mutationVersion };
}

function snapshot(accountId: string, transactionCount = 0): ArchivedAccountDetailSnapshot {
  return { accountId, account: undefined, transactionCount, activeCommitmentCount: 0 };
}

function repository(getSnapshot: IArchivedAccountDetailRepository['getSnapshot']): {
  getSnapshot: jest.MockedFunction<IArchivedAccountDetailRepository['getSnapshot']>;
} {
  return { getSnapshot: jest.fn(getSnapshot) };
}

describe('createArchivedAccountDetailStore', () => {
  it('publishes the snapshot and the status in one step, with no partial state between', async () => {
    const load = deferred<ArchivedAccountDetailSnapshot>();
    const store = createArchivedAccountDetailStore(repository(() => load.promise));
    const seen: { status: string; hasSnapshot: boolean }[] = [];
    store.subscribe((state) =>
      seen.push({ status: state.status, hasSnapshot: state.snapshot !== undefined }),
    );

    const pending = store.getState().ensure(input('acc-1'));
    expect(store.getState().status).toBe('loading');
    expect(store.getState().snapshot).toBeUndefined();

    load.resolve(snapshot('acc-1', 7));
    await pending;

    expect(store.getState().status).toBe('ready');
    expect(store.getState().snapshot?.transactionCount).toBe(7);
    expect(seen).toEqual([
      { status: 'loading', hasSnapshot: false },
      { status: 'ready', hasSnapshot: true },
    ]);
  });

  it('drops a slower first response once a newer key has started', async () => {
    const first = deferred<ArchivedAccountDetailSnapshot>();
    const second = deferred<ArchivedAccountDetailSnapshot>();
    const repo = repository(({ mutationVersion }) =>
      mutationVersion === 0 ? first.promise : second.promise,
    );
    const store = createArchivedAccountDetailStore(repo);

    const stale = store.getState().ensure(input('acc-1', 0));
    const fresh = store.getState().ensure(input('acc-1', 1));

    second.resolve(snapshot('acc-1', 2));
    await fresh;
    first.resolve(snapshot('acc-1', 99));
    await stale;

    expect(store.getState().status).toBe('ready');
    expect(store.getState().snapshot?.transactionCount).toBe(2);
  });

  it('reads once for two requests on the same key', async () => {
    const repo = repository(({ accountId }) => Promise.resolve(snapshot(accountId)));
    const store = createArchivedAccountDetailStore(repo);

    await store.getState().ensure(input('acc-1'));
    await store.getState().ensure(input('acc-1'));

    expect(repo.getSnapshot).toHaveBeenCalledTimes(1);
  });

  it.each([
    ['a bumped mutation version', input('acc-1', 1)],
    ['a different account', input('acc-2', 0)],
  ])('reads again under loading for %s', async (_label, next) => {
    const repo = repository(({ accountId }) => Promise.resolve(snapshot(accountId)));
    const store = createArchivedAccountDetailStore(repo);
    await store.getState().ensure(input('acc-1', 0));

    const pending = store.getState().ensure(next);
    expect(store.getState().status).toBe('loading');
    expect(store.getState().snapshot).toBeUndefined();
    await pending;

    expect(repo.getSnapshot).toHaveBeenCalledTimes(2);
    expect(store.getState().status).toBe('ready');
  });

  it('logs a failed read, publishes error, and a retry reads again', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation();
    let attempt = 0;
    const repo = repository(({ accountId }) => {
      attempt += 1;
      return attempt === 1
        ? Promise.reject(new Error('db down'))
        : Promise.resolve(snapshot(accountId));
    });
    const store = createArchivedAccountDetailStore(repo);

    await store.getState().ensure(input('acc-1'));
    expect(store.getState().status).toBe('error');
    expect(store.getState().snapshot).toBeUndefined();
    expect(consoleError).toHaveBeenCalledWith(
      '[archivedAccountDetailStore] snapshot request failed:',
      expect.any(Error),
    );

    await store.getState().retry(input('acc-1'));
    expect(repo.getSnapshot).toHaveBeenCalledTimes(2);
    expect(store.getState().status).toBe('ready');
    expect(store.getState().snapshot?.accountId).toBe('acc-1');
    consoleError.mockRestore();
  });

  it('drops a response that lands after a reset', async () => {
    const load = deferred<ArchivedAccountDetailSnapshot>();
    const store = createArchivedAccountDetailStore(repository(() => load.promise));

    const pending = store.getState().ensure(input('acc-1'));
    store.getState().reset();
    load.resolve(snapshot('acc-1', 5));
    await pending;

    expect(store.getState().status).toBe('idle');
    expect(store.getState().snapshot).toBeUndefined();
  });
});
