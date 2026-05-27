import { act, renderHook } from '@testing-library/react-native';
import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CounterStore {
  count: number;
  label: string;
  increment: () => void;
  setLabel: (label: string) => void;
}

function createCounterStore() {
  const baseStore = create<CounterStore>()((set) => ({
    count: 0,
    label: 'zero',
    increment: () => set((s) => ({ count: s.count + 1 })),
    setLabel: (label) => set({ label }),
  }));

  return createMoneyAppSelectors(baseStore);
}

describe('createMoneyAppSelectors', () => {
  it('exposes top-level state selectors and action selectors', () => {
    const useCounterStore = createCounterStore();

    const countHook = renderHook(() => useCounterStore.useState.count());
    const labelHook = renderHook(() => useCounterStore.useState.label());
    const incrementHook = renderHook(() => useCounterStore.use.increment());

    expect(countHook.result.current).toBe(0);
    expect(labelHook.result.current).toBe('zero');

    act(() => {
      incrementHook.result.current();
    });

    expect(countHook.result.current).toBe(1);
    expect(labelHook.result.current).toBe('zero');
  });

  it('reuses the generated selector function for each key', () => {
    const selectorCalls: Array<(state: CounterStore) => unknown> = [];
    const state: CounterStore = {
      count: 0,
      label: 'zero',
      increment: jest.fn(),
      setLabel: jest.fn(),
    };
    const baseStore = Object.assign(
      ((selector: (s: CounterStore) => unknown) => {
        selectorCalls.push(selector);
        return selector(state);
      }) as ReturnType<typeof createCounterStore>,
      {
        getState: () => state,
        setState: jest.fn(),
        subscribe: jest.fn(),
        getInitialState: () => state,
      },
    );
    const useCounterStore = createMoneyAppSelectors(baseStore);

    useCounterStore.useState.count();
    useCounterStore.useState.count();
    useCounterStore.use.increment();
    useCounterStore.use.increment();

    expect(selectorCalls[0]).toBe(selectorCalls[1]);
    expect(selectorCalls[2]).toBe(selectorCalls[3]);
  });
});
