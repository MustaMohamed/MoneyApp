import { act, renderHook } from '@testing-library/react-native';

import { useAppReadyStore } from '@/store/ready.store';

describe('useAppReadyStore', () => {
  beforeEach(() => {
    act(() => {
      useAppReadyStore.getState().reset();
    });
  });

  it('initialises with ready = false', () => {
    const { result } = renderHook(() => useAppReadyStore.useState.ready());

    expect(result.current).toBe(false);
  });

  it('markReady sets state.ready to true', () => {
    const { result } = renderHook(() => useAppReadyStore((s) => s.ready));

    act(() => {
      useAppReadyStore.getState().markReady();
    });

    expect(result.current).toBe(true);
  });

  it('reset sets state.ready to false', () => {
    const { result } = renderHook(() => useAppReadyStore.useState.ready());

    act(() => {
      useAppReadyStore.getState().markReady();
      useAppReadyStore.getState().reset();
    });

    expect(result.current).toBe(false);
  });
});
