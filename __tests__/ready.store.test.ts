import { act, renderHook } from '@testing-library/react-native';

import { useAppReady } from '@/store/ready.store';

describe('useAppReady', () => {
  beforeEach(() => {
    const { result, unmount } = renderHook(() => useAppReady());
    act(() => {
      result.current.reset();
    });
    unmount();
  });

  it('initialises with ready = false', () => {
    const { result } = renderHook(() => useAppReady());
    expect(result.current.state.ready.value).toBe(false);
  });

  it('markReady sets state.ready to true', () => {
    const { result } = renderHook(() => useAppReady());
    act(() => {
      result.current.markReady();
    });
    expect(result.current.state.ready.value).toBe(true);
  });

  it('reset sets state.ready to false', () => {
    const { result } = renderHook(() => useAppReady());
    act(() => {
      result.current.markReady();
      result.current.reset();
    });
    expect(result.current.state.ready.value).toBe(false);
  });
});
