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

describe('currencyStore initial state', () => {
  it('starts with rate=50, lastFetched=null, isManualOverride=false, rate_updated_at=null', () => {
    const store = createCurrencyStore(makeRepo());
    expect(store.getState().state.rate).toBe(50);
    expect(store.getState().state.lastFetched).toBeNull();
    expect(store.getState().state.isManualOverride).toBe(false);
    expect(store.getState().state.rate_updated_at).toBeNull();
  });
});

describe('currencyStore.loadRate', () => {
  it('leaves default state when no persisted value exists', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().loadRate();
    expect(store.getState().state.rate).toBe(50);
    expect(store.getState().state.lastFetched).toBeNull();
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
    expect(store.getState().state.rate).toBe(57.5);
    expect(store.getState().state.lastFetched).toBe('2026-05-01T10:00:00.000Z');
    expect(store.getState().state.isManualOverride).toBe(false);
  });

  it('sets isManualOverride=true when stored as "true"', async () => {
    const store = createCurrencyStore(
      makeRepo({ usd_rate: '48', usd_rate_manual_override: 'true' }),
    );
    await store.getState().loadRate();
    expect(store.getState().state.isManualOverride).toBe(true);
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
      json: jest.fn().mockResolvedValue({ rates: { EGP: 55.25 } }),
    } as unknown as Response);
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('updates state with fetched EGP rate', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().fetchRate();
    expect(store.getState().state.rate).toBe(55.25);
    expect(store.getState().state.isManualOverride).toBe(false);
    expect(store.getState().state.lastFetched).toMatch(/^\d{4}-\d{2}-\d{2}T/);
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
      json: jest.fn().mockResolvedValue({ rates: {} }),
    } as unknown as Response);
    const store = createCurrencyStore(makeRepo());
    await expect(store.getState().fetchRate()).rejects.toThrow();
  });
});

describe('currencyStore.setManualRate', () => {
  it('sets rate in state and marks isManualOverride=true', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.getState().setManualRate(48.5);
    expect(store.getState().state.rate).toBe(48.5);
    expect(store.getState().state.isManualOverride).toBe(true);
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
    expect(store.getState().state.lastFetched).toBeNull();
  });

  it('propagates repo errors', async () => {
    const repo = makeRepo();
    (repo.set as jest.Mock).mockRejectedValue(new Error('set fail'));
    const store = createCurrencyStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.getState().setManualRate(48.5)).rejects.toThrow('set fail');
    consoleSpy.mockRestore();
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
    expect(useStore.getState().state.rate).toBe(70);
    expect(useStore.getState().state.isManualOverride).toBe(true);

    useStore.getState().reset();

    expect(useStore.getState().state).toEqual({
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
    expect(store.getState().state.rate_updated_at).toBeNull();
  });

  it('sets rate_updated_at to current ISO timestamp when fetchRate is called', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ rates: { EGP: 55.5 } }),
    } as unknown as Response);
    const before = new Date().toISOString();
    const store = createCurrencyStore(makeRepo());
    await store.getState().fetchRate();
    const after = new Date().toISOString();
    const ts = store.getState().state.rate_updated_at;
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
    const ts = store.getState().state.rate_updated_at;
    expect(ts).not.toBeNull();
    expect(ts! >= before).toBe(true);
    expect(ts! <= after).toBe(true);
  });

  it('persists rate_updated_at to repo on fetchRate', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
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
    expect(store.getState().state.rate_updated_at).not.toBeNull();
    store.getState().reset();
    expect(store.getState().state.rate_updated_at).toBeNull();
  });
});
