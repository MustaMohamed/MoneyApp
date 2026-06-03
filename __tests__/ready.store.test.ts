import { act, renderHook } from '@testing-library/react-native';

import { useAppReadyStore } from '@/store/ready.store';

describe('useAppReadyStore', () => {
  beforeEach(() => {
    const { result, unmount } = renderHook(() => useAppReadyStore());
    act(() => {
      result.current.reset();
    });
    unmount();
  });

  it('initialises with ready = false', () => {
    const { result } = renderHook(() => useAppReadyStore());
    expect(result.current.ready).toBe(false);
  });

  it('markReady sets state.ready to true', () => {
    const { result } = renderHook(() => useAppReadyStore());
    act(() => {
      result.current.markReady();
    });
    expect(result.current.ready).toBe(true);
  });

  it('reset sets state.ready to false', () => {
    const { result } = renderHook(() => useAppReadyStore());
    act(() => {
      result.current.markReady();
      result.current.reset();
    });
    expect(result.current.ready).toBe(false);
  });
});
