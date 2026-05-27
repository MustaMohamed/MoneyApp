// oxlint-disable typescript/no-unsafe-return, typescript/no-unsafe-type-assertion -- Jest test helper mirrors Zustand's dynamic selector API for mocked stores
type StoreShape = { state: object };

type MockSelectorStore<T extends StoreShape> = jest.Mock & {
  use: Record<string, () => unknown>;
  useState: Record<string, () => unknown>;
  getState: jest.Mock<T>;
};

export function makeMockSelectorStore<T extends StoreShape>(
  getStore: () => T,
): MockSelectorStore<T> {
  const hook = jest.fn((selector: (state: T) => unknown) =>
    selector(getStore()),
  ) as MockSelectorStore<T>;

  hook.use = new Proxy({} as Record<string, () => unknown>, {
    get: (_target, key: string) => () => hook((state: T) => state[key as keyof T]),
  });
  hook.useState = new Proxy({} as Record<string, () => unknown>, {
    get: (_target, key: string) => () =>
      hook((state: T) => (state.state as Record<string, unknown>)[key]),
  });
  hook.getState = jest.fn(getStore);

  return hook;
}

export function attachMockSelectorStore<T extends StoreShape>(
  hook: jest.Mock,
  getStore: () => T,
): MockSelectorStore<T> {
  const selectorStore = makeMockSelectorStore(getStore);
  hook.mockImplementation(selectorStore);
  Object.assign(hook, {
    use: selectorStore.use,
    useState: selectorStore.useState,
    getState: selectorStore.getState,
  });
  return hook as MockSelectorStore<T>;
}
