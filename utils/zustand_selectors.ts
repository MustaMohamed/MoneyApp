import type { ExtractState, StoreApi, UseBoundStore } from 'zustand';

type MoneyAppStoreState = { state: object };

type StoreSelectorApi<S extends UseBoundStore<StoreApi<MoneyAppStoreState>>> = S & {
  use: {
    [K in keyof Omit<ExtractState<S>, 'state'>]: () => ExtractState<S>[K];
  };
  useState: ExtractState<S> extends { state: infer State extends object }
    ? { [K in keyof State]: () => State[K] }
    : never;
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
    if (key === 'state') continue;
    mutableStore.use[key] = () => store((s) => (s as Record<string, unknown>)[key]);
  }

  for (const key of Object.keys(initialStoreState.state)) {
    // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- keys come from the store's initial state object and are exposed through the typed useState namespace
    mutableStore.useState[key] = () => store((s) => (s.state as Record<string, unknown>)[key]);
  }

  return store;
}
