import type { ExtractState, StoreApi, UseBoundStore } from 'zustand';

type MoneyAppStoreState = object;

type StoreDataSelectors<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => unknown ? never : K]: () => T[K];
};

type StoreActionSelectors<T> = {
  [K in keyof T as T[K] extends (...args: never[]) => unknown ? K : never]: () => T[K];
};

type StoreSelectorApi<S extends UseBoundStore<StoreApi<MoneyAppStoreState>>> = S & {
  use: StoreActionSelectors<ExtractState<S>>;
  useState: StoreDataSelectors<ExtractState<S>>;
};

export function createMoneyAppSelectors<S extends UseBoundStore<StoreApi<MoneyAppStoreState>>>(
  baseStore: S,
): StoreSelectorApi<S> {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- selector namespaces are attached once during store module initialization
  const store = baseStore as StoreSelectorApi<S>;
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- internal mutable view for populating dynamic selector namespaces
  const mutableStore = store as unknown as {
    use: Record<string, () => unknown>;
    useState: Record<string, () => unknown>;
  };
  const initialStoreState = store.getState();

  mutableStore.use = {};
  mutableStore.useState = {};

  for (const key of Object.keys(initialStoreState)) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- Object.keys gives runtime store keys; Zustand state objects do not expose an index signature
    const selector = (s: MoneyAppStoreState) => (s as Record<string, unknown>)[key];
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- same runtime-key lookup as the selector above
    if (typeof (initialStoreState as Record<string, unknown>)[key] === 'function') {
      mutableStore.use[key] = () => store(selector);
    } else {
      mutableStore.useState[key] = () => store(selector);
    }
  }

  return store;
}
