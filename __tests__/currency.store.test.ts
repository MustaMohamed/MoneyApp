import { isRateUsable } from '@/modules/accounts/domain/account_aggregation';
import { createCurrencyStore } from '@/modules/currency/store/currency.store';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';

const INITIAL_EXPECTATION = {
  rate: 50,
  lastFetched: null,
  isManualOverride: false,
  rate_updated_at: null,
  hasLoaded: false,
};

function makeTrackedRepo(seed: Record<string, string> = {}) {
  const db: Record<string, string> = { ...seed };
  const repo: IAppSettingsRepository = {
    get: jest.fn(async (key: string) => db[key] ?? null),
    set: jest.fn(async (key: string, value: string) => {
      db[key] = value;
    }),
    setMany: jest.fn(async (entries: ReadonlyArray<readonly [string, string]>) => {
      for (const [key, value] of entries) db[key] = value;
    }),
  };
  return { db, repo };
}

function makeRepo(seed: Record<string, string> = {}): IAppSettingsRepository {
  return makeTrackedRepo(seed).repo;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function rateResponse(rate: number): Response {
  return {
    ok: true,
    json: jest.fn().mockResolvedValue({ rates: { EGP: rate } }),
  } as unknown as Response;
}

describe('currencyStore initial state', () => {
  it('starts with rate=50, lastFetched=null, isManualOverride=false, rate_updated_at=null', () => {
    const store = createCurrencyStore(makeRepo());
    expect(store.getState().rate).toBe(50);
    expect(store.getState().lastFetched).toBeNull();
    expect(store.getState().isManualOverride).toBe(false);
    expect(store.getState().rate_updated_at).toBeNull();
  });
});

// The gate lives in the accounts domain and is unit-tested there against
// hand-written triples. These two rows are the ones a hand-written triple cannot
// prove: they hydrate the REAL store — its `INITIAL_STATE`, its `loadRate`, its
// `parsePersistedRate` — and ask the real predicate what it makes of the result.
// A future edit to `INITIAL_STATE` that quietly made the placeholder acceptable
// would leave the domain table green and turn the first of these red.
describe('currencyStore — what isRateUsable makes of the hydrated state', () => {
  const gate = (state: {
    rate: number;
    rate_updated_at: string | null;
    isManualOverride: boolean;
  }) =>
    isRateUsable({
      rate: state.rate,
      rateUpdatedAt: state.rate_updated_at,
      isManualOverride: state.isManualOverride,
    });

  it('refuses the fresh install, before and after hydration', async () => {
    // `INITIAL_STATE.rate` is 50 with no marker and no override. The dashboard
    // renders during the load too, so the pre-hydration state has to be refused
    // as well — the assertion is deliberately on both sides of `loadRate`.
    const store = createCurrencyStore(makeRepo());
    expect(gate(store.getState())).toBe(false);

    await store.getState().loadRate();

    expect(gate(store.getState())).toBe(false);
  });

  it('accepts the install whose manual rate predates the marker', async () => {
    // The same seed as 'does not fetch a manual override' below, which is the
    // proof that this install never repairs itself: `shouldRefreshRate` returns
    // false for an override, so `usd_rate_updated_at` is never written and the
    // marker never appears. `currency.store.ts` shipped in #23 with these two
    // keys and no marker; the marker arrives in #85 (ADR 2026-08-19 §4).
    const store = createCurrencyStore(
      makeRepo({ usd_rate: '48', usd_rate_manual_override: 'true' }),
    );
    await store.getState().loadRate();

    expect(store.getState().rate_updated_at).toBeNull();
    expect(store.getState().isManualOverride).toBe(true);
    expect(gate(store.getState())).toBe(true);
  });
});

describe('currencyStore.loadRate', () => {
  it('leaves default state when no persisted value exists', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().loadRate();
    expect(store.getState().rate).toBe(50);
    expect(store.getState().lastFetched).toBeNull();
  });

  it('reads and applies persisted rate and metadata', async () => {
    const store = createCurrencyStore(
      makeRepo({
        usd_rate: '57.5',
        usd_rate_fetched_at: '2026-05-01T10:00:00.000Z',
        usd_rate_manual_override: 'false',
      }),
    );
    await store.getState().loadRate();
    expect(store.getState().rate).toBe(57.5);
    expect(store.getState().lastFetched).toBe('2026-05-01T10:00:00.000Z');
    expect(store.getState().isManualOverride).toBe(false);
    expect(store.getState().hasLoaded).toBe(true);
  });

  it('marks invalid persisted data loaded without retaining stale ownership metadata', async () => {
    const store = createCurrencyStore(
      makeRepo({
        usd_rate: '50abc',
        usd_rate_fetched_at: '2026-05-01T10:00:00.000Z',
        usd_rate_manual_override: 'true',
      }),
    );

    await store.getState().loadRate();

    expect(store.getState()).toMatchObject({
      rate: 50,
      hasLoaded: true,
      lastFetched: null,
      isManualOverride: false,
    });
  });

  it('restores the fallback rate when a later hydration is invalid', async () => {
    const { db, repo } = makeTrackedRepo({
      usd_rate: '57.5',
      usd_rate_fetched_at: '2026-05-01T10:00:00.000Z',
      usd_rate_manual_override: 'true',
      usd_rate_updated_at: '2026-05-01T10:00:00.000Z',
    });
    const store = createCurrencyStore(repo);
    await store.getState().loadRate();
    db.usd_rate = 'invalid';

    await store.getState().loadRate();

    expect(store.getState()).toMatchObject({
      rate: 50,
      lastFetched: null,
      isManualOverride: false,
      rate_updated_at: null,
      hasLoaded: true,
    });
  });

  it('drops corrupt persisted timestamps', async () => {
    const store = createCurrencyStore(
      makeRepo({
        usd_rate: '57.5',
        usd_rate_fetched_at: 'not-a-date',
        usd_rate_manual_override: 'false',
        usd_rate_updated_at: 'also-not-a-date',
      }),
    );

    await store.getState().loadRate();

    expect(store.getState()).toMatchObject({
      rate: 57.5,
      lastFetched: null,
      rate_updated_at: null,
      hasLoaded: true,
    });
  });

  it('sets isManualOverride=true when stored as "true"', async () => {
    const store = createCurrencyStore(
      makeRepo({ usd_rate: '48', usd_rate_manual_override: 'true' }),
    );
    await store.getState().loadRate();
    expect(store.getState().isManualOverride).toBe(true);
  });

  it('propagates repo errors', async () => {
    const repo = makeRepo();
    (repo.get as jest.Mock).mockRejectedValue(new Error('db error'));
    const store = createCurrencyStore(repo);
    await expect(store.getState().loadRate()).rejects.toThrow('db error');
  });

  it('ignores a stale load result after reset', async () => {
    const pending = deferred<string | null>();
    const repo = makeRepo();
    (repo.get as jest.Mock).mockReturnValue(pending.promise);
    const store = createCurrencyStore(repo);

    const load = store.getState().loadRate();
    store.getState().reset();
    pending.resolve('57');
    await load;

    expect(store.getState()).toMatchObject(INITIAL_EXPECTATION);
  });

  it('contains a stale load failure after reset', async () => {
    const pending = deferred<string | null>();
    const repo = makeRepo();
    (repo.get as jest.Mock).mockReturnValue(pending.promise);
    const store = createCurrencyStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const load = store.getState().loadRate();
    store.getState().reset();
    pending.reject(new Error('stale load failure'));

    await expect(load).resolves.toBeUndefined();
    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });
});

