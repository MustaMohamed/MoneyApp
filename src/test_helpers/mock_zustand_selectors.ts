type StoreShape = object;

type MockSelectorStore<T extends StoreShape> = jest.Mock<
  unknown,
  [selector: (state: T) => unknown]
> & {
  use: Record<string, () => unknown>;
  useState: Record<string, () => unknown>;
  getState: jest.MockedFunction<() => T>;
};

function isJestMock(value: unknown): value is jest.Mock {
  return typeof value === 'function' && '_isMockFunction' in value;
}

function hasOwnKey<T extends StoreShape>(state: T, key: PropertyKey): key is keyof T {
  return Object.prototype.hasOwnProperty.call(state, key);
}

function selectProperty<T extends StoreShape>(state: T, key: PropertyKey): unknown {
  return hasOwnKey(state, key) ? state[key] : undefined;
}

export function makeMockSelectorStore<T extends StoreShape>(
  getStore: () => T,
): MockSelectorStore<T> {
  const hook = jest.fn<unknown, [selector: (state: T) => unknown]>((selector) =>
    selector(getStore()),
  );
  const use = new Proxy<Record<string, () => unknown>>(
    {},
    {
      get: (_target, key) => () => hook((state) => selectProperty(state, key)),
    },
  );
  const useState = new Proxy<Record<string, () => unknown>>(
    {},
    {
      get: (_target, key) => () => hook((state) => selectProperty(state, key)),
    },
  );

  return Object.assign(hook, {
    use,
    useState,
    getState: jest.fn(getStore),
  });
}

export function attachMockSelectorStore<T extends StoreShape>(
  hook: unknown,
  getStore: () => T,
): MockSelectorStore<T> {
  if (!isJestMock(hook)) throw new TypeError('Expected a Jest-mocked Zustand hook');

  const selectorStore = makeMockSelectorStore(getStore);
  hook.mockImplementation(selectorStore);
  Object.assign(hook, {
    use: selectorStore.use,
    useState: selectorStore.useState,
    getState: selectorStore.getState,
  });
  return selectorStore;
}
