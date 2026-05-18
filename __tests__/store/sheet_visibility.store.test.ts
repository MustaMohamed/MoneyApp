import { renderHook } from '@testing-library/react-native';
import { act } from '@testing-library/react-native';

import { useAnySheetOpen, useSheetVisibilityStore } from '@/store/sheet_visibility.store';

beforeEach(() => {
  useSheetVisibilityStore.getState().reset();
});

describe('useSheetVisibilityStore', () => {
  it('initialises with count = 0', () => {
    expect(useSheetVisibilityStore.getState().state.count).toBe(0);
  });

  it('increment increases the count by 1', () => {
    useSheetVisibilityStore.getState().increment();
    expect(useSheetVisibilityStore.getState().state.count).toBe(1);
  });

  it('increment is additive — multiple calls stack correctly', () => {
    useSheetVisibilityStore.getState().increment();
    useSheetVisibilityStore.getState().increment();
    expect(useSheetVisibilityStore.getState().state.count).toBe(2);
  });

  it('decrement decreases the count by 1', () => {
    useSheetVisibilityStore.getState().increment();
    useSheetVisibilityStore.getState().decrement();
    expect(useSheetVisibilityStore.getState().state.count).toBe(0);
  });

  it('decrement does not go below 0 and warns in dev (guard against leaked decrements)', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    useSheetVisibilityStore.getState().decrement();
    expect(useSheetVisibilityStore.getState().state.count).toBe(0);
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[sheet_visibility]'));
    warnSpy.mockRestore();
  });

  it('stacked sheets: increment twice, decrement twice → count reaches 0', () => {
    useSheetVisibilityStore.getState().increment();
    useSheetVisibilityStore.getState().increment();
    useSheetVisibilityStore.getState().decrement();
    expect(useSheetVisibilityStore.getState().state.count).toBe(1);
    useSheetVisibilityStore.getState().decrement();
    expect(useSheetVisibilityStore.getState().state.count).toBe(0);
  });

  it('reset() returns count to 0 from any value', () => {
    useSheetVisibilityStore.getState().increment();
    useSheetVisibilityStore.getState().increment();
    useSheetVisibilityStore.getState().increment();
    expect(useSheetVisibilityStore.getState().state.count).toBe(3);
    useSheetVisibilityStore.getState().reset();
    expect(useSheetVisibilityStore.getState().state.count).toBe(0);
  });
});

describe('useAnySheetOpen', () => {
  it('returns false when count is 0', () => {
    const { result } = renderHook(() => useAnySheetOpen());
    expect(result.current).toBe(false);
  });

  it('returns true when count is 1', () => {
    const { result } = renderHook(() => useAnySheetOpen());
    act(() => {
      useSheetVisibilityStore.getState().increment();
    });
    expect(result.current).toBe(true);
  });

  it('returns true when count is greater than 1 (stacked sheets)', () => {
    const { result } = renderHook(() => useAnySheetOpen());
    act(() => {
      useSheetVisibilityStore.getState().increment();
      useSheetVisibilityStore.getState().increment();
    });
    expect(result.current).toBe(true);
  });

  it('returns false again after all sheets are closed', () => {
    const { result } = renderHook(() => useAnySheetOpen());
    act(() => {
      useSheetVisibilityStore.getState().increment();
    });
    expect(result.current).toBe(true);
    act(() => {
      useSheetVisibilityStore.getState().decrement();
    });
    expect(result.current).toBe(false);
  });
});