describe('currencyStore.fetchRate', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ rates: { EGP: 55.25 } }),
    } as unknown as Response);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('updates state with fetched EGP rate', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().fetchRate();
    expect(store.getState().rate).toBe(55.25);
    expect(store.getState().isManualOverride).toBe(false);
    expect(store.getState().lastFetched).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('persists rate, timestamp, and manual flag to repo', async () => {
    const repo = makeRepo();
    const store = createCurrencyStore(repo);
    await store.getState().fetchRate();
    expect(repo.setMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['usd_rate', '55.25'],
        ['usd_rate_manual_override', 'false'],
        ['usd_rate_fetched_at', expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)],
      ]),
    );
  });

  it('throws when EGP is missing from response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ rates: {} }),
    } as unknown as Response);
    const store = createCurrencyStore(makeRepo());
    await expect(store.getState().fetchRate()).rejects.toThrow();
  });

  it('throws on an unsuccessful HTTP response', async () => {
    global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 503 } as Response);
    const store = createCurrencyStore(makeRepo());

    await expect(store.getState().fetchRate()).rejects.toThrow();
  });

  it('does not let an older fetch overwrite a newer manual save', async () => {
    const response = deferred<Response>();
    global.fetch = jest.fn().mockReturnValue(response.promise);
    const repo = makeRepo();
    const store = createCurrencyStore(repo);

    const staleFetch = store.getState().fetchRate();
    await store.getState().setManualRate(48.5);
    response.resolve(rateResponse(55.25));
    await staleFetch;

    expect(store.getState()).toMatchObject({ rate: 48.5, isManualOverride: true });
    expect(repo.setMany).toHaveBeenCalledTimes(1);
  });

  it('ignores a rejected fetch after a newer manual save owns the rate', async () => {
    const response = deferred<Response>();
    global.fetch = jest.fn().mockReturnValue(response.promise);
    const store = createCurrencyStore(makeRepo());

    const staleFetch = store.getState().fetchRate();
    await store.getState().setManualRate(48.5);
    response.reject(new Error('stale network failure'));

    await expect(staleFetch).resolves.toBeUndefined();
    expect(store.getState()).toMatchObject({ rate: 48.5, isManualOverride: true });
  });

  it('publishes only the newest concurrent fetch', async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    global.fetch = jest.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const store = createCurrencyStore(makeRepo());

    const older = store.getState().fetchRate();
    const newer = store.getState().fetchRate();
    second.resolve(rateResponse(56));
    await newer;
    first.resolve(rateResponse(54));
    await older;

    expect(store.getState().rate).toBe(56);
  });

  it('keeps an older successful commit authoritative when a newer fetch fails', async () => {
    const commitStarted = deferred<void>();
    const releaseCommit = deferred<void>();
    const { db, repo } = makeTrackedRepo();
    (repo.setMany as jest.Mock).mockImplementationOnce(
      async (entries: ReadonlyArray<readonly [string, string]>) => {
        commitStarted.resolve();
        await releaseCommit.promise;
        for (const [key, value] of entries) db[key] = value;
      },
    );
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(rateResponse(55))
      .mockRejectedValueOnce(new Error('newer request failed'));
    const store = createCurrencyStore(repo);

    const older = store.getState().fetchRate();
    await commitStarted.promise;
    const newer = store.getState().fetchRate();
    await expect(newer).rejects.toThrow('newer request failed');
    releaseCommit.resolve();
    await older;

    expect(store.getState().rate).toBe(55);
    expect(await repo.get('usd_rate')).toBe('55');
  });

  it('invalidates pending fetch work when reset', async () => {
    const response = deferred<Response>();
    global.fetch = jest.fn().mockReturnValue(response.promise);
    const store = createCurrencyStore(makeRepo());

    const pending = store.getState().fetchRate();
    store.getState().reset();
    response.resolve(rateResponse(57));
    await pending;

    expect(store.getState()).toMatchObject({
      rate: 50,
      isManualOverride: false,
      hasLoaded: false,
    });
  });

  it('does not publish a persistence commit after reset', async () => {
    const pendingWrite = deferred<void>();
    const repo = makeRepo();
    (repo.setMany as jest.Mock).mockReturnValueOnce(pendingWrite.promise);
    const store = createCurrencyStore(repo);

    const save = store.getState().setManualRate(48.5);
    await Promise.resolve();
    store.getState().reset();
    pendingWrite.resolve();
    await save;

    expect(store.getState()).toMatchObject(INITIAL_EXPECTATION);
  });
});

