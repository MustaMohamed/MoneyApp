import { Currency } from '@/constants/enums';
import type { IBaseCurrencyRepository } from '@/modules/currency/repositories/base_currency.repository';
import {
  createBaseCurrencyStore,
  useBaseCurrencyStore,
} from '@/modules/currency/store/base_currency.store';

function makeRepo(): jest.Mocked<IBaseCurrencyRepository> {
  return {
    set: jest.fn().mockResolvedValue(undefined),
    load: jest.fn().mockResolvedValue(Currency.EGP),
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

let repo: jest.Mocked<IBaseCurrencyRepository>;
let store: ReturnType<typeof createBaseCurrencyStore>;

beforeEach(() => {
  jest.clearAllMocks();
  repo = makeRepo();
  store = createBaseCurrencyStore(repo);
});

describe('baseCurrencyStore.setBaseCurrency — TC-05, moved from the onboarding store (#348)', () => {
  it('persists through the repository then updates the hydrated copy', async () => {
    await store.getState().setBaseCurrency(Currency.USD);
    expect(repo.set.mock.calls).toEqual([[Currency.USD]]);
    expect(store.getState().baseCurrency).toBe(Currency.USD);
  });

  it('propagates repository errors without publishing', async () => {
    repo.set.mockRejectedValueOnce(new Error('base fail'));
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    await expect(store.getState().setBaseCurrency(Currency.USD)).rejects.toThrow('base fail');
    expect(store.getState().baseCurrency).toBe(Currency.EGP);
    consoleSpy.mockRestore();
  });
});

describe('baseCurrencyStore.load — the hydrated copy screen memos read synchronously', () => {
  it('hydrates from the repository', async () => {
    repo.load.mockResolvedValueOnce(Currency.USD);
    await store.getState().load();
    expect(store.getState().baseCurrency).toBe(Currency.USD);
  });

  it('ignores a stale load resolving after a newer one', async () => {
    const stale = deferred<Currency>();
    repo.load.mockReturnValueOnce(stale.promise).mockResolvedValueOnce(Currency.USD);

    const staleLoad = store.getState().load();
    await store.getState().load();
    stale.resolve(Currency.EGP);
    await staleLoad;

    expect(store.getState().baseCurrency).toBe(Currency.USD);
  });
});

describe('baseCurrencyStore.reset', () => {
  it('restores EGP and invalidates in-flight loads', async () => {
    await store.getState().setBaseCurrency(Currency.USD);
    store.getState().reset();
    expect(store.getState().baseCurrency).toBe(Currency.EGP);
  });
});

describe('useBaseCurrencyStore', () => {
  it('exposes the shared Zustand singleton API with the EGP default', () => {
    expect(typeof useBaseCurrencyStore.getState).toBe('function');
    expect(useBaseCurrencyStore.getState().baseCurrency).toBe(Currency.EGP);
  });
});
