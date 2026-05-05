import { createCurrencyStore } from '@/store/currency.store';
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
  it('starts with rate=50, lastFetched=null, isManualOverride=false', () => {
    const store = createCurrencyStore(makeRepo());
    expect(store.getState().state.rate).toBe(50);
    expect(store.getState().state.lastFetched).toBeNull();
    expect(store.getState().state.isManualOverride).toBe(false);
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
