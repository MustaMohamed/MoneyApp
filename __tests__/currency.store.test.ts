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
  it('starts with rate=50, lastFetched=null, isManualOverride=false, rateUpdatedAt=null', () => {
    const store = createCurrencyStore(makeRepo());
    expect(store.state.rate.value).toBe(50);
    expect(store.state.lastFetched.value).toBeNull();
    expect(store.state.isManualOverride.value).toBe(false);
    expect(store.state.rateUpdatedAt.value).toBeNull();
  });
});

describe('currencyStore.loadRate', () => {
  it('leaves default state when no persisted value exists', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.loadRate();
    expect(store.state.rate.value).toBe(50);
    expect(store.state.lastFetched.value).toBeNull();
  });

  it('reads and applies persisted rate and metadata', async () => {
    const store = createCurrencyStore(
      makeRepo({
        usd_rate: '57.5',
        usd_rate_fetched_at: '2026-05-01T10:00:00.000Z',
        usd_rate_manual_override: 'false',
        usd_rate_updated_at: '2026-05-01T10:00:00.000Z',
      }),
    );
    await store.loadRate();
    expect(store.state.rate.value).toBe(57.5);
    expect(store.state.lastFetched.value).toBe('2026-05-01T10:00:00.000Z');
    expect(store.state.isManualOverride.value).toBe(false);
    expect(store.state.rateUpdatedAt.value).toBe('2026-05-01T10:00:00.000Z');
  });

  it('sets isManualOverride=true when stored as "true"', async () => {
    const store = createCurrencyStore(
      makeRepo({ usd_rate: '48', usd_rate_manual_override: 'true' }),
    );
    await store.loadRate();
    expect(store.state.isManualOverride.value).toBe(true);
  });

  it('propagates repo errors', async () => {
    const repo = makeRepo();
    (repo.get as jest.Mock).mockRejectedValue(new Error('db error'));
    const store = createCurrencyStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.loadRate()).rejects.toThrow('db error');
    consoleSpy.mockRestore();
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
    await store.fetchRate();
    expect(store.state.rate.value).toBe(55.25);
    expect(store.state.isManualOverride.value).toBe(false);
    expect(store.state.lastFetched.value).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('persists rate, timestamp, manual flag, and rateUpdatedAt to repo', async () => {
    const repo = makeRepo();
    const store = createCurrencyStore(repo);
    await store.fetchRate();
    expect(repo.set).toHaveBeenCalledWith('usd_rate', '55.25');
    expect(repo.set).toHaveBeenCalledWith('usd_rate_manual_override', 'false');
    expect(repo.set).toHaveBeenCalledWith(
      'usd_rate_fetched_at',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
    expect(repo.set).toHaveBeenCalledWith(
      'usd_rate_updated_at',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
  });

  it('throws when EGP is missing from response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ rates: {} }),
    } as unknown as Response);
    const store = createCurrencyStore(makeRepo());
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.fetchRate()).rejects.toThrow();
    consoleSpy.mockRestore();
  });
});

describe('currencyStore.setManualRate', () => {
  it('sets rate in state and marks isManualOverride=true', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.setManualRate(48.5);
    expect(store.state.rate.value).toBe(48.5);
    expect(store.state.isManualOverride.value).toBe(true);
  });

  it('persists rate, manual flag, and rateUpdatedAt to repo', async () => {
    const repo = makeRepo();
    const store = createCurrencyStore(repo);
    await store.setManualRate(48.5);
    expect(repo.set).toHaveBeenCalledWith('usd_rate', '48.5');
    expect(repo.set).toHaveBeenCalledWith('usd_rate_manual_override', 'true');
    expect(repo.set).toHaveBeenCalledWith(
      'usd_rate_updated_at',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
  });

  it('does not update lastFetched', async () => {
    const store = createCurrencyStore(makeRepo());
    await store.setManualRate(48.5);
    expect(store.state.lastFetched.value).toBeNull();
  });

  it('propagates repo errors', async () => {
    const repo = makeRepo();
    (repo.set as jest.Mock).mockRejectedValue(new Error('set fail'));
    const store = createCurrencyStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.setManualRate(48.5)).rejects.toThrow('set fail');
    consoleSpy.mockRestore();
  });
});

describe('currencyStore.reset', () => {
  it('restores initial signal values', async () => {
    const repo = makeRepo({
      usd_rate: '70',
      usd_rate_fetched_at: '2025-01-01T00:00:00Z',
      usd_rate_manual_override: 'true',
      usd_rate_updated_at: '2025-01-01T00:00:00Z',
    });
    const store = createCurrencyStore(repo);
    await store.loadRate();
    expect(store.state.rate.value).toBe(70);
    expect(store.state.isManualOverride.value).toBe(true);

    store.reset();

    expect(store.state.rate.value).toBe(50);
    expect(store.state.lastFetched.value).toBeNull();
    expect(store.state.isManualOverride.value).toBe(false);
    expect(store.state.rateUpdatedAt.value).toBeNull();
  });
});

describe('currencyStore.rateUpdatedAt', () => {
  it('sets rateUpdatedAt to current ISO timestamp when fetchRate is called', async () => {
    const originalFetch = global.fetch;
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ rates: { EGP: 55.5 } }),
    } as unknown as Response);
    const before = new Date().toISOString();
    const store = createCurrencyStore(makeRepo());
    await store.fetchRate();
    const after = new Date().toISOString();
    const ts = store.state.rateUpdatedAt.value;
    expect(ts).not.toBeNull();
    expect(ts! >= before).toBe(true);
    expect(ts! <= after).toBe(true);
    global.fetch = originalFetch;
  });

  it('sets rateUpdatedAt to current ISO timestamp when setManualRate is called', async () => {
    const before = new Date().toISOString();
    const store = createCurrencyStore(makeRepo());
    await store.setManualRate(55.5);
    const after = new Date().toISOString();
    const ts = store.state.rateUpdatedAt.value;
    expect(ts).not.toBeNull();
    expect(ts! >= before).toBe(true);
    expect(ts! <= after).toBe(true);
  });
});
