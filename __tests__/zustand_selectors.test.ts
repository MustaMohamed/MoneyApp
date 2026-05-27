import { act, renderHook } from '@testing-library/react-native';
import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

interface CounterStore {
  state: {
    count: number;
    label: string;
  };
  increment: () => void;
  setLabel: (label: string) => void;
}

function createCounterStore() {
  const baseStore = create<CounterStore>()((set) => ({
    state: { count: 0, label: 'zero' },
    increment: () => set((s) => ({ state: { ...s.state, count: s.state.count + 1 } })),
    setLabel: (label) => set((s) => ({ state: { ...s.state, label } })),
  }));

  return createMoneyAppSelectors(baseStore);
}

describe('createMoneyAppSelectors', () => {
  it('exposes nested state leaf selectors and top-level action selectors', () => {
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
});
