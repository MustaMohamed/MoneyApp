import { createCurrencyStore } from '@/modules/currency/store/currency.store';
import type { IAppSettingsRepository } from '@/repositories/app_settings.repository';

function makeRepo(seed: Record<string, string> = {}): IAppSettingsRepository {
  const db: Record<string, string> = { ...seed };
  return {
    get: jest.fn(async (key: string) => db[key] ?? null),
    set: jest.fn(async (key: string, value: string) => {
      db[key] = value;
    }),
  };
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
    expect(repo.set).toHaveBeenCalledWith('usd_rate', '55.25');
    expect(repo.set).toHaveBeenCalledWith('usd_rate_manual_override', 'false');
    expect(repo.set).toHaveBeenCalledWith(
      'usd_rate_fetched_at',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
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
    expect(repo.set).not.toHaveBeenCalledWith('usd_rate_manual_override', 'false');
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
});

describe('currencyStore.setManualRate', () => {
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
    expect(repo.set).toHaveBeenCalledWith('usd_rate', '48.5');
    expect(repo.set).toHaveBeenCalledWith('usd_rate_manual_override', 'true');
  });

  it('does not update lastFetched', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().setManualRate(48.5);
    expect(store.getState().lastFetched).toBeNull();
  });

  it('propagates repo errors', async () => {
    const repo = makeRepo();
    (repo.set as jest.Mock).mockRejectedValue(new Error('set fail'));
    const store = createCurrencyStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.getState().setManualRate(48.5)).rejects.toThrow('set fail');
    consoleSpy.mockRestore();
  });

  it('ignores a rejected manual save after a newer operation owns the rate', async () => {
    const firstWrite = deferred<void>();
    const repo = makeRepo();
    (repo.set as jest.Mock).mockReturnValueOnce(firstWrite.promise).mockResolvedValue(undefined);
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
    expect(repo.set).toHaveBeenCalledWith(
      'usd_rate_updated_at',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
    global.fetch = originalFetch;
  });

  it('persists rate_updated_at to repo on setManualRate', async () => {
    const repo = makeRepo();
    const store = createCurrencyStore(repo);
    await store.getState().setManualRate(48.5);
    expect(repo.set).toHaveBeenCalledWith(
      'usd_rate_updated_at',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
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
