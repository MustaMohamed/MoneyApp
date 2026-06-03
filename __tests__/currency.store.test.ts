import { CurrencyStore } from '@/modules/currency/store/currency.store';
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

beforeEach(() => {
  jest.clearAllMocks();
});

describe('CurrencyStore initial state', () => {
  it('starts with rate=50, lastFetched=null, isManualOverride=false, rate_updated_at=null', () => {
    const store = new CurrencyStore(makeRepo());

    expect(store.rate).toBe(50);
    expect(store.lastFetched).toBeNull();
    expect(store.isManualOverride).toBe(false);
    expect(store.rate_updated_at).toBeNull();
  });
});

describe('CurrencyStore.loadRate', () => {
  it('leaves default state when no persisted value exists', async () => {
    const store = new CurrencyStore(makeRepo());

    await store.loadRate();

    expect(store.rate).toBe(50);
    expect(store.lastFetched).toBeNull();
    expect(store.isManualOverride).toBe(false);
    expect(store.rate_updated_at).toBeNull();
  });

  it('reads the unchanged persistence keys', async () => {
    const repo = makeRepo();
    const store = new CurrencyStore(repo);

    await store.loadRate();

    expect(repo.get).toHaveBeenCalledWith('usd_rate');
    expect(repo.get).toHaveBeenCalledWith('usd_rate_fetched_at');
    expect(repo.get).toHaveBeenCalledWith('usd_rate_manual_override');
    expect(repo.get).toHaveBeenCalledWith('usd_rate_updated_at');
  });

  it('reads and applies persisted rate and metadata', async () => {
    const store = new CurrencyStore(
      makeRepo({
        usd_rate: '57.5',
        usd_rate_fetched_at: '2026-05-01T10:00:00.000Z',
        usd_rate_manual_override: 'false',
        usd_rate_updated_at: '2026-05-01T10:00:00.000Z',
      }),
    );

    await store.loadRate();

    expect(store.rate).toBe(57.5);
    expect(store.lastFetched).toBe('2026-05-01T10:00:00.000Z');
    expect(store.isManualOverride).toBe(false);
    expect(store.rate_updated_at).toBe('2026-05-01T10:00:00.000Z');
  });

  it('sets isManualOverride=true when stored as "true"', async () => {
    const store = new CurrencyStore(makeRepo({ usd_rate: '48', usd_rate_manual_override: 'true' }));

    await store.loadRate();

    expect(store.isManualOverride).toBe(true);
  });

  it('logs and rethrows repo errors', async () => {
    const error = new Error('db error');
    const repo = makeRepo();
    (repo.get as jest.Mock).mockRejectedValue(error);
    const store = new CurrencyStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.loadRate()).rejects.toThrow('db error');

    expect(consoleSpy).toHaveBeenCalledWith('[currencyStore] loadRate failed:', error);
    consoleSpy.mockRestore();
  });
});

describe('CurrencyStore.fetchRate', () => {
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

  it('updates state with fetched EGP rate and fetch metadata', async () => {
    const store = new CurrencyStore(makeRepo());

    await store.fetchRate();

    expect(store.rate).toBe(55.25);
    expect(store.isManualOverride).toBe(false);
    expect(store.lastFetched).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(store.rate_updated_at).toBe(store.lastFetched);
  });

  it('persists rate, fetched timestamp, manual flag, and updated timestamp to repo', async () => {
    const repo = makeRepo();
    const store = new CurrencyStore(repo);

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

  it('logs and throws when EGP is missing from response', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: jest.fn().mockResolvedValue({ rates: {} }),
    } as unknown as Response);
    const store = new CurrencyStore(makeRepo());
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.fetchRate()).rejects.toThrow('[currencyStore] EGP not in API response');

    expect(consoleSpy).toHaveBeenCalledWith('[currencyStore] fetchRate failed:', expect.any(Error));
    consoleSpy.mockRestore();
  });

  it('logs and rethrows fetch errors', async () => {
    const error = new Error('network fail');
    global.fetch = jest.fn().mockRejectedValue(error);
    const store = new CurrencyStore(makeRepo());
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.fetchRate()).rejects.toThrow('network fail');

    expect(consoleSpy).toHaveBeenCalledWith('[currencyStore] fetchRate failed:', error);
    consoleSpy.mockRestore();
  });
});

describe('CurrencyStore.setManualRate', () => {
  it('sets rate in state and marks isManualOverride=true', async () => {
    const store = new CurrencyStore(makeRepo());

    await store.setManualRate(48.5);

    expect(store.rate).toBe(48.5);
    expect(store.isManualOverride).toBe(true);
  });

  it('persists rate, manual flag, and updated timestamp to repo', async () => {
    const repo = makeRepo();
    const store = new CurrencyStore(repo);

    await store.setManualRate(48.5);

    expect(repo.set).toHaveBeenCalledWith('usd_rate', '48.5');
    expect(repo.set).toHaveBeenCalledWith('usd_rate_manual_override', 'true');
    expect(repo.set).toHaveBeenCalledWith(
      'usd_rate_updated_at',
      expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    );
    expect(repo.set).not.toHaveBeenCalledWith('usd_rate_fetched_at', expect.any(String));
  });

  it('does not update lastFetched', async () => {
    const store = new CurrencyStore(makeRepo());

    await store.setManualRate(48.5);

    expect(store.lastFetched).toBeNull();
  });

  it('sets rate_updated_at to current ISO timestamp', async () => {
    const before = new Date().toISOString();
    const store = new CurrencyStore(makeRepo());

    await store.setManualRate(55.5);

    const after = new Date().toISOString();
    expect(store.rate_updated_at).not.toBeNull();
    expect(store.rate_updated_at! >= before).toBe(true);
    expect(store.rate_updated_at! <= after).toBe(true);
  });

  it('logs and rethrows repo errors', async () => {
    const error = new Error('set fail');
    const repo = makeRepo();
    (repo.set as jest.Mock).mockRejectedValue(error);
    const store = new CurrencyStore(repo);
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    await expect(store.setManualRate(48.5)).rejects.toThrow('set fail');

    expect(consoleSpy).toHaveBeenCalledWith('[currencyStore] setManualRate failed:', error);
    consoleSpy.mockRestore();
  });
});

describe('CurrencyStore.reset', () => {
  it('restores initial state', async () => {
    const store = new CurrencyStore(
      makeRepo({
        usd_rate: '70',
        usd_rate_fetched_at: '2025-01-01T00:00:00Z',
        usd_rate_manual_override: 'true',
        usd_rate_updated_at: '2025-01-02T00:00:00Z',
      }),
    );
    await store.loadRate();
    expect(store.rate).toBe(70);
    expect(store.isManualOverride).toBe(true);

    store.reset();

    expect(store.rate).toBe(50);
    expect(store.lastFetched).toBeNull();
    expect(store.isManualOverride).toBe(false);
    expect(store.rate_updated_at).toBeNull();
  });
});