describe('currencyStore.refreshRateIfStale', () => {
  let originalFetch: typeof global.fetch;

  beforeEach(() => {
    originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue(rateResponse(55));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('does not fetch before persisted state has loaded', async () => {
    const store = createCurrencyStore(makeRepo());

    await store.getState().refreshRateIfStale(Date.now());

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('does not fetch a manual override', async () => {
    const store = createCurrencyStore(
      makeRepo({ usd_rate: '48', usd_rate_manual_override: 'true' }),
    );
    await store.getState().loadRate();

    await store.getState().refreshRateIfStale(Date.now());

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('deduplicates concurrent stale refreshes', async () => {
    const response = deferred<Response>();
    global.fetch = jest.fn().mockReturnValue(response.promise);
    const store = createCurrencyStore(makeRepo());
    await store.getState().loadRate();

    const first = store.getState().refreshRateIfStale(Date.now());
    const second = store.getState().refreshRateIfStale(Date.now());
    response.resolve(rateResponse(55));
    await Promise.all([first, second]);

    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps reset state when a default-timed refresh finishes later', async () => {
    const response = deferred<Response>();
    global.fetch = jest.fn().mockReturnValue(response.promise);
    const store = createCurrencyStore(makeRepo());
    await store.getState().loadRate();

    const refresh = store.getState().refreshRateIfStale();
    store.getState().reset();
    response.resolve(rateResponse(55));
    await refresh;

    expect(store.getState()).toMatchObject(INITIAL_EXPECTATION);
  });
});

describe('currencyStore.setManualRate', () => {
  it.each([Number.NaN, 0])('rejects invalid rate %s', async (rate) => {
    const store = createCurrencyStore(makeRepo());

    await expect(store.getState().setManualRate(rate)).rejects.toThrow(
      'Manual rate must be a positive number',
    );
  });

  it('sets rate in state and marks isManualOverride=true', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().setManualRate(48.5);
    expect(store.getState().rate).toBe(48.5);
    expect(store.getState().isManualOverride).toBe(true);
  });

  it('persists rate and manual flag to repo', async () => {
    const repo = makeRepo();
    const store = createCurrencyStore(repo);
    await store.getState().setManualRate(48.5);
    expect(repo.setMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['usd_rate', '48.5'],
        ['usd_rate_manual_override', 'true'],
      ]),
    );
  });

  it('does not update lastFetched', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().setManualRate(48.5);
    expect(store.getState().lastFetched).toBeNull();
  });

  it('propagates repo errors', async () => {
    const repo = makeRepo();
    (repo.setMany as jest.Mock).mockRejectedValue(new Error('set fail'));
    const store = createCurrencyStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.getState().setManualRate(48.5)).rejects.toThrow('set fail');
    consoleSpy.mockRestore();
  });

  it('ignores a rejected manual save after a newer operation owns the rate', async () => {
    const firstWrite = deferred<void>();
    const repo = makeRepo();
    (repo.setMany as jest.Mock)
      .mockReturnValueOnce(firstWrite.promise)
      .mockResolvedValue(undefined);
    const store = createCurrencyStore(repo);

    const staleManualSave = store.getState().setManualRate(48.5);
    await Promise.resolve();
    store.getState().reset();
    firstWrite.reject(new Error('stale persistence failure'));

    await expect(staleManualSave).resolves.toBeUndefined();
    expect(store.getState()).toMatchObject({
      rate: 50,
      isManualOverride: false,
      hasLoaded: false,
    });
  });
});

describe('currencyStore.reset', () => {
  it('restores INITIAL_STATE (rate=50, lastFetched=null, isManualOverride=false)', async () => {
    const repo = makeRepo({
      usd_rate: '70',
      usd_rate_fetched_at: '2025-01-01T00:00:00Z',
      usd_rate_manual_override: 'true',
    });
    const useStore = createCurrencyStore(repo);
    await useStore.getState().loadRate();
    expect(useStore.getState().rate).toBe(70);
    expect(useStore.getState().isManualOverride).toBe(true);

    useStore.getState().reset();

    expect(useStore.getState()).toMatchObject({
      rate: 50,
      lastFetched: null,
      isManualOverride: false,
      rate_updated_at: null,
    });
  });
});

describe('currencyStore — rate_updated_at', () => {
  it('initializes rate_updated_at to null', () => {
    const store = createCurrencyStore(makeRepo());
    expect(store.getState().rate_updated_at).toBeNull();
  });

  it('sets rate_updated_at to current ISO timestamp when fetchRate is called', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ rates: { EGP: 55.5 } }),
    } as unknown as Response);
    const before = new Date().toISOString();
    const store = createCurrencyStore(makeRepo());
    await store.getState().fetchRate();
    const after = new Date().toISOString();
    const ts = store.getState().rate_updated_at;
    expect(ts).not.toBeNull();
    expect(ts! >= before).toBe(true);
    expect(ts! <= after).toBe(true);
    global.fetch = originalFetch;
  });

  it('sets rate_updated_at to current ISO timestamp when setManualRate is called', async () => {
    const before = new Date().toISOString();
    const store = createCurrencyStore(makeRepo());
    await store.getState().setManualRate(55.5);
    const after = new Date().toISOString();
    const ts = store.getState().rate_updated_at;
    expect(ts).not.toBeNull();
    expect(ts! >= before).toBe(true);
    expect(ts! <= after).toBe(true);
  });

  it('persists rate_updated_at to repo on fetchRate', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ rates: { EGP: 55.5 } }),
    } as unknown as Response);
    const repo = makeRepo();
    const store = createCurrencyStore(repo);
    await store.getState().fetchRate();
    expect(repo.setMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['usd_rate_updated_at', expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)],
      ]),
    );
    global.fetch = originalFetch;
  });

  it('persists rate_updated_at to repo on setManualRate', async () => {
    const repo = makeRepo();
    const store = createCurrencyStore(repo);
    await store.getState().setManualRate(48.5);
    expect(repo.setMany).toHaveBeenCalledWith(
      expect.arrayContaining([
        ['usd_rate_updated_at', expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/)],
      ]),
    );
  });

  it('restores rate_updated_at to null on reset', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().setManualRate(48.5);
    expect(store.getState().rate_updated_at).not.toBeNull();
    store.getState().reset();
    expect(store.getState().rate_updated_at).toBeNull();
  });
});
